# NovaCut AI: System Architecture & Integration Guide

## 🔷 High-Level Architecture

NovaCut AI uses a multi-layered approach to bridge high-level user intent with low-level media manipulation.

### Layer 1: Frontend (React + Vite)
- **User Interface**: Handles media preview, timeline visualization, and natural language input.
- **Intent Parsing**: Calls Gemini API to convert user conversational commands into a structured `EditPlan` (JSON).

### Layer 2: API Gateway (Express Node.js)
- **Job Management**: Receives `EditPlan` and coordinates the execution.
- **Microservice Orchestration**: Forwards heavy processing tasks to the Python execution layer via Redis or HTTP.

### Layer 3: AI Processing (Gemini 1.5 Flash/Pro)
- **Scene Detections**: Identifies visual boundaries.
- **Speech-to-Text**: For silence detection and content understanding.
- **Subject Tracking**: Returns coordinates for Smart Cropping.

### Layer 4: Execution Layer (Python + MoviePy/FFmpeg)
- **Command Translation**: Map JSON instructions to MoviePy `VideoFileClip` operations.
- **Rendering**: Final multi-pass render to produce the edited file.

---

## 🔷 Data Flow (Step-by-Step)

1. **Upload**: User imports `video.mp4`. Preview is loaded.
2. **Analysis**: 
   - Backend sends a low-res proxy of the video to Gemini.
   - Gemini returns a metadata map: `{ "silences": [...], "faces": [...], "highlights": [...] }`.
3. **Instruction**: User types "Make this a 9:16 vertical short and remove dead air."
4. **Resolution**: 
   - `aiService` parses this into:
     ```json
     [
       { "type": "crop", "aspect": "9:16", "strategy": "face_center" },
       { "type": "remove", "start": 10.5, "end": 12.0 }
     ]
     ```
5. **Execution**:
   - Node server calls Python script: `python render.py --plan plan.json --input video.mp4`.
   - Python uses `moviepy.editor.vfx` to adjust speed and `crop` to adjust framing.
6. **Delivery**: Final video is saved to Cloud Storage and a URL is returned to the user.

---

## 🔷 Integration with Python (MoviePy)

Below is a conceptual Python snippet to be used in the Execution Layer:

```python
from moviepy.editor import VideoFileClip, concatenate_videoclips
import json

def process_video(input_path, plan_path, output_path):
    clip = VideoFileClip(input_path)
    with open(plan_path) as f:
        instructions = json.load(f)
    
    final_clips = []
    current_pos = 0
    
    for inst in instructions:
        # 1. Handle "Speed Up" / "Remove"
        if inst['type'] == 'remove':
            # Skip this segment
            continue
            
        # 2. Handle "Crop"
        if inst['type'] == 'crop':
            # Simplified auto-centering logic
            clip = clip.crop(x_center=clip.w/2, width=clip.h*(9/16))
            
    # Final Output
    clip.write_videofile(output_path, codec="libx264")

# Call from Node.js via shell_exec or HTTP request
```

---

## 🔷 MVP vs Advanced Version

| Feature | MVP | Advanced |
| :--- | :--- | :--- |
| **Silence Removal** | Hard cut on decibel threshold. | Gap filling with ambient noise (AI Generative). |
| **Smart Crop** | Static center-crop. | Dynamic tracking (follows subject as they move). |
| **Watermark Removal**| Static blur on detected region. | AI Inpainting (Pixel-stable reconstruction). |
| **Highlights** | Based on audio spikes. | Multimodal (Visual sentiment + Audio energy). |
| **Speed Control** | Constant multiplier (e.g. 2x). | Smooth interpolation (Optical Flow speed ramping). |

---

## 🔷 Failure Modes & Mitigation

1. **Wrong Cropping**: Occurs in multi-person shots.
   - *Mitigation*: Allow user to "Select Primary Subject" in the UI.
2. **Misinterpreting Natural Language**: Ambiguous commands.
   - *Mitigation*: AI returns a "Plan Preview" for user confirmation before rendering.
3. **Over-speeding Important Parts**: AI misses nuanced slow speech.
   - *Mitigation*: Implement a "Speech Preservation" rule—never speed up segments with >80% speech confidence.
