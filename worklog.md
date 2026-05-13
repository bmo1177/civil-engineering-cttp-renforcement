---
Task ID: 2
Agent: Main Agent
Task: Fix ALL hydration/SSR issues causing broken interactivity (buttons, inputs, calculations not working)

Work Log:
- Deep-audited all CTTP components for hydration mismatch sources
- Identified root cause: page.tsx was going through SSR with 'use client' + mounted guard, but this pattern is fragile and can still cause hydration mismatches
- Applied NUCLEAR FIX: moved entire interactive page to CalculatorApp.tsx loaded via `next/dynamic({ ssr: false })`
- page.tsx is now a thin wrapper (~40 lines) that only renders a pure-HTML loading placeholder on the server
- CalculatorApp.tsx (client-only, never SSR'd) contains all interactive logic with NO mounted guard needed
- Removed `safeWindowInnerWidth()` helper — replaced with direct `window.innerWidth` since component only runs on client
- Replaced dynamic import of LicenseInput with static import (parent already skips SSR)
- Removed unnecessary `typeof window === 'undefined'` checks in safe helpers
- Fixed onnxruntime-node Turbopack compile error: moved ONNXProvider to separate `onnx-provider.ts` file, loaded dynamically only when INFERENCE_BACKEND=onnx
- Made `getInferenceProvider()` async to support dynamic ONNX module loading
- Updated predict API route to await `getInferenceProvider()`
- Removed `onnxruntime-node` from `serverExternalPackages` in next.config.ts
- Verified lint passes with zero errors
- Verified dev server compiles without onnxruntime-node warnings
- Verified page loads (200 status), API routes work, all interactivity functions

Stage Summary:
- ALL interactivity now works: tabs, dropdowns, inputs, compute button, AI analysis, settings, export
- Page uses `ssr: false` pattern to completely eliminate hydration mismatches
- Server renders only a simple HTML loading placeholder (no React components, no Lucide icons)
- Client loads the full interactive CalculatorApp after hydration
- onnxruntime-node compile warnings are completely eliminated
- Code is portable: downloads and runs on any machine with `bun install && bun run dev`

---
