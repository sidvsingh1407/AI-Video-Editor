| Feature | Status | Evidence (file:lines) | Notes |
| :--- | :--- | :--- | :--- |
| 1. AI Copilot → Gemini | (a) Implemented and working | `src/services/aiService.ts:82`, `src/services/aiService.ts:6-73` | Calls `gemini-3-flash-preview` strictly (not Pro as DOCS.md claims). Prompt instructs returning a strict JSON `EditPlan` containing a summary and operations. Types supported in prompt: blur, branding, avatar, remove, insert, music, captions, text_overlay. |
| 2. Canvas compositor | (b) Partially implemented | `src/App.tsx:392-506` | Execution branches exist for `blur`, `watermark`, `branding`, `avatar`, `captions`, `text_overlay`, and `remove` (via skipping time). Missing execution branches for `speed`, `crop`, `stabilize`, `bokeh`, and `highlight`. `insert` (B-roll) extends the timeline but does not actually draw the video to the canvas. |
| 3. Watermark removal | (a) Implemented and working | `src/App.tsx:271-299` | Uses a pixel/blur-based compositing technique (drawing a blurred, brightness-adjusted background and padding it) via hardware-accelerated canvas filters. It is not generative inpainting. |
| 4. Avatar/lip-sync | (a) Implemented and working | `src/App.tsx:430-475` | Simulates lip-sync. Analyzes general audio volume (frequency bins 2-15) to calculate a "jaw drop" scale factor, and scales only the bottom half of the static avatar image on the Y-axis. No real lip-sync AI model (like Wav2Lip or SadTalker) is used. |
| 5. B-roll | (b) Partially implemented | `src/App.tsx:336-340`, `src/App.tsx:932-938` | The AI can issue an `insert` command and a `<video ref={bRollVideoRef}>` element is created to hold the source. The render loop calculates `maxEndTime` including B-roll duration, but there is no `drawImage` branch to ever composite it onto the canvas. True PiP overlay is not supported by the current b-roll implementation. |
| 6. Backend /api/render | (c) Documented/planned only | `server.ts:19-54` | A mock API endpoint. It generates a random jobId, waits 500ms between fake hardcoded console logs (like `[*] SADTALKER_V1: Extracting audio...`), and marks complete after 5000ms. No FFmpeg or MoviePy rendering happens. |
| 7. Persistence | (d) Not present at all | `src/App.tsx:45` | Project history and state live entirely in React memory (`useState<EditPlan[]>([])`). No LocalStorage, IndexedDB, or server-side DB is used; jobs vanish on refresh. |

### Deployment Branches (Point 8)

| Branch Name | Last Commit Date | Description | Merged |
| :--- | :--- | :--- | :--- |
| `migrate-to-vercel-serverless-...` | 2026-05-19 | Migrates backend to Vercel Serverless Functions (`api/render.ts`) | No |
| `render-deployment-setup-...` | 2026-05-19 | Adds `render.yaml` and updates start scripts for Render deployment | No |
| `perf-optimizations-...` | 2026-05-15 | Canvas filter optimization and audio engine memory leak fix | Yes |
| `optimize-render-loop-ops-map-...` | 2026-05-16 | Memoizes end time calculations in render loop | No |
| `performance-opt-pixel-loop-...` | 2026-05-16 | Optimizes pixel iteration math (prior to the canvas filter refactor) | No |
| `feat/avatar-lip-sync-...` | 2026-05-15 | Implements the real-time generative avatar with simulated lip-sync | No (Squashed/Re-implemented) |

*(Note: other branches are minor chores or empty commits).*

### Dependency Assessment (Point 9)

**Unused Dependencies (listed in package.json but unused in codebase):**
- `dotenv` (Dependencies)
- `path-browserify` (Dependencies)
- `autoprefixer` (DevDependencies)

*Note: `depcheck` flags `tailwindcss`, `tsx`, and `typescript` as unused, but they are used in build scripts and Vite config.*

### App.tsx Assessment (Point 10)

`src/App.tsx` is currently **1,557 lines long** on the main branch. Structurally, it is a massive, monolithic "God Component" that handles everything simultaneously: initializing the Web Audio API, managing the `requestAnimationFrame` canvas rendering loop, orchestrating drag-and-drop interactions, fetching AI payloads from Gemini, and rendering over a dozen complex UI panels (timeline, chat, properties) using inline SVG icons. After inspecting all remote and local branches, **there is zero refactoring or componentization work present anywhere**; no branch introduces a `src/components/` directory to break this file apart.