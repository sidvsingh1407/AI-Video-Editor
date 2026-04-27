# NovaCut AI: Smart Video Editor

NovaCut AI is a production-grade, AI-powered video automation platform designed to transform natural language instructions into high-fidelity video edits. Built with a custom real-time synthesis engine, NovaCut enables professional-level workflows such as smart cropping, watermark inpainting, logo branding, and generative talking avatar synthesis.

## 🚀 Core Features

### 1. **NovaEngine: Real-Time Synthesis**
Unlike traditional "preview-only" editors, NovaCut uses a **Canvas-Based Synthesis Engine**. Edits are physically baked into the video frames in real-time, allowing for destructive editing directly in the browser.
- **MediaRecorder Export**: Exports real video files (.webm/.mp4) containing all AI-generated modifications.
- **Frame-Level Control**: Precise frame-skipping for silence removal and "WARP" speed adjustments.

### 2. **Precision AI Inpainting & Branding**
Target and remove unwanted elements with surgical precision.
- **Smart Inpaint**: Manually select any region on the video player to apply AI-driven inpainting.
- **Branding Bypass**: Replace selected watermarks or regions with your own high-resolution Logo branding.

### 3. **Generative Avatar Synthesis (SadTalker Style)**
Turn static headshots into dynamic talking avatars for narration.
- **Analytical Mode**: Optimized for educational content with subtle, stable head movements and accurate lip-syncing.
- **Dynamic Mode**: More expressive animations for engaging social media content.
- **LIP_SYNC_ACTIVE**: Real-time visual pulses synchronized with audio frequency analysis.

### 4. **AI Copilot**
Interact with your video using natural language.
- "Remove the boring silence at the beginning."
- "Speed up the tutorial part by 2x."
- "Blur out the sensitive information in the corner."
- "Crop into the main subject."

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React.
- **Animation**: Motion (motion/react).
- **Video Engine**: HTML5 Canvas + MediaRecorder API.
- **Backend**: Node.js Express (Synthesis Job Management & Logs).
- **AI Logic**: Intelligent instruction parsing and timeline mapping.

## 🏗️ Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### Building for Production
```bash
npm run build
```

## 📋 Engine Diagnostics
NovaCut includes a built-in diagnostic overlay for developers and power users:
- **`[ENGINE] ACTIVE_EDITS`**: Real-time count of active synthesis layers.
- **`[STATE] SYNTH_SYNC_MODE`**: Confirms frame-accurate synchronization.
- **`SADTALKER_ANALYTICAL_LOCK`**: Indicates facial stability mode is active.

## ⚖️ License
SPDX-License-Identifier: Apache-2.0
