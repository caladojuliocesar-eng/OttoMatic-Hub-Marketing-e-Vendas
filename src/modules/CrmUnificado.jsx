import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Phone, MessageSquare, Copy, Building2, Scissors, Stethoscope, CheckCircle2, AlertCircle, FileText, X, Tag, Activity, Download, Wand2, Image as ImageIcon, Upload, Loader2, BrainCircuit, Target, Search, Plus, Save } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db, hubAppId as appId, signInAnonymously, onAuthStateChanged } from '../lib/firebase';

const initialLeads = [
  {
    id: 1,
    name: "CASA VR | Salão de Beleza",
    niche: "Salão High-Ticket",
    website: "https://www.casavrsalao.com/",
    social: "Instagram: @casavrsalao",
    gmn_comments: "Avaliações 5 estrelas elogiando a estrutura, mas gargalo no WhatsApp.",
    phone: "5519999999999",
    summary: "Salão de beleza com conceito de alta performance e humanizado em Campinas.",
    pain_points: ["Falta de um assistente virtual.", "Equipe grande gera dor de cabeça logística."],
    key_contacts: "Rodolfo Iglesias (Sócio) e Sheila Brunelli.",
    tech: ["Wix/WordPress", "Sem automação visível"],
    score: 9,
    pitch: "Fala Rodolfo, notei que a Casa VR foca muito em um atendimento premium, mas o primeiro contato pelo site ainda depende de humanos. E se a gente colocasse um assistente de IA com a mesma 'vibe' sofisticada do salão para agendar as clientes 24h?",
    status: "prospectar",
    type: "beleza",
    igHandle: "casavrsalao",
    conversation: []
  },
  {
    id: 2,
    name: "Qualis Clínica Odontológica",
    niche: "Invisalign & Reabilitação",
    website: "https://clinicaqualis.com.br/",
    social: "Instagram: @qualisodontologia",
    gmn_comments: "Elogiada pela tradição (14 anos no Taquaral).",
    phone: "551932416847",
    summary: "Clínica tradicional no Taquaral com foco em Reabilitação Oral e Invisalign.",
    pain_points: ["Vendem Invisalign, mas site tem formulário frio.", "Muitos saem sem deixar contato."],
    key_contacts: "Dra. Cunha Bonini e Dr. Matheus Bernardes.",
    tech: ["WordPress", "Linktree sem bot"],
    score: 10,
    pitch: "Dra. Cunha, a Qualis é referência em Invisalign, mas o site depende de um formulário lento. Uma assistente de IA poderia responder às dúvidas iniciais na hora. Posso mostrar como funciona?",
    status: "prospectar",
    type: "odonto",
    igHandle: "qualisodontologia",
    conversation: []
  },
  {
    id: 7,
    name: "Odontologia Moraes",
    niche: "Implantes & Odonto Geral",
    website: "N/A",
    social: "Instagram Local",
    gmn_comments: "Clínica tradicional, muito volume de pacientes.",
    phone: "5519991049897",
    summary: "Foco em volume e atendimento de famílias e pacientes antigos no Cambuí.",
    pain_points: ["Base gigante adormecida.", "Falta de CRM de reativação automática."],
    key_contacts: "Gestão / Recepção Chefe",
    tech: ["WhatsApp Business"],
    score: 7,
    pitch: "Vi que vocês têm um volume imenso de pacientes antigos. Que tal uma IA reativando essa base adormecida para profilaxia de forma 100% automática no WhatsApp?",
    status: "prospectar",
    type: "odonto",
    igHandle: "odontologiamoraes",
    conversation: []
  }
];

const COLUMNS = [
  { id: 'prospectar', title: 'Radar', color: 'bg-slate-800 border-l-4 border-blue-500' },
  { id: 'contato', title: 'Contato Feito', color: 'bg-slate-800 border-l-4 border-yellow-500' },
  { id: 'reuniao', title: 'Reunião', color: 'bg-slate-800 border-l-4 border-purple-500' },
  { id: 'fechado', title: 'Fechado', color: 'bg-slate-800 border-l-4 border-green-500' }
];

const STORAGE_KEY = 'prospect-master-crm-leads-v2';
const EMPTY_LEAD_FORM = {
  name: '',
  niche: '',
  website: '',
  social: '',
  gmn_comments: '',
  phone: '',
  summary: '',
  pain_points: '',
  key_contacts: '',
  tech: '',
  score: '7',
  pitch: '',
  status: 'prospectar',
  type: 'outro',
  igHandle: ''
};

const DEFAULT_COPY = {
  titulo: "O Instagram pode estar deixando oportunidades de agendamento na mesa.",
  subtitulo: "A oportunidade está em traduzir seu serviço em conteúdos que geram confiança antes da consulta.",
  dor_titulo: "A oportunidade: transformar atenção em confiança",
  dor_texto: "O tema já é forte. O que muda é a forma como ele aparece no feed: de uma peça difícil de absorver rapidamente para uma sequência clara e educativa.",
  post_texto: "Conteúdo estratégico focado em atração e conversão. Agende uma avaliação pelo link da bio."
};

