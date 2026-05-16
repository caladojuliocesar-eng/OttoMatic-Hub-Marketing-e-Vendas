import React, { useState } from 'react';
import { 
  Wand2, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LayoutTemplate,
  Smartphone,
  Code,
  Download
} from 'lucide-react';

// API Key injetada pelo ambiente do Hub
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

const DEFAULT_FORM_DATA = {
  clientName: 'Odontologia Moraes',
  niche: 'Clínica Odontológica',
  problem: 'O Instagram atual tem posts difíceis de ler, sem hierarquia visual e não converte atenção em agendamentos.',
  whatsapp: '5511999999999',
  imgBefore: 'https://lh3.googleusercontent.com/d/1zBbABlx7We-L9gJ-wVO8DEAk3CAZNBxW=w1280',
  carouselImages: [
    'https://lh3.googleusercontent.com/d/1KNmSMMA_74BZvP-xu2zlrRzpFhxmPbea=w1280',
    'https://lh3.googleusercontent.com/d/1fU9FhgYrMkVbHmpRgYqbL1eeMoj4vLIN=w1280',
    'https://lh3.googleusercontent.com/d/1-gx0LFfr9dsrjX1mJtsE9Xz5lsdo9s8s=w1280',
    'https://lh3.googleusercontent.com/d/18HuTKuKZgHFQquuJeX9dJLa-y9I8w4L0=w1280',
    'https://lh3.googleusercontent.com/d/1NymDxdpp3N4u_r7wUfVHKuHbh-1Vz7DQ=w1280',
    'https://lh3.googleusercontent.com/d/16UH0X5GtB5Z895py7f7rNtdx3bl1KyNk=w1280'
  ],
  imgDashboard: 'https://lh3.googleusercontent.com/d/1gzmlhquwq9qRlYfyJFpV9P8sqhQ1yps-=w1280',
  offer1Name: 'Carrosséis Prontos (DFY)',
  offer1Description: 'Nós cuidamos do roteiro, estrutura visual, copy dos slides e entrega dos arquivos finais. Vocês só revisam e publicam.',
  offer1Price: 'R$ 497 por carrossel',
  offer1BestFor: 'Quem quer consistência agora, com execução externa.',
  offer2Name: 'Sistema de IA Próprio',
  offer2Description: 'Um sistema personalizado para vocês criarem novos carrosséis por conta própria, usando nossa tecnologia de IA, sem mensalidade de agência.',
  offer2Price: 'Projeto sob medida',
  offer2BestFor: 'Quem quer independência para produzir em escala.'
};

