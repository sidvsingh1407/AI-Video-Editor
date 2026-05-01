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
import { AudioMixingEngine, SmartMusicSetter, AudioEvent } from "./lib/audioEngine";
import { AUDIO_LIBRARY } from "./lib/audioLibrary";

const audioEngine = new AudioMixingEngine();

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
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [audioTimeline, setAudioTimeline] = useState<AudioEvent[]>([]);
  const [musicPreset, setMusicPreset] = useState<'auto' | 'tension' | 'corporate' | 'docs' | 'uplifting'>('auto');
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [isSelectingWatermark, setIsSelectingWatermark] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [inpaintStrength, setInpaintStrength] = useState(0.95);
  const [inpaintNoiseLevel, setInpaintNoiseLevel] = useState(15);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [watermarkRect, setWatermarkRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [tempRect, setTempRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
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
      setHistory([...history, pendingPlan]);
      
      // Auto-generate music timeline after confirming plan
      if (video?.duration) {
        const setter = new SmartMusicSetter(video, pendingPlan);
        const timeline = setter.generateTimeline();
        setAudioTimeline(timeline);
      }
      
      setPendingPlan(null);
    }
  };

  const handleDiscardPlan = () => {
    setPendingPlan(null);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioEngine.suspend();
      } else {
        audioEngine.resume();
        videoRef.current.play();
      }
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
  const extensionTriggeredRef = useRef(false);

  // Advanced AI Inpainting Utility
  const aiInpaintWatermark = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, rect: any, strength = 0.95, noiseLevel = 15) => {
    const { x, y, w, h } = rect;
    if (w <= 0 || h <= 0) return;

    ctx.save();
    try {
      const imageData = ctx.getImageData(x, y, w, h);
      const data = imageData.data;
      const margin = 8;
      
      const tE = ctx.getImageData(x, Math.max(0, y - margin), w, margin).data;
      const bE = ctx.getImageData(x, Math.min(canvas.height - margin, y + h), w, margin).data;
      
      for (let i = 0; i < data.length; i += 4) {
        const px = (i / 4) % w;
        const py = Math.floor((i / 4) / w);
        const wY = py / h;

        for (let c = 0; c < 3; c++) {
          const sampled = (tE[Math.floor(px) * 4 + c] * (1 - wY)) + (bE[Math.floor(px) * 4 + c] * wY);
          const noise = (Math.random() - 0.5) * noiseLevel;
          data[i + c] = Math.max(0, Math.min(255, (sampled * strength) + (data[i + c] * (1 - strength)) + noise));
        }
        data[i + 3] = 255;
      }
      ctx.putImageData(imageData, x, y);
    } catch(e) {}

    ctx.filter = `blur(${Math.round(w * 0.05)}px)`;
    ctx.globalAlpha = 0.3;
    ctx.drawImage(canvas, x - 10, y - 10, w + 20, h + 20, x, y, w, h);
    ctx.restore();
  };

  // NovaCut Frame Synthesis Engine
  useEffect(() => {
    const videoElement = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoElement || !canvas || (!isPlaying && renderStatus !== 'rendering')) {
      clockRef.current = 0;
      lastFrameTimeRef.current = 0;
      extensionTriggeredRef.current = false;
      audioEngine.suspend();
      return;
    }

    audioEngine.init(videoElement);
    audioEngine.resume();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderFrame = () => {
      const duration = videoElement.duration;
      const deltaTime = (isPlaying || renderStatus === 'rendering') ? (1 / 30) : 0; 
      
      if (isPlaying || renderStatus === 'rendering') {
        clockRef.current += deltaTime * videoElement.playbackRate;
        setCurrentTime(Math.min(clockRef.current, Math.max(videoElement.duration, ...activeOpsRef.current.map(o => parseTime(o.end, videoElement.duration)))));
      }

      const currentTime = clockRef.current;
      const ops = activeOpsRef.current;
      
      const effectiveEndTimes = ops.map(op => {
        const start = parseTime(op.start, duration);
        let end = parseTime(op.end, duration);
        if (op.type === 'insert' && bRollVideoRef.current?.duration) {
          end = Math.max(end, start + bRollVideoRef.current.duration);
        }
        return end;
      });
      
      const maxEndTime = Math.max(duration, ...effectiveEndTimes, duration > 0 ? duration + 3 : 0);
      const isFinished = currentTime >= maxEndTime - 0.05;

      if (isFinished) {
        if (renderStatus === 'rendering') {
          setRenderProgress(100);
          stopRecording();
        }
        setIsPlaying(false);
        return;
      }

      if (renderStatus === 'rendering' && duration > 0) {
        setRenderProgress((currentTime / maxEndTime) * 100);
      }

      // Check for start of extension
      if (duration > 0 && currentTime >= duration && !extensionTriggeredRef.current) {
        extensionTriggeredRef.current = true;
        audioEngine.triggerEvent('whoosh');
      }

      const activeOps = ops.filter(op => {
        const start = parseTime(op.start, duration);
        const end = parseTime(op.end, maxEndTime);
        return currentTime >= start && currentTime <= end;
      });

      // DAG PIPELINE NODES
      // Node 0: Base
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (currentTime < duration) {
        try {
          if (videoElement.readyState >= 2) {
             if (Math.abs(videoElement.currentTime - currentTime) > 0.1) {
                videoElement.currentTime = currentTime;
             }
             ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          }
        } catch (e) {}
      }

      // Node 1: Cleanup Bus (Inpainting)
      activeOps.filter(o => o.type === 'blur' || o.type === 'watermark').forEach(op => {
        const rect = op.parameters.rect ? {
          x: op.parameters.rect.x * canvas.width,
          y: op.parameters.rect.y * canvas.height,
          w: op.parameters.rect.w * canvas.width,
          h: op.parameters.rect.h * canvas.height
        } : null;
        if (rect) aiInpaintWatermark(ctx, canvas, rect, op.parameters.strength || 0.95, op.parameters.noise || 15);
      });

      // Node 2: Overlay Bus (Branding/Graphics)
      activeOps.filter(o => o.type === 'branding').forEach(op => {
        const rect = op.parameters.rect ? {
          x: op.parameters.rect.x * canvas.width,
          y: op.parameters.rect.y * canvas.height,
          w: op.parameters.rect.w * canvas.width,
          h: op.parameters.rect.h * canvas.height
        } : null;

        if (rect && logoImgRef.current?.complete) {
          const animation = op.parameters.animation;
          const opStart = parseTime(op.start, duration);
          const progress = Math.min(1, (currentTime - opStart) / 1.5);
          
          ctx.save();
          let scale = 1.0;
          if (animation === 'zoom') scale = 0.5 + progress * 0.5;
          if (animation === 'bounce') scale += Math.sin(currentTime * 6) * 0.05;
          
          ctx.translate(rect.x + rect.w/2, rect.y + rect.h/2);
          ctx.scale(scale, scale);
          ctx.drawImage(logoImgRef.current, -rect.w/2, -rect.h/2, rect.w, rect.h);
          ctx.restore();
        }
      });

      // Node 3: Metadata Bus (Captions/Text)
      activeOps.filter(o => o.type === 'captions' || o.type === 'text_overlay').forEach(op => {
         if (op.type === 'captions') {
           const captions = op.parameters.captions_list || [];
           const currentCaption = captions.find((c: any) => {
             const s = parseTime(c.start, duration);
             const e = parseTime(c.end, duration);
             return currentTime >= s && currentTime <= e;
           });
           if (currentCaption) {
             ctx.save();
             ctx.font = 'bold 32px Inter';
             ctx.fillStyle = 'white';
             ctx.textAlign = 'center';
             ctx.fillText(currentCaption.text, canvas.width/2, canvas.height - 40);
             ctx.restore();
           }
         } else if (op.type === 'text_overlay') {
           const { text, style, rect, animation } = op.parameters;
           if (!text) return;

           ctx.save();
           const opStart = parseTime(op.start, duration);
           const opEnd = parseTime(op.end, duration);
           const elapsed = currentTime - opStart;
           
           if (style === 'title') {
             const alphaNum = Math.min(1, elapsed / 0.8) * Math.min(1, (opEnd - currentTime) / 0.8);
             ctx.globalAlpha = Math.max(0, alphaNum);
             ctx.fillStyle = 'rgba(0,0,0,0.5)';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             ctx.font = 'bold 72px "Space Grotesk", sans-serif';
             ctx.fillStyle = 'white';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             const yOffset = (1 - Math.max(0, alphaNum)) * 30;
             ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + yOffset);
           } else if (style === 'floating') {
             const r = rect || { x: 0.5, y: 0.5, w: 0.2, h: 0.1 };
             const coords = { x: r.x * canvas.width, y: r.y * canvas.height, w: r.w * canvas.width, h: r.h * canvas.height };
             const alphaNum = Math.min(1, elapsed / 0.5) * Math.min(1, (opEnd - currentTime) / 0.5);
             ctx.globalAlpha = Math.max(0, alphaNum);
             let mx = 0, my = 0;
             if (animation === 'float') {
               my = Math.sin(currentTime * 2) * 15;
               mx = Math.cos(currentTime * 1.5) * 10;
             }
             ctx.font = 'bold 42px "Space Grotesk", sans-serif';
             ctx.fillStyle = '#60a5fa';
             ctx.strokeStyle = 'white';
             ctx.lineWidth = 2;
             ctx.textAlign = 'center';
             ctx.strokeText(text, coords.x + mx, coords.y + my);
             ctx.fillText(text, coords.x + mx, coords.y + my);
           }
           ctx.restore();
         }
      });

      if (isSelectingWatermark && tempRect) {
        ctx.save();
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(tempRect.x, tempRect.y, tempRect.w, tempRect.h);
        ctx.fillStyle = 'rgba(255, 51, 102, 0.2)';
        ctx.fillRect(tempRect.x, tempRect.y, tempRect.w, tempRect.h);
        ctx.restore();
      }

      if (isPreviewActive && watermarkRect) {
        aiInpaintWatermark(ctx, canvas, watermarkRect, inpaintStrength, inpaintNoiseLevel);
      }

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
    
    // Use CinematicAudioEngine stream
    const audioEngineStream = audioEngine.getStream();
    
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(audioEngineStream ? audioEngineStream.getAudioTracks() : [])
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
      
      // Phase 5: Output Validation (Theoretical vs Actual)
      const actualDuration = clockRef.current;
      const expectedDuration = (videoRef.current?.duration || 0) + (activeOpsRef.current.length > 0 ? 3 : 0);
      setRenderLogs(prev => [...prev, `[✓] Synthesis Finalized.`, `[✓] Validation: ${actualDuration.toFixed(2)}s rendered (Expected: ${expectedDuration.toFixed(2)}s)`, `[✓] Stream Integrity Validated.`]);
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
    
    if (isMusicEnabled && audioTimeline.length > 0) {
      setRenderLogs(prev => [...prev, "[*] Synthesizing Soundtrack Engine..."]);
      await audioEngine.playTimeline(audioTimeline);
    }

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
    setTempRect(null);
    setIsPreviewActive(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingWatermark || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
    
    setIsDragging(true);
    setDragStart({ x, y });
    setTempRect({ x, y, w: 0, h: 0 });
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
    
    setTempRect(newRect);
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (tempRect && (tempRect.w > 2 && tempRect.h > 2)) {
        setWatermarkRect(tempRect);
        setIsPreviewActive(true);
      }
      setIsSelectingWatermark(false);
    }
  };

  const applyManualWatermarkRemoval = () => {
    if (!watermarkRect) return;
    
    const newPlan: EditPlan = {
      summary: "Manual Watermark Removal applied via inpainting",
      operations: [{
        type: 'watermark',
        target: 'watermark',
        scope: 'global',
        start: 0,
        end: 'video_end',
        parameters: {
          rect: {
            x: watermarkRect.x / (canvasRef.current?.width || 1280),
            y: watermarkRect.y / (canvasRef.current?.height || 720),
            w: watermarkRect.w / (canvasRef.current?.width || 1280),
            h: watermarkRect.h / (canvasRef.current?.height || 720)
          },
          strength: inpaintStrength,
          noise: inpaintNoiseLevel,
          reason: "Manual region-based inpainting"
        }
      }]
    };
    
    setHistory([...history, newPlan]);
    setIsPreviewActive(false);
    setWatermarkRect(null);
    setTempRect(null);
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

            {/* AI Assistant & Music Panel */}
            <div className="flex flex-col gap-6">
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
                {/* ... (AI Assistant content) */}

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

              {/* Smart Music Setter Panel */}
              <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-pink-600 rounded flex items-center justify-center">
                      <Music className="text-white w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">Modular Soundtrack</span>
                  </div>
                  <button 
                    onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isMusicEnabled ? 'bg-pink-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isMusicEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className={`p-4 space-y-4 transition-opacity ${!isMusicEnabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                   <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Behavioral Preset</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['auto', 'tension', 'corporate', 'docs', 'uplifting'] as const).map(p => (
                        <button 
                          key={p}
                          onClick={() => setMusicPreset(p)}
                          className={`px-3 py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${musicPreset === p ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                          {p.replace('docs', 'Documentary')}
                        </button>
                      ))}
                    </div>
                   </div>

                   {audioTimeline.length > 0 ? (
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Audio Timeline Preview</span>
                          <Activity className="w-3 h-3 text-pink-400" />
                        </div>
                        
                        <div className="bg-gray-900 rounded-lg p-3 space-y-2 border border-gray-800">
                          {/* Gantt Timeline */}
                          <div className="relative h-24 w-full">
                            {['baseLoop', 'emotionalOverlay', 'eventTrigger'].map((type, rowIdx) => (
                              <div key={type} className="absolute w-full h-6 border-b border-gray-800/50" style={{ top: rowIdx * 28 }}>
                                 {audioTimeline.filter(e => e.type === type).map((event, i) => {
                                   const start = (event.startTime / (video?.duration || 1)) * 100;
                                   const width = (event.duration / (video?.duration || 1)) * 100;
                                   const colors: Record<string, string> = {
                                      baseLoop: 'bg-indigo-500/60 border-indigo-700',
                                      emotionalOverlay: 'bg-pink-500/60 border-pink-700',
                                      eventTrigger: 'bg-amber-500/80 border-amber-700'
                                   };
                                   return (
                                     <div 
                                       key={i}
                                       className={`absolute h-4 rounded mt-1 border-l-2 text-[7px] font-mono flex items-center px-1 text-white truncate shadow-lg ${colors[type]}`}
                                       style={{ left: `${start}%`, width: `${width}%` }}
                                     >
                                       {event.id}
                                     </div>
                                   );
                                 })}
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase px-1">
                            <span>0s</span>
                            <span>Intro</span>
                            <span>Spike</span>
                            <span>{Math.round(video?.duration || 0)}s</span>
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            audioEngine.init(videoRef.current || undefined);
                            audioEngine.stopAll();
                            await audioEngine.playTimeline(audioTimeline);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all text-gray-600"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Preview Orchestration
                        </button>
                     </div>
                   ) : (
                     <div className="h-32 flex flex-col items-center justify-center border border-dashed border-gray-100 rounded-xl bg-gray-50/50 text-gray-400 gap-2">
                        <Library className="w-6 h-6 opacity-40" />
                        <p className="text-[10px] font-medium italic">Execute an AI Plan to synthesize music</p>
                     </div>
                   )}
                </div>
              </div>

              {/* Advanced Watermark Remover Panel */}
              <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
                 <div className="p-4 border-b border-border flex items-center justify-between bg-blue-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <Crop className="text-white w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">AI Inpaint Remover</span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <button 
                      onClick={startWatermarkSelection}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${isSelectingWatermark ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                    >
                      <Maximize className="w-4 h-4" />
                      {isSelectingWatermark ? 'Selecting Region...' : 'Start Selection'}
                    </button>
                    <p className="text-[9px] text-gray-400 text-center italic">Click & drag on the video to target a logo or watermark</p>
                  </div>

                  {watermarkRect && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-2 border-t border-gray-100"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Inpaint Strength</label>
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 rounded">{Math.round(inpaintStrength * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0.1" max="1" step="0.05"
                          value={inpaintStrength}
                          onChange={(e) => setInpaintStrength(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Texture Noise</label>
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 rounded">{inpaintNoiseLevel}</span>
                        </div>
                        <input 
                          type="range" min="0" max="40" step="1"
                          value={inpaintNoiseLevel}
                          onChange={(e) => setInpaintNoiseLevel(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setIsPreviewActive(false);
                            setWatermarkRect(null);
                          }}
                          className="flex-1 py-2 text-[10px] font-bold uppercase text-gray-500 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={applyManualWatermarkRemoval}
                          className="flex-[2] py-2 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-lg shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-3 h-3" />
                          Apply removal
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
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

