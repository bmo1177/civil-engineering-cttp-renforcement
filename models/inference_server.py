"""
Unified Inference Server — CTTP Renforcement
Loads both Keras (EfficientNetB0) and YOLO (YOLOv8-cls) road condition models.
Provides a unified API for classification and future detection.
"""

import os
import sys
import json
import time
import io
import logging
from pathlib import Path

import numpy as np
from flask import Flask, request, jsonify

logging.basicConfig(level=logging.INFO, format='[inference-server] %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

MODELS_DIR = Path(__file__).parent.resolve()
CLASS_NAMES = ['good', 'poor', 'satisfactory', 'very_poor']

keras_model = None
yolo_model = None

def load_models():
    global keras_model, yolo_model, tf

    keras_path = MODELS_DIR / "road_condition_model_finetuned.keras"
    yolo_dir = MODELS_DIR / "Yolo-Road-Condition-main"
    yolo_path = yolo_dir / "yolo_road_model.pt"

    # ── YOLO Model (load before TF to avoid PyTorch/TF conflict) ──
    if yolo_path.exists():
        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model from {yolo_path}...")
            yolo_model = YOLO(str(yolo_path))
            logger.info(f"YOLO model loaded. Task: {yolo_model.task}, Classes: {yolo_model.names}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
    else:
        logger.warning(f"YOLO model not found at {yolo_path}")

    # ── Keras Model ──
    if keras_path.exists():
        try:
            import tensorflow
            tf = tensorflow
            logger.info(f"Loading Keras model from {keras_path}...")
            keras_model = tf.keras.models.load_model(str(keras_path))
            logger.info(f"Keras model loaded. Input: {keras_model.input_shape}, Output: {keras_model.output_shape}")
        except Exception as e:
            logger.error(f"Failed to load Keras model: {e}")
    else:
        logger.warning(f"Keras model not found at {keras_path}")

    if keras_model is None and yolo_model is None:
        logger.error("No models loaded! Server will return errors.")
    else:
        loaded = []
        if keras_model: loaded.append("Keras")
        if yolo_model: loaded.append("YOLO")
        logger.info(f"Models loaded: {' + '.join(loaded)}")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'keras_loaded': keras_model is not None,
        'yolo_loaded': yolo_model is not None,
        'class_names': CLASS_NAMES,
    })

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded', 'success': False}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file', 'success': False}), 400

    try:
        img_bytes = file.read()
        start_time = time.time()

        result = {'success': True, 'class_names': CLASS_NAMES}

        # ── Keras Prediction ──
        if keras_model is not None:
            try:
                from PIL import Image
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                img_resized = img.resize((224, 224))
                img_array = tf.keras.utils.img_to_array(img_resized)
                img_array = tf.expand_dims(img_array, 0)

                predictions = keras_model.predict(img_array, verbose=0)
                score = predictions[0]
                predicted_idx = int(np.argmax(score))
                confidence = float(np.max(score) * 100)

                result['keras'] = {
                    'status': CLASS_NAMES[predicted_idx],
                    'confidence': round(confidence, 2),
                    'probabilities': {CLASS_NAMES[i]: round(float(score[i]) * 100, 2) for i in range(len(CLASS_NAMES))},
                }
            except Exception as e:
                logger.error(f"Keras inference error: {e}")
                result['keras'] = {'error': str(e)}
        else:
            result['keras'] = {'error': 'Keras model not loaded'}

        # ── YOLO Prediction ──
        if yolo_model is not None:
            try:
                from PIL import Image
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                results = yolo_model.predict(img, verbose=False)
                r = results[0]
                if hasattr(r, 'probs') and r.probs is not None:
                    top1 = r.probs.top1
                    confidence = float(r.probs.top1conf * 100)
                    probs = r.probs.data.tolist() if hasattr(r.probs, 'data') else None

                    result['yolo'] = {
                        'status': r.names[top1],
                        'confidence': round(confidence, 2),
                        'probabilities': {CLASS_NAMES[i]: round(float(probs[i]) * 100, 2) for i in range(len(CLASS_NAMES))} if probs else None,
                    }
                else:
                    result['yolo'] = {'error': 'No classification output'}
            except Exception as e:
                logger.error(f"YOLO inference error: {e}")
                result['yolo'] = {'error': str(e)}
        else:
            result['yolo'] = {'error': 'YOLO model not loaded'}

        # ── Ensemble / Combined Status ──
        combined = ensemble_predict(result)
        if combined:
            result['combined'] = combined

        elapsed = round((time.time() - start_time) * 1000, 2)
        result['processing_time_ms'] = elapsed

        return jsonify(result)

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500

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
    return {
        'status': winner,
        'confidence': round(votes[winner] / len([k for k in ['keras', 'yolo'] if result.get(k, {}).get('status')]), 2),
    }

if __name__ == '__main__':
    logger.info("Loading models...")
    load_models()
    port = int(os.environ.get('INFERENCE_PORT', 5980))
    logger.info(f"Starting inference server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
