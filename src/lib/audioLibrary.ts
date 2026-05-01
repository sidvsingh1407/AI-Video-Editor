/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AudioTrack {
  id: string;
  name: string;
  duration: number;
  mood: string;
  energy: number;
  description: string;
  useCase: string;
  audioUrl: string;
}

export const AUDIO_LIBRARY = {
  baseLoops: {
    'BL-01': {
      id: 'BL-01',
      name: 'Low Signal Drift',
      duration: 30,
      mood: 'Uneasy, anticipatory',
      energy: 2,
      description: 'Sub-bass drone + slow pulse + noise floor',
      useCase: 'Opening hook, "something is wrong"',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    'BL-02': {
      id: 'BL-02',
      name: 'Cold System Idle',
      duration: 25,
      mood: 'Clinical, machine-like',
      energy: 3,
      description: 'Clean synth pad + ticking digital artifacts',
      useCase: 'AI explanation, system visuals',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
    },
    'BL-03': {
      id: 'BL-03',
      name: 'Neutral Continuum',
      duration: 35,
      mood: 'Observational, documentary',
      energy: 2,
      description: 'Light pad + minimal harmonic movement',
      useCase: 'Narration continuity',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
    },
    'BL-04': {
      id: 'BL-04',
      name: 'Rising Instability',
      duration: 30,
      mood: 'Increasing pressure',
      energy: 5,
      description: 'Gradual pulse acceleration + filtered noise rise',
      useCase: 'Pre-reveal buildup',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    'BL-05': {
      id: 'BL-05',
      name: 'Dark Infrastructure',
      duration: 40,
      mood: 'Heavy, systemic risk',
      energy: 4,
      description: 'Low drones + distant metallic textures',
      useCase: 'Financial/legal consequence segments',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    },
    'BL-06': {
      id: 'BL-06',
      name: 'Silent Collapse Bed',
      duration: 20,
      mood: 'Emptiness after failure',
      energy: 1,
      description: 'Near-silence + air tone + faint harmonic residue',
      useCase: 'Post-impact drop',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
    }
  },
  eventTriggers: {
    'ET-01': {
      id: 'ET-01',
      name: 'Hard Impact Hit',
      duration: 1.5,
      energy: 9,
      description: 'Sub hit + metallic slam',
      useCase: 'Failure reveal',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    'ET-02': {
      id: 'ET-02',
      name: 'Glitch Burst Alpha',
      duration: 1,
      energy: 7,
      description: 'Digital corruption + bitcrush',
      useCase: 'AI hallucination',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
    },
    'ET-03': {
      id: 'ET-03',
      name: 'Bass Drop Collapse',
      duration: 2,
      energy: 10,
      description: 'Low frequency drop + silence',
      useCase: 'Major reveal',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
    },
    'ET-04': {
      id: 'ET-04',
      name: 'System Error Sweep',
      duration: 2,
      energy: 6,
      description: 'Rising digital noise -> abrupt cut',
      useCase: 'Transition to failure',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    'ET-05': {
      id: 'ET-05',
      name: 'Reverse Tension Pull',
      duration: 1.5,
      energy: 6,
      description: 'Reverse swell',
      useCase: 'Pre-impact',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    },
    'ET-06': {
      id: 'ET-06',
      name: 'Data Fragment Crack',
      duration: 1,
      energy: 7,
      description: 'Glass-like digital break',
      useCase: 'System breakdown',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
    },
    'ET-07': {
      id: 'ET-07',
      name: 'Low Frequency Pulse Hit',
      duration: 1,
      energy: 8,
      description: 'Heartbeat-style sub',
      useCase: 'Tension spike',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    'ET-08': {
      id: 'ET-08',
      name: 'Static Cut',
      duration: 0.8,
      energy: 5,
      description: 'Noise burst + silence',
      useCase: 'Abrupt scene change',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
    }
  },
  emotionalOverlays: {
    'EO-01': {
      id: 'EO-01',
      name: 'Aftermath Piano',
      duration: 25,
      mood: 'Regret, loss',
      energy: 3,
      description: 'Sparse piano notes',
      useCase: 'Layoffs, lawsuits',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    'EO-02': {
      id: 'EO-02',
      name: 'Dark Reflection Pad',
      duration: 30,
      mood: 'Heavy contemplation',
      energy: 2,
      description: 'Evolving pad',
      useCase: 'Consequence phase',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
    },
    'EO-03': {
      id: 'EO-03',
      name: 'Rising Swell Layer',
      duration: 20,
      mood: 'Anticipation',
      energy: 6,
      description: 'Filtered crescendo',
      useCase: 'Build phase',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
    },
    'EO-04': {
      id: 'EO-04',
      name: 'Insight Harmonics',
      duration: 30,
      mood: 'Clarity, analysis',
      energy: 3,
      description: 'Soft harmonic synth',
      useCase: 'Explanation',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    'EO-05': {
      id: 'EO-05',
      name: 'Irony Texture',
      duration: 20,
      mood: 'Subtle unease',
      energy: 4,
      description: 'Detuned synth + slight dissonance',
      useCase: '"Expected vs reality"',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    },
    'EO-06': {
      id: 'EO-06',
      name: 'Residual Echo',
      duration: 20,
      mood: 'Aftermath emptiness',
      energy: 1,
      description: 'Reverb tails',
      useCase: 'Ending fade',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
    }
  }
};
