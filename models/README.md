---
title: CTTP Road Condition Inference Server
emoji: 🛣️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# CTTP Road Condition Inference Server

Flask + TensorFlow (Keras EfficientNetB0) + YOLOv8 inference API for road condition classification.

## Endpoints

- `GET /health` — Check if models are loaded
- `POST /predict` — Upload an image, get road condition prediction

## Classes

- `good` — Road in good condition
- `satisfactory` — Acceptable condition
- `poor` — Poor condition  
- `very_poor` — Very poor condition
