'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { Login } from '@/components/Login';
import { TranscriptionView, SummaryView, TagsView, MetadataView } from '@/components/results';

// Types for API responses
interface TranscriptionResult {
  success: boolean;
  transcription: string;
  language: string;
  fileName: string;
}

interface SpeakerResult {
  success: boolean;
  speakers: Array<{
    id: string;
    name: string;
    segments: Array<{
      start: string;
      end: string;
      text: string;
    }>;
  }>;
  totalSpeakers: number;
  summary: string;
  fileName: string;
}

interface SummaryResult {
  success: boolean;
  summary: string;
  tags: string[];
  mainTopics: string[];
  duration: string;
  language: string;
  sentiment: string;
  confidence: number;
  fileName: string;
}

interface TranslationResult {
  success: boolean;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  summary: string;
  fileName: string;
}

interface AnalysisResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  fileType: string;
  aiAnalysis: {
    contentAnalysis: unknown;
    technicalAnalysis: unknown;
    contentSummary: unknown;
    recommendations: string[];
    suitability: unknown;
  };
  technicalData: {
    mediaInfo: unknown;
    mediaConchReport: string;
  };
}

export default function FunctionalDashboard() {
  const t = useTranslations('DashboardPage');
  const { user, loading } = useAuth();
  const [result, setResult] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState('es');
  const [currentAction, setCurrentAction] = useState<string>('');
  const [speakers, setSpeakers] = useState<string>('');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed'>('detailed');
  const [targetLanguage, setTargetLanguage] = useState('en');

  // Demo mode - skip authentication
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!isDemoMode) {
    if (loading) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando Annalogica...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return <Login />;
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 50));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 50));
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const callAPI = async (endpoint: string, formData: FormData) => {
    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error calling ${endpoint}`);
    }

    return response.json();
  };

  const handleActionClick = async (action: string) => {
    if (selectedFiles.length === 0) {
      setError('Por favor selecciona al menos un archivo');
      return;
    }

    setCurrentAction(action);
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const file = selectedFiles[0]; // Process first file for now
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', currentLanguage);

      let apiResult;

      switch (action) {
        case 'transcribir':
          apiResult = await callAPI('transcribe', formData);
          break;

        case 'identificar':
          formData.append('speakerHints', speakers);
          apiResult = await callAPI('identify-speakers', formData);
          break;

        case 'resumir':
          formData.append('summaryType', summaryType);
          apiResult = await callAPI('summarize', formData);
          break;

        case 'traducir':
          formData.append('targetLanguage', targetLanguage);
          formData.append('sourceLanguage', currentLanguage);
          apiResult = await callAPI('translate', formData);
          break;

        case 'analizar':
          formData.append('analysisType', 'complete');
          apiResult = await callAPI('analyze', formData);
          break;

        default:
          throw new Error('Acción no reconocida');
      }

      setResult({
        action,
        data: apiResult,
        fileName: file.name,
        timestamp: new Date().toISOString()
      });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
    } finally {
      setIsLoading(false);
      setCurrentAction('');
    }
  };

  const formatResultForDisplay = (result: unknown) => {
    if (!result) return null;

    const { action, data } = result as Record<string, unknown>;

    switch (action) {
      case 'transcribir':
        const transcriptionData = data as Record<string, string>;
        return {
          aiAnalysis: {
            transcription: transcriptionData.transcription || '',
            summary: `Transcripción en ${transcriptionData.language || 'idioma detectado'}`,
            speakers: [],
            tags: ['transcripción', transcriptionData.language || 'audio']
          }
        };

      case 'identificar':
        const speakerData = data as Record<string, unknown>;
        return {
          aiAnalysis: {
            transcription: '',
            summary: (speakerData.summary as string) || 'Identificación de oradores',
            speakers: [],
            tags: ['identificación', 'oradores', 'análisis']
          }
        };

      case 'resumir':
        const summaryData = data as Record<string, unknown>;
        return {
          aiAnalysis: {
            transcription: '',
            summary: (summaryData.summary as string) || 'Resumen del contenido',
            speakers: [],
            tags: (summaryData.tags as string[]) || []
          }
        };

      case 'traducir':
        const translationData = data as Record<string, string>;
        return {
          aiAnalysis: {
            transcription: translationData.translatedText || '',
            summary: `Traducido de ${translationData.sourceLanguage} a ${translationData.targetLanguage}`,
            speakers: [],
            tags: ['traducción', translationData.sourceLanguage, translationData.targetLanguage]
          }
        };

      case 'analizar':
        const analysisData = data as Record<string, unknown>;
        return {
          aiAnalysis: {
            transcription: '',
            summary: 'Análisis completo del archivo',
            speakers: [],
            tags: ['análisis', 'técnico']
          },
          technicalData: analysisData.technicalData
        };

      default:
        return {
          aiAnalysis: {
            transcription: '',
            summary: 'Resultado del análisis',
            speakers: [],
            tags: []
          }
        };
    }
  };

  const displayResult = formatResultForDisplay(result);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
          🚀 Modo Demo - Sin autenticación requerida |
          <button
            onClick={() => window.location.reload()}
            className="ml-2 underline hover:no-underline"
          >
            Salir del modo demo
          </button>
        </div>
      )}

      {/* Settings Button - Top Right */}
      <div className={`fixed ${isDemoMode ? 'top-16' : 'top-6'} right-6 z-40`}>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
          <span className="text-sm text-gray-600">Ajustes</span>
          <div className="w-5 h-5 text-gray-600">
            <span>⚙️</span>
          </div>
        </div>
      </div>

      <div className={`flex ${isDemoMode ? 'pt-10' : ''}`} style={{height: '100vh'}}>
        {/* Sidebar */}
        <div className="bg-white border-r border-gray-200 p-6 flex flex-col" style={{width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%', height: '100%'}}>
          {/* Header */}
          <div className="flex items-center mb-6">
            <h1 className="text-3xl text-orange-500 tracking-tight" style={{fontFamily: 'var(--font-orbitron)', fontWeight: '900'}}>anna logica</h1>
          </div>

          {/* File Upload Section */}
          <div className="mb-6">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-500 text-sm">📁</span>
                <h2 className="text-sm font-medium text-gray-900">Carga de Archivos</h2>
              </div>
              <p className="text-xs text-gray-600 mb-3">Sube hasta 50 archivos de audio, video o texto.</p>

              <div className="text-gray-400 mb-3">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-xs text-gray-600 mb-1">Arrastra y suelta hasta 50 archivos aquí</p>
              <p className="text-xs text-gray-500 mb-2">o</p>
              <button className="text-orange-500 text-xs font-medium hover:text-orange-600">
                Selecciona archivos de tu equipo
              </button>
              <input
                id="file-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="audio/*,video/*,.txt,.docx,.pdf"
              />
            </div>
          </div>

          {/* AI Actions Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-orange-500 text-sm">🤖</span>
              <h2 className="text-sm font-medium text-gray-900">Acciones IA</h2>
            </div>
            <p className="text-xs text-gray-600 mb-3">Selecciona archivos y aplica una acción de IA.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Idioma del Contenido</label>
                <select
                  value={currentLanguage}
                  onChange={(e) => setCurrentLanguage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="auto">Detección automática</option>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ca">Català</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleActionClick('transcribir')}
                  disabled={isLoading}
                  className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  📝 Transcribir
                </button>
                <button
                  onClick={() => handleActionClick('identificar')}
                  disabled={isLoading}
                  className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  👥 Identificar Oradores
                </button>
              </div>

              <button
                onClick={() => handleActionClick('resumir')}
                disabled={isLoading}
                className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                📋 Resumir y Etiquetar
              </button>

              <div className="flex items-center gap-3 text-xs mb-2">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="summary"
                    className="accent-orange-500 scale-75"
                    checked={summaryType === 'short'}
                    onChange={() => setSummaryType('short')}
                  />
                  <span className="text-gray-700">Corto</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="summary"
                    className="accent-orange-500 scale-75"
                    checked={summaryType === 'detailed'}
                    onChange={() => setSummaryType('detailed')}
                  />
                  <span className="text-gray-700">Detallado</span>
                </label>
              </div>

              <input
                type="text"
                placeholder="Pistas de oradores (ej: Ana, Juan)"
                value={speakers}
                onChange={(e) => setSpeakers(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-2"
              />

              <button
                onClick={() => handleActionClick('traducir')}
                disabled={isLoading}
                className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 mb-2"
              >
                🌐 Traducir
              </button>

              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-3"
              >
                <option value="en">Inglés</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="ca">Català</option>
              </select>

              <button
                onClick={() => handleActionClick('analizar')}
                disabled={isLoading}
                className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                📊 Analizar Fichero
              </button>
            </div>
          </div>

        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto" style={{height: '100%'}}>
          <div className="mb-6" style={{height: '28px'}}></div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{height: 'calc(100vh - 200px)', minHeight: '500px'}}>
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-500 text-sm">📁</span>
                <h2 className="text-sm font-medium text-gray-900">Archivos</h2>
              </div>
              <p className="text-xs text-gray-600">Archivos cargados y resultados del procesamiento</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mb-4 rounded-md text-xs">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 mx-4 mb-4 rounded-md flex items-center gap-3 text-xs">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando {currentAction}...</span>
              </div>
            )}

            {displayResult ? (
              <div className="px-4 py-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900">Resultados del Análisis</h3>
                    <button
                      onClick={() => setResult(null)}
                      className="px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-xs"
                    >
                      Analizar otro archivo
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <SummaryView aiAnalysis={displayResult.aiAnalysis} />
                      <TranscriptionView aiAnalysis={displayResult.aiAnalysis} />
                    </div>
                    <div className="space-y-6">
                      <TagsView aiAnalysis={displayResult.aiAnalysis} />
                      {/* <MetadataView result={displayResult as unknown} /> */}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" className="rounded border-gray-300 scale-75" />
                    <span className="text-xs font-medium text-gray-900 flex-1">Nombre Archivo</span>
                    <span className="text-xs font-medium text-gray-600 text-center" style={{minWidth: '80px'}}>Estado</span>
                    <span className="text-xs font-medium text-gray-600">Acciones</span>
                  </div>
                </div>

                {selectedFiles.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="px-4 py-3 flex items-center gap-4">
                        <input type="checkbox" className="rounded border-gray-300 scale-75" />
                        <span className="flex-1 text-xs text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500 text-center" style={{minWidth: '80px'}}>Cargado</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-500">Aún no has subido ningún archivo.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}