const normalizeLead = (lead) => ({
  ...lead,
  conversation: Array.isArray(lead.conversation) ? lead.conversation : [],
  pain_points: Array.isArray(lead.pain_points) ? lead.pain_points : String(lead.pain_points || '').split('\n').map(item => item.trim()).filter(Boolean),
  tech: Array.isArray(lead.tech) ? lead.tech : String(lead.tech || '').split(',').map(item => item.trim()).filter(Boolean),
  score: Number(lead.score || 0)
});

const getLeadPayloadFromForm = (form) => ({
  name: form.name.trim(),
  niche: form.niche.trim(),
  website: form.website.trim() || 'N/A',
  social: form.social.trim(),
  gmn_comments: form.gmn_comments.trim(),
  phone: form.phone.replace(/\D/g, ''),
  summary: form.summary.trim(),
  pain_points: form.pain_points.split('\n').map(item => item.trim()).filter(Boolean),
  key_contacts: form.key_contacts.trim(),
  tech: form.tech.split(',').map(item => item.trim()).filter(Boolean),
  score: Number(form.score || 0),
  pitch: form.pitch.trim(),
  status: form.status,
  type: form.type,
  igHandle: form.igHandle.trim().replace('@', ''),
  conversation: []
});

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getSafeFileName = (name) => {
  const cleaned = String(name || 'lead')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `Proposta_${cleaned || 'lead'}.html`;
};

const loadSavedLeads = () => {
  if (typeof window === 'undefined') return initialLeads.map(normalizeLead);

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialLeads.map(normalizeLead);
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeLead) : initialLeads.map(normalizeLead);
  } catch {
    return initialLeads.map(normalizeLead);
  }
};

const callGeminiJSON = async (apiKey, prompt) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || 'Não foi possível conectar com a IA. Tente novamente em alguns instantes.');
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('A IA não retornou uma resposta válida. Tente gerar novamente.');

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error('A IA retornou uma resposta fora do formato esperado. Tente gerar novamente.');
  }
};

