import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import PromptInput from './components/PromptInput';
import SpriteDisplay from './components/SpriteDisplay';
import FaceAnimationEditor from './components/FaceAnimationEditor';
import ApiKeyDialog from './components/ApiKeyDialog';
import { generateSprite } from './services/geminiService';
import { GenerationStatus, Language } from './types';
import { TRANSLATIONS } from './constants';

function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [useGreenBackground, setUseGreenBackground] = useState<boolean>(false);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [spriteResult, setSpriteResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('ja');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'face'>('generate');

  // Initialize API Key (Pro Model requires user selection)
  useEffect(() => {
    const initKey = async () => {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (hasKey) {
            setApiKey(process.env.API_KEY || '');
          } else {
            setTimeout(async () => {
                 await window.aistudio.openSelectKey();
                 setApiKey(process.env.API_KEY || '');
            }, 500);
          }
        } else {
             // Check localStorage first
             const storedKey = localStorage.getItem('banana_sprite_api_key');
             if (storedKey) {
                 setApiKey(storedKey);
             } else if(process.env.API_KEY) {
                 setApiKey(process.env.API_KEY);
             } else {
                 // No API key found, show dialog
                 setShowApiKeyDialog(true);
             }
        }
      } catch (e) {
        console.error("Error initializing API key:", e);
        setShowApiKeyDialog(true);
      }
    };
    initKey();
  }, []);

  const handleSelectKey = async () => {
    try {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setApiKey(process.env.API_KEY || '');
             // window.location.reload(); // Reload isn't strictly necessary if state updates, but good for clean slate
        } else {
            // Show dialog for non-AI Studio environments
            setApiKeyError(null);
            setShowApiKeyDialog(true);
        }
    } catch(e) {
        console.error("Failed to open key selector", e);
        setShowApiKeyDialog(true);
    }
  };

  const handleSaveApiKey = (key: string) => {
    if (key.trim()) {
      setApiKey(key.trim());
      localStorage.setItem('banana_sprite_api_key', key.trim());
      setShowApiKeyDialog(false);
      setApiKeyError(null);
      // Clear error message and show success message
      setErrorMsg(null);
      const t = TRANSLATIONS[language];
      setSuccessMsg(t.apiKeySetSuccess);
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    }
  };

  const handleCloseApiKeyDialog = () => {
    setShowApiKeyDialog(false);
    setApiKeyError(null);
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setErrorMsg(language === 'ja' ? "APIキーを選択してください。" : "Please select an API Key first.");
      setApiKeyError(null);
      setShowApiKeyDialog(true);
      return;
    }
    if (!referenceImage) {
      setErrorMsg(language === 'ja' ? "キャラクター画像をアップロードしてください。" : "Please upload a character reference image.");
      return;
    }
    if (!prompt.trim()) {
      setErrorMsg(language === 'ja' ? "動きの説明を入力してください。" : "Please enter a movement description.");
      return;
    }

    setStatus(GenerationStatus.GENERATING_SPRITE);
    setErrorMsg(null);
    setSpriteResult(null);

    try {
      const currentKey = process.env.API_KEY || apiKey;
      
      const resultBase64 = await generateSprite(currentKey, referenceImage, prompt, useGreenBackground);
      setSpriteResult(resultBase64);
      setStatus(GenerationStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      const errorMessage = err.message || '';
      if (errorMessage.includes("Requested entity was not found") || 
          errorMessage.includes("API key") || 
          errorMessage.includes("invalid") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("permission")) {
         const msg = language === 'ja' 
           ? "APIキーが無効か、プロジェクトが見つかりません。正しいAPIキーを入力してください。" 
           : "API Key invalid or project not found. Please enter a valid API key.";
         setErrorMsg(msg);
         setApiKeyError(msg);
         setShowApiKeyDialog(true);
      } else {
         setErrorMsg(err.message || (language === 'ja' ? "生成に失敗しました。" : "Failed to generate sprite sheet. Please try again."));
      }
    }
  };

  const t = TRANSLATIONS[language];

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-yellow-50/30">
      <ApiKeyDialog
        isOpen={showApiKeyDialog}
        onClose={handleCloseApiKeyDialog}
        onSave={handleSaveApiKey}
        language={language}
        errorMessage={apiKeyError || undefined}
      />
      <Header language={language} setLanguage={setLanguage} onApiKeyClick={handleSelectKey} />

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-6 py-3 font-semibold text-sm transition-colors ${
                activeTab === 'generate'
                  ? 'border-b-2 border-yellow-400 text-yellow-900 bg-yellow-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {language === 'ja' ? 'スプライト生成' : 'Generate Sprite'}
            </button>
            <button
              onClick={() => setActiveTab('face')}
              className={`px-6 py-3 font-semibold text-sm transition-colors ${
                activeTab === 'face'
                  ? 'border-b-2 border-yellow-400 text-yellow-900 bg-yellow-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {TRANSLATIONS[language].expressionEditor}
            </button>
          </div>
        </div>

        {activeTab === 'generate' && (
          <>
            {/* Intro / Status */}
            <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-2 text-gray-800">{t.introTitle}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
                {t.introText}
            </p>
             {!apiKey && (
                 <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg inline-block">
                     <p className="text-red-800 text-sm mb-2">{t.apiKeyRequired}</p>
                     <button onClick={handleSelectKey} className="text-xs bg-red-100 px-3 py-1 rounded hover:bg-red-200 font-semibold text-red-900">
                         {t.selectKey}
                     </button>
                     <p className="text-xs text-gray-500 mt-2">
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-gray-800">{t.billingDocs}</a>
                     </p>
                 </div>
             )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6 md:p-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <ImageUploader 
              onImageSelected={setReferenceImage} 
              selectedImage={referenceImage} 
              language={language}
            />
            <PromptInput 
              prompt={prompt} 
              setPrompt={setPrompt} 
              disabled={status === GenerationStatus.GENERATING_SPRITE}
              language={language}
            />
          </div>

          {/* Green Background Option */}
          <div className="mb-6 flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="greenBackground"
              checked={useGreenBackground}
              onChange={(e) => setUseGreenBackground(e.target.checked)}
              disabled={status === GenerationStatus.GENERATING_SPRITE}
              className="w-5 h-5 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400 focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="greenBackground" className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-semibold text-gray-900">
                {t.greenBackgroundLabel}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                {t.greenBackgroundInfo}
              </span>
            </label>
          </div>

          {/* Action Area */}
          <div className="flex flex-col items-center justify-center pt-6 border-t border-gray-100">
            {successMsg && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                    {successMsg}
                </div>
            )}
            {errorMsg && !successMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                    {errorMsg}
                </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={status === GenerationStatus.GENERATING_SPRITE || !referenceImage || !prompt}
              className={`
                relative px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:-translate-y-0.5 border-2 border-black
                ${(status === GenerationStatus.GENERATING_SPRITE || !referenceImage || !prompt)
                  ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 hover:shadow-yellow-200'}
              `}
            >
              {status === GenerationStatus.GENERATING_SPRITE ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t.generating}
                </span>
              ) : (
                t.generateBtn
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">{t.timeEst}</p>
            
            {/* Warnings */}
            <div className="mt-6 text-xs text-gray-500 bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-left space-y-1">
                <p className="flex items-start gap-1">
                    <span className="text-yellow-600">⚠️</span>
                    {t.noteGacha}
                </p>
                <p className="flex items-start gap-1">
                    <span className="text-yellow-600">⚠️</span>
                    {t.noteOverwrite}
                </p>
            </div>

          </div>
        </div>

            {/* Results */}
            {spriteResult && (
              <SpriteDisplay spriteSheetBase64={spriteResult} language={language} />
            )}
          </>
        )}

        {activeTab === 'face' && (
          <FaceAnimationEditor language={language} />
        )}

      </main>

      <footer className="bg-yellow-50 border-t border-yellow-200 py-6 text-center text-sm text-yellow-800">
         Banana Sprite Generator v1.2 &copy; 2025
      </footer>
    </div>
  );
}

export default App;