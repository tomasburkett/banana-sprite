import { FacePartRect, FacePartRectMap, FacePartImages, FacePartKey } from '../types';

/**
 * Default face part rectangles (normalized coordinates, will be scaled to frame size)
 * These are relative positions within a frame (0-1 range)
 */
export const DEFAULT_FACE_PARTS: FacePartRectMap = {
  eyesOpen: { x: 0.25, y: 0.2, w: 0.5, h: 0.15 },
  eyesClosed: { x: 0.25, y: 0.2, w: 0.5, h: 0.05 },
  mouthOpen: { x: 0.3, y: 0.5, w: 0.4, h: 0.2 },
  mouthClosed: { x: 0.3, y: 0.55, w: 0.4, h: 0.05 },
};

/**
 * Analyzes mouth region to detect if it's open or closed
 * Returns a score: higher = more open
 */
const analyzeMouthOpenness = async (
  frameDataUrl: string,
  mouthRect: FacePartRect,
  frameWidth: number,
  frameHeight: number
): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const x = Math.floor(mouthRect.x * frameWidth);
      const y = Math.floor(mouthRect.y * frameHeight);
      const w = Math.floor(mouthRect.w * frameWidth);
      const h = Math.floor(mouthRect.h * frameHeight);
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(0);
        return;
      }
      
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      
      // Calculate how much of the mouth region is "open" (not background/skin color)
      // Simple heuristic: count non-transparent pixels in the center region
      let openPixels = 0;
      const centerY = Math.floor(h / 2);
      const centerHeight = Math.floor(h * 0.6);
      
      for (let y = centerY - centerHeight / 2; y < centerY + centerHeight / 2; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 128) { // Not transparent
            openPixels++;
          }
        }
      }
      
      // Normalize by area
      const openness = openPixels / (w * centerHeight);
      resolve(openness);
    };
    img.onerror = () => resolve(0);
    img.src = frameDataUrl;
  });
};

/**
 * Finds the best frames for open and closed mouth/eyes from all frames
 */
export const findBestExpressionFrames = async (
  frames: string[],
  frameWidth: number,
  frameHeight: number
): Promise<{
  eyesOpenFrameIndex: number;
  eyesClosedFrameIndex: number;
  mouthOpenFrameIndex: number;
  mouthClosedFrameIndex: number;
}> => {
  let maxMouthOpen = 0;
  let minMouthOpen = Infinity;
  let mouthOpenIndex = 0;
  let mouthClosedIndex = 0;
  
  // Analyze all frames to find best open/closed states
  for (let i = 0; i < frames.length; i++) {
    const openness = await analyzeMouthOpenness(
      frames[i],
      DEFAULT_FACE_PARTS.mouthOpen,
      frameWidth,
      frameHeight
    );
    
    if (openness > maxMouthOpen) {
      maxMouthOpen = openness;
      mouthOpenIndex = i;
    }
    if (openness < minMouthOpen) {
      minMouthOpen = openness;
      mouthClosedIndex = i;
    }
  }
  
  // For eyes, use frame 0 as default (can be improved later)
  // For now, assume frame 0 has eyes open, and we'll create closed eyes by modifying
  return {
    eyesOpenFrameIndex: 0,
    eyesClosedFrameIndex: 0, // Will be handled by extracting with different rect
    mouthOpenFrameIndex: mouthOpenIndex,
    mouthClosedFrameIndex: mouthClosedIndex,
  };
};

/**
 * Extracts face parts from a frame image
 */
export const extractFaceParts = async (
  frameDataUrl: string,
  parts: FacePartRectMap = DEFAULT_FACE_PARTS,
  frameWidth?: number,
  frameHeight?: number
): Promise<FacePartImages> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = frameWidth || img.width;
      const height = frameHeight || img.height;
      
      const result: Partial<FacePartImages> = {};
      
      // Extract each face part
      (Object.keys(parts) as FacePartKey[]).forEach((key) => {
        const rect = parts[key];
        const x = Math.floor(rect.x * width);
        const y = Math.floor(rect.y * height);
        const w = Math.floor(rect.w * width);
        const h = Math.floor(rect.h * height);
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw the cropped region
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        result[key] = canvas.toDataURL('image/png');
      });
      
      resolve(result as FacePartImages);
    };
    img.onerror = reject;
    img.src = frameDataUrl;
  });
};

