import { useState, useEffect, useRef } from 'react';
import { EyeState } from '../../types';

interface UseBlinkSchedulerOptions {
  minInterval?: number; // milliseconds
  maxInterval?: number; // milliseconds
  blinkDuration?: number; // milliseconds
}

export const useBlinkScheduler = (options: UseBlinkSchedulerOptions = {}) => {
  const {
    minInterval = 2000,
    maxInterval = 6000,
    blinkDuration = 120,
  } = options;

  const [eyeState, setEyeState] = useState<EyeState>('open');
  const timeoutRef = useRef<number | null>(null);
  const blinkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const scheduleBlink = () => {
      // Random interval between min and max
      const interval = minInterval + Math.random() * (maxInterval - minInterval);
      
      timeoutRef.current = window.setTimeout(() => {
        // Start blink
        setEyeState('closed');
        
        // End blink after blinkDuration
        blinkTimeoutRef.current = window.setTimeout(() => {
          setEyeState('open');
          scheduleBlink(); // Schedule next blink
        }, blinkDuration);
      }, interval);
    };

    scheduleBlink();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, [minInterval, maxInterval, blinkDuration]);

  return { eyeState };
};

