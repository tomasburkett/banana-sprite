import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAudioMouthSync } from './useAudioMouthSync';

// Mock AudioContext
class MockAudioContext {
  createAnalyser() {
    return {
      fftSize: 256,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn((arr: Uint8Array) => {
        // Simulate volume
        for (let i = 0; i < arr.length; i++) {
          arr[i] = 100; // Some volume
        }
      }),
      connect: vi.fn(),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createMediaStreamSource() {
    return {
      connect: vi.fn(),
    };
  }
  destination = {};
  close = vi.fn();
}

describe('useAudioMouthSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock AudioContext
    (window as any).AudioContext = MockAudioContext;
    (window as any).webkitAudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with mouth closed when no audio source', () => {
    const { result } = renderHook(() => useAudioMouthSync({ audioSource: null }));
    expect(result.current.mouthState).toBe('closed');
  });

  it('should handle AudioBuffer source', async () => {
    const mockBuffer = {
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 1,
      length: 44100,
    } as AudioBuffer;

    const { result } = renderHook(() =>
      useAudioMouthSync({
        audioSource: mockBuffer,
        threshold: 0.01,
      })
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.mouthState).toBeDefined();
    }, { timeout: 10000 });
  });
});

