import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock canvas for jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  const { createCanvas } = require('canvas');
  HTMLCanvasElement.prototype.getContext = function(contextId: string) {
    if (contextId === '2d') {
      const canvas = createCanvas(this.width, this.height);
      return canvas.getContext('2d');
    }
    return null;
  };
  
  HTMLCanvasElement.prototype.toDataURL = function() {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  };
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

