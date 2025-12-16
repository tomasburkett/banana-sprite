import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBlinkScheduler } from './useBlinkScheduler';

describe('useBlinkScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with eyes open', () => {
    const { result } = renderHook(() => useBlinkScheduler());
    expect(result.current.eyeState).toBe('open');
  });

  it('should blink after interval', async () => {
    const { result } = renderHook(() =>
      useBlinkScheduler({ minInterval: 100, maxInterval: 100, blinkDuration: 50 })
    );

    expect(result.current.eyeState).toBe('open');

    // Fast-forward time to trigger blink
    vi.advanceTimersByTime(150);

    // Should be closed after interval
    await waitFor(() => {
      expect(result.current.eyeState).toBe('closed');
    }, { timeout: 200 });

    // Fast-forward blink duration
    vi.advanceTimersByTime(60);

    // Should be open again
    await waitFor(() => {
      expect(result.current.eyeState).toBe('open');
    });
  });
});

