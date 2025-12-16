import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioMouthSync } from '../src/hooks/useAudioMouthSync';
import { useBlinkScheduler } from '../src/hooks/useBlinkScheduler';
import { extractExpressionParts, drawFaceGuides, DEFAULT_FACE_PARTS } from '../src/faceParts';
import { FacePartImages, RecordingState } from '../types';

export interface FaceAnimatorProps {
  frames: string[]; // Base64 data URLs
  width: number;
  height: number;
  audioSource?: AudioBuffer | MediaStream | null;
  debugGuides?: boolean;
  volumeThreshold?: number;
  onRecordingStateChange?: (state: RecordingState) => void;
  onRecordingControlsReady?: (controls: {
    startRecording: () => void;
    stopRecording: () => void;
    getRecordedBlob: () => Blob | null;
  }) => void;
}

export const FaceAnimator: React.FC<FaceAnimatorProps> = ({
  frames,
  width,
  height,
  audioSource = null,
  debugGuides = false,
  volumeThreshold = 0.01,
  onRecordingStateChange,
  onRecordingControlsReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [faceParts, setFaceParts] = useState<FacePartImages | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const isRenderingRef = useRef<boolean>(false);

  const { mouthState } = useAudioMouthSync({ audioSource, threshold: volumeThreshold });
  const { eyeState } = useBlinkScheduler();

  // Initialize face parts extraction - find best frames for each expression
  useEffect(() => {
    if (frames.length === 0) return;

    const extractParts = async () => {
      try {
        const parts = await extractExpressionParts(frames, width, height);
        setFaceParts(parts);
        
        // Preload all images to prevent flickering
        const imageUrls = [
          frames[0], // base frame
          parts.eyesOpen,
          parts.eyesClosed,
          parts.mouthOpen,
          parts.mouthClosed,
        ];
        
        await Promise.all(
          imageUrls.map((url) => {
            return new Promise<void>((resolve) => {
              if (imageCacheRef.current.has(url)) {
                resolve();
                return;
              }
              const img = new Image();
              img.onload = () => {
                imageCacheRef.current.set(url, img);
                resolve();
              };
              img.onerror = () => resolve(); // Continue even if image fails
              img.src = url;
            });
          })
        );
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to extract expression parts:', err);
      }
    };

    extractParts();
  }, [frames, width, height]);

  // Render composite frame
  // Use frame 0 as base for body, and only change eyes/mouth based on state
  const renderCompositeFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isInitialized || !faceParts || isRenderingRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isRenderingRef.current = true;

    // Get cached images or load them
    const getCachedImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const cached = imageCacheRef.current.get(url);
        if (cached) {
          resolve(cached);
          return;
        }
        const img = new Image();
        img.onload = () => {
          imageCacheRef.current.set(url, img);
          resolve(img);
        };
        img.onerror = () => {
          // Create a blank image if loading fails
          const blank = new Image();
          imageCacheRef.current.set(url, blank);
          resolve(blank);
        };
        img.src = url;
      });
    };

    // Render synchronously using cached images
    (async () => {
      try {
        const baseImg = await getCachedImage(frames[0]);
        const eyePartUrl = eyeState === 'open' ? faceParts.eyesOpen : faceParts.eyesClosed;
        const mouthPartUrl = mouthState === 'open' ? faceParts.mouthOpen : faceParts.mouthClosed;
        
        const eyeImg = await getCachedImage(eyePartUrl);
        const mouthImg = await getCachedImage(mouthPartUrl);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw base frame
        ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

        // Draw eyes at the correct position
        const eyeRect = eyeState === 'open' ? DEFAULT_FACE_PARTS.eyesOpen : DEFAULT_FACE_PARTS.eyesClosed;
        const eyeX = Math.floor(eyeRect.x * canvas.width);
        const eyeY = Math.floor(eyeRect.y * canvas.height);
        const eyeW = Math.floor(eyeRect.w * canvas.width);
        const eyeH = Math.floor(eyeRect.h * canvas.height);
        ctx.drawImage(eyeImg, eyeX, eyeY, eyeW, eyeH);

        // Draw mouth at the correct position
        const mouthRect = mouthState === 'open' ? DEFAULT_FACE_PARTS.mouthOpen : DEFAULT_FACE_PARTS.mouthClosed;
        const mouthX = Math.floor(mouthRect.x * canvas.width);
        const mouthY = Math.floor(mouthRect.y * canvas.height);
        const mouthW = Math.floor(mouthRect.w * canvas.width);
        const mouthH = Math.floor(mouthRect.h * canvas.height);
        ctx.drawImage(mouthImg, mouthX, mouthY, mouthW, mouthH);

        // Draw debug guides if enabled
        if (debugGuides) {
          drawFaceGuides(ctx, DEFAULT_FACE_PARTS, canvas.width);
        }
      } catch (err) {
        console.error('Error rendering frame:', err);
      } finally {
        isRenderingRef.current = false;
      }
    })();
  }, [frames, faceParts, eyeState, mouthState, debugGuides, isInitialized]);

  // Animation loop (10fps)
  // For expression sprites, we use frame 0 as base and only change eyes/mouth
  useEffect(() => {
    if (!isInitialized || frames.length === 0) return;

    const animate = () => {
      // Always use frame 0 as base for body, only eyes/mouth change based on state
      renderCompositeFrame();
      // Update frame index for display purposes (shows which frame we're using as base)
      setCurrentFrameIndex(0);
      animationFrameRef.current = window.setTimeout(animate, 100); // 10fps
    };

    // Initial render
    renderCompositeFrame();
    animate();

    return () => {
      if (animationFrameRef.current) {
        clearTimeout(animationFrameRef.current);
      }
    };
  }, [isInitialized, frames, renderCompositeFrame]);

  // Re-render when eye or mouth state changes
  useEffect(() => {
    if (isInitialized && frames.length > 0) {
      renderCompositeFrame();
    }
  }, [eyeState, mouthState, isInitialized, frames, renderCompositeFrame]);

  // Recording functionality
  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || recordingState !== 'idle') return;

    try {
      // Capture stream from canvas
      const stream = canvas.captureStream(10); // 10fps
      streamRef.current = stream;

      // Add audio track if available
      if (audioSource instanceof MediaStream) {
        // Microphone input
        const audioTracks = audioSource.getAudioTracks();
        audioTracks.forEach((track) => {
          stream.addTrack(track);
        });
      } else if (audioSource instanceof AudioBuffer) {
        // File upload - create audio track from AudioBuffer
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createBufferSource();
        source.buffer = audioSource;
        
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.start();
        
        // Add audio track to stream
        const audioTracks = destination.stream.getAudioTracks();
        audioTracks.forEach((track) => {
          stream.addTrack(track);
        });
      }

      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
      };

      // Fallback to vp8 if vp9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm;codecs=vp8';
      }

      // Fallback to default if vp8 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordingState('saving');
        if (onRecordingStateChange) {
          onRecordingStateChange('saving');
        }
        // The blob URL will be handled by parent component
        setTimeout(() => {
          setRecordingState('idle');
          if (onRecordingStateChange) {
            onRecordingStateChange('idle');
          }
        }, 100);
      };

      mediaRecorder.start();
      setRecordingState('recording');
      if (onRecordingStateChange) {
        onRecordingStateChange('recording');
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      setRecordingState('idle');
      if (onRecordingStateChange) {
        onRecordingStateChange('idle');
      }
    }
  }, [recordingState, audioSource, onRecordingStateChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  }, [recordingState]);

  // Store recording controls for parent access
  const recordingControlsRef = useRef({
    startRecording,
    stopRecording,
    getRecordedBlob: () => {
      if (recordedChunksRef.current.length > 0) {
        return new Blob(recordedChunksRef.current, { type: 'video/webm' });
      }
      return null;
    },
  });

  useEffect(() => {
    const controls = {
      startRecording,
      stopRecording,
      getRecordedBlob: () => {
        if (recordedChunksRef.current.length > 0) {
          return new Blob(recordedChunksRef.current, { type: 'video/webm' });
        }
        return null;
      },
    };
    recordingControlsRef.current = controls;
    if (onRecordingControlsReady) {
      onRecordingControlsReady(controls);
    }
  }, [startRecording, stopRecording, onRecordingControlsReady]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-gray-500">Initializing face parts...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-gray-200 rounded-lg bg-white"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className="mt-2 text-xs text-gray-500">
        Frame: {currentFrameIndex + 1}/{frames.length} | Eyes: {eyeState} | Mouth: {mouthState}
      </div>
    </div>
  );
};
