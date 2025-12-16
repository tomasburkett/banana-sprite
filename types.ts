export interface ProcessedImage {
  base64: string; // Data URL
  width: number;
  height: number;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  PROCESSING_IMAGE = 'PROCESSING_IMAGE',
  GENERATING_SPRITE = 'GENERATING_SPRITE',
  GENERATING_GIF = 'GENERATING_GIF',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export type Language = 'ja' | 'en';

// Face animation types
export type FacePartKey = 'eyesOpen' | 'eyesClosed' | 'mouthOpen' | 'mouthClosed';

export interface FacePartRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FacePartRectMap {
  eyesOpen: FacePartRect;
  eyesClosed: FacePartRect;
  mouthOpen: FacePartRect;
  mouthClosed: FacePartRect;
}

export interface FacePartImages {
  eyesOpen: string; // base64 data URL
  eyesClosed: string;
  mouthOpen: string;
  mouthClosed: string;
}

export type MouthState = 'open' | 'closed';
export type EyeState = 'open' | 'closed';

export type RecordingState = 'idle' | 'recording' | 'saving';

export interface Frame {
  dataUrl: string;
  width: number;
  height: number;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    gifshot: {
      createGIF: (
        options: {
          images: string[];
          gifWidth?: number;
          gifHeight?: number;
          interval?: number; // seconds
          numFrames?: number;
        },
        callback: (obj: { error: boolean; errorCode: string; errorMsg: string; image: string }) => void
      ) => void;
    };
  }
}