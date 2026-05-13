/**
 * No-op module for optional dependencies that may not be installed.
 * Used as a webpack alias fallback for onnxruntime-node.
 */

module.exports = {
  InferenceSession: {
    create: async () => {
      throw new Error('onnxruntime-node is not installed. Install it or set INFERENCE_BACKEND=gemini.')
    },
  },
}
