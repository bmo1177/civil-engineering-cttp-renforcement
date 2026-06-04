FROM python:3.11-slim

# Hugging Face Spaces requires port 7860
ENV PORT=7860
ENV INFERENCE_PORT=7860

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch FIRST — must come before ultralytics
# Without this, pip tries to install the 10GB CUDA version which fails in Docker
RUN pip install --no-cache-dir \
    torch==2.2.2 torchvision==0.17.2 \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model files and server
COPY inference_server.py .
COPY road_condition_model_finetuned.keras .
COPY Yolo-Road-Condition-main/yolo_road_model.pt ./Yolo-Road-Condition-main/yolo_road_model.pt

# Expose port 7860 (required by HF Spaces)
EXPOSE 7860

# Start the server
CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:7860", "--timeout", "120", "inference_server:app"]
