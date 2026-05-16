import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db as firebaseDb, hubAppId as appId, signInAnonymously, onAuthStateChanged } from '../lib/firebase';

// --- Configuração Firebase (centralizada em lib/firebase.js) ---
const STORAGE_KEY = 'calendario-redes-sociais-posts-v2';

const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getErrorMessage = (error, fallback = 'Não foi possível concluir a operação. Tente novamente.') => {
    return error instanceof Error ? error.message : fallback;
};

const normalizePost = (post) => ({
    id: post.id || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: post.date || formatDateKey(new Date()),
    time: post.time || '09:00',
    platform: post.platform || 'Instagram',
    contentFormat: post.contentFormat || post.positioning || 'Feed',
    formatPrompt: post.formatPrompt || '',
    status: post.status || 'Ideia',
    title: post.title || 'Post sem título',
    description: post.description || ''
});

const groupPostsByDate = (postList) => {
    const grouped = {};
    postList.map(normalizePost).forEach(post => {
        if (!grouped[post.date]) grouped[post.date] = [];
        grouped[post.date].push(post);
        grouped[post.date].sort((a, b) => `${a.time}-${a.title}`.localeCompare(`${b.time}-${b.title}`));
    });
    return grouped;
};

const flattenPosts = (postsByDate) => Object.values(postsByDate).flat();

const loadLocalPosts = () => {
    if (typeof window === 'undefined') return {};
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return saved ? groupPostsByDate(JSON.parse(saved)) : {};
    } catch {
        return {};
    }
};

const parseCsvLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];
        if (char === '"' && next === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
            cells.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    cells.push(current.trim());
    return cells;
};

const escapeCsv = (value = '') => `"${String(value).replace(/"/g, '""')}"`;

const CONTENT_FORMATS = ['Feed', 'Reels', 'Carrossel', 'Stories', 'Shorts', 'Live', 'Blog'];

const FORMAT_PROMPTS = {
    Feed: 'Crie uma publicação de feed com título claro, legenda objetiva, contexto do problema, solução prática e chamada para ação natural.',
    Reels: 'Crie um roteiro de Reels curto com gancho nos 3 primeiros segundos, cenas em sequência, fala principal, sugestão visual e chamada para ação no final.',
    Carrossel: 'Crie um carrossel com estrutura de slides: capa forte, desenvolvimento em passos simples, exemplo prático, resumo e chamada para ação no último slide.',
    Stories: 'Crie uma sequência de Stories com abertura, enquete ou interação, entrega rápida de valor, prova/contexto e chamada para responder ou clicar no link.',
    Shorts: 'Crie um roteiro vertical curto para YouTube Shorts com gancho rápido, uma ideia central, ritmo dinâmico e fechamento direto.',
    Live: 'Crie um roteiro de live com promessa clara, tópicos principais, ordem da apresentação, momentos de interação e chamada para oferta ou próximo passo.',
    Blog: 'Crie uma estrutura de artigo para blog com título SEO, introdução, subtítulos, pontos principais, conclusão e chamada para ação.'
};

const getFormatPrompt = (format) => FORMAT_PROMPTS[format] || FORMAT_PROMPTS.Feed;

const buildImagePrompt = ({ title, description, style }) => (
    `Imagem profissional para redes sociais, inspirada no tema "${title}". Contexto visual: "${description}". Estilo: ${style}. Composição limpa, alta qualidade, boa iluminação, visual adequado para post comercial. Regra obrigatória: não inserir letras, palavras, números, frases, logotipos, placas, legendas, marcas d'água ou qualquer texto visível na imagem. --no text --no words --no letters --no numbers --no typography --no watermark`
);

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

// --- Ícones (SVG Inline para não depender de libs externas que quebram) ---
const Icons = {
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="16" /><line x1="8" x2="16" y1="12" y2="12" /></svg>,
    Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>,
    Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
    Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
    Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
    X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c.3 0 .5.2.8.4l.4.5.5.8c.2.3.4.5.8.5s.6-.2.8-.5l.5-.8.4-.5c.2-.3.5-.4.8-.4s.5.2.8.4l.4.5.5.8c.2.3.4.5.8.5s.6-.2.8-.5l.5-.8.4-.5c.2-.3.5-.4.8-.4s.5.2.8.4l.4.5.5.8c.2.3.4.5.8.5s.6-.2.8-.5l.5-.8.4-.5c.2-.3.5-.4.8-.4s-.5-.2-.8-.4l-.4-.5-.5-.8c-.2-.3-.4-.5-.8-.5s-.6.2-.8.5l-.5.8-.4.5c-.2.3-.5.4-.8.4s-.5-.2-.8-.4l-.4-.5-.5-.8c-.2-.3-.4-.5-.8-.5s-.6.2-.8.5l-.5.8-.4.5c-.2.3-.5.4-.8.4s-.5-.2-.8-.4l-.4-.5-.5-.8c-.2-.3-.4-.5-.8-.5s-.6.2-.8.5l-.5.8-.4.5c-.2.3-.5.4-.8.4s-.5-.2-.8-.4l-.4-.5-.5-.8c-.2-.3-.4-.5-.8-.5s-.6.2-.8.5l-.5.8-.4.5c-.2.3-.5.4-.8.4" /><path d="M21 12c0 .3-.2.5-.4.8l-.5.4-.8.5c-.3.2-.5.4-.5.8s.2.6.5.8l.8.5.5.4c.3.2.4.5.4.8s-.2.5-.4.8l-.5.4-.8.5c-.3.2-.5.4-.5.8s.2.6.5.8l.8.5.5.4c.3.2.4.5.4.8s-.2.5-.4.8l-.5.4-.8.5c-.3.2-.5.4-.5.8s.2.6.5.8l.8.5.5.4c.3.2.4.5.4.8" /><path d="M3 12c0-.3.2-.5.4-.8l.5-.4.8-.5c.3-.2.5-.4.5-.8s-.2-.6-.5-.8l-.8-.5-.5-.4c-.3-.2-.4-.5-.4-.8s.2-.5.4-.8l.5-.4.8-.5c.3-.2.5-.4.5-.8s-.2-.6-.5-.8l-.8-.5-.5-.4c-.3-.2-.4-.5-.4-.8s.2-.5.4-.8l.5-.4.8-.5c.3-.2.5-.4.5-.8s-.2-.6-.5-.8l-.8-.5-.5-.4c-.3-.2-.4-.5-.4-.8s.2-.5.4-.8l.5-.4.8-.5c.3-.2.5-.4.5-.8s-.2-.6-.5-.8l-.8-.5-.5-.4c-.3-.2-.4-.5-.4-.8s.2-.5.4-.8l.5-.4.8-.5c.3-.2.5-.4.5-.8s-.2-.6-.5-.8l-.8-.5-.5-.4c-.3-.2-.4-.5-.4-.8s.2-.5.4-.8l.5-.4.8-.5c.3-.2.5-.4.5-.8s-.2-.6-.5-.8l-.8-.5-.5-.4c-.3-.2-.4-.5-.4-.8" /></svg>,
    Lightbulb: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.35 6.64A7.5 7.5 0 1 0 8.66 17.35V19a2 2 0 0 0 2 2h2.66a2 2 0 0 0 2-2v-1.65Z"/><path d="M12 6V3"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
    Spinner: () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>,
    Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
    Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
};

