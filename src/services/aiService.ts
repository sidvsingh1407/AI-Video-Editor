import { GoogleGenAI, Type } from "@google/genai";
import { EditPlan } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const parseEditingInstructions = async (userPrompt: string, videoDuration: number, videoContext?: string): Promise<EditPlan | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. AI features will be disabled.");
    return null;
  }

  const prompt = `
    You are an AI Video Editing Master (Nova_System_v4) and Cinematic Audio Director. 
    Convert the following user request into a specific Edit Plan (JSON).
    The primary mode of interaction is Chat-Initiated Synthesis.

    CRITICAL: For audio synthesis, use the STRICT SOUNDTRACK LIBRARY below.
    
    --- SOUNDTRACK LIBRARY ---
    1. BASE LOOPS (BL):
       - BL-01: "Low Signal Drift" (Mood: Uneasy, anticipation, 2/10 energy)
       - BL-02: "Cold System Idle" (Mood: Clinical, digital, 3/10 energy)
       - BL-03: "Neutral Continuum" (Mood: Documentary, 2/10 energy)
       - BL-04: "Rising Instability" (Mood: Pressure, 5/10 energy)
       - BL-05: "Dark Infrastructure" (Mood: Heavy, 4/10 energy)
       - BL-06: "Silent Collapse Bed" (Mood: Emptiness, 1/10 energy)
    
    2. EVENT TRIGGERS (ET):
       - ET-01: "Hard Impact Hit" (Shock, E9)
       - ET-02: "Glitch Burst Alpha" (Hallucination, E7)
       - ET-03: "Bass Drop Collapse" (Major Reveal, E10)
       - ET-04: "System Error Sweep" (Transition, E6)
       - ET-05: "Reverse Tension Pull" (Pre-impact, E6)
       - ET-06: "Data Fragment Crack" (Breakdown, E7)
       - ET-07: "Low Frequency Pulse Hit" (Spike, E8)
       - ET-08: "Static Cut" (Abrupt change, E5)
    
    3. EMOTIONAL OVERLAYS (EO):
       - EO-01: "Aftermath Piano" (Regret)
       - EO-02: "Dark Reflection Pad" (Consequence)
       - EO-03: "Rising Swell Layer" (Anticipation)
       - EO-04: "Insight Harmonics" (Clarity)
       - EO-05: "Irony Texture" (Uneasy irony)
       - EO-06: "Residual Echo" (Ending)
    
    SYSTEM LOGIC (MAPPING):
    - Tension -> BL-01
    - Build -> BL-04 + EO-03
    - Shock -> ET-01 / ET-03
    - Technical -> BL-02 + EO-04
    - Fallout -> BL-05 + EO-01
    - Insight -> BL-03 + EO-06
    - Post-impact -> BL-06

    CRITICAL INSTRUCTION: Always provide a highly detailed "summary" explaining your creative logic (Why you chose specific speeds, effects, or music).
    
    Guidelines:
    - "Smart Master": Combine Branding + Speed Ramping + Watermark Fix (Global).
    - "Watermark Removal": Use type: "blur", target: "watermark". Specify 'rect' if position is implied. ALWAYS use scope: "global" and start: "0", end: "end" unless a specific time segment is mentioned.
    - "Logo/Branding": Add parameters.rect. Use scope: "global" and start: "0", end: "end" for permanent logos. Case: "add my logo" -> type: "branding".
    - "Trim / Cut": Use type: "remove", target: "segment". To trim the end, use start: "duration - trim_amount", end: "end".
    - "Append / Insert B-Roll": Use type: "insert", target: "b-roll". If appending to end, use start: "end", end: "end + broll_duration".
    - "Soundtrack Engine": When asked for audio analysis or mood setting, return operations with type: "music" and parameters: { base: "BL-XX", overlay: "EO-XX", event: "ET-XX", emotion: "EmotionName" }.
    - "Auto Captions / Text Content": When asked for written content or captions, use type: "captions", target: "subtitle", and include parameters.captions_list: [{time: number, text: string, duration: number}].
    - "Intro Page / Thumbnail": Use type: "text_overlay", target: "intro_card". Usually start: "0", end: "3". Parameters: { text: "Title Text", style: "title" }.
    - "Floating Highlight / Incident": Use type: "text_overlay", target: "floating_word". Parameters: { text: "Word", style: "floating", rect: {x, y, w, h}, animation: "float" }. Use this when specific company names or incidents are mentioned.
    - "Duration": current video is ${videoDuration}s. Use exactly "0" for start and "end" for end to cover the whole video.
    
    Coordinate Examples (1280x720):
    - Top Right: {x: 1000, y: 40, w: 240, h: 120}
    - Bottom Right: {x: 1000, y: 560, w: 240, h: 120}
    - Top Left: {x: 40, y: 40, w: 240, h: 120}
    - Bottom Left: {x: 40, y: 560, w: 240, h: 120}

    User Request: "${userPrompt}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            operations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  target: { type: Type.STRING },
                  start: { type: Type.STRING },
                  end: { type: Type.STRING },
                  scope: { type: Type.STRING },
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      speed_factor: { type: Type.NUMBER },
                      reason: { type: Type.STRING },
                      animation: { type: Type.STRING },
                      base: { type: Type.STRING },
                      overlay: { type: Type.STRING },
                      event: { type: Type.STRING },
                      emotion: { type: Type.STRING },
                      text: { type: Type.STRING },
                      style: { type: Type.STRING },
                      captions_list: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            time: { type: Type.NUMBER },
                            text: { type: Type.STRING },
                            duration: { type: Type.NUMBER }
                          },
                          required: ['time', 'text']
                        }
                      },
                      rect: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER },
                          y: { type: Type.NUMBER },
                          w: { type: Type.NUMBER },
                          h: { type: Type.NUMBER }
                        },
                        required: ['x', 'y', 'w', 'h']
                      }
                    },
                    required: ['reason']
                  }
                },
                required: ['type', 'target', 'start', 'end', 'scope', 'parameters']
              }
            }
          },
          required: ['summary', 'operations']
        }
      }
    });

    return JSON.parse(response.text || "null");
  } catch (error: any) {
    console.error("AI Instruction Parsing Error:", error);
    return null;
  }
};
