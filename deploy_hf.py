"""
deploy_hf.py — Deploy models/inference_server to Hugging Face Spaces
Usage: HF_TOKEN=hf_xxxx python deploy_hf.py
Get your token at: https://huggingface.co/settings/tokens (needs Write access)
"""
import os
import sys

# ── 1. Get token ──────────────────────────────────────────────────────────────
TOKEN = os.environ.get("HF_TOKEN")
if not TOKEN:
    print("❌ Error: HF_TOKEN environment variable not set.")
    print("")
    print("Get your token from: https://huggingface.co/settings/tokens")
    print("Then run: HF_TOKEN=hf_xxxx python deploy_hf.py")
    sys.exit(1)

from huggingface_hub import HfApi, create_repo
api = HfApi(token=TOKEN)

# ── 2. Get username ───────────────────────────────────────────────────────────
print("🔍 Getting your HF username...")
user_info = api.whoami()
username = user_info["name"]
repo_id = f"{username}/cttp-inference-server"
print(f"   Logged in as: {username}")
print(f"   Space will be: {repo_id}")

# ── 3. Create the Space ───────────────────────────────────────────────────────
print("\n🚀 Creating HF Space (Docker)...")
try:
    create_repo(
        repo_id=repo_id,
        repo_type="space",
        space_sdk="docker",
        token=TOKEN,
        private=False,  # Must be public for free tier
        exist_ok=True,  # Don't fail if it already exists
    )
    print(f"   ✅ Space ready: https://huggingface.co/spaces/{repo_id}")
except Exception as e:
    print(f"   ⚠️  Space creation issue (may already exist): {e}")

# ── 4. Upload the models/ folder ─────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
print(f"\n📦 Uploading {MODELS_DIR} to HF Space...")
print("   (This may take several minutes — model files are large)")

api.upload_folder(
    folder_path=MODELS_DIR,
    repo_id=repo_id,
    repo_type="space",
    token=TOKEN,
    ignore_patterns=[
        "__pycache__",
        "*.pyc",
        "build/",
        "dist/",
        "*.zip",
        "*.spec",
        "app.py",           # Old standalone app, not needed
        "class_names.txt",  # Embedded in inference_server.py
    ],
    commit_message="Deploy CTTP inference server",
)

# ── 5. Print results ──────────────────────────────────────────────────────────
space_url = f"https://huggingface.co/spaces/{repo_id}"
api_url = f"https://{username}-cttp-inference-server.hf.space"

print(f"""
✅ Deployment complete!

   Space page:  {space_url}
   API URL:     {api_url}
   Health:      {api_url}/health

⏳ Build takes ~5–10 minutes the first time (TensorFlow is large).
   Watch build logs at: {space_url}

📋 Next step — Add this to Vercel environment variables:
   INFERENCE_SERVER_URL = {api_url}
""")
