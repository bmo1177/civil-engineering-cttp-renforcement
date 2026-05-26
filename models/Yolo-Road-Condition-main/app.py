from flask import Flask, request, jsonify, render_template_string
from ultralytics import YOLO
from PIL import Image
import io

app = Flask(__name__)

# ==========================================
# 1. LOAD YOLO MODEL
# ==========================================
print("Loading YOLOv8 model... Please wait.")
model = YOLO("yolo_road_model.pt") 
print("Model loaded successfully!")

# ==========================================
# 2. SIMPLE WEB INTERFACE
# ==========================================
@app.route('/', methods=['GET'])
def home():
    html_code = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Road Condition AI</title>
        <style>
            body { font-family: Arial; text-align: center; margin-top: 50px; }
            .container { border: 1px solid #ccc; padding: 20px; width: 400px; margin: 0 auto; border-radius: 10px; }
            button { padding: 10px 20px; background-color: #28a745; color: white; border: none; cursor: pointer; }
            #result { margin-top: 20px; font-weight: bold; font-size: 1.2em; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Road Condition AI (YOLOv8)</h2>
            <form id="uploadForm" enctype="multipart/form-data">
                <input type="file" id="fileInput" name="file" accept="image/*" required><br><br>
                <button type="submit">Analyze Road</button>
            </form>
            <div id="result"></div>
        </div>

        <script>
            document.getElementById('uploadForm').onsubmit = async function(e) {
                e.preventDefault();
                document.getElementById('result').innerText = "AI is Analyzing...";
                
                let formData = new FormData();
                formData.append("file", document.getElementById('fileInput').files[0]);
                
                let response = await fetch('/predict', {
                    method: "POST",
                    body: formData
                });
                
                let data = await response.json();
                if (data.success) {
                    document.getElementById('result').innerHTML = 
                        "<span style='color: blue;'>Status: " + data.status.replace("_", " ").toUpperCase() + "</span><br>" +
                        "<span style='color: green;'>Confidence: " + data.confidence + "</span>";
                } else {
                    document.getElementById('result').style.color = "red";
                    document.getElementById('result').innerText = "Error: " + data.error;
                }
            };
        </script>
    </body>
    </html>
    """
    return render_template_string(html_code)

# ==========================================
# 3. PREDICTION API ENDPOINT
# ==========================================
@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Read image file
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
        # YOLOv8 handles all the image resizing and preprocessing automatically!
        results = model.predict(img)
        
        # Extract results
        result = results[0]
        # Get the index of the highest probability
        top_class_index = result.probs.top1 
        # Get the class name (e.g., 'poor', 'good')
        predicted_class = result.names[top_class_index] 
        # Get the confidence score
        confidence = float(result.probs.top1conf * 100)
        
        return jsonify({
            'status': predicted_class,
            'confidence': f"{confidence:.2f}%",
            'success': True
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5980, debug=True)