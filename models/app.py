from flask import Flask, request, jsonify, render_template_string
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

# ==========================================
# 1. LOAD MODEL & CLASS NAMES (Done once at startup)
# ==========================================
print("Loading model... Please wait.")
model = tf.keras.models.load_model("road_condition_model_finetuned.keras")

with open("class_names.txt", "r") as f:
    class_names = [line.strip() for line in f.readlines()]
print(f"Model loaded successfully! Classes: {class_names}")

# ==========================================
# 2. IMAGE PREPROCESSING FUNCTION
# ==========================================
def prepare_image(image_bytes):
    # Read the image, convert to RGB, and resize to 224x224 (EfficientNetB0 size)
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    
    # Convert image to an array and add a batch dimension
    img_array = tf.keras.utils.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0)
    return img_array

# ==========================================
# 3. PREDICTION API ENDPOINT (TRUE AI)
# ==========================================
@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # 1. Prepare image
        img_bytes = file.read()
        processed_image = prepare_image(img_bytes)
        
        # 2. THE AI DOES THE WORK HERE
        predictions = model.predict(processed_image)
        
        # FIX: The model already outputs probabilities, so we just take predictions[0] directly!
        score = predictions[0] 
        
        # 3. Extract the highest percentage
        predicted_class = class_names[np.argmax(score)]
        confidence = float(np.max(score) * 100)
        
        return jsonify({
            'status': predicted_class,
            'confidence': f"{confidence:.2f}%",
            'success': True
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500
# ==========================================
# 4. SIMPLE WEB INTERFACE (For testing)
# ==========================================
@app.route('/', methods=['GET'])
def home():
    # A simple HTML page to test your model directly from your browser
    html_code = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Road Condition Classifier</title>
        <style>
            body { font-family: Arial; text-align: center; margin-top: 50px; }
            .container { border: 1px solid #ccc; padding: 20px; width: 400px; margin: 0 auto; border-radius: 10px; }
            button { padding: 10px 20px; background-color: #28a745; color: white; border: none; cursor: pointer; }
            #result { margin-top: 20px; font-weight: bold; font-size: 1.2em; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Road Condition AI</h2>
            <form id="uploadForm" enctype="multipart/form-data">
                <input type="file" id="fileInput" name="file" accept="image/*" required><br><br>
                <button type="submit">Analyze Road</button>
            </form>
            <div id="result"></div>
        </div>

        <script>
            document.getElementById('uploadForm').onsubmit = async function(e) {
                e.preventDefault();
                document.getElementById('result').innerText = "Analyzing...";
                
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

if __name__ == '__main__':
    # Start the server on port 5000
    app.run(host='0.0.0.0', port=5980, debug=True)