const generateHTML = (lead, copy, images) => {
  const safeLead = {
    name: escapeHtml(lead.name),
    phone: String(lead.phone || '').replace(/\D/g, ''),
    igHandle: escapeHtml(lead.igHandle || 'perfil.oficial')
  };
  const safeCopy = {
    titulo: escapeHtml(copy.titulo),
    subtitulo: escapeHtml(copy.subtitulo),
    dor_titulo: escapeHtml(copy.dor_titulo),
    dor_texto: escapeHtml(copy.dor_texto),
    post_texto: escapeHtml(copy.post_texto)
  };
  const safeImages = images.map(escapeHtml);
  const getImg = (idx) => safeImages[idx] || `https://placehold.co/1080x1350/0f172a/ffffff?text=Slide+${idx+1}`;
  const initials = escapeHtml(String(lead.name || 'CL').substring(0,2).toUpperCase());
  const whatsappText = encodeURIComponent(`Olá, vi a proposta do carrossel e quero seguir com a comunicação da ${lead.name}.`);

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposta Exclusiva | ${safeLead.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; scroll-behavior: smooth; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
        .preview-frame { width: min(100%, 16rem); aspect-ratio: 4 / 5; }
        .instagram-post { box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18); }
        .ig-avatar {
            background: linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4) border-box;
            border: 2px solid transparent;
        }
        .ig-slide { width: 100%; aspect-ratio: 4 / 5; }
        .ig-nav { background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(8px); }
        .ig-dot { width: 6px; height: 6px; transition: transform .2s ease, background .2s ease; }
        .ig-dot.active { transform: scale(1.25); background: #0ea5e9; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased">
    <header class="bg-slate-900 text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div class="max-w-3xl mx-auto relative z-10 text-center">
            <div class="inline-block px-4 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold text-sm mb-6 border border-blue-500/30">
                PROPOSTA EXCLUSIVA PARA: <span class="text-white">${safeLead.name}</span>
            </div>
            <h1 class="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">${safeCopy.titulo}</h1>
            <p class="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">${safeCopy.subtitulo}</p>
        </div>
    </header>

    <section class="max-w-5xl mx-auto px-4 -mt-12 relative z-20 mb-16">
        <div class="glass rounded-2xl shadow-xl p-6 md:p-10 border border-slate-200">
            <h2 class="text-2xl font-bold text-center mb-3">${safeCopy.dor_titulo}</h2>
            <p class="text-center text-slate-600 max-w-2xl mx-auto mb-8">${safeCopy.dor_texto}</p>
            <div class="flex justify-center">
                <div class="flex flex-col items-center">
                    <div class="text-sky-600 font-bold mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-arrow-trend-up text-xl"></i> DIREÇÃO PROPOSTA
                    </div>
                    <div class="preview-frame bg-white rounded-xl overflow-hidden shadow-2xl border-4 border-sky-500 relative transform md:scale-105">
                        <img src="${getImg(0)}" class="w-full h-full object-contain" alt="Arte Proposta">
                    </div>
                    <p class="text-sm text-slate-500 mt-6 text-center px-4 font-semibold max-w-sm">Formato vertical, hierarquia visual e narrativa em etapas tornam a mensagem mais fácil de entender.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="max-w-6xl mx-auto px-4 mb-20">
        <div class="grid lg:grid-cols-[1fr_430px] gap-10 items-center">
            <div class="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
                <span class="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700 mb-5">
                    <i class="fa-brands fa-instagram"></i> SIMULAÇÃO NO FEED
                </span>
                <h2 class="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">Veja como o carrossel aparece para o cliente.</h2>
                <p class="text-slate-600 text-lg mb-6">A primeira imagem capta a atenção. Os próximos slides educam e conduzem o lead para uma decisão consciente e qualificada.</p>
            </div>
            <article class="instagram-post w-full max-w-[430px] mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3">
                    <div class="flex items-center gap-3">
                        <div class="ig-avatar w-10 h-10 rounded-full p-[2px]">
                            <div class="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-extrabold">${initials}</div>
                        </div>
                        <div>
                            <p class="text-sm font-extrabold leading-tight">${safeLead.igHandle}</p>
                            <p class="text-xs text-slate-500 leading-tight">Campinas, SP</p>
                        </div>
                    </div>
                </div>
                <div class="relative bg-white border-y border-slate-100">
                    <div class="absolute top-3 right-3 z-10 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white" data-ig-counter>1/${safeImages.length || 1}</div>
                    <button type="button" class="ig-nav hidden md:flex absolute left-3 top-1/2 z-10 -translate-y-1/2 w-9 h-9 rounded-full text-white items-center justify-center" data-ig-prev><i class="fa-solid fa-chevron-left"></i></button>
                    <button type="button" class="ig-nav hidden md:flex absolute right-3 top-1/2 z-10 -translate-y-1/2 w-9 h-9 rounded-full text-white items-center justify-center" data-ig-next><i class="fa-solid fa-chevron-right"></i></button>
                    <div class="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth" data-ig-track>
                        ${safeImages.length > 0 
                            ? safeImages.map(img => `<div class="ig-slide shrink-0 snap-center bg-white"><img src="${img}" class="w-full h-full object-contain"></div>`).join('')
                            : `<div class="ig-slide shrink-0 snap-center bg-white"><img src="${getImg(0)}" class="w-full h-full object-contain"></div>`
                        }
                    </div>
                </div>
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-4 text-[22px] text-slate-900"><i class="fa-regular fa-heart"></i><i class="fa-regular fa-comment"></i><i class="fa-regular fa-paper-plane"></i></div>
                        <i class="fa-regular fa-bookmark text-[22px] text-slate-900"></i>
                    </div>
                    <p class="text-sm font-bold mb-1">187 curtidas</p>
                    <p class="text-sm leading-snug"><span class="font-extrabold">${safeLead.igHandle}</span> ${safeCopy.post_texto}</p>
                </div>
            </article>
        </div>
    </section>

    <section class="bg-slate-900 text-white py-16 px-6">
        <div class="max-w-3xl mx-auto text-center">
            <h2 class="text-3xl font-bold mb-4">Vamos elevar a percepção do perfil?</h2>
            <p class="text-slate-300 mb-8 text-lg">A proposta é alinhar comunicação, estética e estratégia para que o Instagram reflita melhor a qualidade da ${safeLead.name}.</p>
            <div class="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-lg mx-auto mb-8">
                <a href="https://wa.me/${safeLead.phone}?text=${whatsappText}" target="_blank" rel="noopener noreferrer" class="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition duration-300 text-center text-lg shadow-lg shadow-green-500/30">
                    <i class="fa-brands fa-whatsapp mr-2"></i> Quero Seguir com a Proposta
                </a>
            </div>
        </div>
    </section>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            var track = document.querySelector('[data-ig-track]');
            if (!track) return;
            var slides = Array.from(track.children);
            var counter = document.querySelector('[data-ig-counter]');
            var prev = document.querySelector('[data-ig-prev]');
            var next = document.querySelector('[data-ig-next]');
            var current = 0;
            var ticking = false;
            function update(index) {
                current = Math.max(0, Math.min(index, slides.length - 1));
                if (counter) counter.textContent = (current + 1) + '/' + slides.length;
            }
            function goTo(index) {
                update(index);
                track.scrollTo({ left: current * track.clientWidth, behavior: 'smooth' });
            }
            if (prev) prev.addEventListener('click', function () { goTo(current - 1); });
            if (next) next.addEventListener('click', function () { goTo(current + 1); });
            track.addEventListener('scroll', function () {
                if (ticking) return;
                ticking = true;
                window.requestAnimationFrame(function () {
                    var index = Math.round(track.scrollLeft / track.clientWidth);
                    if (index !== current) update(index);
                    ticking = false;
                });
            });
            update(0);
        });
    </script>
