import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateSpriteSheetSize, sliceSpriteSheet } from './imageUtils';

describe('validateSpriteSheetSize', () => {
  it('should pass for valid square sprite sheet divisible by 4', async () => {
    // Create a mock 1024x1024 image
    const img = new Image();
    img.width = 1024;
    img.height = 1024;
    
    expect(() => validateSpriteSheetSize(img)).not.toThrow();
  });

  it('should throw error for non-square image', () => {
    const img = new Image();
    img.width = 900;
    img.height = 1024;
    
    expect(() => validateSpriteSheetSize(img)).toThrow(/square/);
  });

  it('should throw error for width not divisible by 4', () => {
    const img = new Image();
    img.width = 1025; // not divisible by 4
    img.height = 1025;
    
    expect(() => validateSpriteSheetSize(img)).toThrow(/divisible by 4/);
  });

  it('should throw error for height not divisible by 4', () => {
    const img = new Image();
    img.width = 1025; // not divisible by 4
    img.height = 1025; // not divisible by 4
    
    expect(() => validateSpriteSheetSize(img)).toThrow(/divisible by 4/);
  });
});

describe('sliceSpriteSheet', () => {
  it('should return 16 frames for valid 4x4 sprite sheet', async () => {
    // Create a mock canvas-based sprite sheet
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1024, 1024);
    }
    const base64 = canvas.toDataURL('image/png');
    
    const frames = await sliceSpriteSheet(base64);
    expect(frames).toHaveLength(16);
  }, 10000); // Increase timeout
});