const DEFAULT_COPY = {
  heroTitle: "O Instagram pode estar deixando oportunidades de agendamento na mesa.",
  heroSubtitle: "A empresa já tem experiência. A oportunidade está em traduzir isso em conteúdos que geram confiança antes do contato.",
  opportunityTitle: "A oportunidade: transformar atenção em confiança",
  opportunityDesc: "O tema já é forte. O que muda é a forma como ele aparece no feed: de uma peça difícil de absorver para uma sequência clara e educativa.",
  beforeText: "O conteúdo tem um tema relevante, mas a leitura concorre com muitos elementos da tela e perde força no primeiro contato.",
  afterText: "Formato vertical, hierarquia visual e narrativa em etapas tornam a mensagem mais fácil de entender e acompanhar.",
  carouselCaption: "Informação não é estética. É prevenção, segurança e cuidado com você.",
  recommendation: "Começar com um carrossel pronto valida a linguagem. Se quiser escala, o próximo passo é o app personalizado."
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const isValidUrl = (value) => {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const getActiveCarouselImages = (images) => images
  .map(img => img.trim())
  .filter(Boolean);

const getSafeFileName = (name) => {
  const baseName = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `proposta-${baseName || 'cliente'}.html`;
};

export default function App() {
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  const [copyData, setCopyData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleCarouselImageChange = (index, value) => {
    const newImages = [...formData.carouselImages];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, carouselImages: newImages }));
    if (error) setError('');
  };

  const validateForm = () => {
    const activeCarouselImages = getActiveCarouselImages(formData.carouselImages);
    const phoneDigits = formData.whatsapp.replace(/\D/g, '');

    if (!formData.clientName.trim()) return 'Preencha o nome do cliente.';
    if (!formData.niche.trim()) return 'Preencha o nicho ou setor do cliente.';
    if (!formData.problem.trim()) return 'Descreva o cenário ou problema atual.';
    if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 15) return 'Informe um WhatsApp válido, apenas com DDD e número.';
    if (!isValidUrl(formData.imgBefore)) return 'Informe um link válido para a imagem do post antigo.';
    if (activeCarouselImages.length === 0) return 'Informe pelo menos um link de imagem para o carrossel proposto.';
    if (activeCarouselImages.some(img => !isValidUrl(img))) return 'Revise os links do carrossel. Use links iniciados por http ou https.';
    if (!isValidUrl(formData.imgDashboard)) return 'Informe um link válido para a imagem da dashboard do app.';
    if (!formData.offer1Name.trim() || !formData.offer1Description.trim() || !formData.offer1Price.trim()) return 'Preencha nome, descrição e preço da oferta 1.';
    if (!formData.offer2Name.trim() || !formData.offer2Description.trim() || !formData.offer2Price.trim()) return 'Preencha nome, descrição e preço da oferta 2.';

    return '';
  };

  const generateProposalCopy = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);
    setError('');
    
    const prompt = `
      Você é um copywriter de elite especialista em vendas B2B e marketing digital.
      Sua missão é gerar os textos persuasivos para uma proposta comercial de venda de Carrosséis para o Instagram ou um Sistema de IA de conteúdo.
      
      Dados do Cliente:
      - Nome: ${formData.clientName}
      - Nicho: ${formData.niche}
      - Problema Atual: ${formData.problem}

      Ofertas comerciais:
      - Oferta 1: ${formData.offer1Name} | Preço: ${formData.offer1Price}
      - Descrição da oferta 1: ${formData.offer1Description}
      - Oferta 2: ${formData.offer2Name} | Preço: ${formData.offer2Price}
      - Descrição da oferta 2: ${formData.offer2Description}
      
      Gere os textos de forma EXTREMAMENTE PROFISSIONAL, direta, sem gírias, focada em conversão, lucro e autoridade. ZERO SARCASMO.
      
      Retorne APENAS um JSON válido com a seguinte estrutura:
      {
        "heroTitle": "Título principal forte focado na perda de oportunidades (ex: O Instagram pode estar deixando oportunidades na mesa)",
        "heroSubtitle": "Subtítulo explicando que o cliente já tem autoridade, só falta traduzir isso no digital",
        "opportunityTitle": "Título da seção de oportunidade",
        "opportunityDesc": "Breve texto explicando como mudar o formato do post muda a percepção do público",
        "beforeText": "Texto curto criticando sutilmente o formato antigo (ruído visual, não atrai)",
        "afterText": "Texto curto elogiando o formato proposto (narrativa clara, hierarquia)",
        "carouselCaption": "Uma legenda curta e vendedora para o post simulado no Instagram",
        "recommendation": "Sua recomendação final sobre qual pacote escolher, comparando a oferta 1 com a oferta 2"
      }
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          }
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || 'Não foi possível conectar com a IA. Tente novamente em alguns instantes.');
      }

      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) throw new Error('A IA não retornou um texto válido. Tente gerar novamente.');
      
      let parsedData;
      try {
        parsedData = JSON.parse(textResponse);
      } catch {
        throw new Error('A IA retornou uma resposta fora do formato esperado. Tente gerar novamente.');
      }

      setCopyData(parsedData);
      setActiveTab('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar cópia. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getFullHTML = () => {
    const copy = {
      ...DEFAULT_COPY,
      heroSubtitle: `A ${formData.clientName} já tem experiência. A oportunidade está em traduzir isso em conteúdos que geram confiança antes do contato.`,
      ...(copyData || {})
    };

    const safeCopy = Object.fromEntries(
      Object.entries(copy).map(([key, value]) => [key, escapeHtml(value)])
    );
    const activeCarouselImages = getActiveCarouselImages(formData.carouselImages);
    const safeCarouselImages = activeCarouselImages.map(escapeHtml);
    const displayCarouselImages = safeCarouselImages.length ? safeCarouselImages : [''];
    const safeClientName = escapeHtml(formData.clientName.trim());
    const safeInstagramName = escapeHtml(`cliente_${(formData.niche || 'lead').substring(0, 4).toLowerCase().replace(/[^a-z0-9]/g, '') || 'lead'}`);
    const safeImgBefore = escapeHtml(formData.imgBefore.trim());
    const safeImgDashboard = escapeHtml(formData.imgDashboard.trim());
    const safeOffer1Name = escapeHtml(formData.offer1Name.trim());
    const safeOffer1Description = escapeHtml(formData.offer1Description.trim());
    const safeOffer1Price = escapeHtml(formData.offer1Price.trim());
    const safeOffer1BestFor = escapeHtml(formData.offer1BestFor.trim() || 'Quem quer consistência agora, com execução externa.');
    const safeOffer2Name = escapeHtml(formData.offer2Name.trim());
    const safeOffer2Description = escapeHtml(formData.offer2Description.trim());
    const safeOffer2Price = escapeHtml(formData.offer2Price.trim());
    const safeOffer2BestFor = escapeHtml(formData.offer2BestFor.trim() || 'Quem quer independência para produzir em escala.');
    
    const carouselSlidesHTML = displayCarouselImages.map((img, idx) => `
                        <div class="ig-slide shrink-0 snap-center bg-white flex items-center justify-center">
                            <img src="${img}" class="w-full h-full object-contain" alt="Slide ${idx + 1}">
                        </div>`).join('');

    const carouselDotsHTML = displayCarouselImages.map((_, idx) => `
                        <button type="button" class="ig-dot ${idx === 0 ? 'active bg-sky-500' : 'bg-slate-300'} rounded-full" data-ig-dot="${idx}" aria-label="Ver slide ${idx + 1}"></button>`).join('');

    const whatsappLink = `https://wa.me/${formData.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, vi a proposta e quero conversar sobre o carrossel pronto, a produção semanal ou o app de carrosséis com IA para ${formData.clientName}.`)}`;
    const safeWhatsappLink = escapeHtml(whatsappLink);

    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposta Exclusiva | ${safeClientName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; scroll-behavior: smooth; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
        .print-frame { width: min(100%, 20rem); aspect-ratio: 1280 / 914; }
        .preview-frame { width: min(100%, 16rem); aspect-ratio: 4 / 5; }
        .carousel-frame { width: 280px; aspect-ratio: 4 / 5; }
        .instagram-post { box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18); }
        .ig-avatar {
            background: linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4) border-box;
            border: 2px solid transparent;
        }
        .ig-slide { width: 100%; aspect-ratio: 4 / 5; }
        .ig-nav { background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(8px); }
        .ig-dot { width: 6px; height: 6px; transition: transform .2s ease, background .2s ease; }
        .ig-dot.active { transform: scale(1.25); background: #0ea5e9; }
        .offer-card { box-shadow: 0 24px 70px rgba(15, 23, 42, 0.10); }
        .app-shell {
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.16), transparent 38%), linear-gradient(225deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
        }
        .app-preview-frame { width: min(100%, 360px); aspect-ratio: 1280 / 1851; }
        @media (min-width: 768px) { .carousel-frame { width: 400px; } }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased">

    <!-- HEADER / HERO -->
    <header class="bg-slate-900 text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div class="max-w-3xl mx-auto relative z-10 text-center">
            <div class="inline-block px-4 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold text-sm mb-6 border border-blue-500/30">
                PROPOSTA EXCLUSIVA PARA: <span class="text-white uppercase">${safeClientName}</span>
            </div>
            <h1 class="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">${safeCopy.heroTitle}</h1>
            <p class="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">${safeCopy.heroSubtitle}</p>
        </div>
    </header>

    <!-- OPORTUNIDADE VISUAL -->
    <section class="max-w-5xl mx-auto px-4 -mt-12 relative z-20 mb-16">
        <div class="glass rounded-2xl shadow-xl p-6 md:p-10 border border-slate-200">
            <h2 class="text-2xl font-bold text-center mb-3">${safeCopy.opportunityTitle}</h2>
            <p class="text-center text-slate-600 max-w-2xl mx-auto mb-8">${safeCopy.opportunityDesc}</p>

            <div class="grid md:grid-cols-2 gap-8 items-center">
                <div class="flex flex-col items-center">
                    <div class="text-amber-600 font-bold mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-magnifying-glass-chart text-xl"></i> COMO APARECE HOJE
                    </div>
                    <div class="print-frame bg-white rounded-xl overflow-hidden shadow-md border-4 border-amber-100">
                        <img src="${safeImgBefore}" class="w-full h-full object-contain" alt="Post Antigo">
                    </div>
                    <p class="text-sm text-slate-500 mt-4 text-center px-4">${safeCopy.beforeText}</p>
                </div>

                <div class="flex flex-col items-center">
                    <div class="text-sky-600 font-bold mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-arrow-trend-up text-xl"></i> DIREÇÃO PROPOSTA
                    </div>
                    <div class="preview-frame bg-white rounded-xl overflow-hidden shadow-2xl border-4 border-sky-500 relative transform md:scale-105">
                        <img src="${displayCarouselImages[0]}" class="w-full h-full object-contain" alt="Nova Arte">
                    </div>
                    <p class="text-sm text-slate-500 mt-6 text-center px-4 font-semibold">${safeCopy.afterText}</p>
                </div>
            </div>

            <div class="grid md:grid-cols-3 gap-4 mt-10">
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <div class="text-sky-600 text-xl mb-3"><i class="fa-solid fa-eye"></i></div>
                    <h3 class="font-bold mb-2">Primeira impressão</h3>
                    <p class="text-sm text-slate-600">O feed decide em segundos. Uma capa com menos ruído aumenta a chance de a pessoa parar.</p>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <div class="text-sky-600 text-xl mb-3"><i class="fa-solid fa-route"></i></div>
                    <h3 class="font-bold mb-2">Sequência de raciocínio</h3>
                    <p class="text-sm text-slate-600">O carrossel organiza o problema e o próximo passo sem exigir leitura pesada.</p>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <div class="text-sky-600 text-xl mb-3"><i class="fa-solid fa-bullseye"></i></div>
                    <h3 class="font-bold mb-2">Foco na Solução</h3>
                    <p class="text-sm text-slate-600">Transformamos características técnicas em uma conversa sobre resultados e segurança.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- SIMULAÇÃO DO POST NO INSTAGRAM -->
    <section class="max-w-6xl mx-auto px-4 mb-20">
        <div class="grid lg:grid-cols-[1fr_430px] gap-10 items-center">
            <div class="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
                <span class="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700 mb-5">
                    <i class="fa-brands fa-instagram"></i> SIMULAÇÃO NO FEED
                </span>
                <h2 class="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">Veja como o carrossel aparece para o público.</h2>
                <p class="text-slate-600 text-lg mb-6">A primeira imagem chama atenção. Os próximos slides explicam o contexto e conduzem o seguidor para uma decisão consciente.</p>
                <div class="grid sm:grid-cols-3 gap-3 text-left">
                    <div class="bg-white border border-slate-200 rounded-xl p-4">
                        <div class="text-sky-600 text-xl mb-2"><i class="fa-solid fa-hand-pointer"></i></div>
                        <p class="font-bold text-sm">Arraste natural</p>
                        <p class="text-xs text-slate-500 mt-1">Experiência igual a um post real.</p>
                    </div>
                    <div class="bg-white border border-slate-200 rounded-xl p-4">
                        <div class="text-sky-600 text-xl mb-2"><i class="fa-solid fa-layer-group"></i></div>
                        <p class="font-bold text-sm">Sequência 4:5</p>
                        <p class="text-xs text-slate-500 mt-1">Formato vertical otimizado.</p>
                    </div>
                    <div class="bg-white border border-slate-200 rounded-xl p-4">
                        <div class="text-sky-600 text-xl mb-2"><i class="fa-solid fa-calendar-check"></i></div>
                        <p class="font-bold text-sm">Convite no final</p>
                        <p class="text-xs text-slate-500 mt-1">Orienta o próximo passo.</p>
                    </div>
                </div>
            </div>

            <article class="instagram-post w-full max-w-[430px] mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3">
                    <div class="flex items-center gap-3">
                        <div class="ig-avatar w-10 h-10 rounded-full p-[2px]">
                            <div class="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-extrabold">CL</div>
                        </div>
                        <div>
                            <p class="text-sm font-extrabold leading-tight">${safeInstagramName}</p>
                            <p class="text-xs text-slate-500 leading-tight">Brasil</p>
                        </div>
                    </div>
                    <button type="button" class="w-9 h-9 rounded-full hover:bg-slate-100 text-slate-700" aria-label="Mais opções">
                        <i class="fa-solid fa-ellipsis"></i>
                    </button>
                </div>

                <div class="relative bg-white">
                    <div class="absolute top-3 right-3 z-10 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white" data-ig-counter>1/${displayCarouselImages.length}</div>
                    
                    <button type="button" class="ig-nav hidden md:flex absolute left-3 top-1/2 z-10 -translate-y-1/2 w-9 h-9 rounded-full text-white items-center justify-center" data-ig-prev aria-label="Slide anterior">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button type="button" class="ig-nav hidden md:flex absolute right-3 top-1/2 z-10 -translate-y-1/2 w-9 h-9 rounded-full text-white items-center justify-center" data-ig-next aria-label="Próximo slide">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>

                    <div class="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth" data-ig-track>
                        ${carouselSlidesHTML}
                    </div>
                </div>

                <div class="px-4 py-3">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-4 text-[22px] text-slate-900">
                            <i class="fa-regular fa-heart"></i>
                            <i class="fa-regular fa-comment"></i>
                            <i class="fa-regular fa-paper-plane"></i>
                        </div>
                        <i class="fa-regular fa-bookmark text-[22px] text-slate-900"></i>
                    </div>

                    <div class="flex items-center justify-center gap-1.5 mb-3" data-ig-dots>
                        ${carouselDotsHTML}
                    </div>

                    <p class="text-sm font-bold mb-1">187 curtidas</p>
                    <p class="text-sm leading-snug">
                        <span class="font-extrabold">${safeInstagramName}</span>
                        ${safeCopy.carouselCaption}
                    </p>
                </div>
            </article>
        </div>
    </section>

    <!-- CAMINHOS COMERCIAIS -->
    <section class="max-w-6xl mx-auto px-4 mb-20">
        <div class="text-center max-w-3xl mx-auto mb-10">
            <span class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white mb-5">
                <i class="fa-solid fa-diagram-project"></i> DUAS FORMAS DE IMPLEMENTAR
            </span>
            <h2 class="text-3xl md:text-4xl font-extrabold mb-4">Vocês podem receber o conteúdo pronto ou ganhar autonomia com IA.</h2>
            <p class="text-slate-600 text-lg">A escolha depende do quanto a equipe quer participar da produção.</p>
        </div>

        <div class="grid lg:grid-cols-2 gap-6">
            <!-- OPÇÃO 1 -->
            <div class="offer-card bg-white border border-slate-200 rounded-2xl p-7">
                <div class="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <span class="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 mb-3">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> OPÇÃO 1
                        </span>
                        <h3 class="text-2xl font-extrabold">${safeOffer1Name}</h3>
                        <p class="mt-2 inline-flex rounded-full bg-sky-50 px-3 py-1 text-sm font-extrabold text-sky-700 border border-sky-100">${safeOffer1Price}</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center text-xl">
                        <i class="fa-solid fa-images"></i>
                    </div>
                </div>
                <p class="text-slate-600 mb-6">${safeOffer1Description}</p>
                <ul class="space-y-3 text-sm text-slate-700 mb-7">
                    <li class="flex gap-3"><i class="fa-solid fa-check text-green-500 mt-1"></i><span>Ideal para começar sem mexer na rotina.</span></li>
                    <li class="flex gap-3"><i class="fa-solid fa-check text-green-500 mt-1"></i><span>Conteúdo com tom profissional.</span></li>
                    <li class="flex gap-3"><i class="fa-solid fa-check text-green-500 mt-1"></i><span>Entrega em formato correto para o Instagram.</span></li>
                </ul>
                <div class="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <p class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Melhor para</p>
                    <p class="font-semibold text-slate-800">${safeOffer1BestFor}</p>
                </div>
            </div>

            <!-- OPÇÃO 2 -->
            <div class="offer-card app-shell border border-slate-800 rounded-2xl p-7 text-white overflow-hidden relative">
                <div class="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-cyan-400/10 blur-2xl"></div>
                <div class="relative z-10">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <span class="inline-flex items-center gap-2 rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-bold text-cyan-200 mb-3 border border-cyan-300/20">
                                <i class="fa-solid fa-robot"></i> OPÇÃO 2
                            </span>
                            <h3 class="text-2xl font-extrabold">${safeOffer2Name}</h3>
                            <p class="mt-2 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-extrabold text-cyan-100 border border-cyan-300/20">${safeOffer2Price}</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center text-xl">
                            <i class="fa-solid fa-laptop-code"></i>
                        </div>
                    </div>
                    <p class="text-slate-300 mb-6">${safeOffer2Description}</p>
                    
                    <div class="rounded-2xl bg-slate-950/80 border border-white/10 p-2 mb-6">
                        <div class="flex items-center justify-between px-3 py-2">
                            <div class="flex gap-1.5">
                                <span class="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                                <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                                <span class="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                            </div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prévia real do app</span>
                        </div>
                        <div class="app-preview-frame mx-auto overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                            <img src="${safeImgDashboard}" class="w-full h-full object-contain" alt="Prévia da dashboard do app">
                        </div>
                    </div>

                    <div class="grid sm:grid-cols-2 gap-3 mb-7">
                        <div class="rounded-xl bg-white/7 border border-white/10 p-4">
                            <i class="fa-solid fa-file-lines text-cyan-300 mb-2"></i>
                            <p class="font-bold text-sm">Geração Rápida</p>
                        </div>
                        <div class="rounded-xl bg-white/7 border border-white/10 p-4">
                            <i class="fa-solid fa-download text-cyan-300 mb-2"></i>
                            <p class="font-bold text-sm">Exportação em PNG</p>
                        </div>
                    </div>
                    <div class="rounded-xl bg-cyan-400/10 border border-cyan-300/20 p-4">
                        <p class="text-xs font-bold uppercase tracking-wider text-cyan-200 mb-1">Melhor para</p>
                        <p class="font-semibold text-white">${safeOffer2BestFor}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-6 bg-white border border-slate-200 rounded-2xl p-6">
            <div class="grid md:grid-cols-[220px_1fr] gap-5 items-center">
                <div class="font-extrabold text-xl text-slate-900">Minha recomendação</div>
                <p class="text-slate-600">${safeCopy.recommendation}</p>
            </div>
        </div>
    </section>

    <!-- CTA / FECHAMENTO -->
    <section class="bg-slate-900 text-white py-16 px-6">
        <div class="max-w-3xl mx-auto text-center">
            <h2 class="text-3xl font-bold mb-4">Qual caminho faz mais sentido para vocês agora?</h2>
            <div class="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-lg mx-auto mt-8">
                <a href="${safeWhatsappLink}" target="_blank" rel="noopener noreferrer" class="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition duration-300 text-center text-lg shadow-lg shadow-green-500/30">
                    <i class="fa-brands fa-whatsapp mr-2"></i> Quero Conversar no WhatsApp
                </a>
            </div>
        </div>
    </section>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            var track = document.querySelector('[data-ig-track]');
            if (!track) return;

            var slides = Array.from(track.children);
            var dots = Array.from(document.querySelectorAll('[data-ig-dot]'));
            var counter = document.querySelector('[data-ig-counter]');
            var prev = document.querySelector('[data-ig-prev]');
            var next = document.querySelector('[data-ig-next]');
            var current = 0;
            var ticking = false;

            function update(index) {
                current = Math.max(0, Math.min(index, slides.length - 1));
                if (counter) counter.textContent = (current + 1) + '/' + slides.length;
                dots.forEach(function (dot, dotIndex) {
                    dot.classList.toggle('active', dotIndex === current);
                    dot.classList.toggle('bg-sky-500', dotIndex === current);
                    dot.classList.toggle('bg-slate-300', dotIndex !== current);
                });
            }

            function goTo(index) {
                update(index);
                track.scrollTo({ left: current * track.clientWidth, behavior: 'smooth' });
            }

            if (prev) prev.addEventListener('click', function () { goTo(current - 1); });
            if (next) next.addEventListener('click', function () { goTo(current + 1); });

            dots.forEach(function (dot) {
                dot.addEventListener('click', function () {
                    goTo(Number(dot.getAttribute('data-ig-dot')));
                });
            });

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

  const ensureValidForExport = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return false;
    }

    setError('');
    return true;
  };

  const copyToClipboard = async () => {
    if (!ensureValidForExport()) return;

    try {
      await navigator.clipboard.writeText(getFullHTML());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError('Não foi possível copiar o HTML. Tente novamente ou use o botão de baixar arquivo.');
    }
  };

  const downloadHTML = () => {
    if (!ensureValidForExport()) return;

    const html = getFullHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = getSafeFileName(formData.clientName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 bg-slate-950 text-slate-200 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Sidebar Form */}
      <div className="w-full md:w-1/3 lg:w-[400px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <LayoutTemplate className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Proposal<span className="text-blue-500">Gen</span></h1>
              <p className="text-xs text-slate-400">by Janete (AI Pro)</p>
            </div>
        </div>

        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Cliente</label>
            <input 
              type="text" 
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="Ex: Odontologia Moraes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nicho / Setor</label>
            <input 
              type="text" 
              name="niche"
              value={formData.niche}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="Ex: Clínica Odontológica, Advogado"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">WhatsApp para Fechamento</label>
            <input 
              type="text" 
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="Ex: 5511999999999"
            />
            <p className="text-[10px] text-slate-500 mt-1">Use código do país + DDD + número. Ex: 5511999999999.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Cenário / Problema Atual</label>
            <textarea 
              name="problem"
              value={formData.problem}
              onChange={handleInputChange}
              rows="3"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
              placeholder="Ex: O instagram dele é feio, tem muito texto e ninguém lê."
            ></textarea>
            <p className="text-[10px] text-slate-500 mt-1">A IA vai transformar isso num texto profissional e persuasivo.</p>
          </div>

          <div className="pt-4 border-t border-slate-800">
             <label className="block text-sm font-medium text-slate-400 mb-1">Link Imagem: Antes (Post Antigo)</label>
            <input 
              type="text" 
              name="imgBefore"
              value={formData.imgBefore}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-800">
            <label className="block text-sm font-medium text-slate-400 mb-2">Links: Carrossel Proposto (Até 6)</label>
            <div className="space-y-2">
              {formData.carouselImages.map((img, idx) => (
                <input 
                  key={idx}
                  type="text" 
                  value={img}
                  onChange={(e) => handleCarouselImageChange(idx, e.target.value)}
                  placeholder={`Link do Slide ${idx + 1}`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Deixe os últimos em branco se tiver menos de 6.</p>
          </div>

          <div className="pt-4 border-t border-slate-800">
             <label className="block text-sm font-medium text-slate-400 mb-1">Link Imagem: App Dashboard</label>
            <input 
              type="text" 
              name="imgDashboard"
              value={formData.imgDashboard}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">Oferta 1</p>
              <p className="text-[10px] text-slate-500">A opção de serviço pronto ou execução feita por você.</p>
            </div>
            <div className="space-y-2">
              <input 
                type="text" 
                name="offer1Name"
                value={formData.offer1Name}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
                placeholder="Nome da oferta 1"
              />
              <input 
                type="text" 
                name="offer1Price"
                value={formData.offer1Price}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
                placeholder="Preço da oferta 1"
              />
              <textarea
                name="offer1Description"
                value={formData.offer1Description}
                onChange={handleInputChange}
                rows="3"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none resize-none"
                placeholder="Descrição da oferta 1"
              />
              <input 
                type="text" 
                name="offer1BestFor"
                value={formData.offer1BestFor}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
                placeholder="Melhor para..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">Oferta 2</p>
              <p className="text-[10px] text-slate-500">A opção alternativa, como app, pacote premium ou recorrência.</p>
            </div>
            <div className="space-y-2">
              <input 
                type="text" 
                name="offer2Name"
                value={formData.offer2Name}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
                placeholder="Nome da oferta 2"
              />
              <input 
                type="text" 
                name="offer2Price"
                value={formData.offer2Price}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
                placeholder="Preço da oferta 2"
              />
              <textarea
                name="offer2Description"
                value={formData.offer2Description}
                onChange={handleInputChange}
                rows="3"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none resize-none"
                placeholder="Descrição da oferta 2"
              />
              <input 
                type="text" 
                name="offer2BestFor"
                value={formData.offer2BestFor}
                onChange={handleInputChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs focus:border-blue-500 outline-none"
                placeholder="Melhor para..."
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <button 
          onClick={generateProposalCopy}
          disabled={isGenerating}
          className="mt-8 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
        >
          {isGenerating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Gerando Copy com IA...</>
          ) : (
            <><Wand2 className="w-5 h-5" /> Gerar Proposta B2B</>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        
        {/* Topbar */}
        <div className="min-h-16 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/50">
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Smartphone className="w-4 h-4" /> Preview Real
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'code' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Code className="w-4 h-4" /> Código Fonte
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition border border-slate-700"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Código Copiado!' : 'Copiar HTML'}
            </button>
            <button 
              onClick={downloadHTML}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition border border-blue-500"
            >
              <Download className="w-4 h-4" />
              Baixar .html
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-hidden relative">
          {!copyData && !isGenerating && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10 bg-slate-950/80 backdrop-blur-sm">
                <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium text-slate-300">Preencha os dados e clique em Gerar</p>
                <p className="text-sm">A IA vai escrever a copy e montar o HTML pra você.</p>
             </div>
          )}

          {activeTab === 'preview' ? (
            <div className="w-full h-full bg-slate-100 p-4 overflow-hidden flex justify-center">
               <div className="w-full max-w-5xl h-full bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-300 flex flex-col relative">
                  {/* Falso browser header */}
                  <div className="h-8 bg-slate-200 border-b border-slate-300 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="mx-auto bg-white/50 text-slate-500 text-[10px] px-24 py-0.5 rounded-md">
                      proposta-{formData.clientName.toLowerCase().replace(/\s+/g, '-')}.html
                    </div>
                  </div>
                  <iframe 
                    srcDoc={getFullHTML()} 
                    className="w-full flex-1 border-0"
                    title="Preview"
                  />
               </div>
            </div>
          ) : (
            <div className="w-full h-full p-6 overflow-y-auto bg-[#0d1117]">
              <pre className="text-sm text-slate-300 font-mono">
                <code>
                  {getFullHTML()}
                </code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}