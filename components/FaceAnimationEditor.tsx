import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sliceSpriteSheet } from '../services/imageUtils';
import { Language, RecordingState, GenerationStatus } from '../types';
import { TRANSLATIONS, EXPRESSION_PRESETS } from '../constants';
import { FaceAnimator } from './FaceAnimator';
import { generateSprite } from '../services/geminiService';

interface FaceAnimationEditorProps {
  language: Language;
}

const FaceAnimationEditor: React.FC<FaceAnimationEditorProps> = ({ language }) => {
  const [spriteSheetBase64, setSpriteSheetBase64] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [frameWidth, setFrameWidth] = useState(256);
  const [frameHeight, setFrameHeight] = useState(256);
  const [audioSource, setAudioSource] = useState<AudioBuffer | MediaStream | null>(null);
  const [audioInputMode, setAudioInputMode] = useState<'file' | 'microphone'>('file');
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState<boolean | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [webmUrl, setWebmUrl] = useState<string | null>(null);
  const [volumeThreshold, setVolumeThreshold] = useState(0.01);
  const [debugGuides, setDebugGuides] = useState(false);
  const [expressionPrompt, setExpressionPrompt] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('happy');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  
  const recordingControlsRef = useRef<{
    startRecording: () => void;
    stopRecording: () => void;
    getRecordedBlob: () => Blob | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spriteFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  // Initialize API Key
  useEffect(() => {
    const storedKey = localStorage.getItem('banana_sprite_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else if (process.env.API_KEY) {
      setApiKey(process.env.API_KEY);
    }
  }, []);

  // Update prompt when preset is selected
  useEffect(() => {
    const preset = EXPRESSION_PRESETS.find(p => p.id === selectedPresetId);
    if (preset && preset.id !== 'custom') {
      setExpressionPrompt(preset.prompt);
    }
  }, [selectedPresetId]);

  // Parse sprite sheet when it arrives
  useEffect(() => {
    if (!spriteSheetBase64) {
      setFrames([]);
      return;
    }

    const process = async () => {
      try {
        const sliced = await sliceSpriteSheet(spriteSheetBase64);
        setFrames(sliced);
        
        const img = new Image();
        img.onload = () => {
          const w = img.width / 4;
          const h = img.height / 4;
          setFrameWidth(w);
          setFrameHeight(h);
        };
        img.src = spriteSheetBase64;
      } catch (err) {
        console.error("Error processing sprite sheet:", err);
      }
    };
    process();
  }, [spriteSheetBase64]);

  // Handle reference image upload
  const handleReferenceImageUpload = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setReferenceImage(result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle sprite sheet upload
  const handleSpriteSheetUpload = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSpriteSheetBase64(result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle audio file upload
  const handleAudioFileUpload = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioSource(audioBuffer);
    } catch (err) {
      console.error('Failed to load audio file:', err);
    }
  }, []);

  // Handle microphone access
  const handleMicrophoneAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneStream(stream);
      setAudioSource(stream);
      setHasMicrophonePermission(true);
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      setHasMicrophonePermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert(t.microphoneNotAllowed);
      }
    }
  }, [t.microphoneNotAllowed]);

  // Cleanup microphone stream
  useEffect(() => {
    return () => {
      if (microphoneStream) {
        microphoneStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [microphoneStream]);

  // Handle audio input mode change
  useEffect(() => {
    if (audioInputMode === 'file') {
      if (microphoneStream) {
        microphoneStream.getTracks().forEach((track) => track.stop());
        setMicrophoneStream(null);
      }
      setAudioSource(null);
    } else if (audioInputMode === 'microphone') {
      handleMicrophoneAccess();
    }
  }, [audioInputMode, handleMicrophoneAccess]);

  // Handle recording state change
  const handleRecordingStateChange = useCallback((state: RecordingState) => {
    setRecordingState(state);
    if (state === 'idle' && recordingControlsRef.current) {
      const blob = recordingControlsRef.current.getRecordedBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        setWebmUrl(url);
      }
    }
  }, []);

  // Handle recording controls ready
  const handleRecordingControlsReady = useCallback((controls: {
    startRecording: () => void;
    stopRecording: () => void;
    getRecordedBlob: () => Blob | null;
  }) => {
    recordingControlsRef.current = controls;
  }, []);

  // Start/stop recording
  const handleStartRecording = useCallback(() => {
    recordingControlsRef.current?.startRecording();
  }, []);

  const handleStopRecording = useCallback(() => {
    recordingControlsRef.current?.stopRecording();
  }, []);

  // Handle expression sprite generation
  const handleGenerateExpressionSprite = useCallback(async () => {
    if (!apiKey) {
      setErrorMsg(language === 'ja' ? "APIキーを設定してください。" : "Please set API key first.");
      return;
    }
    if (!referenceImage) {
      setErrorMsg(language === 'ja' ? "キャラクター画像をアップロードしてください。" : "Please upload a character reference image.");
      return;
    }
    if (!expressionPrompt.trim()) {
      setErrorMsg(language === 'ja' ? "表情のプロンプトを入力してください。" : "Please enter an expression prompt.");
      return;
    }

    setStatus(GenerationStatus.GENERATING_SPRITE);
    setErrorMsg(null);

    try {
      const currentKey = process.env.API_KEY || apiKey;
      const resultBase64 = await generateSprite(currentKey, referenceImage, expressionPrompt, false, true);
      setSpriteSheetBase64(resultBase64);
      setStatus(GenerationStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      setErrorMsg(err.message || (language === 'ja' ? "生成に失敗しました。" : "Failed to generate sprite sheet."));
    }
  }, [apiKey, referenceImage, expressionPrompt, language]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-yellow-400 overflow-hidden mt-8">
      <div className="p-4 border-b border-yellow-200 bg-yellow-100">
        <h2 className="font-bold text-yellow-900 text-lg">{t.expressionEditor}</h2>
        <p className="text-sm text-yellow-800 mt-1">
          {t.expressionEditorDescription}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Expression Generation Section */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">1. {t.selectExpression}</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-800 mb-2">
              {t.selectExpression}
            </label>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {EXPRESSION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  disabled={status === GenerationStatus.GENERATING_SPRITE}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                    selectedPresetId === preset.id
                      ? 'bg-yellow-400 text-gray-900 border-2 border-yellow-600'
                      : 'bg-white hover:bg-yellow-100 hover:text-yellow-900 text-gray-700 border border-gray-300 hover:border-yellow-400'
                  }`}
                >
                  {preset.label[language]}
                </button>
              ))}
            </div>

            <textarea
              value={expressionPrompt}
              onChange={(e) => {
                setExpressionPrompt(e.target.value);
                if (e.target.value !== EXPRESSION_PRESETS.find(p => p.id === selectedPresetId)?.prompt) {
                  setSelectedPresetId('custom');
                }
              }}
              disabled={status === GenerationStatus.GENERATING_SPRITE}
              placeholder={t.expressionPromptPlaceholder}
              className="w-full p-4 border border-gray-300 rounded-xl shadow-inner focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm min-h-[160px] bg-yellow-50 text-gray-900 leading-relaxed font-mono"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-800 mb-2">
              {language === 'ja' ? 'キャラクター画像（必須）' : 'Character Image (Required)'}
            </label>
            {referenceImage ? (
              <div className="space-y-2">
                <img
                  src={referenceImage}
                  alt="Reference"
                  className="max-w-xs h-auto border-2 border-gray-200 rounded-lg"
                />
                <button
                  onClick={() => {
                    setReferenceImage(null);
                    imageFileInputRef.current?.value && (imageFileInputRef.current.value = '');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold"
                >
                  {language === 'ja' ? '画像を削除' : 'Remove Image'}
                </button>
              </div>
            ) : (
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleReferenceImageUpload(file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-gray-900 hover:file:bg-yellow-300"
              />
            )}
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleGenerateExpressionSprite}
            disabled={status === GenerationStatus.GENERATING_SPRITE || !referenceImage || !expressionPrompt.trim()}
            className={`w-full px-6 py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:-translate-y-0.5 border-2 border-black ${
              (status === GenerationStatus.GENERATING_SPRITE || !referenceImage || !expressionPrompt.trim())
                ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed shadow-none'
                : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 hover:shadow-yellow-200'
            }`}
          >
            {status === GenerationStatus.GENERATING_SPRITE ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.expressionGenerating}
              </span>
            ) : (
              t.generateExpressionSprite
            )}
          </button>
        </div>

        {/* Animation Section */}
        {spriteSheetBase64 && (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">2. {t.faceAnimation}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Left: Sprite Sheet Preview */}
              <div className="flex flex-col items-center">
                <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">
                  {language === 'ja' ? 'スプライトシート' : 'Sprite Sheet'}
                </h4>
                <div className="relative border-2 border-gray-100 bg-white shadow-sm p-1 rounded-lg w-full">
                  <img 
                    src={spriteSheetBase64} 
                    alt="Expression Sprite Sheet" 
                    className="max-w-full h-auto w-full" 
                  />
                </div>
                <a 
                  href={spriteSheetBase64}
                  download="expression_sprite_sheet.png"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-bold shadow-md hover:shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {t.downloadPng}
                </a>
              </div>
              {/* Right: Face Animation Preview */}
              <div className="flex flex-col items-center">
                {frames.length > 0 ? (
                  <>
                    <FaceAnimator
                      frames={frames}
                      width={frameWidth}
                      height={frameHeight}
                      audioSource={audioSource}
                      debugGuides={debugGuides}
                      volumeThreshold={volumeThreshold}
                      onRecordingStateChange={handleRecordingStateChange}
                      onRecordingControlsReady={handleRecordingControlsReady}
                    />

                    {/* Recording Controls */}
                    <div className="mt-4 w-full space-y-2">
                      <h4 className="text-sm font-bold text-gray-700 mb-2">
                        {language === 'ja' ? '録画コントロール' : 'Recording Controls'}
                      </h4>
                      {!audioSource && (
                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                          {language === 'ja' ? '⚠ 音声ファイルをアップロードするか、マイクを有効にしてください。' : '⚠ Please upload an audio file or enable microphone.'}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {recordingState === 'idle' ? (
                          <button
                            onClick={handleStartRecording}
                            disabled={!audioSource || frames.length === 0}
                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                          >
                            {t.recordingStart}
                          </button>
                        ) : recordingState === 'recording' ? (
                          <button
                            onClick={handleStopRecording}
                            className="flex-1 px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                          >
                            {t.recordingStop}
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-wait text-sm font-semibold"
                          >
                            {t.recordingSaving}
                          </button>
                        )}
                      </div>

                      {webmUrl && (
                        <a
                          href={webmUrl}
                          download="face_animation.webm"
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 text-sm font-semibold"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          {t.downloadWebm}
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">処理中...</span>
                  </div>
                )}
              </div>

              {/* Right: Controls */}
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2">{t.audioInputMode}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAudioInputMode('file')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        audioInputMode === 'file'
                          ? 'bg-yellow-400 text-gray-900'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {t.audioFile}
                    </button>
                    <button
                      onClick={() => setAudioInputMode('microphone')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        audioInputMode === 'microphone'
                          ? 'bg-yellow-400 text-gray-900'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {t.audioMicrophone}
                    </button>
                  </div>
                </div>

                {audioInputMode === 'file' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.uploadAudioFile}
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleAudioFileUpload(file);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-gray-900 hover:file:bg-yellow-300"
                    />
                    {audioSource && frames.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 mb-2">
                          {language === 'ja' ? '✓ 音声ファイルが読み込まれました。下の「録画開始」ボタンで録画を開始できます。' : '✓ Audio file loaded. You can start recording with the "Start Recording" button below.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {audioInputMode === 'microphone' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-700">{t.microphonePermission}</span>
                      {hasMicrophonePermission === false && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          {t.microphoneNotAllowed}
                        </span>
                      )}
                      {hasMicrophonePermission === true && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          ✓ Allowed
                        </span>
                      )}
                    </div>
                    {!microphoneStream && (
                      <button
                        onClick={handleMicrophoneAccess}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-semibold"
                      >
                        Request Microphone Access
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.volumeThreshold}: {volumeThreshold.toFixed(3)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.001"
                    value={volumeThreshold}
                    onChange={(e) => setVolumeThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="debugGuides"
                    checked={debugGuides}
                    onChange={(e) => setDebugGuides(e.target.checked)}
                    className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                  />
                  <label htmlFor="debugGuides" className="text-sm font-semibold text-gray-700">
                    {t.debugGuides}
                  </label>
                </div>

                {!MediaRecorder.isTypeSupported('video/webm') && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">{t.webmNotSupported}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Sprite Sheet Upload Option */}
        {!spriteSheetBase64 && (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">または、既存のスプライトシートを使用</h3>
            <div>
              <input
                ref={spriteFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleSpriteSheetUpload(file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-gray-900 hover:file:bg-yellow-300"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceAnimationEditor;
