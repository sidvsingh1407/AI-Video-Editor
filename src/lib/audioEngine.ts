/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditPlan, VideoMetadata } from "../types";
import { AUDIO_LIBRARY } from "./audioLibrary";

export interface AudioEvent {
  type: 'baseLoop' | 'emotionalOverlay' | 'eventTrigger';
  id: string;
  startTime: number;
  duration: number;
  volume: number;
  buffer?: AudioBuffer;
}

export class SmartMusicSetter {
  private videoMetadata: VideoMetadata;
  private editPlan: EditPlan;

  constructor(videoMetadata: VideoMetadata, editPlan: EditPlan) {
    this.videoMetadata = videoMetadata;
    this.editPlan = editPlan;
  }

  generateTimeline(): AudioEvent[] {
    const duration = this.videoMetadata.duration;
    if (duration <= 0) return [];

    const phaseLength = duration / 6;
    const arc = {
      hook: { start: 0, end: phaseLength },
      build: { start: phaseLength, end: phaseLength * 2.5 },
      spike: { start: phaseLength * 2.5, end: phaseLength * 3.5 },
      drop: { start: phaseLength * 3.5, end: phaseLength * 4.5 },
      reflect: { start: phaseLength * 4.5, end: phaseLength * 5.5 },
      neutral: { start: phaseLength * 5.5, end: duration }
    };

    const timeline: AudioEvent[] = [];

    // Map phases to categories
    const mapping = {
      hook: { base: 'BL-01', overlay: null, triggers: [] as string[] },
      build: { base: 'BL-04', overlay: 'EO-03', triggers: ['ET-05'] },
      spike: { base: 'BL-05', overlay: null, triggers: ['ET-01'] },
      drop: { base: 'BL-06', overlay: 'EO-02', triggers: [] as string[] },
      reflect: { base: 'BL-03', overlay: 'EO-04', triggers: [] as string[] },
      neutral: { base: 'BL-03', overlay: 'EO-06', triggers: [] as string[] }
    };

    Object.entries(arc).forEach(([phase, range]) => {
      const config = mapping[phase as keyof typeof mapping];
      const pStart = range.start;
      const pEnd = range.end;
      const pDur = pEnd - pStart;

      if (config.base) {
        timeline.push({
          type: 'baseLoop',
          id: config.base,
          startTime: pStart,
          duration: pDur,
          volume: 0.15
        });
      }

      if (config.overlay) {
        timeline.push({
          type: 'emotionalOverlay',
          id: config.overlay,
          startTime: pStart,
          duration: pDur,
          volume: 0.12
        });
      }

      config.triggers.forEach((tid, i) => {
        timeline.push({
          type: 'eventTrigger',
          id: tid,
          startTime: pStart + (i * 0.5),
          duration: 2,
          volume: 0.3
        });
      });
    });

    return timeline.sort((a, b) => a.startTime - b.startTime);
  }
}

export class AudioMixingEngine {
  private audioContext: AudioContext | null = null;
  private master: GainNode | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private isInitialized = false;
  private activeSources: { source: AudioBufferSourceNode, gain: GainNode }[] = [];

  constructor() {}

  init(mediaElement?: HTMLMediaElement) {
    if (this.isInitialized) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.dest = this.audioContext.createMediaStreamDestination();
    this.master = this.audioContext.createGain();
    this.master.connect(this.audioContext.destination);
    this.master.connect(this.dest);
    this.master.gain.setValueAtTime(0.8, this.audioContext.currentTime);

    if (mediaElement) {
      const source = this.audioContext.createMediaElementSource(mediaElement);
      source.connect(this.audioContext.destination);
      source.connect(this.dest);
    }
    this.isInitialized = true;
  }

  async loadTrack(url: string, id: string): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(id)) return this.bufferCache.get(id)!;
    if (!this.audioContext) throw new Error("AudioContext not initialized");

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.bufferCache.set(id, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to track: ${url}`, error);
      return null;
    }
  }

  async playTimeline(timeline: AudioEvent[]) {
    if (!this.audioContext || !this.master) return;

    // Load all missing buffers first
    await Promise.all(timeline.map(async (event) => {
      let url = "";
      if (event.type === 'baseLoop') url = (AUDIO_LIBRARY.baseLoops as any)[event.id].audioUrl;
      if (event.type === 'emotionalOverlay') url = (AUDIO_LIBRARY.emotionalOverlays as any)[event.id].audioUrl;
      if (event.type === 'eventTrigger') url = (AUDIO_LIBRARY.eventTriggers as any)[event.id].audioUrl;
      
      const buffer = await this.loadTrack(url, event.id);
      if (buffer) event.buffer = buffer;
    }));

    const now = this.audioContext.currentTime;

    timeline.forEach(event => {
      if (!event.buffer || !this.audioContext || !this.master) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = event.buffer;
      source.loop = event.type !== 'eventTrigger';

      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(event.volume, now + event.startTime);
      
      // Simple fade out at the end of the event
      gainNode.gain.setTargetAtTime(0, now + event.startTime + event.duration - 0.2, 0.1);

      source.connect(gainNode);
      gainNode.connect(this.master);
      
      source.start(now + event.startTime);
      source.stop(now + event.startTime + event.duration);

      this.activeSources.push({ source, gain: gainNode });
    });
  }

  stopAll() {
    this.activeSources.forEach(({ source }) => {
      try { source.stop(); } catch(e) {}
    });
    this.activeSources = [];
  }

  getStream() {
    return this.dest?.stream || null;
  }

  applySmartDucking(isSpeechDetected: boolean) {
    if (!this.audioContext || !this.master) return;
    const now = this.audioContext.currentTime;
    const targetGain = isSpeechDetected ? 0.3 : 0.8;
    this.master.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  triggerEvent(type: 'whoosh' | 'chime') {
    // Legacy support for synth triggers
    if (!this.audioContext || !this.master) return;
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const g = this.audioContext.createGain();
    
    if (type === 'whoosh') {
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.5);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    }
    
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  resume() {
    this.audioContext?.resume();
  }

  suspend() {
    this.audioContext?.suspend();
  }
}
