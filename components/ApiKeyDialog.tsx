import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  language: Language;
  errorMessage?: string;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  language,
  errorMessage 
}) => {
  const [apiKey, setApiKey] = useState('');
  const t = TRANSLATIONS[language];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      setApiKey('');
    }
  };

  const handleCancel = () => {
    setApiKey('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border-2 border-black">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            {t.apiKeyDialogTitle}
          </h2>
          
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          <p className="text-gray-700 mb-4 text-sm">
            {t.apiKeyDialogDescription}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="apiKey" className="block text-sm font-semibold text-gray-900 mb-2">
                {t.apiKeyLabel}
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t.apiKeyPlaceholder}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                autoFocus
              />
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 mb-2">
                {t.apiKeyHelpText}
              </p>
              <a 
                href="https://ai.google.dev/gemini-api/docs/api-key?hl=ja" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
              >
                {t.apiKeyHelpLink}
              </a>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!apiKey.trim()}
                className="flex-1 px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-300 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed border-2 border-black"
              >
                {t.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyDialog;





