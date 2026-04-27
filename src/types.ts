export interface VideoMetadata {
  name: string;
  duration: number;
  size: number;
  url: string;
}

export interface EditOperation {
  type: 'remove' | 'speed' | 'crop' | 'blur' | 'stabilize' | 'watermark' | 'highlight' | 'branding' | 'captions' | 'insert' | 'bokeh' | 'overlay' | 'music';
  target: 'silence' | 'watermark' | 'low_activity' | 'frame' | 'branding' | 'subtitle' | 'b_roll' | 'background' | 'cinematic' | 'audio_track';
  start: string | number;
  end: string | number;
  scope: 'local' | 'global';
  parameters: {
    speed_factor?: number;
    reason: string;
    [key: string]: any;
  };
}

export interface EditPlan {
  summary: string;
  operations: EditOperation[];
}

export interface AIAnalysisResult {
  segments: {
    start: number;
    end: number;
    label: string;
    confidence: number;
  }[];
  summary: string;
}
