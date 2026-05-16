import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mic2, 
  Sparkles, 
  Download, 
  Volume2, 
  FileAudio, 
  Image as ImageIcon, 
  History,
  Clock,
  User,
  X,
  ChevronDown,
  Infinity as InfinityIcon,
  RefreshCcw,
  ShieldAlert,
  Trophy
} from 'lucide-react';

const apiKey = ""; // Injetada pelo ambiente

const DEFAULT_SCRIPT = 'Olá. Esta é uma narração profissional criada no Voice Studio. Use frases curtas, pausas estratégicas e uma mensagem clara para gerar mais presença e compreensão.';

const getErrorMessage = (error, fallback = 'Não foi possível concluir a operação. Tente novamente.') => {
  return error instanceof Error ? error.message : fallback;
};

const getAudioFileName = (voiceName) => {
  const safeVoice = String(voiceName || 'voz')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `voice-studio-${safeVoice || 'audio'}.wav`;
};

// --- UTILS: PCM to WAV (Alta Compatibilidade) ---
const pcmToWav = (pcmBase64, sampleRate = 24000) => {
  try {
    const binaryString = window.atob(pcmBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

    const buffer = new ArrayBuffer(44 + bytes.length);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + bytes.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); 
    view.setUint16(32, 2, true); 
    view.setUint16(34, 16, true); 
    writeString(36, 'data');
    view.setUint32(40, bytes.length, true);

    const pcmDataBuffer = new Uint8Array(buffer, 44);
    pcmDataBuffer.set(bytes);

    return new Blob([buffer], { type: 'audio/wav' });
  } catch (e) {
    console.error("Erro na conversão PCM:", e);
    return null;
  }
};

