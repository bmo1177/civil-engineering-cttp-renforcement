import sys
import os
from pathlib import Path

# Determine models directory and class names globally
if getattr(sys, 'frozen', False):
    MODELS_DIR = Path(sys._MEIPASS).resolve()
else:
    MODELS_DIR = Path(__file__).parent.resolve()
CLASS_NAMES = ['good', 'poor', 'satisfactory', 'very_poor']

# ─── Command Line Mode Router ────────────────────────────────────────────────
mode = None
sub_port = None

for i in range(len(sys.argv) - 1):
    if sys.argv[i] == '--mode':
        mode = sys.argv[i+1]
    elif sys.argv[i] == '--port':
        sub_port = int(sys.argv[i+1])

# ─── Keras Sub-Server Mode ───────────────────────────────────────────────────
if mode == 'keras':
    import tensorflow as tf
    import numpy as np
    from PIL import Image
    import io
    from flask import Flask, request, jsonify

    app = Flask(__name__)
    
    keras_path = MODELS_DIR / "road_condition_model_finetuned.keras"
    print(f"[keras-server] Loading Keras model from {keras_path}...", flush=True)
    try:
        keras_model = tf.keras.models.load_model(str(keras_path))
        print("[keras-server] Keras model loaded successfully.", flush=True)
    except Exception as e:
        print(f"[keras-server] Failed to load Keras model: {e}", flush=True)
        keras_model = None

    @app.route('/health')
    def health():
        return jsonify({'loaded': keras_model is not None})

    @app.route('/predict', methods=['POST'])
    def predict():
        if keras_model is None:
            return jsonify({'error': 'Keras model not loaded', 'success': False}), 500
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded', 'success': False}), 400
        
        try:
            file = request.files['file']
            img_bytes = file.read()
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            img_resized = img.resize((224, 224))
            img_array = tf.keras.utils.img_to_array(img_resized)
            img_array = tf.expand_dims(img_array, 0)

            predictions = keras_model.predict(img_array, verbose=0)
            score = predictions[0]
            predicted_idx = int(np.argmax(score))
            confidence = float(np.max(score) * 100)

            return jsonify({
                'success': True,
                'status': CLASS_NAMES[predicted_idx],
                'confidence': round(confidence, 2),
                'probabilities': {CLASS_NAMES[i]: round(float(score[i]) * 100, 2) for i in range(len(CLASS_NAMES))},
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 500

    print(f"[keras-server] Starting Keras server on port {sub_port}...", flush=True)
    app.run(host='127.0.0.1', port=sub_port, debug=False)
    sys.exit(0)

# ─── YOLO Sub-Server Mode ────────────────────────────────────────────────────
elif mode == 'yolo':
    from ultralytics import YOLO
    from PIL import Image
    import io
    from flask import Flask, request, jsonify

    app = Flask(__name__)

    yolo_dir = MODELS_DIR / "Yolo-Road-Condition-main"
    yolo_path = yolo_dir / "yolo_road_model.pt"
    print(f"[yolo-server] Loading YOLO model from {yolo_path}...", flush=True)
    try:
        yolo_model = YOLO(str(yolo_path))
        print("[yolo-server] YOLO model loaded successfully.", flush=True)
    except Exception as e:
        print(f"[yolo-server] Failed to load YOLO model: {e}", flush=True)
        yolo_model = None

    @app.route('/health')
    def health():
        return jsonify({'loaded': yolo_model is not None})

    @app.route('/predict', methods=['POST'])
    def predict():
        if yolo_model is None:
            return jsonify({'error': 'YOLO model not loaded', 'success': False}), 500
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded', 'success': False}), 400

        try:
            file = request.files['file']
            img_bytes = file.read()
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            results = yolo_model.predict(img, verbose=False)
            r = results[0]
            if hasattr(r, 'probs') and r.probs is not None:
                top1 = r.probs.top1
                confidence = float(r.probs.top1conf * 100)
                probs = r.probs.data.tolist() if hasattr(r.probs, 'data') else None

                raw_yolo_status = str(r.names[top1])
                yolo_status = raw_yolo_status.strip().lower().replace(' ', '_')

                if yolo_status not in CLASS_NAMES:
                    if 0 <= top1 < len(CLASS_NAMES):
                        yolo_status = CLASS_NAMES[top1]

                yolo_probs = {name: 0.0 for name in CLASS_NAMES}
                if probs is not None:
                    for idx, prob_val in enumerate(probs):
                        if idx in r.names:
                            name = str(r.names[idx]).strip().lower().replace(' ', '_')
                            if name in CLASS_NAMES:
                                yolo_probs[name] = round(float(prob_val) * 100, 2)

                return jsonify({
                    'success': True,
                    'status': yolo_status,
                    'confidence': round(confidence, 2),
                    'probabilities': yolo_probs,
                })
            else:
                return jsonify({'success': False, 'error': 'No classification output'}), 500
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 500

    print(f"[yolo-server] Starting YOLO server on port {sub_port}...", flush=True)
    app.run(host='127.0.0.1', port=sub_port, debug=False)
    sys.exit(0)

# ─── Main Proxy Server Mode ──────────────────────────────────────────────────
else:
    import time
    import requests
    import subprocess
    import threading
    import atexit
    import io
    from flask import Flask, request, jsonify

    app = Flask(__name__)

    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

    KERAS_PORT = int(os.environ.get('KERAS_PORT', 5982))
    YOLO_PORT = int(os.environ.get('YOLO_PORT', 5983))

    subprocesses_started = False
    subprocesses_lock = threading.Lock()
    keras_process = None
    yolo_process = None

    def is_port_in_use(port):
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('127.0.0.1', port)) == 0

    def ensure_subprocesses_running():
        global subprocesses_started, keras_process, yolo_process
        with subprocesses_lock:
            if subprocesses_started:
                return
                
            if not is_port_in_use(KERAS_PORT):
                print(f"[main-server] Starting Keras sub-server on port {KERAS_PORT}...", flush=True)
                keras_process = subprocess.Popen([sys.executable, __file__, '--mode', 'keras', '--port', str(KERAS_PORT)])
                
            if not is_port_in_use(YOLO_PORT):
                print(f"[main-server] Starting YOLO sub-server on port {YOLO_PORT}...", flush=True)
                yolo_process = subprocess.Popen([sys.executable, __file__, '--mode', 'yolo', '--port', str(YOLO_PORT)])
                
            subprocesses_started = True

    def cleanup_subprocesses():
        print("[main-server] Terminating sub-servers...", flush=True)
        global keras_process, yolo_process
        if keras_process:
            try:
                keras_process.terminate()
            except:
                pass
        if yolo_process:
            try:
                yolo_process.terminate()
            except:
                pass

    atexit.register(cleanup_subprocesses)

    @app.route('/health', methods=['GET', 'OPTIONS'])
    def health():
        if request.method == 'OPTIONS':
            return '', 204
            
        ensure_subprocesses_running()
        
        keras_loaded = False
        yolo_loaded = False
        yolo_error = None
        
        try:
            r = requests.get(f'http://127.0.0.1:{KERAS_PORT}/health', timeout=1)
            if r.status_code == 200:
                keras_loaded = r.json().get('loaded', False)
        except Exception as e:
            pass
            
        try:
            r = requests.get(f'http://127.0.0.1:{YOLO_PORT}/health', timeout=1)
            if r.status_code == 200:
                yolo_loaded = r.json().get('loaded', False)
        except Exception as e:
            yolo_error = str(e)
            
        return jsonify({
            'status': 'ok',
            'keras_loaded': keras_loaded,
            'yolo_loaded': yolo_loaded,
            'yolo_error': yolo_error,
            'class_names': CLASS_NAMES,
        })

    def ensemble_predict(result):
        votes = {}
        for model_key in ['keras', 'yolo']:
            model_result = result.get(model_key)
            if model_result and 'status' in model_result:
                status = model_result['status']
                conf = model_result.get('confidence', 0)
                votes[status] = votes.get(status, 0) + conf

        if not votes:
            return None

        winner = max(votes, key=votes.get)
        valid_models = [k for k in ['keras', 'yolo'] if result.get(k, {}).get('status')]
        return {
            'status': winner,
            'confidence': round(votes[winner] / len(valid_models), 2) if valid_models else 0.0,
        }

    @app.route('/predict', methods=['POST', 'OPTIONS'])
    def predict():
        if request.method == 'OPTIONS':
            return '', 204
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded', 'success': False}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file', 'success': False}), 400

        ensure_subprocesses_running()
        
        try:
            img_bytes = file.read()
            start_time = time.time()

            result = {'success': True, 'class_names': CLASS_NAMES}

            # ── Keras Prediction ──
            try:
                files = {'file': (file.filename, io.BytesIO(img_bytes), file.content_type)}
                r = requests.post(f'http://127.0.0.1:{KERAS_PORT}/predict', files=files, timeout=60)
                if r.status_code == 200:
                    res_data = r.json()
                    if res_data.get('success'):
                        result['keras'] = {
                            'status': res_data['status'],
                            'confidence': res_data['confidence'],
                            'probabilities': res_data.get('probabilities'),
                        }
                    else:
                        result['keras'] = {'error': res_data.get('error', 'Unknown error')}
                else:
                    try:
                        res_data = r.json()
                        err_msg = res_data.get('error', f'Sub-server returned status {r.status_code}')
                        result['keras'] = {'error': err_msg}
                    except:
                        result['keras'] = {'error': f'Sub-server returned status {r.status_code}'}
            except Exception as e:
                result['keras'] = {'error': str(e)}

            # ── YOLO Prediction ──
            try:
                files = {'file': (file.filename, io.BytesIO(img_bytes), file.content_type)}
                r = requests.post(f'http://127.0.0.1:{YOLO_PORT}/predict', files=files, timeout=60)
                if r.status_code == 200:
                    res_data = r.json()
                    if res_data.get('success'):
                        result['yolo'] = {
                            'status': res_data['status'],
                            'confidence': res_data['confidence'],
                            'probabilities': res_data.get('probabilities'),
                        }
                    else:
                        result['yolo'] = {'error': res_data.get('error', 'Unknown error')}
                else:
                    try:
                        res_data = r.json()
                        err_msg = res_data.get('error', f'Sub-server returned status {r.status_code}')
                        result['yolo'] = {'error': err_msg}
                    except:
                        result['yolo'] = {'error': f'Sub-server returned status {r.status_code}'}
            except Exception as e:
                result['yolo'] = {'error': str(e)}

            # ── Ensemble / Combined Status ──
            combined = ensemble_predict(result)
            if combined:
                result['combined'] = combined

            elapsed = round((time.time() - start_time) * 1000, 2)
            result['processing_time_ms'] = elapsed

            return jsonify(result)

        except Exception as e:
            return jsonify({'error': str(e), 'success': False}), 500

    # Startup subprocesses on load
    ensure_subprocesses_running()

    if __name__ == '__main__':
        port = int(os.environ.get('PORT', os.environ.get('INFERENCE_PORT', 5980)))
        print(f"[main-server] Starting main inference server on port {port}...", flush=True)
        app.run(host='0.0.0.0', port=port, debug=False)