</body>
</html>`;
};

export default function CRMApp() {
  const [leads, setLeads] = useState(loadSavedLeads);
  const [user, setUser] = useState(null);
  const [loadingLeads, setLoadingLeads] = useState(Boolean(db));
  const [syncMode, setSyncMode] = useState(db ? 'firestore' : 'local');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeTab, setActiveTab] = useState('dossie'); // 'dossie', 'ia', 'tutor'
  const [feedback, setFeedback] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState(EMPTY_LEAD_FORM);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const hasSeededFirestoreRef = useRef(false);

  // Estados IA de Copy
  const [promptIA, setPromptIA] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState(DEFAULT_COPY);
  const [uploadedImages, setUploadedImages] = useState([]);

  // Estados do Tutor de Vendas
  const [chatInput, setChatInput] = useState("");
  const [isTutorThinking, setIsTutorThinking] = useState(false);
  const [tutorAdvice, setTutorAdvice] = useState(null);
  const chatEndRef = useRef(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

  useEffect(() => {
    if (!auth) {
      setLoadingLeads(false);
      setSyncMode('local');
      return;
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error('Erro ao autenticar no Firebase.', error);
        setSyncMode('local');
        setLoadingLeads(false);
        showFeedback('Firestore indisponível. Usando salvamento local neste navegador.');
      }
    };

    initAuth();
    return onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (!currentUser) setLoadingLeads(false);
    });
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    setLoadingLeads(true);
    setSyncMode('firestore');

    const leadsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'leads');
    const unsubscribe = onSnapshot(query(leadsRef), async (snapshot) => {
      const firestoreLeads = snapshot.docs.map(item => normalizeLead({ ...item.data(), id: item.id }));

      if (firestoreLeads.length === 0) {
        const starterLeads = initialLeads.map(normalizeLead);
        setLeads(starterLeads);
        setLoadingLeads(false);

        if (!hasSeededFirestoreRef.current) {
          hasSeededFirestoreRef.current = true;
          await Promise.all(starterLeads.map(({ id, ...lead }) => addDoc(leadsRef, {
            ...lead,
            legacyId: id,
            createdAt: serverTimestamp()
          })));
        }
        return;
      }

      setLeads(firestoreLeads);
      setLoadingLeads(false);
    }, (error) => {
      console.error('Erro ao carregar leads do Firestore.', error);
      setSyncMode('local');
      setLoadingLeads(false);
      showFeedback('Não foi possível sincronizar com Firestore. Usando dados locais.');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch (error) {
      console.warn('Não foi possível salvar o CRM no navegador.', error);
    }
  }, [leads]);

  useEffect(() => {
    if (!selectedLead) return;
    const updatedLead = leads.find(lead => lead.id === selectedLead.id);
    if (updatedLead) setSelectedLead(updatedLead);
  }, [leads, selectedLead?.id]);

  const showFeedback = (message) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3600);
  };

  const updateLeadInFirestore = async (leadId, changes) => {
    if (!db || !user || typeof leadId !== 'string') return;

    const leadRef = doc(db, 'artifacts', appId, 'users', user.uid, 'leads', leadId);
    await updateDoc(leadRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
  };

  const moveLead = async (leadId, newStatus) => {
    setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, status: newStatus } : lead));
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus } : prev);
    }
    try {
      await updateLeadInFirestore(leadId, { status: newStatus });
    } catch (error) {
      console.error('Erro ao atualizar status no Firestore.', error);
      showFeedback('Status alterado localmente, mas não foi sincronizado com Firestore.');
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
      showFeedback('Texto copiado.');
    } catch {
      showFeedback('Não foi possível copiar agora. Tente novamente.');
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    if (files.length === 0) return;

    const promises = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises)
      .then(base64Images => {
        setUploadedImages(prev => [...prev, ...base64Images].slice(0, 6));
        showFeedback('Imagens adicionadas à proposta.');
      })
      .catch(() => showFeedback('Não foi possível carregar uma das imagens.'));
  };

  const handleNewLeadChange = (field, value) => {
    setNewLead(prev => ({ ...prev, [field]: value }));
  };

  const createNewLead = async () => {
    if (!newLead.name.trim()) {
      showFeedback('Informe o nome do lead.');
      return;
    }
    if (!newLead.niche.trim()) {
      showFeedback('Informe o nicho ou setor do lead.');
      return;
    }
    if (!newLead.summary.trim()) {
      showFeedback('Informe um resumo comercial do lead.');
      return;
    }

    const payload = normalizeLead(getLeadPayloadFromForm(newLead));
    setIsSavingLead(true);

    try {
      if (db && user) {
        const leadsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'leads');
        const docRef = await addDoc(leadsRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        const createdLead = { ...payload, id: docRef.id };
        setSelectedLead(createdLead);
      } else {
        const createdLead = { ...payload, id: Date.now() };
        setLeads(prev => [createdLead, ...prev]);
        setSelectedLead(createdLead);
      }

      setNewLead(EMPTY_LEAD_FORM);
      setIsNewLeadOpen(false);
      setActiveTab('dossie');
      showFeedback('Lead cadastrado.');
    } catch (error) {
      console.error('Erro ao cadastrar lead.', error);
      showFeedback('Não foi possível cadastrar o lead agora.');
    } finally {
      setIsSavingLead(false);
    }
  };

  // Funções do Tutor de Vendas
  const addMessageToHistory = (role) => {
    if (!selectedLead || !chatInput.trim()) return;
    const newMessage = { role, text: chatInput, id: Date.now() };
    const newConversation = [...(selectedLead.conversation || []), newMessage];
    
    setLeads(prevLeads => {
      const updatedLeads = prevLeads.map(l => {
        if (l.id === selectedLead.id) {
          return { ...l, conversation: newConversation };
        }
        return l;
      });
      setSelectedLead(updatedLeads.find(l => l.id === selectedLead.id));
      return updatedLeads;
    });

    updateLeadInFirestore(selectedLead.id, { conversation: newConversation }).catch(error => {
      console.error('Erro ao salvar conversa no Firestore.', error);
      showFeedback('Mensagem adicionada localmente, mas não foi sincronizada com Firestore.');
    });

    setChatInput("");
    setTutorAdvice(null); // Reseta o conselho anterior ao adicionar nova msg
    
    window.setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const callTutorAPI = async () => {
    if (!selectedLead.conversation || selectedLead.conversation.length === 0) {
      showFeedback('Adicione pelo menos uma mensagem da conversa antes de pedir a análise.');
      return;
    }
    
    setIsTutorThinking(true);
    setTutorAdvice(null);
    setFeedback('');

    const historyText = selectedLead.conversation.map(msg => 
      `${msg.role === 'lead' ? 'CLIENTE' : 'VENDEDOR'}: ${msg.text}`
    ).join('\n');

    try {
      const systemPrompt = `Você é Janete, uma consultora de vendas B2B sênior, direta, objetiva e profissional. O vendedor está tentando vender soluções de marketing/IA para a empresa: ${selectedLead.name} (Nicho: ${selectedLead.niche}). 
      As dores dessa empresa são: ${selectedLead.pain_points.join(', ')}.

      Aqui está o histórico real da conversa no WhatsApp até agora:
      ---
      ${historyText}
      ---
      
      Sua tarefa é agir como uma mentora comercial. 
      Analise a última interação, identifique a objeção real do cliente e entregue uma resposta pronta para o vendedor copiar e colar.
      
      Retorne APENAS um JSON válido com esta estrutura:
      {
        "analise": "Uma análise curta e objetiva sobre a situação atual.",
        "estrategia": "A tática comercial para avançar a conversa.",
        "copy_exata": "O texto exato que o vendedor deve copiar e mandar no WhatsApp agora. Seja persuasivo, direto e finalize com uma pergunta simples."
      }`;

      setTutorAdvice(await callGeminiJSON(apiKey, systemPrompt));
    } catch (error) {
      console.error(error);
      showFeedback(error instanceof Error ? error.message : 'Não foi possível gerar a análise do tutor.');
    } finally {
      setIsTutorThinking(false);
      window.setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const callGeminiAPI_Proposals = async () => {
    if (!selectedLead) return;
    if (!promptIA.trim()) {
      showFeedback('Descreva primeiro o serviço ou proposta que você quer vender.');
      return;
    }
    setIsGenerating(true);
    setFeedback('');
    try {
      const systemPrompt = `Você é Janete, uma copywriter B2B sênior, persuasiva, objetiva e profissional.
      O cliente alvo é: ${selectedLead.name} (Nicho: ${selectedLead.niche}).
      Dores deles: ${selectedLead.pain_points.join(', ')}.
      O vendedor (Thiago) quer focar em: "${promptIA}".
      
      Gere UMA COPY CURTA E PERSUASIVA para uma página web de apresentação de serviço.
      Retorne APENAS um JSON válido com a seguinte estrutura:
      {
        "titulo": "Headline principal (máx 60 caracteres)",
        "subtitulo": "Subheadline de apoio (máx 150 caracteres)",
        "dor_titulo": "Título da seção de dor/problema (máx 40 caracteres)",
        "dor_texto": "Explicação do problema atual do feed e a solução proposta (máx 200 caracteres)",
        "post_texto": "Legenda simulada para o post no instagram"
      }`;

      setGeneratedCopy({ ...DEFAULT_COPY, ...(await callGeminiJSON(apiKey, systemPrompt)) });
      showFeedback('Copy da proposta gerada.');
    } catch (error) {
      console.error(error);
      showFeedback(error instanceof Error ? error.message : 'Não foi possível gerar a copy da proposta.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadHTML = () => {
    if (!selectedLead) return;
    if (uploadedImages.length === 0) {
      showFeedback('Adicione pelo menos uma imagem de carrossel antes de baixar a proposta.');
      return;
    }

    const htmlContent = generateHTML(selectedLead, generatedCopy, uploadedImages);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getSafeFileName(selectedLead.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback('Arquivo HTML gerado.');
  };

  const getIcon = (type) => {
    if (type === 'odonto') return <Stethoscope size={18} className="text-blue-400" />;
    if (type === 'beleza') return <Scissors size={18} className="text-pink-400" />;
    return <Building2 size={18} className="text-gray-400" />;
  };

  const stats = useMemo(() => {
    return {
      total: leads.length,
      prospectar: leads.filter(l => l.status === 'prospectar').length,
      contato: leads.filter(l => l.status === 'contato').length,
      reuniao: leads.filter(l => l.status === 'reuniao').length,
      fechado: leads.filter(l => l.status === 'fechado').length,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return leads.filter(lead => {
      const matchesType = typeFilter === 'all' || lead.type === typeFilter;
      if (!matchesType) return false;
      if (!query) return true;

      return [
        lead.name,
        lead.niche,
        lead.social,
        lead.summary,
        lead.key_contacts,
        ...(lead.pain_points || [])
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [leads, searchTerm, typeFilter]);

  return (
    <div className="absolute inset-0 bg-slate-950 text-slate-200 font-sans p-6 overflow-y-auto">
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="text-blue-400" />
            ProspectAI <span className="text-slate-500 font-normal">| CRM de Prospecção</span>
          </h1>
          <p className="text-slate-400 mt-1">Funil, dossiê comercial, propostas HTML e tutor de vendas com IA.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center min-w-[100px]">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total</span>
            <span className="text-2xl font-bold text-white mt-1">{stats.total}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center min-w-[100px]">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Radar</span>
            <span className="text-2xl font-bold text-blue-400 mt-1">{stats.prospectar}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center min-w-[100px]">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Contato</span>
            <span className="text-2xl font-bold text-yellow-400 mt-1">{stats.contato}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center min-w-[100px]">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Fechados</span>
            <span className="text-2xl font-bold text-green-400 mt-1">{stats.fechado}</span>
          </div>
        </div>
      </header>

      {feedback && (
        <div className="absolute top-4 right-4 z-[70] bg-slate-900 border border-blue-700 text-blue-100 px-4 py-3 rounded-xl shadow-2xl text-sm flex items-center gap-2">
          <AlertCircle size={16} className="text-blue-300" />
          {feedback}
        </div>
      )}

      <div className="mb-5 flex flex-col xl:flex-row gap-3 justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por lead, nicho, contato ou dor..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'odonto', label: 'Odonto' },
            { id: 'beleza', label: 'Beleza' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => setTypeFilter(option.id)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${typeFilter === option.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              {option.label}
            </button>
          ))}
          <div className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 flex items-center">
            {loadingLeads ? 'Sincronizando...' : syncMode === 'firestore' ? 'Firestore ativo' : 'Salvamento local'}
          </div>
          <button
            onClick={() => setIsNewLeadOpen(true)}
            className="px-4 py-2 rounded-xl border border-blue-500 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8 h-[calc(100vh-300px)] items-start">
        {COLUMNS.map(column => (
          <div key={column.id} className="min-w-[380px] w-[380px] flex flex-col bg-slate-900/50 rounded-2xl p-4 border border-slate-800 max-h-full">
            <div className="flex justify-between items-center mb-4 px-2 shrink-0">
              <h2 className="font-semibold text-slate-200 tracking-wide">{column.title}</h2>
              <span className="bg-slate-800 text-slate-300 text-xs py-1 px-3 rounded-full font-bold">
                {filteredLeads.filter(l => l.status === column.id).length}
              </span>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar flex-grow pb-4">
              {filteredLeads.filter(l => l.status === column.id).map(lead => (
                <div key={lead.id} className={`p-5 rounded-xl shadow-lg bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all shrink-0 ${column.color.split(' ')[1]} ${column.color.split(' ')[2]}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-white leading-tight pr-4">{lead.name}</h3>
                    <div className="p-2 bg-slate-900/50 rounded-lg shrink-0">
                      {getIcon(lead.type)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <button 
                      onClick={() => { setSelectedLead(lead); setActiveTab('dossie'); }}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2 py-2 rounded-lg text-xs font-semibold transition-all border border-blue-500/30"
                    >
                      <FileText size={14} /> Dossiê
                    </button>
                    <button 
                      onClick={() => { setSelectedLead(lead); setActiveTab('ia'); }}
                      className="flex-1 flex items-center justify-center gap-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white px-2 py-2 rounded-lg text-xs font-semibold transition-all border border-purple-500/30"
                    >
                      <Wand2 size={14} /> Proposta
                    </button>
                    <button 
                      onClick={() => { setSelectedLead(lead); setActiveTab('tutor'); }}
                      className="w-full flex items-center justify-center gap-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white px-2 py-2 rounded-lg text-xs font-semibold transition-all border border-amber-500/30"
                    >
                      <BrainCircuit size={14} /> Tutor IA
                    </button>
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-4 border-t border-slate-700">
                    <select 
                      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-2 outline-none focus:border-blue-500 appearance-none cursor-pointer w-full"
                      value={lead.status}
                      onChange={(e) => moveLead(lead.id, e.target.value)}
                    >
                      <option value="prospectar">Radar</option>
                      <option value="contato">Contatado</option>
                      <option value="reuniao">Reunião</option>
                      <option value="fechado">Fechado</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isNewLeadOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus size={20} className="text-blue-400" />
                  Novo Lead
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Será salvo no Firestore quando o Gemini Canvas estiver conectado. Caso contrário, fica salvo localmente neste navegador.
                </p>
              </div>
              <button onClick={() => setIsNewLeadOpen(false)} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full transition-colors ml-4 shrink-0" title="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Nome do Lead</label>
                  <input value={newLead.name} onChange={(e) => handleNewLeadChange('name', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="Ex: Clínica Exemplo" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Nicho / Setor</label>
                  <input value={newLead.niche} onChange={(e) => handleNewLeadChange('niche', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="Ex: Clínica odontológica" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Site</label>
                  <input value={newLead.website} onChange={(e) => handleNewLeadChange('website', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Instagram / Social</label>
                  <input value={newLead.social} onChange={(e) => handleNewLeadChange('social', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="Instagram: @perfil" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">WhatsApp</label>
                  <input value={newLead.phone} onChange={(e) => handleNewLeadChange('phone', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="5511999999999" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">@ do Instagram</label>
                  <input value={newLead.igHandle} onChange={(e) => handleNewLeadChange('igHandle', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="@perfil" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Tipo</label>
                  <select value={newLead.type} onChange={(e) => handleNewLeadChange('type', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="outro">Outro</option>
                    <option value="odonto">Odonto</option>
                    <option value="beleza">Beleza</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
                  <select value={newLead.status} onChange={(e) => handleNewLeadChange('status', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="prospectar">Radar</option>
                    <option value="contato">Contato Feito</option>
                    <option value="reuniao">Reunião</option>
                    <option value="fechado">Fechado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Score</label>
                  <input type="number" min="0" max="10" value={newLead.score} onChange={(e) => handleNewLeadChange('score', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Tecnologia</label>
                  <input value={newLead.tech} onChange={(e) => handleNewLeadChange('tech', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="WordPress, WhatsApp Business, Linktree" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Resumo Comercial</label>
                  <textarea value={newLead.summary} onChange={(e) => handleNewLeadChange('summary', e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none" placeholder="Descreva rapidamente quem é o lead e por que ele é uma oportunidade." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Dores Principais</label>
                  <textarea value={newLead.pain_points} onChange={(e) => handleNewLeadChange('pain_points', e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none" placeholder={"Uma dor por linha\nEx: Site não captura contatos\nEx: WhatsApp depende da recepção"} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Contatos-Chave</label>
                  <textarea value={newLead.key_contacts} onChange={(e) => handleNewLeadChange('key_contacts', e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none" placeholder="Nome do decisor, sócio, gestor ou recepção." />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Observações / Google Meu Negócio</label>
                  <textarea value={newLead.gmn_comments} onChange={(e) => handleNewLeadChange('gmn_comments', e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none" placeholder="Avaliações, reputação, gargalos, diferenciais percebidos." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pitch Inicial</label>
                  <textarea value={newLead.pitch} onChange={(e) => handleNewLeadChange('pitch', e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none" placeholder="Mensagem inicial para copiar e mandar no WhatsApp." />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-3 justify-end">
              <button onClick={() => setIsNewLeadOpen(false)} className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold">
                Cancelar
              </button>
              <button onClick={createNewLead} disabled={isSavingLead} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
                {isSavingLead ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSavingLead ? 'Salvando...' : 'Salvar Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* CABEÇALHO DO MODAL */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                <button 
                  onClick={() => setActiveTab('dossie')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'dossie' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <FileText size={16} className="inline mr-2"/> Dossiê
                </button>
                <button 
                  onClick={() => setActiveTab('ia')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'ia' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <Wand2 size={16} className="inline mr-2"/> Proposta HTML
                </button>
                <button 
                  onClick={() => setActiveTab('tutor')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'tutor' ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <BrainCircuit size={16} className="inline mr-2"/> Tutor de Vendas
                </button>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full transition-colors ml-4 shrink-0" title="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-slate-900 relative">
              
              {/* ABA 1: DOSSIÊ */}
              {activeTab === 'dossie' && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedLead.name}</h2>
                    <div className="flex gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><Tag size={14}/> {selectedLead.social}</span>
                      <span className="flex items-center gap-1"><Phone size={14}/> {selectedLead.phone}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider mb-2"><Activity size={16}/> Resumo de Atuação</h4>
                    <p className="text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800/50">{selectedLead.summary}</p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-rose-400 font-bold tracking-wider uppercase">Pitch Inicial (Para Iniciar Conversa)</span>
                      <button onClick={() => copyToClipboard(selectedLead.pitch, selectedLead.id)} className="text-slate-400 hover:text-white">
                        {copiedId === selectedLead.id ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p className="text-slate-400 italic">"{selectedLead.pitch}"</p>
                  </div>
                </div>
              )}

              {/* ABA 2: FÁBRICA DE PROPOSTAS HTML */}
              {activeTab === 'ia' && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-6">
                    <div className="bg-purple-900/20 border border-purple-500/30 p-5 rounded-xl">
                      <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Wand2 size={18}/> 1. Copy com IA</h4>
                      <textarea 
                        value={promptIA}
                        onChange={(e) => setPromptIA(e.target.value)}
                        placeholder="Quero focar em vender implantes..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-purple-500 outline-none h-24 mb-3 resize-none"
                      />
                      <button 
                        onClick={callGeminiAPI_Proposals}
                        disabled={isGenerating}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2"
                      >
                        {isGenerating ? <Loader2 size={18} className="animate-spin"/> : <Wand2 size={18}/>}
                      </button>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/30 p-5 rounded-xl">
                      <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><ImageIcon size={18}/> 2. Suas Imagens</h4>
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer hover:bg-slate-800/50">
                        <Upload className="w-6 h-6 text-slate-400" />
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      {uploadedImages.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                          {uploadedImages.map((src, i) => (
                            <img key={i} src={src} className="w-12 h-16 object-cover rounded border border-slate-700" alt={`Slide ${i + 1}`} />
                          ))}
                          <button onClick={() => setUploadedImages([])} className="text-xs text-rose-400 underline mt-auto mb-1">Limpar</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col h-full">
                    <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2"><CheckCircle2 size={18}/> 3. Resumo e Download</h4>
                    <div className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar text-sm text-slate-400">
                       <p>A proposta HTML será gerada com a copy atual, os dados do lead e as imagens enviadas.</p>
                       <p>Antes de baixar, confira se o texto do foco comercial e as imagens do carrossel representam a oferta que será enviada ao cliente.</p>
                    </div>
                    <button 
                      onClick={downloadHTML}
                      className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.4)]"
                    >
                      <Download size={20} className="inline mr-2"/> Baixar HTML Exclusivo
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 3: TUTOR DE VENDAS */}
              {activeTab === 'tutor' && (
                <div className="flex flex-col h-[65vh]">
                  
                  {/* Histórico do Chat */}
                  <div className="flex-grow bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar mb-4 flex flex-col gap-3">
                    {(!selectedLead.conversation || selectedLead.conversation.length === 0) ? (
                      <div className="m-auto text-center text-slate-500 flex flex-col items-center">
                        <MessageSquare size={32} className="mb-2 opacity-50"/>
                        <p>Cole o histórico da conversa aqui para eu analisar.</p>
                      </div>
                    ) : (
                      selectedLead.conversation.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col max-w-[80%] ${msg.role === 'lead' ? 'self-start' : 'self-end'}`}>
                          <span className={`text-[10px] uppercase font-bold mb-1 ${msg.role === 'lead' ? 'text-amber-500' : 'text-blue-500 self-end'}`}>
                            {msg.role === 'lead' ? selectedLead.name : 'Você'}
                          </span>
                          <div className={`p-3 rounded-2xl text-sm ${msg.role === 'lead' ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input do Chat */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <textarea 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Cole a mensagem aqui..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-amber-500 outline-none h-16 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => addMessageToHistory('lead')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold py-2 rounded-lg text-sm border border-slate-700">
                        + O Cliente Disse
                      </button>
                      <button onClick={() => addMessageToHistory('user')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold py-2 rounded-lg text-sm border border-slate-700">
                        + Eu Disse
                      </button>
                    </div>
                  </div>

                  {/* Botão Magia e Resultado */}
                  <div className="mt-4 pt-4 border-t border-slate-800 shrink-0">
                    {!tutorAdvice && !isTutorThinking && (
                      <button 
                        onClick={callTutorAPI}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-3 rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.4)] flex justify-center items-center gap-2 text-base transition-all"
                      >
                        <BrainCircuit size={20}/> Analisar conversa com IA
                      </button>
                    )}

                    {isTutorThinking && (
                      <div className="flex justify-center items-center py-6 text-amber-500 gap-3">
                        <Loader2 size={24} className="animate-spin"/>
                        <span className="font-bold animate-pulse">A IA está analisando a conversa...</span>
                      </div>
                    )}

                    {tutorAdvice && (
                      <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-5 shadow-2xl relative overflow-visible mt-2">
                        <div className="absolute -top-4 left-4 bg-amber-600 text-white text-xs font-black px-3 py-1 rounded-full border-2 border-slate-900 flex items-center gap-1">
                          <BrainCircuit size={12}/> ANÁLISE DA IA
                        </div>
                        
                        <div className="mb-4 mt-2">
                          <p className="text-sm text-slate-300 italic border-l-2 border-amber-500 pl-3">"{tutorAdvice.analise || tutorAdvice.diagnostico || 'Análise indisponível.'}"</p>
                        </div>
                        
                        <div className="mb-4">
                          <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider block mb-1">Estratégia:</span>
                          <p className="text-sm font-semibold text-slate-200">{tutorAdvice.estrategia}</p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 relative">
                          <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider block mb-2">Copie e Cole essa resposta agora:</span>
                          <p className="text-slate-100 text-base leading-relaxed">"{tutorAdvice.copy_exata}"</p>
                          <button 
                            onClick={() => copyToClipboard(tutorAdvice.copy_exata, 'copy-tutor')}
                            className="absolute top-3 right-3 text-slate-400 hover:text-emerald-400 transition-colors bg-slate-900 p-2 rounded-lg"
                          >
                            {copiedId === 'copy-tutor' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}