/**
 * Extracts face parts from specific frames (for expression sprites)
 */
export const extractExpressionParts = async (
  frames: string[],
  frameWidth: number,
  frameHeight: number
): Promise<FacePartImages> => {
  // Find best frames for each expression
  const bestFrames = await findBestExpressionFrames(frames, frameWidth, frameHeight);
  
  // Extract parts from the best frames
  const [eyesOpenData, eyesClosedData, mouthOpenData, mouthClosedData] = await Promise.all([
    extractFaceParts(frames[bestFrames.eyesOpenFrameIndex], {
      eyesOpen: DEFAULT_FACE_PARTS.eyesOpen,
      eyesClosed: DEFAULT_FACE_PARTS.eyesOpen, // Dummy, not used
      mouthOpen: DEFAULT_FACE_PARTS.mouthOpen, // Dummy, not used
      mouthClosed: DEFAULT_FACE_PARTS.mouthClosed, // Dummy, not used
    }, frameWidth, frameHeight),
    extractFaceParts(frames[bestFrames.eyesClosedFrameIndex], {
      eyesOpen: DEFAULT_FACE_PARTS.eyesOpen, // Dummy, not used
      eyesClosed: DEFAULT_FACE_PARTS.eyesClosed,
      mouthOpen: DEFAULT_FACE_PARTS.mouthOpen, // Dummy, not used
      mouthClosed: DEFAULT_FACE_PARTS.mouthClosed, // Dummy, not used
    }, frameWidth, frameHeight),
    extractFaceParts(frames[bestFrames.mouthOpenFrameIndex], {
      eyesOpen: DEFAULT_FACE_PARTS.eyesOpen, // Dummy, not used
      eyesClosed: DEFAULT_FACE_PARTS.eyesClosed, // Dummy, not used
      mouthOpen: DEFAULT_FACE_PARTS.mouthOpen,
      mouthClosed: DEFAULT_FACE_PARTS.mouthOpen, // Dummy, not used
    }, frameWidth, frameHeight),
    extractFaceParts(frames[bestFrames.mouthClosedFrameIndex], {
      eyesOpen: DEFAULT_FACE_PARTS.eyesOpen, // Dummy, not used
      eyesClosed: DEFAULT_FACE_PARTS.eyesClosed, // Dummy, not used
      mouthOpen: DEFAULT_FACE_PARTS.mouthOpen, // Dummy, not used
      mouthClosed: DEFAULT_FACE_PARTS.mouthClosed,
    }, frameWidth, frameHeight),
  ]);
  
  return {
    eyesOpen: eyesOpenData.eyesOpen,
    eyesClosed: eyesClosedData.eyesClosed,
    mouthOpen: mouthOpenData.mouthOpen,
    mouthClosed: mouthClosedData.mouthClosed,
  };
};

/**
 * Draws face part guide rectangles on a canvas (for debugging)
 */
export const drawFaceGuides = (
  ctx: CanvasRenderingContext2D,
  parts: FacePartRectMap,
  scale: number = 1
): void => {
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;
  
  (Object.keys(parts) as FacePartKey[]).forEach((key) => {
    const rect = parts[key];
    const x = rect.x * scale;
    const y = rect.y * scale;
    const w = rect.w * scale;
    const h = rect.h * scale;
    
    ctx.strokeRect(x, y, w, h);
    
    // Label
    ctx.fillStyle = '#FF0000';
    ctx.font = '12px monospace';
    ctx.fillText(key, x, y - 5);
  });
};
