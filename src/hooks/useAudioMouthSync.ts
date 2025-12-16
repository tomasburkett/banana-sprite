import { useState, useEffect, useRef } from 'react';
import { MouthState } from '../../types';

interface UseAudioMouthSyncOptions {
  threshold?: number; // Volume threshold (0-1)
  attack?: number; // Attack time in ms (how quickly mouth opens)
  release?: number; // Release time in ms (how quickly mouth closes)
  audioSource?: AudioBuffer | MediaStream | null;
}

export const useAudioMouthSync = (options: UseAudioMouthSyncOptions = {}) => {
  const {
    threshold = 0.01,
    attack = 50,
    release = 100,
    audioSource = null,
  } = options;

  const [mouthState, setMouthState] = useState<MouthState>('closed');
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVolumeRef = useRef<number>(0);
  const smoothingRef = useRef<number>(0);

  useEffect(() => {
    if (!audioSource) {
      setMouthState('closed');
      return;
    }

    let isActive = true;

    const initAudio = async () => {
      try {
        // Create AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('AudioContext not supported');
        }

        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        // Create analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        // Connect source
        let source: AudioNode;
        if (audioSource instanceof AudioBuffer) {
          // AudioBuffer (uploaded file) - loop playback
          const bufferSource = audioContext.createBufferSource();
          bufferSource.buffer = audioSource;
          bufferSource.loop = true; // Loop the audio
          bufferSource.connect(analyser);
          source = bufferSource;
          bufferSource.start(0);
        } else if (audioSource instanceof MediaStream) {
          // MediaStream (microphone)
          const streamSource = audioContext.createMediaStreamSource(audioSource);
          streamSource.connect(analyser);
          source = streamSource;
          
          // Check microphone permission
          const tracks = audioSource.getAudioTracks();
          if (tracks.length > 0) {
            setHasMicrophonePermission(tracks[0].enabled);
          }
        } else {
          throw new Error('Invalid audio source type');
        }

        sourceNodeRef.current = source;
        analyser.connect(audioContext.destination);

        // Start analysis loop
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const timeDataArray = new Uint8Array(analyser.fftSize);
        
        const analyze = () => {
          if (!isActive || !analyserRef.current) return;

          // Use time domain data for better volume detection
          analyserRef.current.getByteTimeDomainData(timeDataArray);
          
          // Calculate RMS (Root Mean Square) volume from time domain
          let sum = 0;
          for (let i = 0; i < timeDataArray.length; i++) {
            const normalized = (timeDataArray[i] - 128) / 128;
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / timeDataArray.length);
          
          // Smooth volume changes
          smoothingRef.current = smoothingRef.current * 0.7 + rms * 0.3;
          const smoothedVolume = smoothingRef.current;

          // Update mouth state based on threshold
          if (smoothedVolume > threshold) {
            lastVolumeRef.current = smoothedVolume;
            setMouthState('open');
          } else {
            // Use release time for closing
            if (lastVolumeRef.current > threshold) {
              // Delay closing
              setTimeout(() => {
                if (isActive && smoothingRef.current <= threshold) {
                  setMouthState('closed');
                }
              }, release);
            } else {
              setMouthState('closed');
            }
          }

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (err: any) {
        if (isActive) {
          setError(err.message || 'Failed to initialize audio');
          setMouthState('closed');
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setHasMicrophonePermission(false);
          }
        }
      }
    };

    initAudio();

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceNodeRef.current) {
        if (sourceNodeRef.current instanceof AudioBufferSourceNode) {
          sourceNodeRef.current.stop();
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioSource, threshold, attack, release]);

  return {
    mouthState,
    hasMicrophonePermission,
    error,
  };
};