// --- HELPER: Fetch with Exponential Backoff ---
const fetchWithRetry = async (url, options, maxRetries = 5) => {
  let retries = 0;
  while (retries <= maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return await response.json();
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Servidor ocupado (${response.status})`);
      }
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Erro na API do Gemini");
    } catch (err) {
      retries++;
      if (retries > maxRetries) throw err;
      const delay = Math.pow(2, retries - 1) * 1000;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

const VOICES = [
  { name: "Charon", gender: "M", tone: "Autoridade e Impacto", type: "Elite" },
  { name: "Fenrir", gender: "M", tone: "Rascante e Forte", type: "Cinema" },
  { name: "Kore", gender: "F", tone: "Direta e Corporativa", type: "Padrão" },
  { name: "Schedar", gender: "F", tone: "Assertiva e Liderança", type: "Leadership" },
  { name: "Iapetus", gender: "M", tone: "Racional e Estável", type: "News" },
  { name: "Autonoe", gender: "F", tone: "Analítica e Clara", type: "Documentário" },
  { name: "Puck", gender: "M", tone: "Brincalhão e Enérgico", type: "Narrativa" },
  { name: "Aoede", gender: "F", tone: "Musical e Suave", type: "Lírica" },
  { name: "Leda", gender: "F", tone: "Elegante e Madura", type: "Corporativo" },
  { name: "Orus", gender: "M", tone: "Jovem e Dinâmico", type: "Vendas" },
  { name: "Zephyr", gender: "M", tone: "Leve e Arejado", type: "Meditação" },
  { name: "Callirrhoe", gender: "F", tone: "Acolhedora", type: "Educação" },
  { name: "Enceladus", gender: "M", tone: "Épico e Vibrante", type: "Gaming" },
  { name: "Umbriel", gender: "M", tone: "Misterioso", type: "Ficção" },
  { name: "Algieba", gender: "F", tone: "Sofisticada", type: "Luxury" },
  { name: "Despina", gender: "F", tone: "Rápida e Persuasiva", type: "Marketing" },
  { name: "Erinome", gender: "F", tone: "Suave e Gentil", type: "Kids" },
  { name: "Algenib", gender: "M", tone: "Confiante", type: "Coach" },
  { name: "Rasalgethi", gender: "M", tone: "Robusto", type: "Outdoor" },
  { name: "Laomedeia", gender: "F", tone: "Doce", type: "Storytelling" },
  { name: "Achernar", gender: "M", tone: "Técnico", type: "Tech" },
  { name: "Alnilam", gender: "M", tone: "Clássico", type: "Radio" },
  { name: "Gacrux", gender: "M", tone: "Amigável", type: "Podcast" },
  { name: "Pulcherrima", gender: "F", tone: "Artística", type: "Design" },
  { name: "Achird", gender: "M", tone: "Direto", type: "Instructional" },
  { name: "Zubenelgenubi", gender: "M", tone: "Diplomático", type: "Politics" },
  { name: "Vindemiatrix", gender: "F", tone: "Inspiradora", type: "Health" },
  { name: "Sadachbia", gender: "F", tone: "Enigmática", type: "Cinema" },
  { name: "Sadaltager", gender: "M", tone: "Tradicional", type: "History" },
  { name: "Sulafat", gender: "F", tone: "Rápida", type: "Sports" }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('EDITOR');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [isImproving, setIsImproving] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [storyboard, setStoryboard] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [multimodalFiles, setMultimodalFiles] = useState({ image: null, audio: null });
  const [duration, setDuration] = useState(0);
  const [lastGeneratedAt, setLastGeneratedAt] = useState(null);

  const audioUrl = useMemo(() => {
    return audioBlob ? URL.createObjectURL(audioBlob) : null;
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    const words = script.trim().split(/\s+/).filter(w => !w.startsWith('<') && !w.startsWith('[')).length;
    const wordTime = words * 0.48;
    const breakRegex = /<break\s+time="([\d.]+)s"\s*\/>/g;
    let breakTime = 0, match;
    while ((match = breakRegex.exec(script)) !== null) breakTime += parseFloat(match[1]);
    setDuration(wordTime + breakTime);
  }, [script]);

  const clearError = () => setErrorMessage('');

  const improveScript = async () => {
    if (!script.trim()) {
      setErrorMessage('Digite um roteiro antes de pedir a melhoria com IA.');
      return;
    }
    setIsImproving(true);
    clearError();
    try {
      const systemPrompt = `Você é um diretor de voz profissional para vídeos, aulas, anúncios e narrações comerciais.
      Sua missão é melhorar clareza, ritmo, presença e naturalidade do roteiro.
      Regras:
      1. Mantenha o sentido original.
      2. Use PT-BR natural e profissional.
      3. Melhore frases longas, pontuação e respiração.
      4. Use pausas curtas <break time="0.3s" /> apenas quando ajudarem a compreensão.
      5. Não exagere em dramaticidade, gírias ou comandos agressivos.
      6. Retorne APENAS o texto aprimorado.`;

      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: script }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (result) setScript(result);
    } catch (err) {
      setErrorMessage(`Não foi possível melhorar o roteiro: ${getErrorMessage(err)}`);
    } finally { setIsImproving(false); }
  };

  const synthesize = async () => {
    if (!script.trim()) {
      setErrorMessage('Digite um roteiro antes de gerar o áudio.');
      return;
    }
    setIsSynthesizing(true);
    setAudioBlob(null);
    setLastGeneratedAt(null);
    clearError();
    try {
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: script }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice.name } } }
          }
        })
      });
      const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const pcmData = inlineData?.data;
      if (pcmData) {
        const rateMatch = inlineData?.mimeType?.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
        const blob = pcmToWav(pcmData, sampleRate);
        if (blob) setAudioBlob(blob);
        else throw new Error("Erro ao construir o arquivo WAV.");
        setLastGeneratedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      } else {
        throw new Error("A API não retornou áudio. Tente novamente.");
      }
    } catch (err) {
      setErrorMessage(`Não foi possível gerar o áudio: ${getErrorMessage(err)}`);
    } finally { setIsSynthesizing(false); }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setMultimodalFiles(prev => ({
      ...prev,
      [type]: {
        data: reader.result.split(',')[1],
        mimeType: file.type || (type === 'image' ? 'image/png' : 'audio/mpeg'),
        name: file.name
      }
    }));
    reader.readAsDataURL(file);
  };

  const analyzeMultimodal = async () => {
    if (!multimodalFiles.image || !multimodalFiles.audio) return;
    setIsAnalyzing(true);
    clearError();
    try {
      const prompt = `Aja como uma diretora de voz profissional. Analise o frame e o áudio de referência.
      Gere um roteiro em PT-BR adequado ao visual, com ritmo natural e indicação objetiva de intenção vocal.
      Depois gere um breve storyboard de direção vocal.
      Separe as duas partes usando exatamente a palavra SEPARATOR.`;

      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: multimodalFiles.image.mimeType, data: multimodalFiles.image.data } },
              { inlineData: { mimeType: multimodalFiles.audio.mimeType, data: multimodalFiles.audio.data } }
            ]
          }]
        })
      });
      const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (fullText?.includes('SEPARATOR')) {
        const [newScript, newStory] = fullText.split('SEPARATOR');
        setScript(newScript.trim());
        setStoryboard(newStory.trim());
        setActiveTab('EDITOR');
      } else {
        throw new Error("Falha na formatação multimodal.");
      }
    } catch (err) {
      setErrorMessage(`Não foi possível analisar os arquivos: ${getErrorMessage(err)}`);
    } finally { setIsAnalyzing(false); }
  };

  const downloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getAudioFileName(selectedVoice.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 bg-neutral-950 text-neutral-100 font-sans flex flex-col overflow-hidden">
      {/* Background visual */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[95%] h-[50%] bg-indigo-600/5 blur-[160px] rounded-full" />
      </div>

      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-slate-800 rounded-2xl shadow-xl shadow-indigo-600/10">
            <Mic2 size={22} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-black tracking-tighter text-xl block leading-none uppercase">Voice Studio</span>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.3em]">Narração profissional</span>
          </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-bold transition-all"
        >
          <User size={14} className="text-indigo-400" />
          {selectedVoice.name}
          <ChevronDown size={14} className="opacity-50" />
        </button>
      </header>

      {errorMessage && (
        <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-red-400 text-sm font-medium">
            <ShieldAlert size={18} />
            <span>{errorMessage}</span>
          </div>
          <button onClick={clearError} className="p-1 hover:bg-white/5 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex px-6 pt-4 gap-2 z-20">
        {['EDITOR', 'OUVIDO BIÔNICO'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); clearError(); }}
            className={`flex-1 py-3 text-[10px] tracking-widest font-black rounded-2xl border transition-all ${
              activeTab === tab 
                ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)]' 
                : 'border-neutral-900 text-neutral-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto p-6 pb-24 custom-scrollbar">
        {activeTab === 'EDITOR' ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-[2.5rem] p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Trophy size={16} className="text-indigo-400" />
                  </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Roteiro de voz</span>
                </div>
                <button 
                  onClick={improveScript}
                  disabled={isImproving}
                  className="flex items-center gap-2 px-5 py-2 bg-neutral-800 hover:bg-indigo-500/20 border border-neutral-700 hover:border-indigo-500/40 text-neutral-300 hover:text-indigo-300 rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                >
                  {isImproving ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isImproving ? 'AJUSTANDO...' : 'MELHORAR COM IA'}
                </button>
              </div>

              <textarea 
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Digite aqui o roteiro que será transformado em áudio..."
                className="w-full h-64 bg-transparent text-sm md:text-base leading-relaxed outline-none resize-none placeholder:text-neutral-800 custom-scrollbar font-medium"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 border-t border-neutral-900 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
                    <Clock size={12} className="text-indigo-500" /> 
                    <span>{duration.toFixed(2)}s</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-indigo-500 bg-indigo-500/5 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                    <InfinityIcon size={12} />
                    <span>{script.trim().split(/\s+/).filter(Boolean).length} palavras</span>
                  </div>
                </div>
                
                <button 
                  onClick={synthesize}
                  disabled={isSynthesizing || !script}
                  className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 to-slate-900 text-white rounded-2xl font-black text-xs tracking-widest shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30 uppercase"
                >
                  {isSynthesizing ? (
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCcw size={16} className="animate-spin" />
                       <span>GERANDO ÁUDIO...</span>
                    </div>
                   ) : 'GERAR ÁUDIO'}
                </button>
              </div>
            </div>

            {audioBlob && (
              <div className="bg-gradient-to-br from-slate-900 to-black border border-indigo-500/20 rounded-[2.5rem] p-7 animate-in zoom-in-95 duration-500 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                      <Volume2 className="text-indigo-400" size={32} />
                    </div>
                    <div>
                       <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Áudio pronto {lastGeneratedAt ? `às ${lastGeneratedAt}` : ''}</span>
                       <h3 className="text-lg font-black tracking-tight uppercase">{selectedVoice.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto bg-black/40 p-2.5 rounded-2xl border border-white/5">
                    <audio 
                      controls 
                       src={audioUrl} 
                      className="flex-1 md:w-64 h-8" 
                    />
                    <button 
                       onClick={downloadAudio}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg active:scale-90"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {storyboard && ( activeTab === 'EDITOR' && (
              <div className="bg-neutral-900/20 border border-neutral-800 rounded-[2.5rem] p-8 animate-in fade-in">
                <div className="flex items-center gap-3 mb-6 text-indigo-400">
                  <History size={18} />
                   <h3 className="text-sm font-black uppercase tracking-widest">Guia de direção vocal</h3>
                </div>
                 <div className="text-neutral-400 text-sm md:text-base leading-relaxed whitespace-pre-wrap border-l-2 border-indigo-900 pl-6 ml-2 opacity-90">
                  {storyboard}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
             <div className="bg-neutral-900/40 border border-neutral-800 rounded-[3rem] p-12 text-center backdrop-blur-3xl shadow-2xl">
              <h2 className="text-4xl font-black mb-4 tracking-tighter">Análise de Referência</h2>
              <p className="text-neutral-500 text-sm mb-12 max-w-lg mx-auto">Envie um frame e um áudio/vídeo de referência para a IA sugerir roteiro e direção vocal.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <label className="group relative flex flex-col items-center justify-center h-48 border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 rounded-[2.5rem] bg-neutral-950/50 cursor-pointer transition-all overflow-hidden">
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />
                  <ImageIcon size={40} className={multimodalFiles.image ? 'text-indigo-400' : 'text-neutral-800'} />
                   <span className="text-[10px] font-black mt-4 text-neutral-600 uppercase tracking-widest">Frame de vídeo</span>
                   {multimodalFiles.image?.name && <span className="text-[10px] text-indigo-400 mt-2 max-w-[180px] truncate">{multimodalFiles.image.name}</span>}
                </label>

                <label className="group relative flex flex-col items-center justify-center h-48 border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 rounded-[2.5rem] bg-neutral-950/50 cursor-pointer transition-all overflow-hidden">
                  <input type="file" accept="audio/*,video/*" onChange={(e) => handleFileUpload(e, 'audio')} className="hidden" />
                  <FileAudio size={40} className={multimodalFiles.audio ? 'text-indigo-400' : 'text-neutral-800'} />
                   <span className="text-[10px] font-black mt-4 text-neutral-600 uppercase tracking-widest">Áudio ou vídeo referência</span>
                   {multimodalFiles.audio?.name && <span className="text-[10px] text-indigo-400 mt-2 max-w-[180px] truncate">{multimodalFiles.audio.name}</span>}
                </label>
              </div>

              <button 
                onClick={analyzeMultimodal}
                disabled={isAnalyzing || !multimodalFiles.image || !multimodalFiles.audio}
                className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl text-xs tracking-[0.3em] shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all"
              >
                 {isAnalyzing ? <RefreshCcw size={20} className="animate-spin mx-auto" /> : 'ANALISAR REFERÊNCIA'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Casting Drawer */}
      <div className={`absolute inset-0 z-50 transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-3xl" onClick={() => setIsSidebarOpen(false)} />
        <aside className={`absolute right-0 top-0 h-full w-full max-w-sm bg-neutral-900 border-l border-neutral-800 shadow-2xl transition-transform duration-500 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-8 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
            <div>
              <h2 className="font-black text-2xl tracking-tighter uppercase">Escolher Voz</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">Biblioteca de vozes</p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-2xl transition-all active:scale-90 shadow-lg">
              <X size={22} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto h-[calc(100%-120px)] space-y-3 custom-scrollbar">
            {VOICES.map((v) => (
              <button
                key={v.name}
                onClick={() => { setSelectedVoice(v); setIsSidebarOpen(false); clearError(); }}
                className={`w-full group p-5 rounded-[1.5rem] flex items-center gap-4 border transition-all duration-300 ${
                  selectedVoice.name === v.name 
                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-2xl shadow-indigo-500/10' 
                    : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-inner ${
                  v.gender === 'F' ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20' : 'bg-slate-500/10 text-slate-400 group-hover:bg-slate-500/20'
                }`}>
                  <Volume2 size={22} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black tracking-tight group-hover:text-white transition-colors">{v.name}</span>
                    <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">{v.type}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-medium group-hover:text-neutral-400 transition-colors">{v.tone}</span>
                </div>
                {selectedVoice.name === v.name && (
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_15px_#4f46e5] animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </aside>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #404040; }
        
        audio::-webkit-media-controls-panel { 
          background: rgba(0,0,0,0.8); 
          border-radius: 16px;
          border: 1px solid rgba(79,70,229,0.1);
        }
        audio::-webkit-media-controls-play-button,
        audio::-webkit-media-controls-current-time-display { filter: brightness(0) invert(1); }
      `}</style>
    </div>
  );
};

export default App;