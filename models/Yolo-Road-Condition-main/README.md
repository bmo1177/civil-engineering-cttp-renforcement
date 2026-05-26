# YOLOv8 AI Road Condition Classifier 🛣️

An Artificial Intelligence web application built with **YOLOv8** and **Flask** that analyzes images of roads and strictly classifies their condition into one of four categories: **Good**, **Satisfactory**, **Poor**, or **Very Poor**.

## 🚀 Overview

This project was built to automate the assessment of road infrastructure. By utilizing the state-of-the-art `YOLOv8-cls` (Image Classification) model, the AI evaluates road textures, cracks, and potholes with incredibly high accuracy. 

The backend is powered by a lightweight Flask API that serves both a user-friendly web interface and a programmatic API endpoint for mobile/web integration.

## 📊 Model Performance

The model was trained on a dataset of thousands of road images using PyTorch/Ultralytics and achieved the following metrics:
- **Validation Accuracy:** 98.40%
- **Real-World Test Accuracy:** 95.80% (Evaluated on completely unseen test data)
- **Inference Speed:** ~1.4ms per image (GPU) / Highly optimized for CPU deployment.
- **Model Size:** 10.3 MB (Ultra-lightweight `.pt` file)

## 🛠️ Tech Stack
- **Machine Learning:** Ultralytics (YOLOv8), PyTorch
- **Backend:** Python, Flask
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Image Processing:** Pillow (PIL)

## Performance
This model was trained on thousands of images using PyTorch/YOLOv8. 
- **Validation Accuracy:** 98.40%
- **Real-World Test Accuracy:** 95.80%
- **Inference Speed:** ~1.4ms per image


## 📂 Project Structure
```text
📦 yolo-road-condition
 ┣ 📜 app.py               # Main Flask server and web interface
 ┣ 📜 yolo_road_model.pt   # The trained YOLOv8 model weights
 ┣ 📜 requirements.txt     # Python dependencies
 ┣ 📜 .gitignore           # Ignored files for GitHub
 ┗ 📜 README.md            # Project documentation
```
## 💻 How to Run it Locally

### 1. Clone the repository
```bash
git clone https://github.com/LasferYaaqoub/yolo-road-condition.git
cd yolo-road-condition
```
### 2. Install the dependencies
```bash
pip install -r requirements.txt
```
### 3. Start the Server
```bash
python app.py
```
### 4. Access the Web App
```text
Open your web browser and navigate to:
http://127.0.0.1:5980
```
