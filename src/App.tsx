/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Upload, 
  Scissors, 
  Zap, 
  MessageSquare, 
  Search, 
  Maximize, 
  Volume2, 
  Crop, 
  Gauge, 
  ChevronRight,
  Clock,
  Sparkles,
  Info,
  Download,
  CheckCircle2,
  Terminal,
  Activity,
  Music,
  Library,
  Type
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VideoMetadata, EditPlan, EditOperation } from "./types";
import { parseEditingInstructions } from "./services/aiService";

const MUSIC_LIBRARY = [
  { id: 'upbeat', name: 'Upbeat Energetic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', genre: 'Upbeat', mood: 'high energy, motivational, fast-paced' },
  { id: 'chill', name: 'Chill Lo-Fi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', genre: 'Relaxing', mood: 'background, study, relaxed' },
  { id: 'cinematic', name: 'Cinematic Tech', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', genre: 'Cinematic', mood: 'professional, technical, explanatory' },
  { id: 'piano', name: 'Piano Melancholy', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', genre: 'Piano', mood: 'sad, reflective, emotional' },
  { id: 'corporate', name: 'Corporate Motivation', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', genre: 'Corporate', mood: 'business, presentation, clear' },
  { id: 'smooth', name: 'Smooth Jazz', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', genre: 'Jazz', mood: 'sophisticated, dining, smooth' },
];

const BL_MAPPING: Record<string, string> = {
  'BL-01': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'BL-02': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  'BL-03': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
  'BL-04': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'BL-05': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'BL-06': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
};

export default function App() {
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [history, setHistory] = useState<EditPlan[]>([]);
  const [pendingPlan, setPendingPlan] = useState<EditPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'complete'>('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bRollUrl, setBRollUrl] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [isSelectingWatermark, setIsSelectingWatermark] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [watermarkRect, setWatermarkRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bRollVideoRef = useRef<HTMLVideoElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const requestRef = useRef<number>(0);

  const parseTime = (val: string | number, duration: number): number => {
    if (typeof val === 'number') return val;
    if (!val || val === '0:00') return 0;
    if (val === 'video_end' || val === 'end') return duration || 0;
    
    // Check for MM:SS
    if (typeof val === 'string' && val.includes(':')) {
       const [min, sec] = val.split(':').map(Number);
       return (min * 60) + (sec || 0);
    }
    
    return parseFloat(val) || 0;
  };

  useEffect(() => {
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = logoUrl;
      img.onload = () => { logoImgRef.current = img; };
    }
  }, [logoUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideo({
        name: file.name,
        duration: 0,
        size: file.size,
        url: url
      });
      setIsPlaying(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      logoImgRef.current = img;
    }
  };

  const handleBRollUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBRollUrl(url);
    }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMusicUrl(url);
    }
  };

  const handleAIMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setIsProcessing(true);
    const result = await parseEditingInstructions(chatInput, video?.duration || 0);
    setPendingPlan(result);
    setChatInput("");
    setIsProcessing(false);
  };

  const handleConfirmPlan = () => {
    if (pendingPlan) {
      // Auto-attach music presets or BL mappings if detected from AI
      const musicOp = pendingPlan.operations.find(op => op.type === 'music');
      if (musicOp) {
        if (musicOp.parameters.music_preset) {
          const preset = MUSIC_LIBRARY.find(m => m.name === musicOp.parameters.music_preset);
          if (preset) setMusicUrl(preset.url);
        } else if (musicOp.parameters.base) {
          const baseId = musicOp.parameters.base as string;
          if (BL_MAPPING[baseId]) setMusicUrl(BL_MAPPING[baseId]);
        }
      }
      setHistory([...history, pendingPlan]);
      setPendingPlan(null);
    }
  };

  const handleDiscardPlan = () => {
    setPendingPlan(null);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      if (video) setVideo(prev => prev ? { ...prev, duration: video.duration } : null);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [video?.url]);

  const activeOpsRef = useRef<EditOperation[]>([]);

  // Derived effective time logic
  const getVirtualTime = (rawTime: number) => {
    const duration = video?.duration || 0;
    if (!duration) return rawTime;

    const removes = history.flatMap(p => p.operations).filter(o => o.type === 'remove')
      .map(o => ({
        start: parseTime(o.start, duration),
        end: parseTime(o.end, duration)
      }))
      .sort((a,b) => a.start - b.start);

    const mergedRemoves: {start: number, end: number}[] = [];
    removes.forEach(curr => {
      if (!mergedRemoves.length) {
        mergedRemoves.push(curr);
      } else {
        const last = mergedRemoves[mergedRemoves.length - 1];
        if (curr.start <= last.end) {
          last.end = Math.max(last.end, curr.end);
        } else {
          mergedRemoves.push(curr);
        }
      }
    });

    let subtracted = 0;
    mergedRemoves.forEach(range => {
      if (rawTime >= range.end) {
        subtracted += (range.end - range.start);
      } else if (rawTime > range.start) {
        subtracted += (rawTime - range.start);
      }
    });
    
    return Math.max(0, rawTime - subtracted);
  };

  const virtualDuration = getVirtualTime(video?.duration || 0);
  const virtualCurrentTime = getVirtualTime(currentTime);

  // Periodically update active operations to avoid doing it every frame
  useEffect(() => {
    const allOps = history.flatMap(plan => plan.operations || []);
    activeOpsRef.current = allOps;
  }, [history]);

  const clockRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  // NovaCut Frame Synthesis Engine
  useEffect(() => {
    const videoElement = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoElement || !canvas || (!isPlaying && renderStatus !== 'rendering')) {
      clockRef.current = 0;
      lastFrameTimeRef.current = 0;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderFrame = (now: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = now;
      const deltaTime = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      // Update master clock
      if (isPlaying || renderStatus === 'rendering') {
        if (!videoElement.paused && !videoElement.ended) {
          clockRef.current = videoElement.currentTime;
        } else {
          // If video ended or paused during render, advance clock manually for appends
          clockRef.current += deltaTime * videoElement.playbackRate;
        }
        // Keep React state in sync for UI counters
        setCurrentTime(clockRef.current);
      }

      const currentTime = clockRef.current;
      const duration = videoElement.duration;
      
      const effectiveEndTimes = activeOpsRef.current.map(op => {
        const start = parseTime(op.start, duration);
        let end = parseTime(op.end, duration);
        if (op.type === 'insert' && bRollVideoRef.current?.duration) {
          end = Math.max(end, start + bRollVideoRef.current.duration);
        }
        return end;
      });
      
      const maxEndTime = Math.max(duration, ...effectiveEndTimes);
      
      const isFinished = currentTime >= maxEndTime - 0.05;

      if (isFinished || (videoElement.paused && renderStatus !== 'rendering' && currentTime < duration)) {
        if (renderStatus === 'rendering' && isFinished) {
          setRenderProgress(100);
          stopRecording();
        }
        return;
      }

      if (renderStatus === 'rendering' && duration > 0) {
        const vDur = getVirtualTime(duration);
        const vCurrent = getVirtualTime(currentTime);
        setRenderProgress(vDur > 0 ? (vCurrent / vDur) * 100 : 100);
      }

      // 1. Resolve Active Operations (Optimized lookup)
      const activeOps = activeOpsRef.current.filter(op => {
        const start = parseTime(op.start, duration);
        let end = parseTime(op.end, duration);
        
        // If it's an insert (B-roll), ensure we at least try to play its duration if b-roll is loaded
        if (op.type === 'insert' && bRollVideoRef.current?.duration) {
          end = Math.max(end, start + bRollVideoRef.current.duration);
        }
        
        return currentTime >= start && currentTime <= end;
      });

      // 2. Destructive State Management (Cuts/Speed)
      const removeOp = activeOps.find(op => op.type === 'remove');
      if (removeOp) {
        const end = parseTime(removeOp.end, duration);
        videoElement.currentTime = Math.min(end + 0.1, duration);
        requestRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const speedOp = activeOps.find(op => op.type === 'speed');
      videoElement.playbackRate = speedOp ? (speedOp.parameters.speed_factor || 2.0) : 1.0;

      // 3. Frame Composition
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cropOp = activeOps.find(op => op.type === 'crop');
      const insertOp = activeOps.find(op => op.type === 'insert');
      const musicOp = activeOps.find(op => op.type === 'music');
      const bokehOp = activeOps.find(op => op.type === 'bokeh');
      const overlayOp = activeOps.find(op => op.type === 'overlay');
      const captionsOp = activeOps.find(op => op.type === 'captions');

      if (videoElement.readyState >= 2) { 
        // 3a. Frame Pre-processing (Bokeh/Filters)
        if (bokehOp) {
          ctx.filter = `blur(${bokehOp.parameters.intensity || 5}px) grayscale(0.2)`;
        } else if (overlayOp) {
          const style = overlayOp.parameters.style;
          if (style === 'noir') ctx.filter = 'grayscale(1) contrast(1.2)';
          else if (style === 'vibrant') ctx.filter = 'saturate(1.8) contrast(1.1)';
          else if (style === 'cinematic') ctx.filter = 'sepia(0.1) contrast(1.1) brightness(0.95)';
        }

        // 3e. Cinematic Soundtrack Engine logic
        if (musicOp && musicAudioRef.current) {
          const { base, event } = musicOp.parameters;
          
          if (base && musicUrl) {
            // Restore strict synchronization for music loops
            if (Math.abs(musicAudioRef.current.currentTime - currentTime) > 0.5) {
              musicAudioRef.current.currentTime = currentTime;
            }
            if (musicAudioRef.current.paused) {
              musicAudioRef.current.play().catch(() => {});
            }
            musicAudioRef.current.volume = event ? 0.15 : 0.4;
          }
        } else if (musicAudioRef.current) {
          if (!musicAudioRef.current.paused) musicAudioRef.current.pause();
        }

        if (insertOp && bRollVideoRef.current && bRollVideoRef.current.readyState >= 2) {
          // 3b. B-Roll Insertion Logic (Audio Ducking + Sync)
          const bRollStart = parseTime(insertOp.start, duration);
          const bRollOffset = currentTime - bRollStart;
          const bRollDuration = bRollVideoRef.current.duration;

          if (bRollOffset >= 0 && bRollOffset < bRollDuration) {
            videoElement.volume = 0.1;
            bRollVideoRef.current.volume = 1.0;

            if (Math.abs(bRollVideoRef.current.currentTime - bRollOffset) > 0.3) {
              bRollVideoRef.current.currentTime = bRollOffset;
            }
            if (bRollVideoRef.current.paused) {
              bRollVideoRef.current.play().catch(() => {});
            }
            ctx.drawImage(bRollVideoRef.current, 0, 0, canvas.width, canvas.height);
          } else {
            videoElement.volume = 1.0;
            if (!bRollVideoRef.current.paused) bRollVideoRef.current.pause();
            bRollVideoRef.current.volume = 0;

            if (cropOp) {
              ctx.drawImage(videoElement, videoElement.videoWidth * 0.15, videoElement.videoHeight * 0.15, videoElement.videoWidth * 0.7, videoElement.videoHeight * 0.7, 0, 0, canvas.width, canvas.height);
            } else {
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            }
          }
        } else {
          videoElement.volume = 1.0;
          if (bRollVideoRef.current && !bRollVideoRef.current.paused) {
            bRollVideoRef.current.pause();
            bRollVideoRef.current.volume = 0;
          }

          if (cropOp) {
            ctx.drawImage(videoElement, videoElement.videoWidth * 0.15, videoElement.videoHeight * 0.15, videoElement.videoWidth * 0.7, videoElement.videoHeight * 0.7, 0, 0, canvas.width, canvas.height);
          } else {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          }
        }
        
        ctx.filter = 'none';

        // 3c. Bokeh Masking
        if (bokehOp) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width * 0.3, canvas.height * 0.45, 0, 0, Math.PI * 2);
          ctx.clip();
          if (cropOp) {
            ctx.drawImage(videoElement, videoElement.videoWidth * 0.15, videoElement.videoHeight * 0.15, videoElement.videoWidth * 0.7, videoElement.videoHeight * 0.7, 0, 0, canvas.width, canvas.height);
          } else {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          }
          ctx.restore();
        }

        // 3d. Cinematic Bars
        if (overlayOp && overlayOp.parameters.style === 'cinematic') {
          ctx.fillStyle = 'black';
          const barHeight = canvas.height * 0.12;
          ctx.fillRect(0, 0, canvas.width, barHeight);
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
        }
      }

        // 4. Region Effects
        const effects = activeOps.filter(op => op.type === 'blur' || op.type === 'watermark' || op.type === 'branding');
        
        // Sort effects so blur/watermark (cleanup) happens BEFORE branding (overlay)
        const sortedEffects = [...effects].sort((a, b) => {
          if ((a.type === 'blur' || a.type === 'watermark') && b.type === 'branding') return -1;
          if (a.type === 'branding' && (b.type === 'blur' || b.type === 'watermark')) return 1;
          return 0;
        });

        sortedEffects.forEach(op => {
          ctx.save();
          
          // Coordinate normalization helper
          const normalizeRect = (r: any) => {
            const res = { ...r };
            // Robust check: if all values are <= 1.0 and not all 0, assume percentage.
            // If they are large (>1), assume absolute pixels.
            const isPercentage = (res.x <= 1 && res.y <= 1 && res.w <= 1 && res.h <= 1) && 
                                 (res.x !== 0 || res.y !== 0 || res.w !== 0 || res.h !== 0);

            if (isPercentage) {
              res.x *= canvas.width;
              res.y *= canvas.height;
              res.w *= canvas.width;
              res.h *= canvas.height;
            }
            return res;
          };

          const rect = normalizeRect(op.parameters.rect || {
            x: canvas.width - (canvas.width * 0.2) - 40,
            y: canvas.height - (canvas.height * 0.15) - 40,
            w: canvas.width * 0.2,
            h: canvas.height * 0.15
          });

          if (op.type === 'branding' && logoImgRef.current?.complete && logoImgRef.current.naturalWidth > 0) {
          const animation = op.parameters.animation;
          let scale = 1.0;
          let alpha = 1.0;

          if (animation === 'pulse') {
            scale = 1.0 + Math.sin(currentTime * 4) * 0.05;
          } else if (animation === 'bounce') {
            scale = 1.0 + Math.abs(Math.sin(currentTime * 6)) * 0.1;
          } else if (animation === 'fade') {
            const opStart = parseTime(op.start, duration);
            alpha = Math.min(1, (currentTime - opStart) / 1.5); // 1.5s fade-in
          }

          ctx.save();
          ctx.globalAlpha = alpha;
          const centerX = rect.x + rect.w / 2;
          const centerY = rect.y + rect.h / 2;
          ctx.translate(centerX, centerY);
          ctx.scale(scale, scale);
          ctx.drawImage(logoImgRef.current, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
          ctx.restore();
        } else {
          // AI-Simulated Inpainting Effect
          ctx.save();
          // Create the mask for the operation
          ctx.beginPath();
          ctx.rect(rect.x, rect.y, rect.w, rect.h);
          ctx.clip();
          
          // 1. Initial color sampling (heavy blur)
          ctx.filter = 'blur(35px) saturate(1.3) contrast(1.1)';
          ctx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
          
          // 2. Multi-Directional Edge Smearing (Simulating Content Awareness)
          ctx.globalAlpha = 0.7;
          ctx.filter = 'blur(20px)';
          
          // Sample Top Edge and smear downwards
          ctx.drawImage(canvas, rect.x, Math.max(0, rect.y - 15), rect.w, 15, rect.x, rect.y, rect.w, rect.h * 0.6);
          // Sample Bottom Edge and smear upwards
          ctx.drawImage(canvas, rect.x, Math.min(canvas.height - 15, rect.y + rect.h), rect.w, 15, rect.x, rect.y + rect.h * 0.4, rect.w, rect.h * 0.6);
          // Sample Left Edge and smear right
          ctx.drawImage(canvas, Math.max(0, rect.x - 15), rect.y, 15, rect.h, rect.x, rect.y, rect.w * 0.6, rect.h);
          // Sample Right Edge and smear left
          ctx.drawImage(canvas, Math.min(canvas.width - 15, rect.x + rect.w), rect.y, 15, rect.h, rect.x + rect.w * 0.4, rect.y, rect.w * 0.6, rect.h);
          
          // 3. Detail Synthesis (Adding subtle noise and color jitter)
          ctx.globalAlpha = 0.08;
          ctx.filter = 'none';
          for(let i = 0; i < 30; i++) {
            const rx = rect.x + Math.random() * rect.w;
            const ry = rect.y + Math.random() * rect.h;
            const size = 2 + Math.random() * 10;
            ctx.fillStyle = `rgba(${120 + Math.random() * 80}, ${120 + Math.random() * 80}, ${120 + Math.random() * 80}, 0.5)`;
            ctx.beginPath();
            ctx.arc(rx, ry, size, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Final Grain layer
          ctx.globalAlpha = 0.05;
          ctx.fillStyle = '#888';
          for(let i = 0; i < 100; i++) {
            ctx.fillRect(rect.x + Math.random() * rect.w, rect.y + Math.random() * rect.h, 1, 1);
          }
          ctx.restore();
        }
        ctx.restore();
      });

      // 5. Smart Captions Rendering
      if (captionsOp) {
        const captions = captionsOp.parameters.captions_list || [];
        const currentCaption = [...captions].reverse().find((c: any) => {
          const duration = c.duration || 3.5;
          return currentTime >= c.time && currentTime <= c.time + duration;
        });
        
        if (currentCaption) {
          ctx.save();
          ctx.font = 'bold 36px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          const text = currentCaption.text.toUpperCase();
          const padding = 12;
          const textWidth = ctx.measureText(text).width;
          const yPos = (overlayOp && overlayOp.parameters.style === 'cinematic') ? canvas.height - (canvas.height * 0.12) - 20 : canvas.height - 40;
          
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect((canvas.width - textWidth) / 2 - padding, yPos - 50, textWidth + padding * 2, 55);
          
          ctx.fillStyle = '#fff';
          ctx.fillText(text, canvas.width / 2, yPos - 5);
          ctx.restore();
        }
      }

      // 6. Text Overlay Rendering (Intro Cards & Floating Words)
      const textOverlays = activeOps.filter(op => op.type === 'text_overlay');
      textOverlays.forEach(op => {
        const { text, style, rect, animation } = op.parameters;
        if (!text) return;

        ctx.save();
        const opStart = parseTime(op.start, duration);
        const opEnd = parseTime(op.end, duration);
        const elapsed = currentTime - opStart;
        
        if (style === 'title') {
          // Intro Card Styling
          const alphaNum = Math.min(1, elapsed / 0.8) * Math.min(1, (opEnd - currentTime) / 0.8);
          ctx.globalAlpha = Math.max(0, alphaNum);
          
          // Background Wash
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.font = 'bold 72px "Space Grotesk", sans-serif';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Subtle slide-up
          const yOffset = (1 - Math.max(0, alphaNum)) * 30;
          ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + yOffset);
          
          ctx.font = '24px "Space Grotesk", sans-serif';
          ctx.globalAlpha = Math.max(0, alphaNum) * 0.7;
          ctx.fillText("NOVA SYNTHESIS • PRESENTATION", canvas.width / 2, canvas.height / 2 + 80 + yOffset);
        } else if (style === 'floating') {
          // Floating Word Styling
          const r = rect || { x: 0.5, y: 0.5, w: 0.2, h: 0.1 };
          const coords = { x: r.x, y: r.y, w: r.w, h: r.h };
          
          // Coordinate normalization
          if (coords.x <= 1 && coords.w <= 1) {
            coords.x *= canvas.width;
            coords.y *= canvas.height;
            coords.w *= canvas.width;
            coords.h *= canvas.height;
          }

          const alphaNum = Math.min(1, elapsed / 0.5) * Math.min(1, (opEnd - currentTime) / 0.5);
          ctx.globalAlpha = Math.max(0, alphaNum);

          // Motion offset
          let mx = 0, my = 0;
          if (animation === 'float') {
            my = Math.sin(currentTime * 2) * 15;
            mx = Math.cos(currentTime * 1.5) * 10;
          }

          ctx.font = 'bold 42px "Space Grotesk", sans-serif';
          ctx.fillStyle = '#60a5fa'; // Blue-400
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.textAlign = 'center';
          
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 15;
          
          ctx.strokeText(text, coords.x + mx, coords.y + my);
          ctx.fillText(text, coords.x + mx, coords.y + my);
        }
        ctx.restore();
      });

      // Synthesis Debug Overlays Removed
      requestRef.current = requestAnimationFrame(renderFrame);
    };

    requestRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, renderStatus]); // Removed history from deps (using activeOpsRef)

  const startRecording = () => {
    const canvas = canvasRef.current;
    const videoElement = videoRef.current;
    if (!canvas || !videoElement) return;
    
    recordedChunks.current = [];
    const canvasStream = canvas.captureStream(30);
    
    // Attempt to capture audio from video element
    const audioStream = (videoElement as any).captureStream ? (videoElement as any).captureStream() : (videoElement as any).mozCaptureStream ? (videoElement as any).mozCaptureStream() : null;
    const musicStream = musicAudioRef.current && (musicAudioRef.current as any).captureStream ? (musicAudioRef.current as any).captureStream() : null;
    
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(audioStream ? audioStream.getAudioTracks() : []),
      ...(musicStream ? musicStream.getAudioTracks() : [])
    ]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? 'video/webm;codecs=vp9' 
      : MediaRecorder.isTypeSupported('video/webm') 
        ? 'video/webm' 
        : 'video/mp4';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };
    
    recorder.onstop = () => {
      setRenderStatus('complete');
    };
    
    recorderRef.current = recorder;
    recorder.start();
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (renderStatus === 'rendering') {
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
    }
  };

  const handleCancelRender = () => {
    stopRecording();
    setRenderStatus('idle');
    setRenderProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handleExport = async () => {
    if (!video || !videoRef.current) return;
    
    const v = videoRef.current;
    v.currentTime = 0;
    v.pause();
    setIsPlaying(false);
    
    setRenderStatus('rendering');
    setRenderLogs(["[*] Initializing NovaEngine Context...", "[*] Attaching Frame Listeners...", "[*] MediaRecorder: READY", "[!] Starting Synthesis Pass..."]);
    
    setTimeout(() => {
      v.play();
      setIsPlaying(true);
      startRecording();
    }, 1000);
  };

  const handleDownload = () => {
    if (recordedChunks.current.length === 0) return;
    
    const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova-cut-output-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startWatermarkSelection = () => {
    setIsSelectingWatermark(true);
    setWatermarkRect(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingWatermark || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
    
    setIsDragging(true);
    setDragStart({ x, y });
    setWatermarkRect({ x, y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingWatermark || !isDragging || !dragStart || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
    
    const newRect = {
      x: Math.min(x, dragStart.x),
      y: Math.min(y, dragStart.y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y)
    };
    
    setWatermarkRect(newRect);
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // If the box is too small, give it a default size around the click point
      if (watermarkRect && (watermarkRect.w < 10 || watermarkRect.h < 10)) {
        const w = 1280 * 0.15;
        const h = 720 * 0.1;
        setWatermarkRect({
          x: Math.max(0, watermarkRect.x - w/2),
          y: Math.max(0, watermarkRect.y - h/2),
          w,
          h
        });
      }
    }
  };

  const applyWatermarkFix = () => {
    if (!watermarkRect) return;
    
    // Choose type based on whether a logo is provided
    const opType = logoUrl ? 'branding' : 'watermark';
    
    const newPlan: EditPlan = {
      summary: logoUrl ? "Manual Logo Placement (Branding)" : "Manual AI Inpainting targeting selected region",
      operations: [{
        type: opType,
        target: logoUrl ? 'branding' : 'watermark',
        scope: 'global',
        start: 0,
        end: 'video_end',
        parameters: {
          rect: watermarkRect,
          reason: logoUrl ? "Branding replacement" : "Manual selection for inpainting",
          logo_url: logoUrl
        }
      }]
    };
    
    setHistory([...history, newPlan]);
    setIsSelectingWatermark(false);
    setWatermarkRect(null);
  };

  return (
    <div className="flex h-screen bg-white text-brand overflow-hidden font-sans">
      {/* Sidebar - Project History */}
      <aside className="w-64 border-r border-border bg-panel flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">NovaCut AI</h1>
          </div>
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Automation Engine v1.0</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Recent Projects</span>
            <div className="space-y-1">
              {['Project_v1'].map((item) => (
                <button key={item} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-200 transition-colors flex items-center justify-between group">
                  <span className="truncate">{item}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Source Assets</span>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-100 bg-gray-50/10 hover:bg-white hover:border-blue-200 transition-all text-gray-600 relative overflow-hidden group">
                <Upload className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                <div className="text-left">
                  <p className="text-xs font-bold">{logoUrl ? 'Logo Uploaded' : 'Upload Logo'}</p>
                  <p className="text-[10px] opacity-70 italic font-mono">Reference Asset</p>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleLogoUpload}
                />
                {logoUrl && <div className="absolute right-3 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
              </button>

              <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-100 bg-gray-50/10 hover:bg-white hover:border-pink-200 transition-all text-gray-600 relative overflow-hidden group">
                <Volume2 className="w-4 h-4 text-gray-400 group-hover:text-pink-600 transition-colors" />
                <div className="text-left">
                  <p className="text-xs font-bold">{musicUrl ? 'Track Uploaded' : 'Background Audio'}</p>
                  <p className="text-[10px] opacity-70 italic font-mono">Reference Asset</p>
                </div>
                <input 
                  type="file" 
                  accept="audio/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleMusicUpload}
                />
                {musicUrl && <div className="absolute right-3 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
              </button>

              <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-100 bg-gray-50/10 hover:bg-white hover:border-purple-200 transition-all text-gray-600 relative overflow-hidden group">
                <Scissors className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                <div className="text-left">
                  <p className="text-xs font-bold">{bRollUrl ? 'B-Roll Uploaded' : 'Reference Video'}</p>
                  <p className="text-[10px] opacity-70 italic font-mono">Reference Asset</p>
                </div>
                <input 
                  type="file" 
                  accept="video/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleBRollUpload}
                />
                {bRollUrl && <div className="absolute right-3 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-500 leading-relaxed font-mono italic">
                <span className="text-black font-bold">Nova_Operational_Directive:</span> Instructions are now processed exclusively via the AI Chat Interface. Manual toolsets have been decommissioned for the AI-First workflow.
              </p>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="bg-white border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">GPU Priority</span>
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase font-bold">Standard</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-black w-1/3" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header / Toolbar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-white z-10">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded text-sm font-medium hover:bg-gray-800 transition-all">
              <Upload className="w-4 h-4" />
              <label htmlFor="video-upload" className="cursor-pointer">Import Media</label>
              <input 
                id="video-upload" 
                type="file" 
                accept="video/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span className="font-mono">
                {formatTime(virtualCurrentTime)} / {formatTime(virtualDuration)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="px-4 py-1.5 border border-border rounded text-sm font-medium hover:bg-gray-50">Preview</button>
            <button 
              onClick={handleExport}
              disabled={!video || renderStatus === 'rendering'}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {renderStatus === 'rendering' ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Rendering...
                </>
              ) : renderStatus === 'complete' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Ready
                </>
              ) : 'Export'}
            </button>
            
            {renderStatus === 'complete' && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 shadow-sm flex items-center gap-2"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                Download Rendered Asset
              </motion.button>
            )}
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex flex-col p-6 gap-6 bg-[#fcfcfc] overflow-y-auto">
          {/* Top Section: Video Preview */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative group">
                {video ? (
                  <>
                    <video 
                      ref={videoRef}
                      src={video.url} 
                      className="hidden"
                      playsInline
                      muted={renderStatus === 'rendering'}
                      crossOrigin="anonymous"
                    />
                    <video 
                      ref={bRollVideoRef}
                      src={bRollUrl || undefined} 
                      className="hidden"
                      playsInline
                      muted={renderStatus === 'rendering'}
                      crossOrigin="anonymous"
                    />
                    <audio 
                      ref={musicAudioRef}
                      src={musicUrl || undefined}
                      className="hidden"
                      crossOrigin="anonymous"
                    />
                    <canvas 
                      ref={canvasRef}
                      className={`w-full h-full object-contain ${isSelectingWatermark ? 'cursor-crosshair' : ''}`}
                      width={1280}
                      height={720}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                    />
                    
                    {/* Selection Overlay */}
                    {isSelectingWatermark && (
                      <div className="absolute inset-0 pointer-events-none border-2 border-blue-500/50 bg-blue-500/5 flex flex-col items-center justify-center">
                         {!watermarkRect && (
                           <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-lg">
                             DRAG TO POSITION {logoUrl ? 'LOGO' : 'INPAINT'}
                           </div>
                         )}
                         {watermarkRect && (
                           <div 
                             className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden"
                             style={{
                               left: `${(watermarkRect.x / 1280) * 100}%`,
                               top: `${(watermarkRect.y / 720) * 100}%`,
                               width: `${(watermarkRect.w / 1280) * 100}%`,
                               height: `${(watermarkRect.h / 720) * 100}%`
                             }}
                           >
                              {/* Corner Crosshairs */}
                              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />

                             {logoUrl ? (
                               <img 
                                 src={logoUrl} 
                                 className="w-full h-full object-contain opacity-70" 
                                 referrerPolicy="no-referrer"
                               />
                             ) : (
                               <div className="flex flex-col items-center gap-1 opacity-60">
                                 <Sparkles className="w-8 h-8 text-white" />
                                 <span className="text-[10px] font-mono text-white font-bold tracking-widest">INPAINT_ZONE</span>
                               </div>
                             )}
                           </div>
                         )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium">No video uploaded</p>
                  </div>
                )}
                
                {renderStatus === 'rendering' && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-white">
                    <div className="w-full max-w-md space-y-6">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
                        <div>
                          <h3 className="text-xl font-bold font-mono tracking-widest uppercase">Synthesizing_Media</h3>
                          <p className="text-sm text-gray-400 mt-1 font-sans">NovaEngine is processing frame transforms & audio vectors...</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                          <span>Process Progress</span>
                          <span>{Math.round(renderProgress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-500" 
                            initial={{ width: 0 }}
                            animate={{ width: `${renderProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-gray-900/50 rounded-lg p-4 font-mono text-[10px] border border-gray-800 h-32 overflow-y-auto">
                        {renderLogs.map((log, i) => (
                          <div key={i} className="flex gap-2 mb-1">
                            <span className="text-gray-600">[{i}]</span>
                            <span className={log?.startsWith?.('[!') ? 'text-amber-400' : 'text-blue-400'}>{log}</span>
                          </div>
                        ))}
                        <div className="animate-pulse text-gray-500 mt-2">_waiting_for_synthesis_callback...</div>
                      </div>

                      <button 
                        onClick={handleCancelRender}
                        className="w-full py-3 rounded-xl border border-red-500/50 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 transition-all font-mono"
                      >
                        Abort Synthesis
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Overlays Removed as per user request */}
              </div>

              {/* Player Controls */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><SkipBack className="w-5 h-5" /></button>
                  <button 
                    onClick={togglePlay}
                    className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-full hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><SkipForward className="w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 mx-8 h-12 bg-gray-50 rounded-lg relative flex items-center px-2">
                   {/* Timeline Thumbnails Simulation */}
                   <div className="absolute inset-0 flex opacity-10 grayscale">
                    {Array.from({length: 12}).map((_, i) => (
                      <div key={i} className="flex-1 border-r border-white bg-gray-400" />
                    ))}
                   </div>
                   
                   {/* AI Edit Integration Map */}
                   <div className="absolute inset-x-0 bottom-0 h-1.5 flex pointer-events-none">
                      {history?.flatMap(plan => plan?.operations || []).map((op, i) => {
                         const start = parseTime(op.start, video?.duration || 0);
                         const end = parseTime(op.end, video?.duration || 0);
                         const total = video?.duration || 1;
                         const left = (start / total) * 100;
                         const width = ((end - start) / total) * 100;
                         
                         const colors: Record<string, string> = {
                           remove: 'bg-red-500',
                           speed: 'bg-purple-500',
                           crop: 'bg-orange-500',
                           blur: 'bg-blue-500',
                           watermark: 'bg-blue-500'
                         };

                         return (
                           <div 
                             key={i} 
                             className={`absolute h-full ${colors[op.type] || 'bg-gray-400'} opacity-60 rounded-full`}
                             style={{ left: `${left}%`, width: `${width}%` }}
                           />
                         );
                      })}
                   </div>

                   {/* Progress */}
                   <div 
                    className="absolute h-full bg-blue-500/10 border-l-2 border-blue-500 z-10 pointer-events-none" 
                    style={{ left: `${(currentTime / (video?.duration || 1)) * 100}%` }}
                   />
                </div>

                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-gray-500" />
                  <Maximize className="w-5 h-5 text-gray-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-4 px-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tight">Timeline Legend:</span>
                <div className="flex items-center gap-3">
                  {[
                    { color: 'bg-red-500', label: 'Cuts' },
                    { color: 'bg-purple-500', label: 'Speed' },
                    { color: 'bg-orange-500', label: 'Crop' },
                    { color: 'bg-blue-500', label: 'Fixes' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                      <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Assistant Panel */}
            <div className="flex flex-col gap-4">
              <div className="flex-1 bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <MessageSquare className="text-white w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">AI Copilot</span>
                  </div>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans leading-relaxed">
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 border border-gray-100 italic">
                    I'm ready to help. Try: "Crop to focus on the person" or "Summarize the key highlights".
                  </div>
                  
                  {history.map((plan, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 items-start"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-sm w-full">
                        <p className="font-medium text-blue-800 mb-1">{plan.summary}</p>
                        <ul className="space-y-1 text-blue-900/60 text-[11px]">
                          {plan.operations.map((op, opIdx) => (
                            <li key={opIdx} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-blue-300 rounded-full" />
                              <span className="uppercase font-bold">{op.type}</span> 
                              <span>({op.start} - {op.end})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ))}

                  {pendingPlan && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden shadow-sm"
                    >
                      <div className="p-3 border-b border-amber-200 bg-amber-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                          <Search className="w-3.5 h-3.5" />
                          PLAN PREVIEW
                        </div>
                        <span className="text-[10px] text-amber-600 font-mono uppercase">NovaCut Engine</span>
                      </div>
                      <div className="p-3 space-y-3">
                        <p className="text-xs font-semibold text-amber-900 leading-tight">
                          {pendingPlan.summary}
                        </p>
                        <ul className="space-y-1.5">
                          {pendingPlan.operations.map((op, i) => (
                            <li key={i} className="text-[11px] text-amber-900/80 flex items-start gap-2">
                              <span className="mt-1 w-1 h-1 bg-amber-400 rounded-full shrink-0" />
                              <span>
                                <strong className="font-bold uppercase text-amber-800">{op.type}</strong>: {op.parameters.reason}
                                <div className="text-[10px] text-amber-600 opacity-75">
                                  Scope: {op.scope} | {op.start} → {op.end}
                                </div>
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={handleConfirmPlan}
                            className="flex-1 bg-amber-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-amber-700 transition-colors uppercase tracking-wider"
                          >
                            Execute Plan
                          </button>
                          <button 
                            onClick={handleDiscardPlan}
                            className="px-3 py-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-200/50 rounded transition-colors uppercase tracking-wider"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isProcessing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              className="w-8 h-8 rounded-full border-2 border-blue-500/10 border-t-blue-500"
                            />
                            <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-blue-900 uppercase tracking-tighter">Deep Synthesis Analysis</p>
                            <p className="text-[9px] text-blue-600 font-mono">Status: Processing Audio & Video Vectors...</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-blue-500 animate-pulse">LIVE_CORE_V4</span>
                      </div>

                      <div className="space-y-1.5 px-1">
                        <div className="flex justify-between text-[8px] font-mono text-blue-400 uppercase">
                          <span>Spectrogram Scan</span>
                          <span>Active</span>
                        </div>
                        <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="w-1/3 h-full bg-blue-500"
                          />
                        </div>
                        <p className="text-[8px] font-mono text-blue-400 opacity-60">IDENTIFYING: SPEECH_RECOGNITION | SCENE_BOUNDARIES | MOOD_TRANSITIONS</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <form onSubmit={handleAIMessage} className="p-4 bg-gray-50 border-t border-border focus-within:bg-white transition-colors">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ask AI to edit..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm pr-10"
                    />
                    <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 bg-black text-white rounded-md hover:scale-105 transition-transform">
                      <Zap className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          {/* Bottom Section: Automation Tools */}
          <section className="bg-white p-8 rounded-3xl border border-border shadow-sm flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center animate-pulse shadow-inner border border-blue-100">
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
            
            <div className="max-w-xl">
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight uppercase italic">Nova_System_v4 Synthesis Mode</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-sans font-medium">
                I have removed the complex manual editing suite to streamline your workflow. 
                Simply describe your cinematic vision — from technical analysis to emotional score synthesis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
              <AutomationPreset 
                icon={<Activity className="w-5 h-5 text-indigo-600" />}
                title="Cinematic Score"
                desc="Map segments to BL-01 through BL-06 with adaptive ducking."
                onClick={() => setChatInput("Analyze scene intensity and apply a cinematic score using the BL/ET/EO library. Ensure a spike and drop curve.")}
              />
              <AutomationPreset 
                icon={<Sparkles className="w-5 h-5 text-blue-600" />}
                title="Smart Master"
                desc="Remove watermarks, add branding, and apply technical speed ramping."
                onClick={() => setChatInput("Perform a Smart Master: clean watermarks, add my logo to the top-right with a pulse animation, and ramp speed for slow segments.")}
              />
              <AutomationPreset 
                icon={<Terminal className="w-5 h-5 text-gray-700" />}
                title="Scene Analysis"
                desc="Deep visual & audio signal processing for narrative pacing."
                onClick={() => setChatInput("Can you perform a full scene analysis? Detect emotional shifts and recommend specific timestamps for inserts.")}
              />
              <AutomationPreset 
                icon={<MessageSquare className="w-5 h-5 text-green-600" />}
                title="Auto Captions"
                desc="Generate dynamic on-screen text and key summaries."
                onClick={() => setChatInput("Analyze this video and add automatic on-screen captions or titles to highlight the key moments and speech.")}
              />
              <AutomationPreset 
                icon={<Type className="w-5 h-5 text-purple-600" />}
                title="Smart Titles"
                desc="Create an intro title card and floating keywords for key incidents."
                onClick={() => setChatInput("Create a professional intro title card and add floating keywords whenever company names or key incidents are mentioned in the video.")}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function AutomationPreset({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center text-center p-6 bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 transition-all rounded-2xl group"
    >
      <div className="mb-4 p-3 bg-white rounded-xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">{title}</h4>
      <p className="text-[10px] text-gray-500 leading-tight font-mono">{desc}</p>
    </button>
  );
}

function AutomationCard({ icon, title, description, badge, onClick }: { icon: React.ReactNode, title: string, description: string, badge: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-blue-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-gray-100 px-2 py-0.5 rounded-full group-hover:text-blue-500 group-hover:border-blue-100">{badge}</span>
      </div>
      <h3 className="font-semibold text-base mb-1 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed font-sans">{description}</p>
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

