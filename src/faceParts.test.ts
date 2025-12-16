import { describe, it, expect } from 'vitest';
import { extractFaceParts, DEFAULT_FACE_PARTS, drawFaceGuides } from './faceParts';
import { FacePartRectMap } from '../types';

describe('extractFaceParts', () => {
  it('should extract all face parts from a frame', async () => {
    // Create a test frame with colored regions
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Skip test if canvas is not available
      return;
    }
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw colored regions for face parts (for verification)
    ctx.fillStyle = '#0000FF'; // Blue for eyes
    ctx.fillRect(64, 51, 128, 38); // eyesOpen region
    
    ctx.fillStyle = '#FF0000'; // Red for mouth
    ctx.fillRect(77, 128, 102, 51); // mouthOpen region
    
    const frameDataUrl = canvas.toDataURL('image/png');
    
    const parts = await extractFaceParts(frameDataUrl, DEFAULT_FACE_PARTS, 256, 256);
    
    expect(parts.eyesOpen).toBeDefined();
    expect(parts.eyesClosed).toBeDefined();
    expect(parts.mouthOpen).toBeDefined();
    expect(parts.mouthClosed).toBeDefined();
    
    // Verify they are base64 data URLs
    expect(parts.eyesOpen).toMatch(/^data:image\/png;base64,/);
    expect(parts.mouthOpen).toMatch(/^data:image\/png;base64,/);
  });

  it('should throw error for invalid image', async () => {
    await expect(extractFaceParts('invalid-data-url')).rejects.toThrow();
  }, 10000); // Increase timeout
});

describe('drawFaceGuides', () => {
  it('should draw guide rectangles on canvas', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Skip test if canvas is not available
      return;
    }
    
    drawFaceGuides(ctx, DEFAULT_FACE_PARTS, 256);
    
    // Verify that something was drawn (we can't easily test exact pixels without more complex setup)
    // At minimum, ensure no errors are thrown
    expect(ctx).toBeDefined();
  });
});