// --- API Helpers ---
const callGeminiAPI = async (contents, tools = null, generationConfig = null) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = { contents };
    if (tools) payload.tools = tools;
    if (generationConfig) payload.generationConfig = generationConfig;

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) return await response.json();
            if (response.status === 429 || response.status >= 500) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error?.message || "Erro na API do Gemini");
            }
        } catch (error) {
              if (i < 4) { await new Promise(resolve => setTimeout(resolve, delay)); delay *= 2; } 
             else { throw error; }
        }
    }
};

const callImagenAPI = async (prompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error?.message || 'Erro ao gerar imagem.');
        }
        const result = await response.json();
        return result.predictions?.[0]?.bytesBase64Encoded;
    } catch (error) { throw error; }
};

// --- UI Components ---

// Toast Notification System
const ToastContainer = ({ toasts, removeToast }) => (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-out translate-x-0 opacity-100 ${
                toast.type === 'success' ? 'bg-white dark:bg-gray-800 border-emerald-500 text-gray-800 dark:text-gray-100' : 
                toast.type === 'error' ? 'bg-white dark:bg-gray-800 border-red-500 text-gray-800 dark:text-gray-100' : 'bg-white dark:bg-gray-800 border-blue-500 text-gray-800 dark:text-gray-100'
            }`}>
                {toast.type === 'success' ? <Icons.Check /> : toast.type === 'error' ? <Icons.Alert /> : <Icons.Sparkles />}
                <p className="text-sm font-medium">{toast.message}</p>
                <button onClick={() => removeToast(toast.id)} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><Icons.X /></button>
            </div>
        ))}
    </div>
);

const Button = ({ children, onClick, disabled, variant = 'primary', className = '', type = 'button' }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
    const variants = {
        primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-md hover:shadow-lg dark:bg-emerald-700 dark:hover:bg-emerald-600",
        secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600",
        ghost: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
        danger: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50",
        purple: "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 shadow-md dark:bg-purple-700 dark:hover:bg-purple-600"
    };

    return (
        <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
            {disabled && variant !== 'ghost' ? <Icons.Spinner /> : children}
        </button>
    );
};

const Card = ({ children, className = '', title }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}>
        {title && <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h2></div>}
        <div className="p-6">{children}</div>
    </div>
);

const IdeaGenerator = ({ onSchedule, addToast, topic, setTopic, researchContext }) => {
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateIdeas = async (e) => {
        e.preventDefault();
        if (!topic.trim()) {
            addToast("Digite um tópico para gerar ideias.", "error");
            return;
        }

        setIsLoading(true);
        setIdeas([]);

        const jsonSchema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    "title": { "type": "STRING" },
                    "description": { "type": "STRING" },
                    "contentFormat": { "type": "STRING" },
                    "formatPrompt": { "type": "STRING" },
                    "suggestion_type": { "type": "STRING" }
                },
                required: ["title", "description"]
            }
        };
        const generationConfig = { responseMimeType: "application/json", responseSchema: jsonSchema };
        const prompt = `Gere 5 ideias profissionais de postagens para mídias sociais sobre o tópico "${topic}". ${researchContext ? `Use também este contexto de pesquisa: "${researchContext}".` : ''} Responda em português do Brasil, com títulos claros, descrições acionáveis, um tipo de conteúdo como educativo, prova social, oferta, bastidores ou autoridade, um contentFormat entre ${CONTENT_FORMATS.join(', ')} e um formatPrompt específico para esse formato. Prompts base por formato: Reels: ${getFormatPrompt('Reels')} Carrossel: ${getFormatPrompt('Carrossel')} Stories: ${getFormatPrompt('Stories')} Feed: ${getFormatPrompt('Feed')}`;
        
        try {
            const result = await callGeminiAPI([{ parts: [{ text: prompt }] }], null, generationConfig);
            const resultText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) {
                setIdeas(JSON.parse(resultText));
                addToast("Ideias geradas com sucesso.", "success");
            } else {
                throw new Error("A IA não retornou ideias.");
            }
        } catch (error) {
            console.error("Erro:", error);
            addToast(`Não foi possível gerar ideias: ${getErrorMessage(error)}`, "error");
        }
        setIsLoading(false);
    };

    return (
        <Card title="Gerador de Ideias" className="h-full">
            <HelperBox title="Quando usar">
                Use esta área quando você quer ideias soltas antes de montar o calendário completo.
            </HelperBox>
            <form onSubmit={handleGenerateIdeas} className="flex flex-col sm:flex-row gap-2 mb-4">
                <textarea
                    value={topic} 
                    onChange={e => setTopic(e.target.value)} 
                    placeholder="Ex: marketing para clínicas odontológicas" 
                    rows="2"
                    className="flex-grow rounded-lg border-gray-200 bg-gray-50 px-4 py-2 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600 dark:focus:border-emerald-500 dark:placeholder-gray-400"
                />
                <Button type="submit" disabled={isLoading} variant="purple">
                    {isLoading ? 'Gerando...' : <><Icons.Lightbulb/> Gerar</>}
                </Button>
            </form>
            <HelperText>Exemplo bom: “conteúdos para vender limpeza de pele para mulheres de 30 a 50 anos no Instagram”.</HelperText>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {ideas.length === 0 && !isLoading && (
                    <div className="text-center text-gray-400 py-8 italic">
                        Digite um tema para gerar ideias de conteúdo.
                    </div>
                )}
                {ideas.map((idea, i) => (
                    <div key={i} className="group relative rounded-xl border border-gray-100 bg-white p-4 transition-all hover:shadow-md hover:border-emerald-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-emerald-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{idea.title}</h4>
                                <span className="inline-block mt-1 text-xs bg-purple-50 text-purple-700 font-medium px-2 py-0.5 rounded-full dark:bg-purple-900/50 dark:text-purple-300">{idea.suggestion_type}</span>
                            </div>
                            <button onClick={() => onSchedule({ title: idea.title, description: idea.description, contentFormat: idea.contentFormat || 'Feed', formatPrompt: idea.formatPrompt || getFormatPrompt(idea.contentFormat || 'Feed') })} className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900">
                                Usar
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed dark:text-gray-300">{idea.description}</p>
                        {idea.contentFormat && <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{idea.contentFormat}</p>}
                    </div>
                ))}
            </div>
        </Card>
    );
};

const CalendarBlockGenerator = ({ topic, researchContext, onApprove, addToast }) => {
    const [brief, setBrief] = useState('');
    const [objective, setObjective] = useState('Gerar autoridade e atrair leads');
    const [startDate, setStartDate] = useState(formatDateKey(new Date()));
    const [durationDays, setDurationDays] = useState(30);
    const [postsPerWeek, setPostsPerWeek] = useState(5);
    const [platforms, setPlatforms] = useState('Instagram, LinkedIn');
    const [formats, setFormats] = useState('Reels, Carrossel, Stories, Feed');
    const [tone, setTone] = useState('Profissional, claro e direto');
    const [previewPosts, setPreviewPosts] = useState([]);
    const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (topic && !brief) setBrief(topic);
    }, [topic, brief]);

    const toggleCsvValue = (current, value) => {
        const items = current.split(',').map(item => item.trim()).filter(Boolean);
        const next = items.includes(value) ? items.filter(item => item !== value) : [...items, value];
        return next.join(', ');
    };

    const handleGenerateCalendar = async (e) => {
        e.preventDefault();
        if (!brief.trim()) {
            addToast("Preencha o tema ou contexto do calendário.", "error");
            return;
        }

        const totalPosts = Math.max(1, Math.round((Number(durationDays) / 7) * Number(postsPerWeek)));
        const endDate = formatDateKey(addDays(new Date(`${startDate}T12:00:00`), Number(durationDays) - 1));
        setIsGeneratingCalendar(true);
        setPreviewPosts([]);

        const jsonSchema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    "date": { "type": "STRING" },
                    "time": { "type": "STRING" },
                    "platform": { "type": "STRING" },
                    "contentFormat": { "type": "STRING" },
                    "formatPrompt": { "type": "STRING" },
                    "status": { "type": "STRING" },
                    "title": { "type": "STRING" },
                    "description": { "type": "STRING" }
                },
                required: ["date", "time", "platform", "contentFormat", "formatPrompt", "status", "title", "description"]
            }
        };
        const generationConfig = { responseMimeType: "application/json", responseSchema: jsonSchema };
        const prompt = `Crie um calendário editorial com ${totalPosts} posts entre ${startDate} e ${endDate}.
Tema/contexto: "${brief}".
Objetivo: "${objective}".
Tom de voz: "${tone}".
Plataformas disponíveis: "${platforms}".
Formatos/posicionamentos disponíveis: "${formats}".
Contexto de pesquisa complementar: "${researchContext || 'Não informado'}".
Prompts específicos por formato:
- Feed: ${getFormatPrompt('Feed')}
- Reels: ${getFormatPrompt('Reels')}
- Carrossel: ${getFormatPrompt('Carrossel')}
- Stories: ${getFormatPrompt('Stories')}
- Shorts: ${getFormatPrompt('Shorts')}
- Live: ${getFormatPrompt('Live')}
- Blog: ${getFormatPrompt('Blog')}
Regras: distribua os posts ao longo do período, varie plataformas e formatos, alterne pilares como educação, autoridade, prova social, relacionamento e oferta. Use datas no formato YYYY-MM-DD, horários no formato HH:mm, status sempre "Ideia", contentFormat deve ser um dos formatos disponíveis, formatPrompt deve trazer o prompt específico adaptado ao post, títulos objetivos e descrições com orientação prática para legenda, roteiro ou sequência. Responda apenas no JSON solicitado.`;

        try {
            const result = await callGeminiAPI([{ parts: [{ text: prompt }] }], null, generationConfig);
            const resultText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!resultText) throw new Error("A IA não retornou o calendário.");
            const parsed = JSON.parse(resultText).map(normalizePost);
            setPreviewPosts(parsed);
            addToast("Calendário gerado. Revise antes de inserir.", "success");
        } catch (error) {
            addToast(`Não foi possível gerar o calendário: ${getErrorMessage(error)}`, "error");
        }
        setIsGeneratingCalendar(false);
    };

    const handleApprove = async () => {
        if (!previewPosts.length) {
            addToast("Gere um calendário antes de aprovar.", "error");
            return;
        }
        const saved = await onApprove(previewPosts);
        if (saved) {
            setPreviewPosts([]);
            addToast("Posts inseridos no calendário.", "success");
        }
    };

    return (
        <Card title="Gerador de Calendário">
            <HelperBox title="Fluxo recomendado">
                Preencha o tema, escolha objetivo, período e plataformas. Depois gere a prévia, revise os posts e só então aprove para colocar tudo no calendário.
            </HelperBox>
            <form onSubmit={handleGenerateCalendar} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Tema, oferta ou contexto</label>
                    <textarea value={brief} onChange={e => setBrief(e.target.value)} rows="3" className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 focus:bg-white focus:border-emerald-500 outline-none transition-all resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600" placeholder="Ex: calendário de 30 dias para vender mentoria de tráfego pago para pequenos negócios"></textarea>
                    <HelperText>Quanto mais específico, melhor. Inclua nicho, público, produto e resultado desejado.</HelperText>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 dark:text-gray-400">Objetivo principal</label>
                    <div className="flex flex-wrap gap-2">
                        {['Atrair clientes', 'Ganhar autoridade', 'Vender uma oferta', 'Engajar seguidores'].map(option => (
                            <ChoicePill key={option} active={objective === option} onClick={() => setObjective(option)}>{option}</ChoicePill>
                        ))}
                    </div>
                    <HelperText>Escolha o resultado principal que você espera desse calendário.</HelperText>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Início</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-lg border-gray-200 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Dias</label>
                        <input type="number" min="7" max="90" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="w-full rounded-lg border-gray-200 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Posts/semana</label>
                        <input type="number" min="1" max="14" value={postsPerWeek} onChange={e => setPostsPerWeek(e.target.value)} className="w-full rounded-lg border-gray-200 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 dark:text-gray-400">Período rápido</label>
                        <div className="flex flex-wrap gap-2">
                            {[7, 15, 30].map(days => (
                                <ChoicePill key={days} active={Number(durationDays) === days} onClick={() => setDurationDays(days)}>{days} dias</ChoicePill>
                            ))}
                        </div>
                        <HelperText>Para começar, 15 dias costuma ser o melhor equilíbrio.</HelperText>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 dark:text-gray-400">Frequência</label>
                        <div className="flex flex-wrap gap-2">
                            <ChoicePill active={Number(postsPerWeek) === 3} onClick={() => setPostsPerWeek(3)}>Leve</ChoicePill>
                            <ChoicePill active={Number(postsPerWeek) === 5} onClick={() => setPostsPerWeek(5)}>Normal</ChoicePill>
                            <ChoicePill active={Number(postsPerWeek) === 7} onClick={() => setPostsPerWeek(7)}>Intensa</ChoicePill>
                        </div>
                        <HelperText>Leve = 3 posts/semana, normal = 5, intensa = 7.</HelperText>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 dark:text-gray-400">Onde publicar</label>
                    <div className="flex flex-wrap gap-2">
                        {['Instagram', 'LinkedIn', 'TikTok', 'YouTube Shorts', 'Facebook', 'Blog'].map(option => (
                            <ChoicePill key={option} active={platforms.split(',').map(item => item.trim()).includes(option)} onClick={() => setPlatforms(toggleCsvValue(platforms, option))}>{option}</ChoicePill>
                        ))}
                    </div>
                    <HelperText>Marque apenas os canais que você realmente pretende alimentar.</HelperText>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:bg-gray-800/60 dark:border-gray-700">
                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex w-full items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-200">
                        Opções avançadas
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{showAdvanced ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                    {showAdvanced && (
                        <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Formatos</label>
                                    <input value={formats} onChange={e => setFormats(e.target.value)} className="w-full rounded-lg border-gray-200 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                    <HelperText>Exemplo: Reels, Carrossel, Stories, Feed.</HelperText>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Tom de voz</label>
                                    <input value={tone} onChange={e => setTone(e.target.value)} className="w-full rounded-lg border-gray-200 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                    <HelperText>Exemplo: profissional, simples, direto e sem exageros.</HelperText>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Objetivo personalizado</label>
                                <input value={objective} onChange={e => setObjective(e.target.value)} className="w-full rounded-lg border-gray-200 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                <HelperText>Use quando os botões de objetivo não forem específicos o bastante.</HelperText>
                            </div>
                        </div>
                    )}
                </div>
                <Button type="submit" disabled={isGeneratingCalendar} variant="primary" className="w-full">
                    {isGeneratingCalendar ? 'Gerando calendário...' : 'Gerar calendário em bloco'}
                </Button>
                <HelperText>O app ainda não publica sozinho. Ele organiza o planejamento para você revisar e usar.</HelperText>
            </form>

            {previewPosts.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Prévia para aprovação</h3>
                        <Button onClick={handleApprove} variant="primary">Aprovar e inserir</Button>
                    </div>
                    <HelperText>Revise títulos, datas e formatos. Depois de aprovar, os posts entram no Meu calendário.</HelperText>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                        {previewPosts.map((post, index) => (
                            <div key={`${post.date}-${post.time}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:bg-gray-700/60 dark:border-gray-600">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-300">{post.date}</span>
                                    <span>{post.time}</span>
                                    <span>{post.platform}</span>
                                    <span>{post.contentFormat}</span>
                                </div>
                                <h4 className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{post.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{post.description}</p>
                                {post.formatPrompt && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{post.formatPrompt}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

const WorkspaceTab = ({ active, title, description, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`text-left rounded-xl border px-4 py-3 transition-all ${
            active
                ? 'border-emerald-500 bg-emerald-50 shadow-sm dark:bg-emerald-900/20 dark:border-emerald-500'
                : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-emerald-700 dark:hover:bg-gray-800/80'
        }`}
    >
        <span className={`block text-sm font-bold ${active ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-800 dark:text-gray-100'}`}>{title}</span>
        <span className="mt-1 block text-xs leading-snug text-gray-500 dark:text-gray-400">{description}</span>
    </button>
);

const ChoicePill = ({ active, children, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            active
                ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
        }`}
    >
        {children}
    </button>
);

const HelperText = ({ children }) => (
    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{children}</p>
);

const HelperBox = ({ title, children }) => (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-900/20">
        <p className="font-bold text-emerald-800 dark:text-emerald-200">{title}</p>
        <p className="mt-1 text-emerald-900/80 dark:text-emerald-100/80">{children}</p>
    </div>
);

const DashboardView = ({ onSchedule, onBulkSchedule, addToast }) => {
    const [activeTool, setActiveTool] = useState('calendar');
    const [researchQuery, setResearchQuery] = useState('');
    const [researchResult, setResearchResult] = useState(null);
    const [ideaTopic, setIdeaTopic] = useState('');
    const [ideaResearchContext, setIdeaResearchContext] = useState('');
    const [isResearching, setIsResearching] = useState(false);
    
    // Image Generation States
    const [postTitle, setPostTitle] = useState('');
    const [postDescription, setPostDescription] = useState('');
    const [postFormat, setPostFormat] = useState('Feed');
    const [imageUrl, setImageUrl] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageStyle, setImageStyle] = useState('Fotografia');
    const [imagePrompt, setImagePrompt] = useState('');

    const handleResearch = async (e) => {
        e.preventDefault();
        if (!researchQuery.trim()) {
            addToast("Digite um assunto para pesquisar.", "error");
            return;
        }
        setIsResearching(true);
        setResearchResult(null);
        
        try {
            const result = await callGeminiAPI(
                [{ parts: [{ text: `Pesquise "${researchQuery}" e crie um resumo profissional em português do Brasil para social media. Traga pontos principais, oportunidades de conteúdo e um ângulo recomendado para postagem.` }] }],
                [{ "google_search": {} }]
            );
            
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                setResearchResult({ text, sources: result?.candidates?.[0]?.groundingMetadata?.groundingAttributions || [] });
                setIdeaTopic(researchQuery);
                setIdeaResearchContext(text);
                addToast("Pesquisa concluída e enviada para o gerador de ideias.", "success");
            } else {
                throw new Error("A pesquisa não retornou conteúdo.");
            }
        } catch(err) {
            addToast(`Não foi possível concluir a pesquisa: ${getErrorMessage(err)}`, "error");
        }
        setIsResearching(false);
    };

    const handleGenerateImage = async () => {
        if (!postTitle.trim()) {
            addToast("Digite um título antes de gerar a imagem.", "error");
            return;
        }
        
        setIsGeneratingImage(true);
        const prompt = `${imagePrompt.trim() || buildImagePrompt({ title: postTitle, description: postDescription, style: imageStyle })}\n\nRegra obrigatória final: a imagem não pode conter nenhum texto visível. Não gerar letras, palavras, frases, números, placas, logotipos, marcas d'água ou tipografia. --no text --no words --no letters --no numbers --no typography --no watermark`;
        
        try {
            const base64 = await callImagenAPI(prompt);
            if (base64) {
                setImageUrl(`data:image/png;base64,${base64}`);
                addToast("Imagem gerada com sucesso.", "success");
            } else {
                throw new Error("A API não retornou imagem.");
            }
        } catch (error) {
            addToast(`Não foi possível gerar a imagem: ${getErrorMessage(error)}`, "error");
        }
        setIsGeneratingImage(false);
    };

    const handleDownloadImage = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `social-post-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast("Download iniciado.", "success");
    };

    const handleUseResearchForIdeas = () => {
        if (!researchResult?.text) return;
        setIdeaTopic(researchQuery);
        setIdeaResearchContext(researchResult.text);
        addToast("Pesquisa enviada para o gerador de ideias.", "success");
    };

    const handleSuggestImagePrompt = () => {
        setImagePrompt(buildImagePrompt({ title: postTitle, description: postDescription, style: imageStyle }));
    };

    const workspaceTabs = [
        { id: 'calendar', title: 'Gerar calendário', description: 'Crie um bloco de posts e aprove antes de inserir.' },
        { id: 'ideas', title: 'Ideias rápidas', description: 'Gere ideias soltas para transformar em posts.' },
        { id: 'research', title: 'Pesquisa IA', description: 'Pesquise contexto e envie para os geradores.' }
    ];

    return (
        <div className="p-4 sm:p-6 space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Bancada de conteúdo</p>
                        <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">Planeje, gere e aprove posts em menos etapas</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Comece pelo calendário em bloco para produzir volume. Use pesquisa e ideias quando precisar aprofundar o tema.</p>
                        <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Ordem sugerida: 1. Gerar calendário  2. Revisar prévia  3. Aprovar  4. Ajustar no Meu calendário.</p>
                    </div>
                    <Button onClick={() => setActiveTool('calendar')} variant="primary" className="w-full lg:w-auto">Gerar calendário</Button>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {workspaceTabs.map(tab => (
                        <WorkspaceTab
                            key={tab.id}
                            active={activeTool === tab.id}
                            title={tab.title}
                            description={tab.description}
                            onClick={() => setActiveTool(tab.id)}
                        />
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-5 items-start">
                <div className="space-y-5">
                    {activeTool === 'calendar' && (
                        <CalendarBlockGenerator topic={ideaTopic} researchContext={ideaResearchContext} onApprove={onBulkSchedule} addToast={addToast} />
                    )}

                    {activeTool === 'ideas' && (
                        <IdeaGenerator onSchedule={onSchedule} addToast={addToast} topic={ideaTopic} setTopic={setIdeaTopic} researchContext={ideaResearchContext} />
                    )}

                    {activeTool === 'research' && (
                        <Card title="Pesquisa Inteligente">
                    <HelperBox title="Quando usar">
                        Use a pesquisa quando você ainda não sabe quais temas abordar ou precisa de contexto antes de gerar ideias.
                    </HelperBox>
                    <form onSubmit={handleResearch} className="flex gap-2">
                        <input type="text" value={researchQuery} onChange={e => setResearchQuery(e.target.value)} placeholder="Ex: tendências de conteúdo para clínicas estéticas" className="flex-grow rounded-lg border-gray-200 bg-gray-50 px-4 py-2 focus:bg-white focus:border-emerald-500 outline-none transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600"/>
                        <Button type="submit" disabled={isResearching} variant="primary">
                            {isResearching ? 'Buscando...' : <><Icons.Search/> Pesquisar</>}
                        </Button>
                    </form>
                    <HelperText>Depois da pesquisa, o resultado é enviado para o gerador de ideias e para o gerador de calendário.</HelperText>
                    
                    {researchResult && (
                        <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-bottom-2 dark:bg-emerald-900/20 dark:border-emerald-800">
                            <h3 className="font-semibold text-emerald-800 mb-2 dark:text-emerald-300">Resumo:</h3>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap dark:text-gray-300">{researchResult.text}</p>
                            <div className="mt-3 pt-3 border-t border-emerald-200 flex justify-end dark:border-emerald-800">
                                <Button variant="secondary" onClick={handleUseResearchForIdeas} className="text-xs py-1">
                                    Usar no gerador de ideias
                                </Button>
                            </div>
                        </div>
                    )}
                        </Card>
                    )}
                </div>

            <Card title="Criador rápido" className="flex flex-col h-full xl:sticky xl:top-24">
                <HelperBox title="Use para post avulso">
                    Esta área é para criar uma publicação individual. Para montar vários dias de conteúdo, use o Gerador de Calendário.
                </HelperBox>
                <div className="space-y-4 flex-grow">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">Título do Post</label>
                            <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)} className="w-full rounded-lg border-gray-200 px-4 py-2 focus:border-emerald-500 outline-none transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600" placeholder="Ex: 5 erros que reduzem seus resultados"/>
                            <HelperText>Escreva o tema principal do post, não precisa ser perfeito.</HelperText>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">Formato</label>
                            <select value={postFormat} onChange={e => setPostFormat(e.target.value)} className="w-full rounded-lg border-gray-200 px-4 py-2 bg-white focus:border-emerald-500 outline-none transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600">
                                {CONTENT_FORMATS.map(format => <option key={format}>{format}</option>)}
                            </select>
                            <HelperText>O formato muda o tipo de texto que a IA deve criar depois.</HelperText>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">Legenda / Texto</label>
                        <textarea value={postDescription} onChange={e => setPostDescription(e.target.value)} rows="5" className="w-full rounded-lg border-gray-200 px-4 py-2 focus:border-emerald-500 outline-none transition-all resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600" placeholder="Escreva a legenda, chamada para ação ou briefing do conteúdo."></textarea>
                        <HelperText>Pode ser um rascunho. Você consegue editar melhor no card do calendário.</HelperText>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 dark:bg-gray-700/50 dark:border-gray-600">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Visual do Post</h3>
                            <select value={imageStyle} onChange={e => setImageStyle(e.target.value)} className="text-sm border-gray-200 rounded-md py-1 px-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                {['Fotografia', '3D', 'Minimalista', 'Neon', 'Aquarela'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="mb-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Prompt da imagem</label>
                                <button type="button" onClick={handleSuggestImagePrompt} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200">
                                    Sugerir prompt
                                </button>
                            </div>
                            <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} rows="3" className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none transition-all resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600" placeholder="Personalize o briefing visual. Regra fixa: a imagem será gerada sem qualquer texto visível."></textarea>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Regra fixa: a imagem gerada não deve conter textos, letras, números, logotipos ou marca d'água.</p>
                            <HelperText>Descreva cena, ambiente, estilo e emoção. Não peça frases dentro da imagem.</HelperText>
                        </div>
                        
                        <div className="relative group min-h-[200px] bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:bg-gray-800 dark:border-gray-600">
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Generated" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button variant="secondary" onClick={handleDownloadImage}><Icons.Download/> Baixar</Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-gray-400 text-center p-4 dark:text-gray-500">
                                    <Icons.Image />
                                    <span className="block text-xs mt-2">A imagem aparecerá aqui</span>
                                </div>
                            )}
                        </div>
                        <Button onClick={handleGenerateImage} disabled={isGeneratingImage || !postTitle} variant="primary" className="w-full mt-3">
                            {isGeneratingImage ? 'Gerando imagem...' : 'Gerar Imagem com IA'}
                        </Button>
                    </div>
                </div>
                <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end dark:border-gray-700">
                    <Button onClick={() => onSchedule({ title: postTitle, description: postDescription, contentFormat: postFormat, formatPrompt: getFormatPrompt(postFormat) })} disabled={!postTitle} variant="primary" className="w-full md:w-auto px-8">
                        Agendar Publicação
                    </Button>
                </div>
            </Card>
        </div>
        </div>
    );
};

// --- Calendar Components ---

const CalendarView = ({ posts, onDayClick, onImport, onExport, addToast, syncMode, isLoadingPosts }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const fileInputRef = useRef(null);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const handleFileImport = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            try {
                const rows = text.split(/\r?\n/).slice(1).map(row => {
                    if (!row.trim()) return null;
                    const cols = parseCsvLine(row);
                    if(cols.length < 4) return null;
                    const hasFormatColumns = cols.length >= 8;
                    const hasStatus = cols.length >= 6;
                    return normalizePost({
                        date: cols[0],
                        time: cols[1],
                        platform: cols[2],
                        contentFormat: hasFormatColumns ? cols[3] : 'Feed',
                        formatPrompt: hasFormatColumns ? cols[4] : '',
                        status: hasFormatColumns ? cols[5] : hasStatus ? cols[3] : 'Ideia',
                        title: hasFormatColumns ? cols[6] : hasStatus ? cols[4] : cols[3],
                        description: hasFormatColumns ? cols[7] : hasStatus ? cols[5] : cols[4]
                    });
                }).filter(Boolean);
                if (!rows.length) throw new Error("Nenhuma linha válida encontrada.");
                onImport(rows);
                addToast(`${rows.length} posts importados.`, "success");
            } catch(err) {
                addToast("Não foi possível importar o CSV. Confira se as colunas estão em ordem: data; horário; plataforma; formato; prompt do formato; status; título; descrição.", "error");
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 capitalize dark:text-gray-100">{monthName}</h2>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg dark:bg-gray-700">
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-white rounded shadow-sm transition dark:text-gray-300 dark:hover:bg-gray-600"><Icons.ChevronLeft/></button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-xs font-semibold px-3 hover:bg-white rounded shadow-sm transition dark:text-gray-300 dark:hover:bg-gray-600">Hoje</button>
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-white rounded shadow-sm transition dark:text-gray-300 dark:hover:bg-gray-600"><Icons.ChevronRight/></button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                     <span className={`text-xs font-semibold px-3 py-1 rounded-full ${syncMode === 'firestore' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                        {isLoadingPosts ? 'Sincronizando...' : syncMode === 'firestore' ? 'Firestore ativo' : 'Modo local'}
                     </span>
                     <input type="file" hidden ref={fileInputRef} accept=".csv" onChange={handleFileImport} />
                     <Button variant="secondary" onClick={onExport}><Icons.Download/> Exportar CSV</Button>
                     <Button variant="secondary" onClick={() => fileInputRef.current.click()}><Icons.Upload/> Importar CSV</Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
                    {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} className="bg-gray-50/50 border-b border-r border-gray-100 dark:bg-gray-800 dark:border-gray-700"></div>)}
                    {Array(days).fill(null).map((_, i) => {
                        const day = i + 1;
                        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dateKey = formatDateKey(dateObj);
                        const dayPosts = posts[dateKey] || [];
                        const isToday = new Date().toDateString() === dateObj.toDateString();

                        return (
                            <div key={day} onClick={() => onDayClick(dateObj)} className={`group relative border-b border-r border-gray-100 p-2 transition-all hover:bg-emerald-50/30 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-700/50 ${isToday ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : ''}`}>
                                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-2 ${isToday ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-700 group-hover:bg-white group-hover:shadow-sm dark:text-gray-300 dark:group-hover:bg-gray-600'}`}>
                                    {day}
                                </div>
                                <div className="space-y-1">
                                    {dayPosts.slice(0, 3).map((post, idx) => (
                                        <div key={idx} className="text-[10px] bg-white border border-emerald-100 text-gray-700 p-1 rounded shadow-sm truncate hover:bg-emerald-600 hover:text-white transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-emerald-600">
                                            <span className="font-bold mr-1 text-emerald-600 group-hover:text-white dark:text-emerald-400">{post.time}</span>
                                            <span className="mr-1">{post.contentFormat}</span>
                                            {post.title}
                                        </div>
                                    ))}
                                    {dayPosts.length > 3 && (
                                        <div className="text-[10px] text-gray-400 text-center font-medium dark:text-gray-500">+ {dayPosts.length - 3} mais</div>
                                    )}
                                </div>
                                <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:bg-emerald-100 p-1 rounded-full dark:text-emerald-400 dark:hover:bg-gray-600">
                                    <Icons.Plus />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Modals (The Polished Ones) ---

const ModalOverlay = ({ children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="absolute inset-0" onClick={onClose}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 dark:bg-gray-800 dark:border dark:border-gray-700">
            {children}
        </div>
    </div>
);

const PostModal = ({ isOpen, onClose, onSave, selectedDate, initialContent, addToast }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [publishDate, setPublishDate] = useState(formatDateKey(new Date()));
    const [time, setTime] = useState('09:00');
    const [platform, setPlatform] = useState('Instagram');
    const [contentFormat, setContentFormat] = useState('Feed');
    const [formatPrompt, setFormatPrompt] = useState(getFormatPrompt('Feed'));
    const [status, setStatus] = useState('Ideia');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialContent?.title || '');
            setDescription(initialContent?.description || '');
            setPublishDate(initialContent?.date || (selectedDate ? formatDateKey(selectedDate) : formatDateKey(new Date())));
            setTime(initialContent?.time || '09:00');
            setPlatform(initialContent?.platform || 'Instagram');
            const nextFormat = initialContent?.contentFormat || 'Feed';
            setContentFormat(nextFormat);
            setFormatPrompt(initialContent?.formatPrompt || getFormatPrompt(nextFormat));
            setStatus(initialContent?.status || 'Ideia');
        }
    }, [isOpen, initialContent, selectedDate]);

    if (!isOpen) return null;

    const handleMagic = async (type) => {
        setIsProcessing(true);
        const prompt = type === 'desc' 
            ? `${formatPrompt}\n\nCrie o conteúdo em português do Brasil para o formato "${contentFormat}". Título: "${title}". Contexto atual: "${description}". Inclua uma chamada para ação natural quando fizer sentido.`
            : `Crie hashtags relevantes em português e termos de mercado para: "${title} - ${description}". Formato: ${contentFormat}. Evite exageros e hashtags genéricas demais.`;
            
        try {
            const res = await callGeminiAPI([{ parts: [{ text: prompt }] }]);
            const txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (txt) {
                setDescription(prev => type === 'desc' ? txt : `${prev}\n\n${txt}`);
                addToast("Texto gerado com sucesso.", "success");
            }
        } catch(e) { addToast(`Não foi possível gerar o texto: ${getErrorMessage(e)}`, "error"); }
        setIsProcessing(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) {
            addToast("Informe o título do post.", "error");
            return;
        }
        onSave({ id: initialContent?.id, title: title.trim(), description: description.trim(), date: publishDate, time, platform, contentFormat, formatPrompt, status });
    };

    const handleFormatChange = (value) => {
        setContentFormat(value);
        setFormatPrompt(getFormatPrompt(value));
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center dark:bg-gray-700/50 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {initialContent?.id ? 'Editar post' : selectedDate?.toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'})}
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><Icons.X/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <HelperBox title={initialContent?.id ? 'Edição completa' : 'Novo post'}>
                    Ajuste data, horário, plataforma, formato, prompt e legenda. Tudo que você salvar aparece no calendário.
                </HelperBox>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Data</label>
                        <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <HelperText>Dia em que o conteúdo deve entrar no calendário.</HelperText>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Horário</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Plataforma</label>
                        <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full mt-1 border rounded-lg p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option>Instagram</option><option>LinkedIn</option><option>TikTok</option><option>YouTube Shorts</option><option>Facebook</option><option>X/Twitter</option><option>Blog</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="w-full mt-1 border rounded-lg p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option>Ideia</option><option>Em produção</option><option>Agendado</option><option>Publicado</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Formato</label>
                        <select value={contentFormat} onChange={e => handleFormatChange(e.target.value)} className="w-full mt-1 border rounded-lg p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {CONTENT_FORMATS.map(format => <option key={format}>{format}</option>)}
                        </select>
                        <HelperText>Escolha se será Reels, Carrossel, Stories, Feed etc.</HelperText>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Prompt do formato</label>
                        <textarea value={formatPrompt} onChange={e => setFormatPrompt(e.target.value)} rows="2" className="w-full mt-1 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600"></textarea>
                        <HelperText>Esse prompt guia a IA quando você clicar em Criar Texto.</HelperText>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Título</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full mt-1 border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600" placeholder="O assunto principal" />
                    <HelperText>Use um título claro. Exemplo: “3 erros que impedem suas vendas pelo Instagram”.</HelperText>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">Legenda</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => handleMagic('desc')} disabled={!title || isProcessing} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 dark:text-purple-400 dark:hover:text-purple-300"><Icons.Sparkles className="w-3 h-3"/> Criar Texto</button>
                            <button type="button" onClick={() => handleMagic('tags')} disabled={!title || isProcessing} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 dark:text-blue-400 dark:hover:text-blue-300"># Hashtags</button>
                        </div>
                    </div>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows="4" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:bg-gray-600"></textarea>
                    <HelperText>Use Criar Texto para gerar legenda, roteiro ou sequência conforme o formato escolhido.</HelperText>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="primary">Salvar Post</Button>
                </div>
            </form>
        </ModalOverlay>
    );
};

// --- Main App Logic ---

export default function App() {
    const [activeView, setActiveView] = useState('dashboard');
    const [posts, setPosts] = useState(loadLocalPosts);
    const [user, setUser] = useState(null);
    const [db, setDb] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const [syncMode, setSyncMode] = useState('firestore');
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);

    // Toast Manager
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    // Firebase Init (centralizado)
    useEffect(() => {
        setDb(firebaseDb);
        const signIn = async () => {
            try {
                await signInAnonymously(auth);
            } catch (e) {
                setSyncMode('local');
                setIsLoadingPosts(false);
                addToast(`Não foi possível autenticar no Firebase. O app continuará em modo local: ${getErrorMessage(e)}`, "error");
            }
        };
        signIn();
        return onAuthStateChanged(auth, setUser);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flattenPosts(posts)));
        } catch (e) {
            console.warn("Não foi possível salvar localmente.", e);
        }
    }, [posts]);

    // Firestore Sync
    useEffect(() => {
        if (!user || !db) return;
        setSyncMode('firestore');
        setIsLoadingPosts(true);
        const postsCol = collection(db, `/artifacts/${appId}/users/${user.uid}/posts`);
        const unsub = onSnapshot(postsCol, (snap) => {
            const data = [];
            snap.forEach(docSnap => {
                data.push(normalizePost({ id: docSnap.id, ...docSnap.data() }));
            });
            setPosts(groupPostsByDate(data));
            setIsLoadingPosts(false);
        }, (err) => {
            setSyncMode('local');
            setIsLoadingPosts(false);
            addToast(`Não foi possível sincronizar com o banco de dados. O app continuará em modo local: ${getErrorMessage(err)}`, "error");
        });
        return () => unsub();
    }, [user, db]);

    // Handlers
    const handleSavePost = async (postData) => {
        const dateKey = postData.date || formatDateKey(activeModal.data.date);
        const payload = normalizePost({ ...postData, date: dateKey });
        const isEditing = Boolean(postData.id);
        try {
            if (!user || !db || syncMode !== 'firestore') {
                setPosts(prev => {
                    const current = flattenPosts(prev);
                    const next = isEditing
                        ? current.map(post => post.id === payload.id ? payload : post)
                        : [...current, payload];
                    return groupPostsByDate(next);
                });
            } else if (isEditing) {
                await updateDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/posts`, payload.id), { ...payload, updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/posts`), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            }
            setActiveModal(null);
            addToast(isEditing ? "Post atualizado com sucesso." : "Post salvo com sucesso.", "success");
        } catch (error) {
            addToast(`Não foi possível salvar o post: ${getErrorMessage(error)}`, "error");
        }
    };

    const handleDeletePost = async (id) => {
        if(window.confirm("Tem certeza de que deseja excluir este post? Esta ação não pode ser desfeita.")) {
            try {
                if (!user || !db || syncMode !== 'firestore') {
                    setPosts(prev => groupPostsByDate(flattenPosts(prev).filter(post => post.id !== id)));
                } else {
                    await deleteDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/posts`, id));
                }
                addToast("Post excluído com sucesso.", "success");
            } catch (error) {
                addToast(`Não foi possível excluir o post: ${getErrorMessage(error)}`, "error");
            }
        }
    };

    const handleImport = async (importedData) => {
        const normalized = importedData.map(normalizePost);
        try {
            if (!user || !db || syncMode !== 'firestore') {
                setPosts(prev => groupPostsByDate([...flattenPosts(prev), ...normalized]));
            } else {
                const batchPromises = normalized.map(post => 
                    addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/posts`), { ...post, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
                );
                await Promise.all(batchPromises);
            }
            return true;
        } catch (error) {
            addToast(`Não foi possível importar os posts: ${getErrorMessage(error)}`, "error");
            return false;
        }
    };

    const handleExport = () => {
        const rows = flattenPosts(posts).sort((a, b) => `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`));
        if (!rows.length) {
            addToast("Não há posts para exportar.", "error");
            return;
        }

        const csv = [
            'date;time;platform;contentFormat;formatPrompt;status;title;description',
            ...rows.map(post => [post.date, post.time, post.platform, post.contentFormat, post.formatPrompt, post.status, post.title, post.description].map(escapeCsv).join(';'))
        ].join('\n');

        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `calendario-redes-sociais-${formatDateKey(new Date())}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast("CSV exportado com sucesso.", "success");
    };

    return (
        <div className={darkMode ? "dark" : ""}>
            <div className="absolute inset-0 bg-gray-50 font-sans text-gray-900 selection:bg-emerald-100 selection:text-emerald-900 dark:bg-gray-900 dark:text-gray-100 dark:selection:bg-emerald-900 dark:selection:text-emerald-100 transition-colors duration-300 overflow-y-auto">
                <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 dark:border-gray-800 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-600 rounded-lg p-1.5 text-white">
                                    <Icons.Sparkles />
                                </div>
                                <span className="font-bold text-xl tracking-tight text-gray-800 dark:text-white">Social<span className="text-emerald-600 dark:text-emerald-400">Pro</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setActiveView('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'dashboard' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                                    Planejar conteúdos
                                </button>
                                <button onClick={() => setActiveView('calendar')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'calendar' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                                    Meu calendário
                                </button>
                                <div className="h-6 w-px bg-gray-200 mx-2 dark:bg-gray-700"></div>
                                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors">
                                    {darkMode ? <Icons.Sun /> : <Icons.Moon />}
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeView === 'dashboard' ? (
                        <DashboardView
                            onSchedule={(content) => { setActiveModal({name: 'post', data: { date: new Date(), content }}); }}
                            onBulkSchedule={async (items) => {
                                const saved = await handleImport(items);
                                if (saved) setActiveView('calendar');
                                return saved;
                            }}
                            addToast={addToast}
                        />
                    ) : (
                        <CalendarView posts={posts} onDayClick={(date) => setActiveModal({name: 'detail', data: { date }})} onImport={handleImport} onExport={handleExport} addToast={addToast} syncMode={syncMode} isLoadingPosts={isLoadingPosts} />
                    )}
                </main>

                <ToastContainer toasts={toasts} removeToast={removeToast} />

                <PostModal 
                    isOpen={activeModal?.name === 'post'} 
                    onClose={() => setActiveModal(null)} 
                    onSave={handleSavePost}
                    selectedDate={activeModal?.data?.date}
                    initialContent={activeModal?.data?.content}
                    addToast={addToast}
                />

                {/* Simple Detail Modal for Calendar Click */}
                {activeModal?.name === 'detail' && (
                    <ModalOverlay onClose={() => setActiveModal(null)}>
                        <div className="p-6 h-[500px] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold dark:text-white">{activeModal.data.date.toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric'})}</h2>
                                <button onClick={() => setActiveModal(null)} className="dark:text-gray-400 dark:hover:text-white"><Icons.X/></button>
                            </div>
                            <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {(posts[formatDateKey(activeModal.data.date)] || []).length === 0 ? (
                                    <div className="text-center text-gray-400 mt-10 dark:text-gray-500">Nenhum post agendado para este dia.</div>
                                ) : (
                                    (posts[formatDateKey(activeModal.data.date)] || []).map(post => (
                                        <div key={post.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-start group hover:border-emerald-200 transition-colors dark:bg-gray-700/50 dark:border-gray-700 dark:hover:border-emerald-500/50">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded dark:bg-emerald-900/50 dark:text-emerald-300">{post.time}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{post.platform}</span>
                                                    <span className="text-xs text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300">{post.contentFormat}</span>
                                                    <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">{post.status}</span>
                                                </div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100">{post.title}</h4>
                                                <p className="text-sm text-gray-600 line-clamp-2 mt-1 dark:text-gray-300">{post.description}</p>
                                                {post.formatPrompt && <p className="text-xs text-gray-500 line-clamp-2 mt-2 dark:text-gray-400">{post.formatPrompt}</p>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setActiveModal({ name: 'post', data: { date: activeModal.data.date, content: post } })} className="text-gray-400 hover:text-emerald-600 transition-colors p-1 dark:text-gray-500 dark:hover:text-emerald-400" title="Editar post"><Icons.Edit/></button>
                                                <button onClick={() => handleDeletePost(post.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 dark:text-gray-600 dark:hover:text-red-400" title="Excluir post"><Icons.Trash/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button onClick={() => setActiveModal({ name: 'post', data: { date: activeModal.data.date } })} variant="primary" className="w-full">Agendar Novo Post</Button>
                            </div>
                        </div>
                    </ModalOverlay>
                )}
            </div>
        </div>
    );
}