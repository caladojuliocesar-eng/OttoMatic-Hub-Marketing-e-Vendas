import React, { useState, useEffect, useRef } from "react";
import { Loader2, ChevronLeft, ChevronRight, Plus, Download, Copy, Sparkles, Upload, ImageIcon, RotateCcw, Trash2, Copy as CopyIcon, Move, Brain, Settings2, SlidersHorizontal, LayoutTemplate, Info } from "lucide-react";

/*
╔═══════════════════════════════════════════════════════════════════════════╗
║                    AI EDIT POLICY — ARQUIVO PROTEGIDO                      ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  Este arquivo contém lógica crítica de produto.                            ║
║  Não reestruture, não simplifique, não remova blocos de proteção,          ║
║  não altere contratos internos, não troque nomes de funções-base,          ║
║  não mova seções entre regiões.                                            ║
║                                                                            ║
║  ✅ PERMITIDO:                                                              ║
║     • ajustes visuais pontuais                                             ║
║     • textos                                                               ║
║     • cores                                                                ║
║     • temas novos no padrão existente                                      ║
║                                                                            ║
║  ❌ PROIBIDO:                                                               ║
║     • refatoração ampla                                                    ║
║     • troca de arquitetura                                                 ║
║     • remoção de validações                                                ║
║     • mudança em engine, estado, exportação, render principal              ║
║     • mudança nos prompts internos dos modos (CAROUSEL_MODES)              ║
║                                                                            ║
║  Se o usuário pedir mudança estrutural, responda com proposta textual      ║
║  e peça confirmação explícita ANTES de editar.                             ║
║                                                                            ║
║  Criado por Thiago Caliman IA — thiagocaliman.com.br                       ║
╚═══════════════════════════════════════════════════════════════════════════╝
*/

// ═══════════════════════════════════════════════════════════════════════════
//  Fábrica de Carrosséis AI PRO — v4
//  Arquitetura: Theme Registry + Layout Registry + Fallback Declarativo
//
//  COMO ADICIONAR UM TEMA NOVO:
//    1. Copie o bloco TEMPLATE no fim do arquivo
//    2. Preencha os campos (id, name, preview, copyRules, supportedLayouts, render)
//    3. Adicione o objeto em THEME_REGISTRY (busque por "THEME_REGISTRY =")
//    4. Pronto. UI, prompts, schema do LLM e fallback se ajustam sozinhos.
//
//  COMO ADICIONAR UM LAYOUT NOVO:
//    1. Adicione uma entrada em LAYOUT_REGISTRY abaixo
//    2. Cada tema que for suportar declara o id em `supportedLayouts`
//    3. Implemente o case no `render()` do(s) tema(s) que o suportam
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 1 — TIPOS E CONTRATOS
// ═══════════════════════════════════════════════════════════════════════════

type LayoutId =
  | "capa" | "so_texto" | "texto_imagem" | "impacto" | "foto_full"
  | "microblog_capa" | "microblog_texto" | "microblog_lista" | "microblog_cta";

type AspectRatioId = "4/5" | "1/1" | "9/16" | "4/3";

type CopyRules = {
  voiceTone: string;
  capaTitleMaxWords: number;
  bodyMaxWords: number;
  imageLayoutMaxWords: number;
  emphasisStyle: string;
  ctaStyle: string;
};

type Slide = {
  slide: number;
  layout: LayoutId;
  titulo: string;
  texto_apoio: string;
  sugestao_visual?: string;
  imageUrl?: string;
  scales?: { title?: number; content?: number };
  positions?: { [field: string]: { x: number; y: number; scale: number } };
};

type RenderContext = {
  slide: Slide;
  index: number;
  aspectRatio: AspectRatioId;
  brandHandle: string;
  brandCategory: string;
  brandProfileImage: string | null;
  brandLogoImage: string | null;
  imagePositions: { [i: number]: number };
  titleScale: number;
  contentScale: number;
  onAction?: any;
  positions?: any;
};

type ThemeDefinition = {
  id: string;
  name: string;
  preview: [string, string, string];
  desc: string;
  copyRules: CopyRules;
  supportedLayouts: LayoutId[];
  fallbackFor?: LayoutId[];
  initialScales?: {
    [ar in AspectRatioId]?: { [layout in LayoutId]?: { title?: number; content?: number } }
  };
  render: (ctx: RenderContext) => React.ReactNode;
};

type LayoutDefinition = {
  id: LayoutId;
  label: string;
  icon: string;
  requiresImage: boolean;
  isMicroblog: boolean;
};


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 2 — LAYOUT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const LAYOUT_REGISTRY: LayoutDefinition[] = [
  { id: "capa",            label: "Capa",       icon: "◼",  requiresImage: false, isMicroblog: false },
  { id: "so_texto",        label: "Só Texto",   icon: "≡",  requiresImage: false, isMicroblog: false },
  { id: "texto_imagem",    label: "Texto+Foto", icon: "▤",  requiresImage: true,  isMicroblog: false },
  { id: "impacto",         label: "Impacto",    icon: "★",  requiresImage: false, isMicroblog: false },
  { id: "foto_full",       label: "Foto Full",  icon: "📸", requiresImage: true,  isMicroblog: false },
  { id: "microblog_capa",  label: "MB Capa",    icon: "📰", requiresImage: true,  isMicroblog: true  },
  { id: "microblog_texto", label: "MB Texto",   icon: "📰", requiresImage: false, isMicroblog: true  },
  { id: "microblog_lista", label: "MB Lista",   icon: "📋", requiresImage: false, isMicroblog: true  },
  { id: "microblog_cta",   label: "MB CTA",     icon: "🎯", requiresImage: true,  isMicroblog: true  },
];

const getLayout = (id: LayoutId) => LAYOUT_REGISTRY.find(l => l.id === id);


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 3 — FORMATOS (aspect ratios)
// ═══════════════════════════════════════════════════════════════════════════

const FORMATS = [
  { id: "4/5",  label: "4:5",  desc: "Feed",      w: 4, h: 5  },
  { id: "1/1",  label: "1:1",  desc: "Quadrado",  w: 1, h: 1  },
  { id: "9/16", label: "9:16", desc: "Stories",   w: 9, h: 16 },
  { id: "4/3",  label: "4:3",  desc: "Landscape", w: 4, h: 3  },
];


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 4 — MODOS DE CAROUSEL (prompts idênticos à v2 — calibrados)
// ═══════════════════════════════════════════════════════════════════════════

const CAROUSEL_MODES = [
  {
    id: "storytelling_lofi", icon: "🧃", label: "Lo-Fi", objetivo: "ALCANCE & VIRAL", cor: "#f97316",
    slideRange: [5, 8], defaultSlides: 6,
    prompt: `Você é um copywriter especialista em conteúdo viral para Instagram 2026.
OBJETIVO: Criar um carrossel de storytelling humano que gere compartilhamentos por DM — o sinal de engajamento mais forte do algoritmo.

PERSONA E TOM:
- Escreva como alguém que está contando uma história no WhatsApp para um amigo próximo
- Voz ativa, primeira pessoa, frases curtas (máx. 15 palavras por frase)
- PROIBIDO: bullet points, "Descubra como", "Incrível", "Transformador", linguagem corporativa, superlativos vazios
- PERMITIDO: "Eu errei feio aqui", "Ninguém te conta isso", "A galera repete esse erro toda semana"

ESTRUTURA OBRIGATÓRIA (framework Hook-Tension-Release-CTA):
- Slide 1 (capa): HOOK — Uma afirmação polêmica OU pergunta que causa desconforto. MÁXIMO 6 PALAVRAS no titulo.
- Slide 2 (so_texto): CONTEXTO — Quem é você nessa história, qual era a situação real.
- Slides 3 a N-2 (alternar so_texto/texto_imagem): TENSÃO — Desenvolva a história em micro-revelações.
- 1x slide (impacto): VIRADA — O momento de ruptura da história.
- Último slide (texto_imagem): RELEASE + CTA — Lição final em 1 frase + CTA de compartilhamento.

REGRAS DE COPY:
- titulo: MÁXIMO 6 PALAVRAS. Direto. Sem ponto final.
- texto_apoio: MÁXIMO 3 linhas. Uma ideia só.
- sugestao_visual: Em INGLÊS, foto espontânea, sem filtro, de bastidores reais.`
  },
  {
    id: "hibrido", icon: "🎬", label: "Híbrido", objetivo: "RETENÇÃO & DWELL", cor: "#a855f7",
    slideRange: [5, 8], defaultSlides: 6,
    prompt: `Você é estrategista de conteúdo e especialista em retenção de feed para o algoritmo do Instagram 2026.
OBJETIVO: Maximizar o "dwell time". Cada slide deve fazer o dedo parar antes de virar.

ESTRUTURA (framework AIDA):
- Slide 1 (capa): ATENÇÃO — Gancho visual + pergunta ou dado que causa impacto imediato.
- Slide 2 (texto_imagem): INTERESSE — Contexto do problema.
- Slides 3 a N-2 (texto_imagem): DESEJO — Cada slide = 1 solução/insight prático.
- 1x slide (impacto): CHOQUE — Dado que quebra a crença limitante.
- Último slide (texto_imagem): AÇÃO — CTA duplo: salvar + compartilhar.

REGRAS DE COPY:
- titulo: MÁXIMO 5 PALAVRAS.
- texto_apoio: MÁXIMO 3 linhas.
- sugestao_visual: Em INGLÊS, fotografia editorial com movimento implícito.`
  },
  {
    id: "deep_dive", icon: "📚", label: "Deep Dive", objetivo: "AUTORIDADE & SAVES", cor: "#06b6d4",
    slideRange: [8, 10], defaultSlides: 10,
    prompt: `Você é um especialista de referência criando o guia definitivo sobre o tema para o Instagram 2026.
OBJETIVO: Fazer o usuário SALVAR o post.

ESTRUTURA (framework PAST):
- Slide 1 (capa): PROMESSA — "O guia completo de [tema] em [N] slides."
- Slide 2 (so_texto): PROBLEMA.
- Slide 3 (impacto): AGITAÇÃO.
- Slides 4 a N-2 (alternar so_texto/texto_imagem): SOLUÇÃO — Numere os passos.
- Último slide (texto_imagem): TRANSFORMAÇÃO + CTA.

REGRAS DE COPY:
- titulo: MÁXIMO 6 PALAVRAS (ou "Passo X:" no início).
- texto_apoio: MÁXIMO 4 linhas.
- sugestao_visual: Em INGLÊS, fotografia de ambiente de trabalho ou resultado.`
  },
  {
    id: "dados_seo", icon: "📊", label: "Dados SEO", objetivo: "SEO & EXPLORAR", cor: "#10b981",
    slideRange: [6, 10], defaultSlides: 7,
    prompt: `Você é analista de dados e especialista em Social SEO para Instagram 2026.
OBJETIVO: Dominar o Explorar e aparecer em buscas. Foco em Saves e Shares.

ESTRUTURA (framework DCIA):
- Slide 1 (capa): KEYWORD + NÚMERO.
- Slides 2-3 (so_texto): CONTEXTO DOS DADOS.
- Slides 4 a N-2: OS DADOS.
- 1-2x slides (impacto): DADO BOMBÁSTICO.
- Último slide (texto_imagem): IMPLICAÇÃO + CTA.

REGRAS DE COPY:
- titulo: Inclua SEMPRE um número, porcentagem ou comparativo. MÁXIMO 7 PALAVRAS.
- texto_apoio: MÁXIMO 3 linhas.
- sugestao_visual: Em INGLÊS, visualização de dados, gráficos, telas de analytics.`
  },
  {
    id: "antes_depois", icon: "🏆", label: "Antes/Depois", objetivo: "VENDAS & CONVERSÃO", cor: "#ef4444",
    slideRange: [7, 10], defaultSlides: 8,
    prompt: `Você é copywriter de resposta direta especialista em conversão e prova social.
OBJETIVO: Converter seguidores em leads.

ESTRUTURA (framework RPM):
- Slide 1 (impacto): RESULTADO — O "depois" em destaque máximo.
- Slide 2 (so_texto): DOR — O "antes" com contexto real.
- Slides 3 a N-3 (texto_imagem): MÉTODO — Numere os passos.
- 1x slide (impacto): PROVA INTERMEDIÁRIA.
- Último slide (texto_imagem): PROVA FINAL + CTA DIRETO.

REGRAS DE COPY:
- titulo slide 1: ESPECÍFICO com números reais. MÁXIMO 7 PALAVRAS.
- titulo método: SEMPRE "Passo X:"
- texto_apoio: MÁXIMO 3 linhas.
- sugestao_visual: Em INGLÊS, foto de resultado ou bastidores.`
  },
  {
    id: "microblog_denso", icon: "📰", label: "Microblog", objetivo: "AUTORIDADE & DENSO", cor: "#f97316",
    slideRange: [6, 10], defaultSlides: 8,
    prompt: `Você é um jornalista especialista em conteúdo editorial denso para Instagram 2026.
OBJETIVO: Criar um carrossel-microblog com densidade máxima de informação.

ESTRUTURA (Jornalístico):
- Slide 1 (microblog_capa): MANCHETE + FOTO EDITORIAL.
- Slides 2-3 (microblog_texto): CONTEXTO E EVIDÊNCIA.
- Slide 4 (microblog_lista): LISTA DE PROBLEMAS OU MITOS.
- Slides 5-6 (microblog_texto): ANÁLISE PROFUNDA.
- Slide N-1 (microblog_texto): IMPLICAÇÕES PARA O LEITOR.
- Último slide (microblog_cta): CTA EDITORIAL.

REGRAS DE COPY — DENSIDADE MÁXIMA:
- titulo: 4-8 palavras. Pode ter 2 partes.
- texto_apoio: MÍNIMO 60, MÁXIMO 120 PALAVRAS. Parágrafos densos. Use "→" positivos/neutros, "✗" problemas. **bold** inline, [L]laranja[/L] para destaque.
- sugestao_visual: Em INGLÊS, foto editorial de alta qualidade.

LAYOUTS: use APENAS microblog_capa / microblog_texto / microblog_lista / microblog_cta.`
  }
];

// Módulo-level ref para drag/resize handlers (mantido compatível com v2)
const _dragCtx: { onAction: any; allPositions: any } = { onAction: null, allPositions: null };


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 5 — HELPERS COMPARTILHADOS DE RENDER
//  Qualquer tema pode usar estes helpers. Eles implementam drag/resize,
//  imagem com posicionamento vertical e safe-area de Stories.
// ═══════════════════════════════════════════════════════════════════════════

const STORY_SAFE_MARGIN_PCT = "13.02%";
const CANVAS_SAFE_X_PCT = "5.56%";

// Cria o contexto visual mínimo que os renderers usam
function buildVisualCtx(ctx: RenderContext) {
  const AR = ctx.aspectRatio || "4/5";
  const isStory = AR === "9/16";
  const slideTitleScale = typeof ctx.slide?.scales?.title === "number" ? ctx.slide.scales.title : ctx.titleScale;
  const slideContentScale = typeof ctx.slide?.scales?.content === "number" ? ctx.slide.scales.content : ctx.contentScale;
  const tS = slideTitleScale / 100;
  const cS = slideContentScale / 100;
  const titFS = (base: number) => Math.round(base * tS);
  const txtFS = (base: number) => Math.round(base * cS);
  const vPos = ctx.imagePositions[ctx.index] !== undefined ? ctx.imagePositions[ctx.index] : 50;
  const num = String(ctx.slide.slide).padStart(2, "0");
  const storyTopMargin = isStory ? { marginTop: STORY_SAFE_MARGIN_PCT } : null;
  const storyBottomMargin = isStory ? { marginBottom: STORY_SAFE_MARGIN_PCT } : null;

  let onAction = ctx.onAction;
  let positions = ctx.positions;
  if (!onAction && _dragCtx.onAction) onAction = _dragCtx.onAction;
  if (!positions && _dragCtx.allPositions) positions = (_dragCtx.allPositions[ctx.index] || {});

  const getPos = (field: string) => {
    const p = positions && positions[field];
    return p || { x: 0, y: 0, scale: 1 };
  };

  const R = React.createElement;
  const SmartEl = (field: string, children: any, extraStyle: any) => {
    const p = getPos(field);
    const transform = "translate(" + p.x + "px, " + p.y + "px) scale(" + p.scale + ")";
    const wrapStyle = Object.assign({
      position: "relative",
      display: "block",
      maxWidth: `calc(100% - (${CANVAS_SAFE_X_PCT} * 2))`,
      marginLeft: CANVAS_SAFE_X_PCT,
      marginRight: CANVAS_SAFE_X_PCT
    }, extraStyle || {});
    const innerStyle = { transform, transformOrigin: "top left", display: "block", cursor: onAction ? "grab" : "default", touchAction: "none" };
    const dragStyle = { position: "absolute", top: -10, left: -10, width: 18, height: 18, borderRadius: "50%", background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", opacity: 0, transition: "opacity 0.15s", zIndex: 20 };
    const resizeStyle = { position: "absolute", bottom: -6, right: -6, width: 12, height: 12, borderRadius: "50%", background: "#f97316", cursor: "nwse-resize", opacity: 0, transition: "opacity 0.15s", zIndex: 20 };
    const moveIcon = R(Move, { size: 10, color: "#fff" });
    const startDrag = onAction ? (ev: any) => onAction(ev, ctx.index, field, "drag") : null;
    const dragEl = onAction ? R("div", { className: "smart-drag", title: "Arrastar", onMouseDown: startDrag, onTouchStart: startDrag, style: dragStyle }, moveIcon) : null;
    const resizeEl = onAction ? R("div", { className: "smart-resize", title: "Redimensionar", onMouseDown: (ev: any) => onAction(ev, ctx.index, field, "resize"), onTouchStart: (ev: any) => onAction(ev, ctx.index, field, "resize"), style: resizeStyle }) : null;
    return R("div", { className: "smart-group", style: wrapStyle }, R("div", { style: innerStyle, onMouseDown: startDrag, onTouchStart: startDrag }, children), dragEl, resizeEl);
  };

  const ImgBlock = ({ h }: { h: any }) => {
    if (!ctx.slide.imageUrl) return null;
    return (
      <div style={{ width: "100%", height: h, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <img src={ctx.slide.imageUrl} alt="v" crossOrigin="anonymous"
          style={{ position: "absolute", minWidth: "100%", minHeight: "100%", width: "auto", height: "auto", left: "50%", top: `${vPos}%`, transform: `translate(-50%, -${vPos}%)`, objectFit: "cover" }} />
      </div>
    );
  };

  return {
    AR, isStory, tS, cS, titFS, txtFS, vPos, num,
    storyTopMargin, storyBottomMargin,
    SmartEl, ImgBlock,
    brandHandle: ctx.brandHandle, brandCategory: ctx.brandCategory,
    brandProfileImage: ctx.brandProfileImage, brandLogoImage: ctx.brandLogoImage,
    slide: ctx.slide
  };
}

type VCtx = ReturnType<typeof buildVisualCtx>;


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 6 — DISPATCHER PRINCIPAL
//  Escolhe o tema, trata fallback declarativo, chama theme.render()
// ═══════════════════════════════════════════════════════════════════════════

function renderSlide(ctx: RenderContext, themeId: string): React.ReactNode {
  const theme = THEME_REGISTRY.find(t => t.id === themeId);
  if (!theme) return null;

  // Se o tema não suporta este layout, procura um fallback declarado
  if (!theme.supportedLayouts.includes(ctx.slide.layout)) {
    const fallback = THEME_REGISTRY.find(t => t.fallbackFor?.includes(ctx.slide.layout));
    if (fallback) return fallback.render(ctx);
    return null;
  }

  return theme.render(ctx);
}


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 7 — INITIAL SCALES HELPERS (derivam do registry)
// ═══════════════════════════════════════════════════════════════════════════

function getInitialCardScales(ar: AspectRatioId, themeId: string, layout: LayoutId) {
  const theme = THEME_REGISTRY.find(t => t.id === themeId);
  return theme?.initialScales?.[ar]?.[layout] || null;
}

function applyInitialScalesToSlides(list: any[], ar: AspectRatioId, themeId: string) {
  if (!Array.isArray(list)) return [];
  return list.map(s => {
    if (!s) return s;
    const p = getInitialCardScales(ar, themeId, s.layout);
    if (!p) return s;
    return {
      ...s,
      scales: {
        ...(s.scales || {}),
        ...(typeof p.title === "number" ? { title: p.title } : {}),
        ...(typeof p.content === "number" ? { content: p.content } : {})
      }
    };
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 8 — THEME REGISTRY
//
//  É AQUI que você adiciona temas novos. Cada objeto é self-contained:
//  metadata + copyRules + supportedLayouts + initialScales + render.
// ═══════════════════════════════════════════════════════════════════════════

const neoBrutalistTheme: ThemeDefinition = {
  id: "neo_brutalist",
  name: "Neo Brutalista",
  preview: ["#f4f4f0", "#ff90e8", "#000000"],
  desc: "Bordas grossas, sombras duras, cores pop",
  copyRules: {
    voiceTone: "Descolado, irônico, direto. Fale a língua da Geração Z e startups de ponta.",
    capaTitleMaxWords: 6,
    bodyMaxWords: 70,
    imageLayoutMaxWords: 18,
    emphasisStyle: "Letras garrafais, blocos de cor marcantes.",
    ctaStyle: "Ação hiper direta, sem rodeios."
  },
  supportedLayouts: ["capa", "so_texto", "texto_imagem", "impacto", "foto_full"],
  initialScales: {
    "1/1": { capa: { title: 80, content: 95 }, so_texto: { title: 75, content: 70 }, texto_imagem: { title: 70, content: 70 }, impacto: { title: 80, content: 65 } },
    "4/5": { capa: { title: 90 }, so_texto: { title: 80 }, texto_imagem: { title: 85 }, impacto: { title: 95 } },
    "4/3": { capa: { title: 70 }, so_texto: { title: 65 }, impacto: { title: 75 } }
  },
  render: (ctx) => {
    const V = buildVisualCtx(ctx);
    const { AR, isStory, titFS, txtFS, vPos, num, storyTopMargin, storyBottomMargin, SmartEl, brandHandle, brandCategory, brandProfileImage, brandLogoImage, slide } = V;
    const canvasSafeXPct = CANVAS_SAFE_X_PCT;

    const bg = "#f4f4f0";
    const black = "#000000";
    const pink = "#ff90e8";
    const yellow = "#ffc900";

    const brutalBorder = "3px solid #000";
    const brutalShadow = "6px 6px 0px #000";

    // Componentes Internos Específicos do Brutalismo
    const Header = ({ color = pink }) => (
      <div style={{ padding: `16px ${canvasSafeXPct} 0`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", ...(storyTopMargin || {}), position: "relative", zIndex: 10 }}>
        <div style={{ background: color, border: brutalBorder, borderRadius: 99, padding: "4px 12px", fontSize: 10, fontWeight: 800, color: black, textTransform: "uppercase", boxShadow: brutalShadow }}>
          {brandCategory}
        </div>
        <div style={{ background: "#fff", border: brutalBorder, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: black, boxShadow: brutalShadow }}>
          {num}
        </div>
      </div>
    );

    const Footer = () => (
      <div style={{ padding: `0 ${canvasSafeXPct} 16px`, display: "flex", justifyContent: "space-between", alignItems: "center", ...(storyBottomMargin || {}), position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: brutalBorder, borderRadius: 99, padding: "4px 12px 4px 4px", boxShadow: brutalShadow }}>
          {brandProfileImage ? <img src={brandProfileImage} style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #000", objectFit: "cover" }} crossOrigin="anonymous"/> : <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #000", background: yellow }} />}
          <span style={{ fontSize: 9, fontWeight: 800, color: black }}>{brandHandle}</span>
        </div>
        {brandLogoImage ? <img src={brandLogoImage} crossOrigin="anonymous" style={{ height: 16, objectFit: "contain" }} /> : null}
      </div>
    );

    const BrutalImgBlock = ({ h }: { h: any }) => {
      if (!slide.imageUrl) return (
        <div style={{ height: h, border: brutalBorder, background: "#fff", boxShadow: brutalShadow, margin: `0 ${canvasSafeXPct}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
           <ImageIcon size={28} color="#000" />
        </div>
      );
      return (
        <div style={{ height: h, border: brutalBorder, boxShadow: brutalShadow, margin: `0 ${canvasSafeXPct}`, position: "relative", overflow: "hidden", background: "#fff" }}>
          <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", minWidth: "100%", minHeight: "100%", width: "auto", height: "auto", left: "50%", top: `${vPos}%`, transform: `translate(-50%, -${vPos}%)`, objectFit: "cover" }} />
        </div>
      );
    };

    if (slide.layout === "capa") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: bg, overflow: "hidden", position: "relative", backgroundImage: "radial-gradient(#000 1px, transparent 0)", backgroundSize: "16px 16px" }}>
        <div style={{ position: "absolute", top: "-10%", right: "-20%", width: "60%", aspectRatio: "1/1", borderRadius: "50%", background: pink, border: brutalBorder, boxShadow: brutalShadow }} />
        <Header color={yellow} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 2 }}>
          {SmartEl("titulo", (
            <div style={{ background: "#fff", border: brutalBorder, padding: 16, boxShadow: brutalShadow, transform: "rotate(-2deg)" }}>
              <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(38)}px`, fontWeight: 900, lineHeight: 1.0, color: black, textTransform: "uppercase", letterSpacing: "-0.03em" }}>{slide.titulo}</h2>
            </div>
          ), { padding: "0 10px" })}
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(12)}px`, color: black, fontWeight: 700, lineHeight: 1.5, marginTop: 24, background: "#fff", display: "inline-block", padding: "6px 12px", border: brutalBorder, boxShadow: "3px 3px 0px #000" }}>{slide.texto_apoio}</p>
          ), { marginTop: 10 })}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "so_texto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: yellow, overflow: "hidden", position: "relative" }}>
        <Header color={pink} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${canvasSafeXPct}`, zIndex: 2 }}>
           <div style={{ background: "#fff", border: brutalBorder, boxShadow: brutalShadow, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
             {SmartEl("titulo", (
                <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(32)}px`, fontWeight: 900, lineHeight: 1.05, color: black, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{slide.titulo}</h2>
              ), null)}
              <div style={{ height: 4, width: "100%", background: black }} />
              {SmartEl("texto_apoio", (
                <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(13)}px`, color: "#333", fontWeight: 600, lineHeight: 1.5 }}>{slide.texto_apoio}</p>
              ), null)}
           </div>
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "texto_imagem") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: bg, overflow: "hidden", position: "relative" }}>
        <Header color={yellow} />
        <div style={{ padding: `12px ${canvasSafeXPct} 16px` }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(24)}px`, fontWeight: 900, lineHeight: 1.05, color: black, textTransform: "uppercase", letterSpacing: "-0.02em", background: pink, display: "inline-block", padding: "4px 10px", border: brutalBorder, boxShadow: "4px 4px 0px #000", transform: "rotate(-1deg)" }}>{slide.titulo}</h2>
          ), null)}
        </div>
        <BrutalImgBlock h="38%" />
        <div style={{ flex: 1, padding: `20px ${canvasSafeXPct} 0` }}>
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(12)}px`, color: black, fontWeight: 700, lineHeight: 1.5, background: "#fff", border: brutalBorder, padding: "10px", boxShadow: "4px 4px 0px #000" }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "impacto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: pink, overflow: "hidden", position: "relative", backgroundImage: "radial-gradient(#000 2px, transparent 0)", backgroundSize: "20px 20px" }}>
        <Header color="#fff" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${canvasSafeXPct}`, zIndex: 2 }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(48)}px`, fontWeight: 900, lineHeight: 0.95, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", textShadow: "4px 4px 0px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}>{slide.titulo}</h2>
          ), null)}
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(14)}px`, color: black, fontWeight: 800, lineHeight: 1.4, marginTop: 16, background: yellow, border: brutalBorder, padding: "8px 14px", boxShadow: brutalShadow, transform: "rotate(1deg)" }}>{slide.texto_apoio}</p>
          ), { marginTop: 10 })}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "foto_full") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", backgroundColor: black }}>
        {slide.imageUrl
          ? <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${vPos}%`, zIndex: 0 }} />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 0 }}><ImageIcon size={32} /></div>}

        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%" }}>
          <Header color={pink} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `16px ${canvasSafeXPct} 16px` }}>
            <div style={{ background: "#fff", border: brutalBorder, boxShadow: brutalShadow, padding: 16 }}>
              {SmartEl("titulo", (
                <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(32)}px`, fontWeight: 900, lineHeight: 1.05, color: black, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 12 }}>{slide.titulo}</h2>
              ), null)}
              <div style={{ height: 3, width: "100%", background: black, marginBottom: 12 }} />
              {SmartEl("texto_apoio", (
                <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(11)}px`, color: "#333", fontWeight: 600, lineHeight: 1.5 }}>{slide.texto_apoio}</p>
              ), null)}
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );

    return null;
  }
};

const darkOrangeTheme: ThemeDefinition = {
  id: "dark_orange",
  name: "Dark Laranja",
  preview: ["#1e1e1e", "#f97316", "#fff"],
  desc: "Texturizado escuro, acento laranja",
  copyRules: {
    voiceTone: "Íntimo, direto, primeira pessoa. Frases curtas.",
    capaTitleMaxWords: 6,
    bodyMaxWords: 80,
    imageLayoutMaxWords: 20,
    emphasisStyle: "Última palavra do título em laranja (aplicado automaticamente pelo render)",
    ctaStyle: "CTA de compartilhamento por DM. Nunca 'link na bio'."
  },
  supportedLayouts: ["capa", "so_texto", "texto_imagem", "impacto", "foto_full"],
  initialScales: {
    "1/1": { capa: { title: 83, content: 91 }, so_texto: { title: 68, content: 78 }, texto_imagem: { title: 83, content: 84 }, impacto: { title: 88, content: 69 } },
    "4/5": { so_texto: { title: 78, content: 95 }, impacto: { title: 84, content: 97 } },
    "4/3": { capa: { title: 62, content: 84 }, so_texto: { title: 62, content: 71 }, texto_imagem: { title: 60, content: 64 }, impacto: { title: 61, content: 69 } }
  },
  render: (ctx) => {
    const V = buildVisualCtx(ctx);
    const { AR, isStory, titFS, txtFS, vPos, storyBottomMargin, SmartEl, ImgBlock, brandHandle, brandCategory, brandProfileImage, brandLogoImage, slide } = V;
    const canvasSafeXPct = CANVAS_SAFE_X_PCT;
    const storySafeMarginPct = STORY_SAFE_MARGIN_PCT;

    const bg = "#1c1c1c";
    const accent = "#f97316";
    const titleColor = "#ffffff";
    const bodyColor = "rgba(255,255,255,0.65)";
    const contentTitleTop = isStory ? "70px" : "35px";
    const soTextoTopPad = isStory ? 0 : 16;
    const impactoTopPad = isStory ? 0 : 35;

    const Arrow = () => (
      <div style={{ position: "absolute", top: isStory ? `calc(${storySafeMarginPct} + 14px)` : 14, right: canvasSafeXPct, width: 32, height: 32, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 900, lineHeight: 1 }}>→</span>
      </div>
    );

    const words = slide.titulo.split(" ");
    const lastWord = words.pop();
    const firstPart = words.join(" ");

    const Footer = () => (
      <div style={{ padding: `0 ${canvasSafeXPct} 14px`, display: "flex", justifyContent: "center", alignItems: "center", gap: 7, ...(storyBottomMargin || {}) }}>
        {brandProfileImage
          ? <img src={brandProfileImage} alt="av" crossOrigin="anonymous" style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 18, height: 18, borderRadius: "50%", background: accent, opacity: 0.8, flexShrink: 0 }} />}
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "Arial", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>{brandHandle}</span>
        {brandLogoImage && <img src={brandLogoImage} alt="logo" crossOrigin="anonymous" style={{ height: 12, width: "auto", objectFit: "contain", opacity: 0.6, marginLeft: 6 }} />}
      </div>
    );

    if (slide.layout === "capa") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: bg, overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.5)", paddingTop: isStory ? storySafeMarginPct : 0, backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.03) 0%, transparent 60%), url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")" }}>
        {/* Categoria no topo-esquerda, alinhada com a Arrow no topo-direita */}
        <span style={{ position: "absolute", top: isStory ? `calc(${storySafeMarginPct} + 20px)` : 20, left: canvasSafeXPct, fontFamily: "Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", zIndex: 10 }}>{brandCategory}</span>
        <Arrow />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `16px ${canvasSafeXPct} 10px` }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${titFS(38)}px`, fontWeight: 900, lineHeight: 1.05, color: titleColor, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
              {firstPart}{firstPart ? " " : ""}<span style={{ color: accent }}>{lastWord}</span>
            </h2>
          ), null)}
          <div style={{ borderTop: "1px dashed rgba(249,115,22,0.4)", marginBottom: 10 }} />
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(11)}px`, color: bodyColor, lineHeight: 1.55, marginBottom: 10 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "texto_imagem") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.5)", paddingTop: isStory ? storySafeMarginPct : 0 }}>
        <Arrow />
        <div style={{ padding: `${contentTitleTop} ${canvasSafeXPct} 8px` }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: `${titFS(22)}px`, fontWeight: 900, lineHeight: 1.1, color: titleColor, marginBottom: 8 }}>{slide.titulo}</h2>
          ), null)}
          <div style={{ height: 2, width: 40, background: accent, marginBottom: 8 }} />
        </div>
        <ImgBlock h="38%" />
        <div style={{ flex: 1, padding: `10px ${canvasSafeXPct} 0` }}>
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(11)}px`, color: bodyColor, lineHeight: 1.6 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "so_texto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.5)", paddingTop: isStory ? storySafeMarginPct : 0 }}>
        <Arrow />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `${soTextoTopPad}px ${canvasSafeXPct} 0` }}>
          {SmartEl("titulo", (
            <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 12, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: `${titFS(32)}px`, fontWeight: 900, lineHeight: 1.05, color: titleColor }}>{slide.titulo}</h2>
            </div>
          ), null)}
          <div style={{ borderTop: `1px dashed rgba(249,115,22,0.35)`, marginBottom: 12 }} />
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(13)}px`, color: bodyColor, lineHeight: 1.65 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "impacto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: accent, overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.5)", paddingTop: isStory ? storySafeMarginPct : 0 }}>
        <div style={{ position: "absolute", top: isStory ? `calc(${storySafeMarginPct} + 10px)` : 10, right: canvasSafeXPct, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>→</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: `${impactoTopPad}px ${canvasSafeXPct} 0` }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: `${titFS(44)}px`, fontWeight: 900, lineHeight: 0.97, color: "#fff", textShadow: "0 2px 0 rgba(0,0,0,0.15)", marginBottom: 14 }}>{slide.titulo}</h2>
          ), null)}
          <div style={{ height: 3, width: 36, background: "rgba(255,255,255,0.5)", marginBottom: 12 }} />
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(13)}px`, color: "rgba(255,255,255,0.88)", lineHeight: 1.5, fontWeight: 700 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    // foto_full: MESMO visual da capa, só troca o fundo preto por uma foto + gradiente escuro na base
    if (slide.layout === "foto_full") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.5)", paddingTop: isStory ? storySafeMarginPct : 0 }}>
        {/* Camada 1: foto de fundo (substitui o backgroundColor da capa) */}
        {slide.imageUrl
          ? <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${vPos}%`, zIndex: 0 }} />
          : <div style={{ position: "absolute", inset: 0, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: 0.4, color: "#fff", zIndex: 0 }}>
              <ImageIcon size={28} /><span style={{ fontSize: 9, marginTop: 6, fontFamily: "Arial", letterSpacing: "0.1em", textTransform: "uppercase" }}>Adicione uma imagem</span>
            </div>}
        {/* Camada 2: gradiente escuro na base (foto respira no topo, texto legível embaixo) */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.15) 100%)", zIndex: 1 }} />
        {/* Camada 3: conteúdo — idêntico ao layout "capa" */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Categoria no topo-esquerda, alinhada com a Arrow no topo-direita */}
          <span style={{ position: "absolute", top: isStory ? `calc(${storySafeMarginPct} + 20px)` : 20, left: canvasSafeXPct, fontFamily: "Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", textShadow: "0 1px 4px rgba(0,0,0,0.6)", zIndex: 11 }}>{brandCategory}</span>
          <Arrow />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `16px ${canvasSafeXPct} 10px` }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${titFS(38)}px`, fontWeight: 900, lineHeight: 1.05, color: titleColor, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
                {firstPart}{firstPart ? " " : ""}<span style={{ color: accent }}>{lastWord}</span>
              </h2>
            ), null)}
            <div style={{ borderTop: "1px dashed rgba(249,115,22,0.4)", marginBottom: 10 }} />
            {SmartEl("texto_apoio", (
              <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(11)}px`, color: bodyColor, lineHeight: 1.55, marginBottom: 10 }}>{slide.texto_apoio}</p>
            ), null)}
          </div>
          <Footer />
        </div>
      </div>
    );

    return null;
  }
};

const darkRedTheme: ThemeDefinition = {
  id: "dark_red",
  name: "Dark Vermelho",
  preview: ["#111", "#e11d48", "#fff"],
  desc: "Preto total, all-caps, círculo",
  copyRules: {
    voiceTone: "Impact/all-caps. Seco, jornalístico, agressivo.",
    capaTitleMaxWords: 6,
    bodyMaxWords: 80,
    imageLayoutMaxWords: 20,
    emphasisStyle: "Títulos em all-caps Impact. Círculos decorativos vermelhos no fundo.",
    ctaStyle: "CTA direto, imperativo."
  },
  supportedLayouts: ["capa", "so_texto", "texto_imagem", "impacto", "foto_full"],
  initialScales: {
    "1/1": { capa: { title: 83, content: 91 }, so_texto: { title: 68, content: 78 }, texto_imagem: { title: 83, content: 84 }, impacto: { title: 88, content: 69 } },
    "4/5": { so_texto: { title: 78, content: 95 }, impacto: { title: 69, content: 96 } },
    "4/3": { capa: { title: 62, content: 84 }, so_texto: { title: 62, content: 71 }, texto_imagem: { title: 60, content: 64 }, impacto: { title: 61, content: 63 } }
  },
  render: (ctx) => {
    const V = buildVisualCtx(ctx);
    const { AR, isStory, titFS, txtFS, vPos, num, storyTopMargin, storyBottomMargin, SmartEl, ImgBlock, brandHandle, brandCategory, brandProfileImage, brandLogoImage, slide } = V;
    const canvasSafeXPct = CANVAS_SAFE_X_PCT;
    const storySafeMarginPct = STORY_SAFE_MARGIN_PCT;

    const bg = "#0e0e0e";
    const accent = "#e11d48";
    const titleColor = "#ffffff";
    const bodyColor = "rgba(255,255,255,0.62)";

    const Header = () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `12px ${canvasSafeXPct} 0`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", ...(storyTopMargin || {}) }}>
        <span>{brandCategory}</span><span style={{ color: accent, fontWeight: 900, fontSize: 11 }}>{num}</span>
      </div>
    );
    const Footer = () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `0 ${canvasSafeXPct} 12px`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", ...(storyBottomMargin || {}) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {brandProfileImage ? <img src={brandProfileImage} alt="av" crossOrigin="anonymous" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 16, height: 16, borderRadius: "50%", background: accent }} />}
          <span>{brandHandle}</span>
        </div>
        {brandLogoImage
          ? <img src={brandLogoImage} alt="logo" crossOrigin="anonymous" style={{ height: 12, width: "auto", objectFit: "contain", opacity: 0.5 }} />
          : <span style={{ opacity: 0.3, fontSize: 8 }}>LOGO</span>}
      </div>
    );
    const RedArrow = () => (
      <div style={{ position: "absolute", top: "50%", right: `calc(${canvasSafeXPct} - 4px)`, transform: "translateY(-50%)", display: "flex", alignItems: "center", justifyContent: "center", width: 24, pointerEvents: "none" }}>
        <span style={{ color: accent, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>→</span>
      </div>
    );
    const Circle = ({ size, top, left, opacity }: any) => (
      <div style={{ position: "absolute", width: size, height: size, borderRadius: "50%", border: `2px solid ${accent}`, top, left, opacity, pointerEvents: "none" }} />
    );

    if (slide.layout === "capa") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.7)", paddingBottom: isStory ? storySafeMarginPct : 0 }}>
        <Circle size={200} top="-60px" left="auto" opacity={0.18} />
        <Circle size={120} top="-20px" left="auto" opacity={0.12} />
        <Header />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 calc(${canvasSafeXPct} + 28px) 0 ${canvasSafeXPct}`, position: "relative", zIndex: 2 }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(46)}px`, fontWeight: 900, lineHeight: 0.92, color: titleColor, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{slide.titulo}</h2>
          ), null)}
          <RedArrow />
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "texto_imagem") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.7)", paddingBottom: isStory ? storySafeMarginPct : 0 }}>
        <Circle size={180} top="30%" left="auto" opacity={0.1} />
        <Header />
        <div style={{ padding: `8px calc(${canvasSafeXPct} + 28px) 6px ${canvasSafeXPct}`, position: "relative", zIndex: 2 }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(24)}px`, fontWeight: 900, lineHeight: 1.05, color: titleColor, textTransform: "uppercase", marginBottom: 4 }}>{slide.titulo}</h2>
          ), null)}
          <RedArrow />
        </div>
        <ImgBlock h="36%" />
        <div style={{ flex: 1, padding: `10px ${canvasSafeXPct} 0`, position: "relative", zIndex: 2 }}>
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(11)}px`, color: bodyColor, lineHeight: 1.6 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "so_texto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.7)", paddingBottom: isStory ? storySafeMarginPct : 0 }}>
        <Circle size={220} top="20%" left="auto" opacity={0.12} />
        <Header />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 calc(${canvasSafeXPct} + 28px) 0 ${canvasSafeXPct}`, position: "relative", zIndex: 2 }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(40)}px`, fontWeight: 900, lineHeight: 0.95, color: titleColor, textTransform: "uppercase", marginBottom: 8 }}>{slide.titulo}</h2>
          ), null)}
          <RedArrow />
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(12)}px`, color: bodyColor, lineHeight: 1.65 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "impacto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.7)", paddingBottom: isStory ? storySafeMarginPct : 0 }}>
        <Circle size={280} top="10%" left="auto" opacity={0.2} />
        <Circle size={160} top="40%" left="auto" opacity={0.12} />
        <Header />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${canvasSafeXPct}`, position: "relative", zIndex: 2 }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(46)}px`, fontWeight: 900, lineHeight: 0.92, color: titleColor, textTransform: "uppercase", marginBottom: 10 }}>{slide.titulo}</h2>
          ), null)}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 3, background: accent, flexShrink: 0 }} />
            {SmartEl("texto_apoio", (
              <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(12)}px`, color: bodyColor, lineHeight: 1.5, fontWeight: 700 }}>{slide.texto_apoio}</p>
            ), null)}
          </div>
          <div style={{ marginTop: 16, width: 48, height: 48, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 20, fontWeight: 900 }}>→</span>
          </div>
        </div>
        <Footer />
      </div>
    );

    // foto_full: MESMA capa, mas com foto de fundo + gradiente escuro
    if (slide.layout === "foto_full") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.7)", paddingBottom: isStory ? storySafeMarginPct : 0 }}>
        {/* Camada 1: foto de fundo */}
        {slide.imageUrl
          ? <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${vPos}%`, zIndex: 0 }} />
          : <div style={{ position: "absolute", inset: 0, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: 0.4, color: "#fff", zIndex: 0 }}>
              <ImageIcon size={28} /><span style={{ fontSize: 9, marginTop: 6, fontFamily: "Arial", letterSpacing: "0.1em", textTransform: "uppercase" }}>Adicione uma imagem</span>
            </div>}
        {/* Camada 2: gradiente escuro na base */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.15) 100%)", zIndex: 1 }} />
        {/* Camada 3: conteúdo com estrutura da capa */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%" }}>
          <Circle size={200} top="-60px" left="auto" opacity={0.3} />
          <Circle size={120} top="-20px" left="auto" opacity={0.2} />
          <Header />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 calc(${canvasSafeXPct} + 28px) 0 ${canvasSafeXPct}`, position: "relative", zIndex: 3 }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(46)}px`, fontWeight: 900, lineHeight: 0.92, color: titleColor, textTransform: "uppercase", letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>{slide.titulo}</h2>
            ), null)}
            <RedArrow />
          </div>
          <Footer />
        </div>
      </div>
    );

    return null;
  }
};

const whiteRedTheme: ThemeDefinition = {
  id: "white_red",
  name: "Branco Vermelho",
  preview: ["#fff", "#e11d48", "#111"],
  desc: "Grid branco, barra vermelha",
  copyRules: {
    voiceTone: "Editorial clean, títulos em all-caps pretos.",
    capaTitleMaxWords: 6,
    bodyMaxWords: 80,
    imageLayoutMaxWords: 20,
    emphasisStyle: "Barras vermelhas horizontais. Grid sutil no fundo.",
    ctaStyle: "CTA de salvamento ou compartilhamento."
  },
  supportedLayouts: ["capa", "so_texto", "texto_imagem", "impacto", "foto_full"],
  initialScales: {
    "1/1": { capa: { title: 83, content: 91 }, so_texto: { title: 68, content: 78 }, texto_imagem: { title: 83, content: 84 }, impacto: { title: 88, content: 69 } },
    "4/5": { impacto: { title: 95 } },
    "4/3": { capa: { title: 62, content: 84 }, so_texto: { title: 60, content: 71 }, texto_imagem: { title: 60, content: 64 }, impacto: { title: 61, content: 63 } }
  },
  render: (ctx) => {
    const V = buildVisualCtx(ctx);
    const { AR, titFS, txtFS, vPos, num, storyTopMargin, storyBottomMargin, SmartEl, ImgBlock, brandHandle, brandCategory, brandProfileImage, brandLogoImage, slide } = V;
    const canvasSafeXPct = CANVAS_SAFE_X_PCT;

    const bg = "#ffffff";
    const accent = "#e11d48";
    const titleColor = "#0d0d0d";
    const bodyColor = "#555";
    const gridBg = `repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.045) 24px, rgba(0,0,0,0.045) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,0,0,0.045) 24px, rgba(0,0,0,0.045) 25px)`;

    const Header = () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `12px ${canvasSafeXPct} 0`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)", ...(storyTopMargin || {}) }}>
        <span>{brandCategory}</span>
        <div style={{ flex: 1, height: "1px", margin: "0 8px", background: "rgba(0,0,0,0.15)" }} />
        <span style={{ color: titleColor, fontWeight: 900 }}>{num}</span>
      </div>
    );
    const Footer = () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `0 ${canvasSafeXPct} 12px`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", ...(storyBottomMargin || {}) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {brandProfileImage ? <img src={brandProfileImage} alt="av" crossOrigin="anonymous" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 16, height: 16, borderRadius: "50%", background: accent }} />}
          <span>{brandHandle}</span>
        </div>
        {brandLogoImage
          ? <img src={brandLogoImage} alt="logo" crossOrigin="anonymous" style={{ height: 12, width: "auto", objectFit: "contain", opacity: 0.5 }} />
          : <span style={{ opacity: 0.25, fontSize: 8 }}>LOGO</span>}
      </div>
    );

    if (slide.layout === "capa") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: bg, backgroundImage: gridBg, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.2)" }}>
        <Header />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${canvasSafeXPct}` }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(42)}px`, fontWeight: 900, lineHeight: 0.92, color: titleColor, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 14 }}>{slide.titulo}</h2>
          ), null)}
          <div style={{ height: 6, width: "100%", background: accent, marginBottom: 14 }} />
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(11)}px`, color: bodyColor, lineHeight: 1.55 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "texto_imagem") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: bg, backgroundImage: gridBg, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.2)" }}>
        <Header />
        <div style={{ padding: `8px ${canvasSafeXPct} 6px` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 28, height: 7, background: accent, flexShrink: 0 }} />
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(22)}px`, fontWeight: 900, lineHeight: 1.05, color: titleColor, textTransform: "uppercase" }}>{slide.titulo}</h2>
            ), null)}
            <div style={{ flex: 1, height: 7, background: accent }} />
          </div>
        </div>
        <ImgBlock h="36%" />
        <div style={{ flex: 1, padding: `10px ${canvasSafeXPct} 0` }}>
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(11)}px`, color: bodyColor, lineHeight: 1.6 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "so_texto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: bg, backgroundImage: gridBg, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.2)" }}>
        <Header />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${canvasSafeXPct}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 24, height: 7, background: accent, flexShrink: 0 }} />
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(38)}px`, fontWeight: 900, lineHeight: 0.95, color: titleColor, textTransform: "uppercase" }}>{slide.titulo}</h2>
            ), null)}
          </div>
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(13)}px`, color: bodyColor, lineHeight: 1.65 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "impacto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: accent, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `12px ${canvasSafeXPct} 0`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          <span>{brandCategory}</span><span style={{ fontWeight: 900 }}>{num}</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${canvasSafeXPct}` }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(46)}px`, fontWeight: 900, lineHeight: 0.92, color: "#fff", textTransform: "uppercase", marginBottom: 12 }}>{slide.titulo}</h2>
          ), null)}
          <div style={{ height: 4, width: "100%", background: "rgba(255,255,255,0.4)", marginBottom: 12 }} />
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(13)}px`, color: "rgba(255,255,255,0.88)", lineHeight: 1.5, fontWeight: 700 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <div style={{ padding: `0 ${canvasSafeXPct} 12px`, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {brandProfileImage ? <img src={brandProfileImage} alt="av" crossOrigin="anonymous" style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />}
            <span>{brandHandle}</span>
          </div>
          {brandLogoImage
            ? <img src={brandLogoImage} alt="logo" crossOrigin="anonymous" style={{ height: 11, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.5 }} />
            : <span style={{ opacity: 0.3, fontSize: 8 }}>LOGO</span>}
        </div>
      </div>
    );

    // foto_full: MESMA capa, mas com foto de fundo + gradiente escuro na base
    // (precisa inverter as cores de texto pra branco porque o fundo agora é escuro)
    if (slide.layout === "foto_full") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", boxShadow: "0 6px 32px rgba(0,0,0,0.2)" }}>
        {/* Camada 1: foto de fundo */}
        {slide.imageUrl
          ? <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${vPos}%`, zIndex: 0 }} />
          : <div style={{ position: "absolute", inset: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: 0.4, color: "#fff", zIndex: 0 }}>
              <ImageIcon size={28} /><span style={{ fontSize: 9, marginTop: 6, fontFamily: "Arial", letterSpacing: "0.1em", textTransform: "uppercase" }}>Adicione uma imagem</span>
            </div>}
        {/* Camada 2: gradiente escuro na base */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.15) 100%)", zIndex: 1 }} />
        {/* Camada 3: conteúdo — estrutura da capa, cores adaptadas pro fundo escuro */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header em branco sobre foto */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `12px ${canvasSafeXPct} 0`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", textShadow: "0 1px 4px rgba(0,0,0,0.6)", ...(storyTopMargin || {}) }}>
            <span>{brandCategory}</span>
            <div style={{ flex: 1, height: "1px", margin: "0 8px", background: "rgba(255,255,255,0.25)" }} />
            <span style={{ color: "#fff", fontWeight: 900 }}>{num}</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${canvasSafeXPct}` }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(42)}px`, fontWeight: 900, lineHeight: 0.92, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 14, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>{slide.titulo}</h2>
            ), null)}
            <div style={{ height: 6, width: "100%", background: accent, marginBottom: 14 }} />
            {SmartEl("texto_apoio", (
              <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(11)}px`, color: "rgba(255,255,255,0.85)", lineHeight: 1.55, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{slide.texto_apoio}</p>
            ), null)}
          </div>
          {/* Footer em branco sobre foto */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `0 ${canvasSafeXPct} 12px`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", textShadow: "0 1px 4px rgba(0,0,0,0.6)", ...(storyBottomMargin || {}) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {brandProfileImage ? <img src={brandProfileImage} alt="av" crossOrigin="anonymous" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 16, height: 16, borderRadius: "50%", background: accent }} />}
              <span>{brandHandle}</span>
            </div>
            {brandLogoImage
              ? <img src={brandLogoImage} alt="logo" crossOrigin="anonymous" style={{ height: 12, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.65 }} />
              : <span style={{ opacity: 0.5, fontSize: 8 }}>LOGO</span>}
          </div>
        </div>
      </div>
    );

    return null;
  }
};

const yellowBlackTheme: ThemeDefinition = {
  id: "yellow_black",
  name: "Amarelo Preto",
  preview: ["#f5c800", "#111", "#fff"],
  desc: "Amarelo vibrante, caixa preta",
  copyRules: {
    voiceTone: "Chamativo, pop, direto. Poucas palavras no título.",
    capaTitleMaxWords: 5,
    bodyMaxWords: 70,
    imageLayoutMaxWords: 18,
    emphasisStyle: "Caixa preta interna, listra diagonal, borda pontilhada.",
    ctaStyle: "CTA urgente, curto."
  },
  supportedLayouts: ["capa", "so_texto", "texto_imagem", "impacto", "foto_full"],
  initialScales: {
    "1/1": { capa: { title: 83, content: 91 }, so_texto: { title: 62, content: 78 }, texto_imagem: { title: 63, content: 84 }, impacto: { title: 72, content: 69 } },
    "4/5": { texto_imagem: { title: 85 }, impacto: { title: 66 } },
    "4/3": { capa: { title: 62, content: 84 }, so_texto: { title: 60, content: 71 }, texto_imagem: { title: 60, content: 64 }, impacto: { title: 61, content: 63 } }
  },
  render: (ctx) => {
    const V = buildVisualCtx(ctx);
    const { AR, titFS, txtFS, vPos, num, storyTopMargin, storyBottomMargin, SmartEl, brandHandle, brandCategory, brandProfileImage, brandLogoImage, slide } = V;
    const canvasSafeXPct = CANVAS_SAFE_X_PCT;

    const yellow = "#f5c800";
    const black = "#111111";
    const white = "#ffffff";
    const diagPattern = `repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 2px, transparent 2px, transparent 12px)`;
    const innerBorder = "2px dashed rgba(0,0,0,0.2)";

    const Header = () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `12px ${canvasSafeXPct} 8px`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.5)", ...(storyTopMargin || {}) }}>
        <span>{brandCategory}</span><span>{num}</span>
      </div>
    );
    const Footer = () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `8px ${canvasSafeXPct} 12px`, fontFamily: "Arial Narrow, Arial, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,0,0,0.45)", ...(storyBottomMargin || {}) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {brandProfileImage ? <img src={brandProfileImage} alt="av" crossOrigin="anonymous" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.3)" }} />}
          <span>{brandHandle}</span>
        </div>
        {brandLogoImage
          ? <img src={brandLogoImage} alt="logo" crossOrigin="anonymous" style={{ height: 12, width: "auto", objectFit: "contain", opacity: 0.5 }} />
          : <span style={{ fontWeight: 900 }}>{num}</span>}
      </div>
    );

    if (slide.layout === "capa") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: yellow, backgroundImage: diagPattern, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.35)" }}>
        <Header />
        <div style={{ flex: 1, padding: "0 12px 0", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: black, border: innerBorder, display: "flex", flexDirection: "column", justifyContent: "center", padding: `18px ${canvasSafeXPct}` }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(38)}px`, fontWeight: 900, lineHeight: 0.95, color: white, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{slide.titulo}</h2>
            ), null)}
          </div>
        </div>
        <div style={{ padding: "8px 12px 0" }}>
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(10)}px`, color: "rgba(0,0,0,0.55)", lineHeight: 1.5 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "texto_imagem") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: yellow, backgroundImage: diagPattern, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.35)" }}>
        <Header />
        <div style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ background: black, border: innerBorder, padding: "12px 14px" }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(22)}px`, fontWeight: 900, lineHeight: 1.05, color: white, textTransform: "uppercase" }}>{slide.titulo}</h2>
            ), null)}
          </div>
          <div style={{ flex: 1, background: black, border: innerBorder, overflow: "hidden", position: "relative" }}>
            {slide.imageUrl
              ? <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", minWidth: "100%", minHeight: "100%", width: "auto", height: "auto", left: "50%", top: `${vPos}%`, transform: `translate(-50%, -${vPos}%)`, objectFit: "cover" }} />
              : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.2 }}><ImageIcon size={20} color={white} /></div>
            }
          </div>
          <div style={{ background: black, border: innerBorder, padding: "10px 14px" }}>
            {SmartEl("texto_apoio", (
              <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(10)}px`, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{slide.texto_apoio}</p>
            ), null)}
          </div>
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "so_texto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: yellow, backgroundImage: diagPattern, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.35)" }}>
        <Header />
        <div style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: black, border: innerBorder, padding: `18px ${canvasSafeXPct}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(36)}px`, fontWeight: 900, lineHeight: 0.95, color: white, textTransform: "uppercase", marginBottom: 14 }}>{slide.titulo}</h2>
            ), null)}
            <div style={{ height: 3, width: 40, background: yellow, marginBottom: 12 }} />
            {SmartEl("texto_apoio", (
              <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(12)}px`, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{slide.texto_apoio}</p>
            ), null)}
          </div>
        </div>
        <Footer />
      </div>
    );

    if (slide.layout === "impacto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: yellow, backgroundImage: diagPattern, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.35)" }}>
        <Header />
        <div style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: black, border: innerBorder, padding: `18px ${canvasSafeXPct}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(44)}px`, fontWeight: 900, lineHeight: 0.92, color: yellow, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 12 }}>{slide.titulo}</h2>
            ), null)}
            <div style={{ height: 4, width: "100%", background: yellow, opacity: 0.4, marginBottom: 12 }} />
            {SmartEl("texto_apoio", (
              <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(13)}px`, color: white, lineHeight: 1.5, fontWeight: 700 }}>{slide.texto_apoio}</p>
            ), null)}
          </div>
        </div>
        <Footer />
      </div>
    );

    // foto_full: mantém a identidade "caixa preta dentro de amarelo com listra"
    // A foto entra COMO fundo da caixa interna (substituindo o preto sólido) + gradiente escuro
    if (slide.layout === "foto_full") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: yellow, backgroundImage: diagPattern, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.35)" }}>
        <Header />
        <div style={{ flex: 1, padding: "0 12px 0", display: "flex", flexDirection: "column" }}>
          {/* Caixa interna: agora é a foto em vez do preto, com borda pontilhada mantida */}
          <div style={{ flex: 1, border: innerBorder, position: "relative", overflow: "hidden" }}>
            {/* Camada 1: foto */}
            {slide.imageUrl
              ? <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${vPos}%`, zIndex: 0 }} />
              : <div style={{ position: "absolute", inset: 0, background: black, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: 0.4, color: white, zIndex: 0 }}>
                  <ImageIcon size={28} /><span style={{ fontSize: 9, marginTop: 6, fontFamily: "Arial", letterSpacing: "0.1em", textTransform: "uppercase" }}>Adicione uma imagem</span>
                </div>}
            {/* Camada 2: gradiente escuro na base */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.15) 100%)", zIndex: 1 }} />
            {/* Camada 3: título centralizado, estrutura da capa */}
            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "center", padding: `18px ${canvasSafeXPct}`, height: "100%" }}>
              {SmartEl("titulo", (
                <h2 style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: `${titFS(38)}px`, fontWeight: 900, lineHeight: 0.95, color: white, textTransform: "uppercase", letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>{slide.titulo}</h2>
              ), null)}
            </div>
          </div>
        </div>
        <div style={{ padding: "8px 12px 0" }}>
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: "Arial, sans-serif", fontSize: `${txtFS(10)}px`, color: "rgba(0,0,0,0.55)", lineHeight: 1.5 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer />
      </div>
    );

    return null;
  }
};

const blackEditorialTheme: ThemeDefinition = {
  id: "black_editorial",
  name: "Editorial Preto",
  preview: ["#0a0a0a", "#f97316", "#fff"],
  desc: "Microblog denso, estilo newsletter",
  copyRules: {
    voiceTone: "Jornalístico, denso, referenciado. Sem motivacional.",
    capaTitleMaxWords: 8,
    bodyMaxWords: 120,
    imageLayoutMaxWords: 120,
    emphasisStyle: "Use **bold** para dados, [L]laranja[/L] para destaque, → e ✗ como marcadores.",
    ctaStyle: "CTA editorial com próximo passo concreto."
  },
  supportedLayouts: ["microblog_capa", "microblog_texto", "microblog_lista", "microblog_cta"],
  // Este tema é o fallback para qualquer layout microblog_* se outro tema não suportar
  fallbackFor: ["microblog_capa", "microblog_texto", "microblog_lista", "microblog_cta"],
  render: (ctx) => {
    const V = buildVisualCtx(ctx);
    const { AR, titFS, txtFS, vPos, num, cS, storyTopMargin, storyBottomMargin, SmartEl, brandHandle, brandCategory, brandProfileImage, brandLogoImage, slide } = V;
    const canvasSafeXPct = CANVAS_SAFE_X_PCT;

    const bg = "#0c0c0c";
    const accent = "#f97316";
    const white = "#ffffff";
    const offwhite = "rgba(255,255,255,0.88)";
    const muted = "rgba(255,255,255,0.55)";
    const divider = "rgba(255,255,255,0.08)";

    const RichText = ({ text, baseSize }: any) => {
      if (!text) return null;
      const sz = baseSize || (11 * cS);
      const paras = text.split("\n").filter((l: string) => l.trim());
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {paras.map((para: string, pi: number) => {
            const parts = para.split(/(\*\*[^*]+\*\*|\[L\][^\[]+\[\/L\])/g);
            const isArrow = para.startsWith("→");
            const isX = para.startsWith("✗") || para.startsWith("X ");
            if (isArrow || isX) {
              const marker = isX ? "✗" : "→";
              const mc = isX ? "#ef4444" : accent;
              const cleanPara = para.replace(/^[✗X→]\s*/, "");
              const innerParts = cleanPara.split(/(\*\*[^*]+\*\*|\[L\][^\[]+\[\/L\])/g);
              return (
                <div key={pi} style={{ display: "flex", gap: 9, alignItems: "flex-start", paddingBottom: 8, borderBottom: `1px solid ${divider}` }}>
                  <span style={{ color: mc, fontSize: sz + 2, fontWeight: 900, fontFamily: "Arial Black,sans-serif", flexShrink: 0, lineHeight: 1.4, marginTop: 1 }}>{marker}</span>
                  <span style={{ fontFamily: "Arial,sans-serif", fontSize: sz, color: offwhite, lineHeight: 1.65 }}>
                    {innerParts.map((p: string, ii: number) => {
                      if (p.startsWith("**") && p.endsWith("**")) return <strong key={ii} style={{ color: white, fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
                      if (p.startsWith("[L]") && p.endsWith("[/L]")) return <span key={ii} style={{ color: accent, fontWeight: 700 }}>{p.slice(3, -4)}</span>;
                      return p;
                    })}
                  </span>
                </div>
              );
            }
            return (
              <p key={pi} style={{ fontFamily: "Arial,sans-serif", fontSize: sz, color: offwhite, lineHeight: 1.7, margin: 0 }}>
                {parts.map((p: string, ii: number) => {
                  if (p.startsWith("**") && p.endsWith("**")) return <strong key={ii} style={{ color: white, fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
                  if (p.startsWith("[L]") && p.endsWith("[/L]")) return <span key={ii} style={{ color: accent, fontWeight: 700 }}>{p.slice(3, -4)}</span>;
                  return p;
                })}
              </p>
            );
          })}
        </div>
      );
    };

    const EHeader = () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `11px ${canvasSafeXPct} 9px`, borderBottom: `1px solid ${divider}`, flexShrink: 0, ...(storyTopMargin || {}) }}>
        <span style={{ fontFamily: "Arial Narrow,Arial,sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: muted }}>{brandCategory}</span>
        <div style={{ flex: 1, height: "1px", background: divider, margin: "0 10px" }} />
        <span style={{ fontFamily: "Arial Narrow,Arial,sans-serif", fontSize: 10, fontWeight: 900, color: accent, letterSpacing: "0.08em" }}>{num}</span>
      </div>
    );

    const EFooter = () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `9px ${canvasSafeXPct} 13px`, borderTop: `1px solid ${divider}`, flexShrink: 0, ...(storyBottomMargin || {}) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {brandProfileImage
            ? <img src={brandProfileImage} alt="av" crossOrigin="anonymous" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(249,115,22,0.6)" }} />
            : <div style={{ width: 20, height: 20, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: "#000", fontFamily: "Arial" }}>{brandHandle[0] || "@"}</span>
              </div>}
          <span style={{ fontFamily: "Arial Narrow,Arial,sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: muted }}>{brandHandle}</span>
        </div>
        {brandLogoImage
          ? <img src={brandLogoImage} alt="logo" crossOrigin="anonymous" style={{ height: 14, width: "auto", objectFit: "contain", opacity: 0.55, filter: "brightness(0) invert(1)" }} />
          : <span style={{ fontFamily: "Arial Narrow,Arial,sans-serif", fontSize: 8, color: "rgba(255,255,255,0.18)", letterSpacing: "0.12em", textTransform: "uppercase" }}>LOGO</span>}
      </div>
    );

    if (slide.layout === "microblog_capa") {
      const titleWords = slide.titulo.split(" ");
      const breakAt = titleWords.length > 4 ? titleWords.length - 2 : Math.ceil(titleWords.length / 2);
      const titleWhite = titleWords.slice(0, breakAt).join(" ");
      const titleOrange = titleWords.slice(breakAt).join(" ");
      const lines = slide.texto_apoio.split("\n").filter((l: string) => l.trim());
      const introLines = lines.filter((l: string) => !l.startsWith("→") && !l.startsWith("✗"));
      const bulletLines = lines.filter((l: string) => l.startsWith("→") || l.startsWith("✗"));

      return (
        <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.9)" }}>
          <EHeader />
          {slide.imageUrl ? (
            <div style={{ height: "36%", position: "relative", overflow: "hidden", flexShrink: 0 }}>
              <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${vPos}%` }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(12,12,12,0.95) 100%)" }} />
            </div>
          ) : (
            <div style={{ height: "28%", background: "#161616", flexShrink: 0 }} />
          )}
          <div style={{ padding: `12px ${canvasSafeXPct} 0`, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black,Impact,sans-serif", fontWeight: 900, lineHeight: 0.97, letterSpacing: "-0.03em", margin: "0 0 11px" }}>
                <span style={{ fontSize: `${titFS(34)}px`, color: white, display: "block" }}>{titleWhite}</span>
                <span style={{ fontSize: `${titFS(34)}px`, color: accent, display: "block" }}>{titleOrange}</span>
              </h2>
            ), null)}
            {SmartEl("texto_apoio", (
              <div>
                {introLines.length > 0 && (
                  <p style={{ fontFamily: "Arial,sans-serif", fontSize: `${txtFS(10)}px`, color: muted, lineHeight: 1.6, margin: "0 0 10px" }}>
                    {introLines.join(" ")}
                  </p>
                )}
                {bulletLines.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, borderTop: `1px solid ${divider}`, paddingTop: 8 }}>
                    {bulletLines.map((item: string, i: number) => {
                      const isX = item.startsWith("✗");
                      const mc = isX ? "#ef4444" : accent;
                      const txt = item.replace(/^[✗→X]\s*/, "");
                      return (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <span style={{ color: mc, fontSize: 11, fontWeight: 900, flexShrink: 0, lineHeight: 1.5 }}>{isX ? "✗" : "→"}</span>
                          <span style={{ fontFamily: "Arial,sans-serif", fontSize: `${txtFS(10)}px`, color: offwhite, lineHeight: 1.55 }}>{txt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ), null)}
          </div>
          <EFooter />
        </div>
      );
    }

    if (slide.layout === "microblog_texto") {
      return (
        <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.9)" }}>
          <EHeader />
          <div style={{ flex: 1, padding: `11px ${canvasSafeXPct} 0`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {SmartEl("titulo", (
              <div style={{ marginBottom: 12 }}>
                <h2 style={{ fontFamily: "Arial Black,Impact,sans-serif", fontSize: `${titFS(18)}px`, fontWeight: 900, lineHeight: 1.1, color: white, textTransform: "uppercase", letterSpacing: "-0.015em", margin: "0 0 6px" }}>
                  {slide.titulo}
                </h2>
                <div style={{ height: 3, width: "100%", background: `linear-gradient(to right, ${accent}, transparent)` }} />
              </div>
            ), null)}
            {SmartEl("texto_apoio", (
              <div style={{ flex: 1, overflow: "hidden" }}>
                <RichText text={slide.texto_apoio} baseSize={10.5 * cS} />
              </div>
            ), null)}
            {slide.imageUrl && (
              <div style={{ height: 70, position: "relative", overflow: "hidden", borderRadius: 2, marginTop: 8, border: `1px solid ${divider}` }}>
                <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
              </div>
            )}
          </div>
          <EFooter />
        </div>
      );
    }

    if (slide.layout === "microblog_lista") {
      const lines = slide.texto_apoio.split("\n").filter((l: string) => l.trim());
      return (
        <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.9)" }}>
          <EHeader />
          <div style={{ flex: 1, padding: `11px ${canvasSafeXPct} 0`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black,Impact,sans-serif", fontSize: `${titFS(18)}px`, fontWeight: 900, lineHeight: 1.1, color: white, textTransform: "uppercase", letterSpacing: "-0.015em", margin: "0 0 12px" }}>
                {slide.titulo}
              </h2>
            ), null)}
            {SmartEl("texto_apoio", (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, overflow: "hidden" }}>
                {lines.map((line: string, i: number) => {
                  const isX = line.startsWith("✗") || line.startsWith("X ");
                  const marker = isX ? "✗" : "→";
                  const mc = isX ? "#ef4444" : accent;
                  const rawText = line.replace(/^[✗X→]\s*/, "");
                  const parts = rawText.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderBottom: `1px solid ${divider}` }}>
                      <span style={{ color: mc, fontSize: 15, fontWeight: 900, fontFamily: "Arial Black,sans-serif", flexShrink: 0, lineHeight: 1.3, minWidth: 14 }}>{marker}</span>
                      <span style={{ fontFamily: "Arial,sans-serif", fontSize: `${txtFS(10)}px`, color: offwhite, lineHeight: 1.62 }}>
                        {parts.map((p: string, ii: number) =>
                          p.startsWith("**") && p.endsWith("**")
                            ? <strong key={ii} style={{ color: white, fontWeight: 700 }}>{p.slice(2, -2)}</strong>
                            : p
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ), null)}
          </div>
          <EFooter />
        </div>
      );
    }

    if (slide.layout === "microblog_cta") {
      const lines = slide.texto_apoio.split("\n").filter((l: string) => l.trim());
      return (
        <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", background: bg, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.9)", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, zIndex: 10 }} />
          <EHeader />
          {slide.imageUrl && (
            <div style={{ height: "30%", position: "relative", overflow: "hidden", flexShrink: 0 }}>
              <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${vPos}%` }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(12,12,12,0.92))" }} />
            </div>
          )}
          <div style={{ flex: 1, padding: `${slide.imageUrl ? "10px" : "16px"} 20px 0`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {SmartEl("titulo", (
              <h2 style={{ fontFamily: "Arial Black,Impact,sans-serif", fontSize: `${titFS(20)}px`, fontWeight: 900, lineHeight: 1.05, color: white, textTransform: "uppercase", margin: "0 0 12px" }}>
                {slide.titulo}
              </h2>
            ), null)}
            {SmartEl("texto_apoio", (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflow: "hidden" }}>
                {lines.map((line: string, i: number) => {
                  const cleanLine = line.replace(/\*\*/g, "");
                  const isBold = line.includes("**");
                  return (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <span style={{ color: accent, fontSize: 12, fontWeight: 900, flexShrink: 0, marginTop: 2, lineHeight: 1.4 }}>→</span>
                      <span style={{ fontFamily: "Arial,sans-serif", fontSize: `${txtFS(11)}px`, color: isBold ? white : offwhite, lineHeight: 1.58, fontWeight: isBold ? 700 : 400 }}>{cleanLine}</span>
                    </div>
                  );
                })}
              </div>
            ), null)}
          </div>
          <EFooter />
        </div>
      );
    }

    return null;
  }
};

const vermelhoSwissTheme: ThemeDefinition = {
  id: "vermelho_swiss",
  name: "Vermelho Suíço",
  preview: ["#f11010", "#104ff1", "#ffffff"],
  desc: "Editorial brutalista, vermelho gritante, blocos azuis.",
  copyRules: {
    voiceTone: "Impactante, direto como um outdoor. Frases curtas e agressivas.",
    capaTitleMaxWords: 7,
    bodyMaxWords: 50,
    imageLayoutMaxWords: 15,
    emphasisStyle: "Blocos de texto azuis e caixas vermelhas maciças.",
    ctaStyle: "Imperativo e seco."
  },
  supportedLayouts: ["capa", "so_texto", "texto_imagem", "impacto", "foto_full"],
  initialScales: {
    "1/1": { capa: { title: 71, content: 90 }, so_texto: { title: 66, content: 80 }, texto_imagem: { title: 74, content: 85 }, impacto: { title: 70, content: 85 } },
    "4/5": { capa: { title: 100 }, so_texto: { title: 105 }, texto_imagem: { title: 90 }, impacto: { title: 110 } },
    "4/3": { capa: { title: 75 }, so_texto: { title: 85 }, impacto: { title: 85 } }
  },
  render: (ctx) => {
    const V = buildVisualCtx(ctx);
    const { AR, isStory, titFS, txtFS, vPos, num, storyTopMargin, storyBottomMargin, SmartEl, brandHandle, brandCategory, brandProfileImage, brandLogoImage, slide } = V;
    const canvasSafeXPct = CANVAS_SAFE_X_PCT;

    const red = "#f11010"; // Vermelho punchy
    const blue = "#104ff1"; // Azul royal punchy
    const white = "#ffffff";
    const black = "#111111";

    const Header = ({ color = black }) => (
      <div style={{ padding: `16px ${canvasSafeXPct} 0`, display: "flex", justifyContent: "space-between", alignItems: "center", ...(storyTopMargin || {}), position: "relative", zIndex: 10 }}>
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color }}>{brandCategory}</span>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color }}>{num}</div>
        </div>
      </div>
    );

    const Footer = ({ color = black }) => (
      <div style={{ padding: `0 ${canvasSafeXPct} 16px`, display: "flex", justifyContent: "space-between", alignItems: "center", ...(storyBottomMargin || {}), position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {brandProfileImage ? <img src={brandProfileImage} style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} crossOrigin="anonymous"/> : <div style={{ width: 16, height: 16, borderRadius: "50%", background: color }} />}
          <span style={{ fontSize: 9, fontWeight: 800, color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{brandHandle}</span>
        </div>
        {brandLogoImage && <img src={brandLogoImage} crossOrigin="anonymous" style={{ height: 12, objectFit: "contain", filter: color === white ? "brightness(0) invert(1)" : "none" }} />}
      </div>
    );

    if (slide.layout === "capa" || slide.layout === "foto_full") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: black, overflow: "hidden", position: "relative" }}>
        {slide.imageUrl
          ? <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${vPos}%`, zIndex: 0 }} />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 0, opacity: 0.3 }}><ImageIcon size={32} /></div>}
        
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%" }}>
          <Header color={white} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ background: red, padding: `24px ${canvasSafeXPct}`, width: "88%" }}>
              {SmartEl("titulo", (
                <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(38)}px`, fontWeight: 900, lineHeight: 0.95, color: white, letterSpacing: "-0.03em", marginBottom: 12 }}>{slide.titulo}</h2>
              ), null)}
              {SmartEl("texto_apoio", (
                <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(12)}px`, color: "rgba(255,255,255,0.9)", fontWeight: 500, lineHeight: 1.4 }}>{slide.texto_apoio}</p>
              ), null)}
            </div>
          </div>
          <div style={{ height: isStory ? 30 : 16 }} />
        </div>
      </div>
    );

    if (slide.layout === "impacto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: red, overflow: "hidden", position: "relative" }}>
        <Header color={white} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${canvasSafeXPct}`, zIndex: 2, alignItems: "center", textAlign: "center" }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(42)}px`, fontWeight: 900, lineHeight: 1.0, color: white, letterSpacing: "-0.03em" }}>{slide.titulo}</h2>
          ), null)}
          {SmartEl("texto_apoio", (
            <div style={{ marginTop: 24, background: blue, padding: "8px 16px", display: "inline-block" }}>
              <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(14)}px`, color: white, fontWeight: 700, lineHeight: 1.4 }}>{slide.texto_apoio}</p>
            </div>
          ), { marginTop: 10 })}
          
          <div style={{ marginTop: 32, opacity: 0.8 }}>
            <svg width="80" height="24" viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 18C15.5 12 45 4 76 12M76 12C72 7.5 68 2 68 2M76 12C72 17 66 22 66 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <Footer color={white} />
      </div>
    );

    if (slide.layout === "so_texto") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: white, overflow: "hidden", position: "relative" }}>
        <Header color={red} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: `24px ${canvasSafeXPct} 0`, zIndex: 2 }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(46)}px`, fontWeight: 900, lineHeight: 0.95, color: black, letterSpacing: "-0.04em" }}>"{slide.titulo}"</h2>
          ), null)}
        </div>
        <div style={{ background: red, padding: `20px ${canvasSafeXPct}`, margin: `0 ${canvasSafeXPct} 24px`, width: "90%" }}>
          {SmartEl("texto_apoio", (
            <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(12)}px`, color: white, fontWeight: 500, lineHeight: 1.5 }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
        <Footer color={black} />
      </div>
    );

    if (slide.layout === "texto_imagem") return (
      <div style={{ aspectRatio: AR, width: "100%", display: "flex", flexDirection: "column", backgroundColor: red, overflow: "hidden", position: "relative" }}>
        <Header color={white} />
        <div style={{ padding: `20px ${canvasSafeXPct} 16px`, textAlign: "center", zIndex: 2 }}>
          {SmartEl("titulo", (
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${titFS(36)}px`, fontWeight: 900, lineHeight: 1.0, color: white, letterSpacing: "-0.03em" }}>{slide.titulo}</h2>
          ), null)}
          {SmartEl("texto_apoio", (
            <div style={{ marginTop: 16, background: blue, padding: "6px 12px", display: "inline-block" }}>
              <p style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: `${txtFS(12)}px`, color: white, fontWeight: 700, lineHeight: 1.4 }}>{slide.texto_apoio}</p>
            </div>
          ), null)}
        </div>
        <div style={{ flex: 1, padding: `0 ${canvasSafeXPct} 24px`, position: "relative", zIndex: 1 }}>
          {slide.imageUrl
            ? <img src={slide.imageUrl} alt="v" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: white }}><ImageIcon size={32} /></div>}
        </div>
        <Footer color={white} />
      </div>
    );

    return null;
  }
};

// THEME_REGISTRY é mutável porque o app permite importar temas via JSON em runtime
// (gerados pelo theme-generator.tsx). Não é const pra possibilitar loadThemeFromJSON().
let THEME_REGISTRY: ThemeDefinition[] = [
  neoBrutalistTheme,
  darkOrangeTheme,
  darkRedTheme,
  whiteRedTheme,
  yellowBlackTheme,
  blackEditorialTheme,
  vermelhoSwissTheme,
];

// ═══════════════════════════════════════════════════════════════════════════
//  JSON THEME LOADER
//  Converte um JSON no formato do theme-generator.tsx em ThemeDefinition
//  executável pelo v4. O `renderCode` do JSON é uma string JS que usa
//  React.createElement (R) — executamos via new Function() com os args
//  esperados (R, slide, theme, slideIndex, totalSlides, brandHandle).
// ═══════════════════════════════════════════════════════════════════════════

function loadThemeFromJSON(json: any): ThemeDefinition {
  if (!json || typeof json !== "object") throw new Error("JSON inválido");
  if (!json.id || !json.name) throw new Error("JSON precisa ter id e name");
  if (!json.renderCode || typeof json.renderCode !== "string") {
    throw new Error("JSON precisa ter renderCode (string com React.createElement)");
  }

  // Compila renderCode uma vez (cache no closure)
  let compiledRender: Function | null = null;
  const getCompiled = () => {
    if (compiledRender) return compiledRender;
    try {
      compiledRender = new Function("R", "slide", "theme", "slideIndex", "totalSlides", "brandHandle", json.renderCode);
    } catch (err: any) {
      throw new Error(`Erro ao compilar renderCode: ${err.message}`);
    }
    return compiledRender;
  };

  // compatibleLayouts do JSON → supportedLayouts do v4
  const supportedLayouts: LayoutId[] = Array.isArray(json.compatibleLayouts) && json.compatibleLayouts.length > 0
    ? json.compatibleLayouts.filter((l: string) => LAYOUT_REGISTRY.some(r => r.id === l))
    : ["capa", "so_texto", "texto_imagem", "impacto", "foto_full"];

  // copyRules: o JSON tem voiceTone em formato tag, o v4 espera string livre
  const jsonCopyRules = json.copyRules || {};
  const copyRules: CopyRules = {
    voiceTone: String(jsonCopyRules.voiceTone || "direto"),
    capaTitleMaxWords: Number(jsonCopyRules.capaTitleMaxWords) || 6,
    bodyMaxWords: Number(jsonCopyRules.bodyMaxWords) || 70,
    imageLayoutMaxWords: Number(jsonCopyRules.imageLayoutMaxWords) || 20,
    emphasisStyle: String(jsonCopyRules.emphasisStyle || "accent_color"),
    ctaStyle: String(jsonCopyRules.ctaStyle || "seta")
  };

  const preview: [string, string, string] = Array.isArray(json.preview) && json.preview.length >= 3
    ? [json.preview[0], json.preview[1], json.preview[2]]
    : [json.bg || "#111", json.accent || "#f97316", json.titleColor || "#fff"];

  return {
    id: json.id,
    name: json.name,
    preview,
    desc: json.description || "",
    copyRules,
    supportedLayouts,
    fallbackFor: json.layoutMode === "microblog"
      ? ["microblog_capa", "microblog_texto", "microblog_lista", "microblog_cta"]
      : undefined,
    initialScales: json.initialScales || {},
    render: (ctx) => {
      try {
        const fn = getCompiled();
        const totalSlides = (ctx as any).totalSlides || 10;
        // Enriquece o "theme" com helpers de escala/safe area — assim o renderCode
        // pode usar theme.__titFS(base) e theme.__txtFS(base) em vez de reinventar,
        // e respeitar safe area de Stories via theme.__safeTopY etc.
        const tS = typeof ctx.slide?.scales?.title === "number" ? ctx.slide.scales.title / 100 : ctx.titleScale / 100;
        const cS = typeof ctx.slide?.scales?.content === "number" ? ctx.slide.scales.content / 100 : ctx.contentScale / 100;
        const isStory = ctx.aspectRatio === "9/16";
        const enriched = {
          ...json,
          __tS: tS,
          __cS: cS,
          __isStory: isStory,
          __titFS: (baseCqw: number) => `${(baseCqw * tS).toFixed(2)}cqw`,
          __txtFS: (baseCqw: number) => `${(baseCqw * cS).toFixed(2)}cqw`,
          __safeX: CANVAS_SAFE_X_PCT,
          __safeTopY: isStory ? STORY_SAFE_MARGIN_PCT : "0%",
          __safeBottomY: isStory ? STORY_SAFE_MARGIN_PCT : "0%"
        };
        return fn(React, ctx.slide, enriched, ctx.index + 1, totalSlides, ctx.brandHandle);
      } catch (err: any) {
        return (
          <div style={{ aspectRatio: ctx.aspectRatio || "4/5", width: "100%", background: "#450a0a", color: "#fca5a5", padding: 16, fontFamily: "monospace", fontSize: 11, display: "flex", alignItems: "center" }}>
            Erro no renderCode: {err.message}
          </div>
        );
      }
    }
  };
}

function registerImportedTheme(json: any): ThemeDefinition {
  const theme = loadThemeFromJSON(json);
  // Substitui se já existe mesmo id; senão adiciona
  const existingIdx = THEME_REGISTRY.findIndex(t => t.id === theme.id);
  if (existingIdx >= 0) {
    THEME_REGISTRY = [...THEME_REGISTRY.slice(0, existingIdx), theme, ...THEME_REGISTRY.slice(existingIdx + 1)];
  } else {
    THEME_REGISTRY = [...THEME_REGISTRY, theme];
  }
  return theme;
}

// Restaura temas importados salvos em localStorage na inicialização
function restoreImportedThemesFromStorage() {
  try {
    const raw = localStorage.getItem("aipro_v4_imported_themes");
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;
    list.forEach(json => {
      try { registerImportedTheme(json); } catch (e) { console.warn("Falha ao restaurar tema:", json?.id, e); }
    });
  } catch (e) { console.warn("Falha ao ler localStorage:", e); }
}

function persistImportedThemes(jsonList: any[]) {
  try {
    localStorage.setItem("aipro_v4_imported_themes", JSON.stringify(jsonList));
  } catch (e) { console.warn("Falha ao salvar em localStorage:", e); }
}

restoreImportedThemesFromStorage();


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 9 — HELPERS DERIVADOS (UI / prompts / schema LLM)
// ═══════════════════════════════════════════════════════════════════════════

// Layouts visíveis na UI dado o modo ativo
function getVisibleLayoutsForMode(modeId: string | null, themeId: string): LayoutDefinition[] {
  const theme = THEME_REGISTRY.find(t => t.id === themeId);
  const isMicroblogMode = modeId === "microblog_denso";

  return LAYOUT_REGISTRY.filter(layout => {
    // No modo microblog: só layouts microblog
    if (isMicroblogMode) return layout.isMicroblog;
    // Fora do modo microblog: nunca layouts microblog
    if (layout.isMicroblog) return false;
    // Se o tema declara supportedLayouts, respeita
    if (theme && !theme.supportedLayouts.includes(layout.id)) return false;
    return true;
  });
}

// Lista de layout ids que o LLM pode retornar dado o modo
function getAllowedLayoutIdsForMode(modeId: string | null): LayoutId[] {
  const isMicroblogMode = modeId === "microblog_denso";
  return LAYOUT_REGISTRY
    .filter(l => isMicroblogMode ? l.isMicroblog : !l.isMicroblog)
    .map(l => l.id);
}

// Sets derivados para normalização pós-LLM (word clamping)
function getLayoutWordBudgets(theme: ThemeDefinition) {
  const imageLayouts = new Set(
    LAYOUT_REGISTRY.filter(l => l.requiresImage && !l.isMicroblog).map(l => l.id)
  );
  // microblog_capa/cta levam imagem mas têm budget próprio alto (microblog = denso)
  const bodyLayouts = new Set<LayoutId>(["so_texto", "impacto", "capa"]);
  return {
    imageLayouts,
    bodyLayouts,
    imageMax: theme.copyRules.imageLayoutMaxWords,
    bodyMax: theme.copyRules.bodyMaxWords
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 10 — APP COMPONENT E TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="tooltip-wrap">
    <Info size={13} color="#a8a29e" />
    <div className="tooltip-content">{text}</div>
  </div>
);

export default function App() {
  // ── State ──
  const [selectedTheme, setSelectedTheme] = useState("neo_brutalist");
  const [themeLocked, setThemeLocked] = useState(false);
  const [selectedMode, setSelectedMode] = useState<any>(null);
  const [theme, setTheme] = useState("");
  const [slides, setSlides] = useState<any[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [slideCount, setSlideCount] = useState(6);
  const [imagePositions, setImagePositions] = useState<{ [i: number]: number }>({});
  const [isExporting, setIsExporting] = useState(false);
  const [brandHandle, setBrandHandle] = useState("@suamarca");
  const [brandCategory, setBrandCategory] = useState("Marketing");
  const [brandProfileImage, setBrandProfileImage] = useState<string | null>(null);
  const [brandLogoImage, setBrandLogoImage] = useState<string | null>(null);
  const [titleScale, setTitleScale] = useState(100);
  const [contentScale, setContentScale] = useState(100);
  const [slideAspectRatio, setSlideAspectRatio] = useState<AspectRatioId>("4/5");
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [loadingImages, setLoadingImages] = useState<{ [i: number]: boolean }>({});
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfImages, setPdfImages] = useState<string[]>([]);
  const [actionInfo, setActionInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [inspectorTab, setInspectorTab] = useState("content");
  const [mobileTab, setMobileTab] = useState<"setup" | "preview" | "edit">("setup");
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [importedThemesJson, setImportedThemesJson] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("aipro_v4_imported_themes") || "[]"); } catch { return []; }
  });
  const [importError, setImportError] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() => {
    try { return localStorage.getItem("aipro_v4_terms_accepted") === "yes"; } catch { return false; }
  });

  const handleAcceptTerms = () => {
    try { localStorage.setItem("aipro_v4_terms_accepted", "yes"); } catch {}
    setTermsAccepted(true);
  };
  // Força re-render quando THEME_REGISTRY muta (importedThemesJson.length funciona como "bump")

  const handleImportThemeJSON = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const theme = registerImportedTheme(json);
      const next = [...importedThemesJson.filter((j: any) => j.id !== theme.id), json];
      setImportedThemesJson(next);
      persistImportedThemes(next);
      setSelectedTheme(theme.id);
    } catch (err: any) {
      setImportError(err.message || "JSON inválido");
    }
    e.target.value = "";
  };

  const handleRemoveImportedTheme = (id: string) => {
    const next = importedThemesJson.filter((j: any) => j.id !== id);
    setImportedThemesJson(next);
    persistImportedThemes(next);
    THEME_REGISTRY = THEME_REGISTRY.filter(t => t.id !== id);
    if (selectedTheme === id) setSelectedTheme("neo_brutalist");
  };

  const activeThemeObj = THEME_REGISTRY.find(t => t.id === selectedTheme) || THEME_REGISTRY[0];
  const themeAccent = activeThemeObj.preview[1] || "#f97316";

  const visibleLayouts = getVisibleLayoutsForMode(selectedMode?.id || null, selectedTheme);

  // ── Drag & Resize ──
  useEffect(() => {
    const handleMouseMove = (e: any) => {
      if (!actionInfo) return;
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - actionInfo.startX, dy = clientY - actionInfo.startY;
      setSlides(prev => prev.map((s, i) => {
        if (i !== actionInfo.index) return s;
        const allPos = s.positions || {};
        const pos = allPos[actionInfo.field] || { x: 0, y: 0, scale: 1 };
        const newPos = { ...allPos };
        if (actionInfo.type === "drag") newPos[actionInfo.field] = { x: actionInfo.origX + dx, y: actionInfo.origY + dy, scale: pos.scale };
        else newPos[actionInfo.field] = { x: pos.x, y: pos.y, scale: Math.max(0.3, actionInfo.origScale + (dx + dy) * 0.005) };
        return { ...s, positions: newPos };
      }));
    };
    const handleMouseUp = () => { if (actionInfo) setActionInfo(null); };
    if (actionInfo) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [actionInfo]);

  useEffect(() => { setSlides(prev => applyInitialScalesToSlides(prev, slideAspectRatio, selectedTheme)); }, [slideAspectRatio, selectedTheme]);

  const handleActionStart = (e: any, index: number, field: string, type: string) => {
    if (!e.touches && e.button !== 0) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const pos = slides[index]?.positions?.[field] || { x: 0, y: 0, scale: 1 };
    setActionInfo({ type, index, field, startX: clientX, startY: clientY, origX: pos.x, origY: pos.y, origScale: pos.scale || 1 });
  };

  _dragCtx.onAction = handleActionStart;
  _dragCtx.allPositions = slides.map((s) => s.positions || {});

  const handleModeSelect = (mode: any) => {
    setSelectedMode(mode);
    setSlideCount(mode.defaultSlides);
    setSlides([]);
    setError("");
    setThemeLocked(false);
    if (mode.id === "microblog_denso") setSelectedTheme("black_editorial");
    else if (selectedTheme === "black_editorial") setSelectedTheme("neo_brutalist");
  };

  const handleResetTheme = () => {
    setThemeLocked(false);
    setSlides([]);
    setError("");
  };

  const handleProfileImageUpload = (e: any) => { const f = e.target.files[0]; if (f) setBrandProfileImage(URL.createObjectURL(f)); };
  const handleLogoUpload = (e: any) => { const f = e.target.files[0]; if (f) setBrandLogoImage(URL.createObjectURL(f)); };
  const handleImageUpload = (index: number, e: any) => {
    const f = e.target.files[0]; if (!f) return;
    setSlides(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: URL.createObjectURL(f) } : s));
    setImagePositions(prev => ({ ...prev, [index]: 50 }));
  };

  const handlePdfUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file || file.type !== "application/pdf") { setError("Isso não é um PDF."); return; }
    setIsProcessingPdf(true); setError("");
    try {
      if (!(window as any).pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => { (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; resolve(null); };
          script.onerror = reject; document.head.appendChild(script);
        });
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      const rawImages: string[] = [];
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += `\n--- PÁGINA ${i} ---\n` + textContent.items.map((it: any) => it.str).join(" ") + "\n";
        if (i <= 10) {
          try {
            const ops = await page.getOperatorList();
            for (let j = 0; j < ops.fnArray.length; j++) {
              const pdfjs = (window as any).pdfjsLib;
              if (ops.fnArray[j] === pdfjs.OPS.paintImageXObject || ops.fnArray[j] === pdfjs.OPS.paintJpegXObject) {
                const imgKey = ops.argsArray[j][0];
                const img: any = await new Promise(resolve => page.objs.get(imgKey, resolve));
                if (!img || img.width < 150 || img.height < 150) continue;
                const canvas = document.createElement("canvas");
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext("2d")!; let extracted = false;
                if (img.bitmap) { ctx.drawImage(img.bitmap, 0, 0); extracted = true; }
                else if (img.data) {
                  let rgba: Uint8ClampedArray | null = null;
                  if (img.data.length === img.width * img.height * 3) {
                    rgba = new Uint8ClampedArray(img.width * img.height * 4);
                    let ptr = 0;
                    for (let k = 0; k < img.data.length; k += 3) { rgba[ptr++] = img.data[k]; rgba[ptr++] = img.data[k + 1]; rgba[ptr++] = img.data[k + 2]; rgba[ptr++] = 255; }
                  } else if (img.data.length === img.width * img.height * 4) {
                    rgba = new Uint8ClampedArray(img.data);
                  }
                  if (rgba) { ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), img.width, img.height), 0, 0); extracted = true; }
                }
                if (extracted) rawImages.push(canvas.toDataURL("image/jpeg", 0.9));
              }
            }
          } catch (e) { console.warn("Erro ao extrair imagem na página", i); }
        }
      }

      if (rawImages.length === 0) {
        for (let i = 1; i <= Math.min(10, totalPages); i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.height = viewport.height; canvas.width = viewport.width;
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          rawImages.push(canvas.toDataURL("image/jpeg", 0.8));
        }
      }

      setTheme(prev => (prev ? prev + "\n\n" : "") + "--- TEXTO EXTRAÍDO DO PDF ---\n" + fullText);
      setPdfImages(rawImages);
      if (totalPages > 10) setError("Aviso: Extraí o texto de tudo, mas limitei a busca de imagens às primeiras 10 páginas.");
    } catch (err) { setError("Deu pau na hora de ler o PDF."); }
    finally { setIsProcessingPdf(false); event.target.value = ""; }
  };

  const generateImageWithAI = async (index: number, prompt: string) => {
    setLoadingImages(prev => ({ ...prev, [index]: true }));
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      const payload = { instances: { prompt: prompt + " -- editorial photography, premium, no text, 4:5 ratio" }, parameters: { sampleCount: 1, aspectRatio: "4:5" } };
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setSlides(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}` } : s));
      setImagePositions(prev => ({ ...prev, [index]: 50 }));
    } catch (err) { setError("Erro ao gerar imagem."); }
    finally { setLoadingImages(prev => ({ ...prev, [index]: false })); }
  };

  const handleSlideTextChange = (index: number, field: string, val: string) => setSlides(prev => prev.map((s, i) => i === index ? { ...s, [field]: val } : s));
  const handleSlideScaleChange = (index: number, type: string, value: any) => setSlides(prev => prev.map((s, i) => i !== index ? s : { ...s, scales: { ...(s.scales || {}), [type]: Number(value) } }));
  const handleSlideLayoutChange = (index: number, layout: LayoutId) => setSlides(prev => prev.map((s, i) => {
    if (i !== index) return s;
    // Ao trocar de layout, re-aplica o preset de escala do novo layout
    // (evita que escalas do layout antigo "vazem" — ex: capa em foto_full)
    const preset = getInitialCardScales(slideAspectRatio, selectedTheme, layout);
    const scales = preset
      ? {
          ...(typeof preset.title === "number" ? { title: preset.title } : {}),
          ...(typeof preset.content === "number" ? { content: preset.content } : {})
        }
      : undefined;
    return { ...s, layout, scales };
  }));
  const handlePositionChange = (index: number, val: number) => setImagePositions(prev => ({ ...prev, [index]: val }));
  const duplicateSlide = (index: number) => { const s = slides[index]; setSlides(prev => { const n = [...prev]; n.splice(index + 1, 0, { ...s, slide: index + 2 }); return n.map((sl, i) => ({ ...sl, slide: i + 1 })); }); };
  const removeSlide = (index: number) => { if (slides.length <= 1) return; setSlides(prev => prev.filter((_, i) => i !== index).map((sl, i) => ({ ...sl, slide: i + 1 }))); setActiveSlide(i => Math.min(i, slides.length - 2)); };
  const addSlide = () => { const newSlide = { slide: slides.length + 1, layout: "so_texto" as LayoutId, titulo: "Novo slide", texto_apoio: "Texto de apoio aqui.", sugestao_visual: "" }; setSlides(prev => [...prev, newSlide]); setActiveSlide(slides.length); };

  // ── LLM CALL ──
  const callAgent = async (instruction: string, prompt: string, schema: any = null, useSearch = false) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const payload: any = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: instruction }] },
      generationConfig: {}
    };
    if (schema) {
      payload.generationConfig.responseMimeType = "application/json";
      payload.generationConfig.responseSchema = schema;
    }
    if (useSearch) payload.tools = [{ googleSearch: {} }];

    let retries = 3;
    let delay = 1500;
    while (retries > 0) {
      try {
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response");
        return text;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  // ── FLUXO AGÊNTICO ──
  const generateCarousel = async () => {
    if (!selectedMode) { setError("Escolha um modo primeiro!"); return; }
    if (!theme.trim()) { setError("Cola um tema ou texto base, careca."); return; }

    setIsGenerating(true);
    setError("");
    setSlides([]);
    setImagePositions({});
    setActiveSlide(0);
    setAgentLogs([]);
    setMobileTab("preview");

    const addLog = (msg: string) => setAgentLogs(prev => [...prev, msg]);

    try {
      // Passo 1: Pesquisador
      let searchData = "Nenhum dado externo solicitado.";
      if (useWebSearch) {
        addLog("[Pesquisador] Minerando dados reais na web (Google Search Grounding)...");
        searchData = await callAgent(
          "Você é um pesquisador de dados sênior. Retorne apenas fatos atualizados, números reais e estatísticas curtas.",
          `Busque informações e dados reais sobre: ${theme}. Nicho do cliente: ${brandCategory}.`,
          null,
          true
        );
      }

      // Passo 2: Copywriter
      addLog("[Copywriter Sênior] Estruturando framework e escrevendo copy...");
      const allowedLayouts = getAllowedLayoutIdsForMode(selectedMode.id);
      const copySchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            slide: { type: "INTEGER" },
            layout: { type: "STRING", enum: allowedLayouts },
            titulo: { type: "STRING" },
            texto_apoio: { type: "STRING" }
          },
          required: ["slide", "layout", "titulo", "texto_apoio"]
        }
      };
      const cr = activeThemeObj.copyRules;
      const themeCopyRules = `
REGRAS DO TEMA ATIVO ("${activeThemeObj.name}"):
- Tom de voz: ${cr.voiceTone}
- Título da capa: máximo ${cr.capaTitleMaxWords} palavras
- Texto de corpo (so_texto/impacto/capa): máximo ${cr.bodyMaxWords} palavras
- Texto em layouts com imagem (texto_imagem/foto_full): máximo ${cr.imageLayoutMaxWords} palavras
- Estilo de ênfase: ${cr.emphasisStyle}
- Estilo de CTA: ${cr.ctaStyle}
`;

      const contextBlock = `

CONTEXTO DO CRIADOR:
- Nicho/categoria: ${brandCategory}
- Handle: ${brandHandle}
${themeCopyRules}
REGRAS GLOBAIS DE QUALIDADE:
1. IDIOMA: Português do Brasil impecável.
2. TÍTULOS: Específicos, não genéricos.
3. TEXTO_APOIO: respeite os limites do tema ativo.
4. PROFUNDIDADE: Cada slide deve ensinar algo que o leitor não saberia pesquisando sozinho.
5. SUGESTAO_VISUAL: Sempre em inglês fotográfico descritivo.
6. PROGRESSÃO NARRATIVA: Cada slide cria micro-tensão.
7. 1 IDEIA CENTRAL POR SLIDE: Desenvolva com exemplos, dados e nuances.
8. CTA FINAL: Nunca "link na bio". Use DM/comentário/compartilhamento.
9. DADOS E REFERÊNCIAS: Cite números, estudos, comparações.
10. VOZ AUTORAL: Tome partido. Conteúdo neutro não engaja.

Responda ESTRITAMENTE em JSON com array de EXATAMENTE ${slideCount} objetos.
Layouts permitidos neste modo: ${allowedLayouts.join(" / ")}`;

      const copySystem = `${selectedMode.prompt}${contextBlock}\n\nOBJETIVO: Criar apenas o roteiro textual (layout, título e texto de apoio).`;
      const copyPrompt = `DADOS DA PESQUISA: ${searchData}\n\nTEMA BASE: ${theme}\n\nCrie EXATAMENTE ${slideCount} slides.`;

      const copyJsonStr = await callAgent(copySystem, copyPrompt, copySchema, false);

      // Passo 3: Revisor + Diretor de Arte
      addLog("[Revisor] Cortando excessos de palavras e validando regras de design...");
      await new Promise(r => setTimeout(r, 600));
      addLog("[Diretor de Arte] Gerando prompts fotográficos profissionais em inglês...");

      const artSchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            slide: { type: "INTEGER" },
            layout: { type: "STRING" },
            titulo: { type: "STRING" },
            texto_apoio: { type: "STRING" },
            sugestao_visual: { type: "STRING" }
          },
          required: ["slide", "layout", "titulo", "texto_apoio", "sugestao_visual"]
        }
      };
      const artSystem = `Você é uma fusão de Revisor e Diretor de Arte.
1. REVISÃO: corte textos que excedam os limites do framework.
2. DIREÇÃO DE ARTE: adicione 'sugestao_visual' em INGLÊS fotográfico para cada slide.
Retorne o JSON final completo.`;
      const artPrompt = `JSON ORIGINAL:\n${copyJsonStr}\n\nFRAMEWORK:\n${selectedMode.prompt}`;

      const finalJsonStr = await callAgent(artSystem, artPrompt, artSchema, false);

      addLog("[Master] Orquestração finalizada! Montando layout...");

      // Pós-processamento determinístico (safety net)
      const budgets = getLayoutWordBudgets(activeThemeObj);
      const clampWords = (text: string, maxWords = 20) => {
        if (!text || typeof text !== "string") return text;
        const words = text.trim().split(/\s+/).filter(Boolean);
        if (words.length <= maxWords) return text.trim();
        return words.slice(0, maxWords).join(" ") + "…";
      };
      const normalizeSlidesFromAI = (rawSlides: any[]) => {
        if (!Array.isArray(rawSlides)) return [];
        return rawSlides.map(s => {
          if (!s || typeof s !== "object") return s;
          if (budgets.imageLayouts.has(s.layout)) return { ...s, texto_apoio: clampWords(s.texto_apoio, budgets.imageMax) };
          if (budgets.bodyLayouts.has(s.layout)) return { ...s, texto_apoio: clampWords(s.texto_apoio, budgets.bodyMax) };
          return s;
        });
      };

      const cleanJson = finalJsonStr.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson.replace(/!NCIA/g, "ÊNCIA").replace(/!ncia/g, "ência"));
      const normalized = normalizeSlidesFromAI(parsed);

      setSlides(applyInitialScalesToSlides(normalized, slideAspectRatio, selectedTheme));
      setThemeLocked(true);
    } catch (err) {
      console.error(err);
      setError("Os agentes falharam. Tenta de novo.");
      setMobileTab("setup");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAllToPNG = async () => {
    if (slides.length === 0) return;
    setIsExporting(true);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const originalScrollY = window.scrollY;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 120));
    await document.fonts.ready;
    try {
      if (!(window as any).htmlToImage) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
          script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
        });
      }
      const deviceMemory = (navigator as any).deviceMemory || 4;
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const exportPixelRatio = isMobile || deviceMemory <= 4 ? 2 : 3;
      const slideCards = Array.from(document.querySelectorAll(".slide-card"));
      for (let i = 0; i < slideCards.length; i++) {
        const element = slideCards[i] as HTMLElement;
        if (!element) continue;
        const options = { pixelRatio: exportPixelRatio, backgroundColor: "#000000" };
        try {
          let blob: Blob | null = (window as any).htmlToImage.toBlob ? await (window as any).htmlToImage.toBlob(element, options) : null;
          if (!blob) { const dataUrl = await (window as any).htmlToImage.toPng(element, options); const res = await fetch(dataUrl); blob = await res.blob(); }
          const link = document.createElement("a");
          link.download = `${(brandHandle || "carrossel").replace("@", "")}_${slideAspectRatio.replace("/", "x")}_slide_${i + 1}.png`;
          const objectUrl = URL.createObjectURL(blob!); link.href = objectUrl; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(objectUrl);
        } catch (e) { console.error(`Falha slide ${i + 1}:`, e); }
        await new Promise(r => setTimeout(r, 350));
      }
    } catch (err) { setError("Erro ao exportar."); }
    finally {
      setIsExporting(false);
      document.documentElement.style.scrollBehavior = "";
      window.scrollTo(0, originalScrollY);
    }
  };

  const copyAll = () => {
    const text = slides.map(s => `[Slide ${s.slide}]\n${s.titulo}\n${s.texto_apoio}\n`).join("\n---\n\n");
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) { }
    document.body.removeChild(ta);
  };

  const drawSlide = (sl: any, idx: number) => renderSlide({
    slide: sl, index: idx, aspectRatio: slideAspectRatio,
    brandHandle, brandCategory, brandProfileImage, brandLogoImage,
    imagePositions, titleScale, contentScale,
    onAction: handleActionStart, positions: sl.positions
  }, selectedTheme);

  const activeSlideData = slides[activeSlide];
  const totalSlides = slides.length;

  const mobileStyles: any = {
    "--show-setup": mobileTab === "setup" ? "block" : "none",
    "--show-preview": mobileTab === "preview" ? "flex" : "none",
    "--show-edit": mobileTab === "edit" ? "block" : "none",
  };

  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body {
          background: radial-gradient(circle at 8% 12%, #ffd9aa 0%, transparent 30%), radial-gradient(circle at 88% 84%, #ffe9b8 0%, transparent 34%), linear-gradient(145deg,#fffaf1,#ffe7c8);
          min-height:100vh; font-family:"Plus Jakarta Sans","Avenir Next","Segoe UI",sans-serif; color:#1e1a16;
          -webkit-tap-highlight-color: transparent;
        }
        .root { width:100%; height:100%; position:absolute; inset:0; display:grid; grid-template-rows: 52px 1fr 120px; grid-template-columns: 260px 1fr 300px; background:rgba(255,255,255,0.78); backdrop-filter:blur(10px); overflow:hidden; animation:rise 0.6s ease both; }
        @keyframes rise { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .spin { animation:spin 1s linear infinite; }
        .pulse-fast { animation:pulse 1s infinite; }
        .topbar { grid-column:1/-1; grid-row:1; border-bottom:1px solid rgba(62,43,27,0.1); background:rgba(255,255,255,0.92); display:flex; align-items:center; gap:10px; padding:0 16px; z-index:10; }
        .panel-sidebar { grid-column:1; grid-row:2; border-right:1px solid rgba(62,43,27,0.1); background:linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,246,233,0.45)); overflow-y:auto; padding:14px; }
        .panel-canvas { grid-column:2; grid-row:2; background:radial-gradient(circle at 50% 50%,rgba(255,180,100,0.1),transparent 70%),#f7f0e6; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .panel-inspector { grid-column:3; grid-row:2; border-left:1px solid rgba(62,43,27,0.1); background:rgba(255,255,255,0.85); overflow-y:auto; }
        .timeline { grid-column:1/-1; grid-row:3; border-top:1px solid rgba(62,43,27,0.1); background:rgba(255,255,255,0.9); display:flex; align-items:center; gap:10px; padding:0 16px; overflow-x:auto; }
        .scr::-webkit-scrollbar{height:4px;width:4px;} .scr::-webkit-scrollbar-track{background:transparent;} .scr::-webkit-scrollbar-thumb{background:rgba(62,43,27,0.15);border-radius:99px;}
        input[type=range]{-webkit-appearance:none;height:4px;outline:none;cursor:pointer;border-radius:99px;background:rgba(62,43,27,0.12);width:100%;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;cursor:pointer;box-shadow:0 2px 6px rgba(255,106,43,0.4);}
        textarea:focus,input:focus{outline:none;border-color:rgba(255,106,43,0.5)!important;box-shadow:0 0 0 3px rgba(255,106,43,0.1);}
        .smart-group:hover .smart-drag,.smart-group:hover .smart-resize{opacity:1!important;}
        .mode-card { border:1.5px solid rgba(62,43,27,0.1); border-radius:12px; padding:10px 8px; cursor:pointer; transition:all 0.15s; background:rgba(255,255,255,0.8); }
        .mode-card:hover { border-color:rgba(255,106,43,0.3); background:rgba(255,106,43,0.04); }
        .mode-card.active { border-color:var(--ac); background:rgba(var(--ac-rgb),0.08); }
        .thumb-item { flex-shrink:0; cursor:pointer; border-radius:10px; overflow:hidden; transition:all 0.15s; border:2px solid transparent; position:relative; }
        .thumb-item.active { border-color:#ff6a2b; box-shadow:0 0 0 2px rgba(255,106,43,0.3); }
        .thumb-item:hover { border-color:rgba(255,106,43,0.4); }
        .insp-tab { flex:1; padding:12px 4px; border:none; background:transparent; font-family:"Plus Jakarta Sans",sans-serif; font-size:10px; font-weight:700; color:#6d645b; cursor:pointer; border-bottom:2px solid transparent; transition:all 0.15s; text-align:center; }
        .insp-tab.active { color:#ff6a2b; border-bottom-color:#ff6a2b; }
        .layout-opt { border:1.5px solid rgba(62,43,27,0.12); border-radius:10px; padding:10px 6px; cursor:pointer; transition:all 0.15s; background:rgba(255,255,255,0.8); text-align:center; }
        .layout-opt:hover { border-color:rgba(255,106,43,0.3); }
        .layout-opt.active { border-color:#ff6a2b; background:rgba(255,106,43,0.06); }
        .btn-sm { display:flex; align-items:center; justify-content:center; gap:5px; padding:7px 12px; border:1px solid rgba(62,43,27,0.14); border-radius:9px; background:rgba(255,255,255,0.9); font-family:"Plus Jakarta Sans",sans-serif; font-size:11px; font-weight:700; color:#3b2f25; cursor:pointer; transition:all 0.14s; white-space:nowrap; }
        .btn-sm:hover { background:rgba(255,106,43,0.08); border-color:rgba(255,106,43,0.3); }
        .btn-icon { width:34px; height:34px; border:1px solid rgba(62,43,27,0.14); border-radius:9px; background:rgba(255,255,255,0.9); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.14s; flex-shrink:0; }
        .btn-icon:hover { background:rgba(255,106,43,0.08); border-color:rgba(255,106,43,0.3); }
        
        .section-label { display: flex; align-items: center; font-size:9px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#6d645b; margin-bottom:8px; }
        .field-label { font-size:10px; font-weight:700; color:#6d645b; margin-bottom:4px; }
        
        /* ── TOOLTIP CSS ── */
        .tooltip-wrap { position: relative; display: inline-flex; align-items: center; cursor: help; margin-left: 6px; vertical-align: middle; }
        .tooltip-content {
          visibility: hidden; opacity: 0; width: max-content; max-width: 200px;
          background-color: #1e1a16; color: #fff; text-align: left;
          border-radius: 6px; padding: 6px 10px; font-size: 10px; font-weight: 600;
          position: absolute; z-index: 100; bottom: 130%; left: 50%; transform: translateX(-50%);
          transition: opacity 0.2s, visibility 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          font-family: "Plus Jakarta Sans", sans-serif; text-transform: none; letter-spacing: 0; line-height: 1.4;
        }
        .tooltip-content::after {
          content: ""; position: absolute; top: 100%; left: 50%; margin-left: -4px;
          border-width: 4px; border-style: solid; border-color: #1e1a16 transparent transparent transparent;
        }
        .tooltip-wrap:hover .tooltip-content { visibility: visible; opacity: 1; }

        .slide-preview-container { max-width: 380px; width: 100%; max-height: calc(100% - 40px); padding: 0 56px; opacity: 1; transition: opacity 0.3s; }
        .mobile-nav { display: none; }
        .desktop-only { display: block; }
        @media (max-width: 1024px) {
          .root { display: flex; flex-direction: column; }
          .desktop-only { display: none !important; }
          .topbar { min-height: auto; padding: 12px 16px; flex-wrap: wrap; justify-content: space-between; }
          .topbar-title { width: 100%; order: 3; text-align: center; margin-top: 8px; font-size: 11px !important; }
          .panel-sidebar { display: var(--show-setup); width: 100%; border-right: none; padding-bottom: 24px; }
          .panel-canvas { display: var(--show-preview); width: 100%; flex-direction: column; }
          .panel-inspector { display: var(--show-edit); width: 100%; border-left: none; padding-bottom: 24px; }
          .timeline { display: var(--show-preview); width: 100%; height: 100px; flex-shrink: 0; border-top: 1px solid rgba(62,43,27,0.1); }
          .slide-preview-container { padding: 0 20px; }
          .mobile-nav { display: flex; width: 100%; background: rgba(255,255,255,0.98); border-top: 1px solid rgba(62,43,27,0.1); padding: 10px 16px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); justify-content: space-around; align-items: center; flex-shrink: 0; z-index: 100; }
          .mobile-nav-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #a8a29e; background: none; border: none; padding: 8px 16px; border-radius: 12px; transition: all 0.2s; }
          .mobile-nav-btn.active { color: #f97316; background: rgba(249,115,22,0.1); }
        }
        .app-credit { position: fixed; bottom: 6px; right: 12px; font-size: 9px; color: rgba(110,100,91,0.6); font-family: "Plus Jakarta Sans", sans-serif; font-weight: 500; letter-spacing: 0.04em; z-index: 999; pointer-events: auto; background: rgba(255,255,255,0.7); padding: 3px 8px; border-radius: 6px; backdrop-filter: blur(6px); }
        .app-credit a { color: #ff6a2b; text-decoration: none; font-weight: 700; }
        .app-credit a:hover { text-decoration: underline; }
        @media (max-width: 1024px) {
          .app-credit { bottom: calc(70px + env(safe-area-inset-bottom)); }
        }
      `}</style>

      <div className="root" style={mobileStyles}>
        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "conic-gradient(from 40deg,#ff6a2b,#ff8c54,#f7b14e,#ff6a2b)", boxShadow: "0 4px 12px rgba(255,106,43,0.35)", flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.2, whiteSpace: "nowrap" }}>Fábrica de Carrosséis AI PRO <span style={{ fontSize: 9, color: themeAccent, marginLeft: 4 }}>v4</span></span>
          </div>
          <div className="desktop-only" style={{ width: 1, height: 24, background: "rgba(62,43,27,0.1)", margin: "0 4px" }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
            <button className="btn-sm" onClick={copyAll} disabled={slides.length === 0}><Copy size={13} />{copied ? "Copiado!" : <span className="desktop-only">Copiar</span>}</button>
            <button className="btn-sm" style={{ background: "#1e1a16", color: "#fff", borderColor: "#1e1a16" }} onClick={exportAllToPNG} disabled={slides.length === 0 || isExporting}>{isExporting ? <Loader2 size={13} className="spin" /> : <Download size={13} />}<span className="desktop-only">Exportar</span></button>
          </div>
          <span className="topbar-title" style={{ fontSize: 12, color: "#6d645b", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {theme.trim().slice(0, 50) || "Novo Projeto"}
          </span>
          {slides.length > 0 && (
            <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: activeThemeObj.preview[0], border: `2px solid ${themeAccent}` }} />
              <span style={{ fontSize: 10, color: "#6d645b", fontWeight: 700 }}>{activeThemeObj.name}</span>
              {themeLocked && <span style={{ fontSize: 9, color: themeAccent, fontWeight: 800, letterSpacing: "0.04em" }}>● TRAVADO</span>}
            </div>
          )}
        </header>

        {/* ── SIDEBAR ── */}
        <aside className="panel-sidebar scr">
          <div style={{ marginBottom: 14 }}>
            <div className="section-label">Briefing <InfoTooltip text="Cole a ideia, tema ou roteiro. O motor de IA vai pesquisar fatos reais na web e montar a estrutura inteira em cima disso." /></div>
            <textarea value={theme} onChange={e => setTheme(e.target.value)} placeholder="Cole o tema, texto ou ideia do carrossel..."
              style={{ width: "100%", minHeight: 80, padding: "9px 10px", border: "1px solid rgba(62,43,27,0.14)", borderRadius: 12, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 11, color: "#1e1a16", background: "rgba(255,255,255,0.9)", resize: "vertical", lineHeight: 1.5 }} />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <label style={{ flex: 1 }}>
                <div className="btn-sm" style={{ width: "100%" }}><Upload size={11} />{isProcessingPdf ? "Lendo..." : "PDF"}</div>
                <input type="file" accept="application/pdf" onChange={handlePdfUpload} style={{ display: "none" }} />
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="checkbox" id="ws" checked={useWebSearch} onChange={e => setUseWebSearch(e.target.checked)} style={{ accentColor: themeAccent }} />
                <label htmlFor="ws" style={{ fontSize: 10, color: "#6d645b", fontWeight: 600, cursor: "pointer" }}>Web</label>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="section-label">Modo <InfoTooltip text="Muda o framework de persuasão da IA (Ex: AIDA, PAS) e define se o carrossel será mais enxuto (viral) ou mais longo (autoridade)." /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {CAROUSEL_MODES.map(m => (
                <div key={m.id} className={`mode-card${selectedMode?.id === m.id ? " active" : ""}`} style={{ "--ac": m.cor, "--ac-rgb": "255,106,43" } as any} onClick={() => handleModeSelect(m)}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>{m.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: selectedMode?.id === m.id ? m.cor : "#1e1a16", lineHeight: 1.2 }}>{m.label}</div>
                  <div style={{ fontSize: 8, color: "#6d645b", marginTop: 2, fontWeight: 600 }}>{m.objetivo}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="section-label">Formato <InfoTooltip text="Proporção da lâmina. 4:5 é o padrão ouro atual do Instagram para feed (ocupa mais a tela verticalmente)." /></div>
            <div style={{ display: "flex", gap: 5 }}>
              {FORMATS.map(f => (
                <button key={f.id} onClick={() => setSlideAspectRatio(f.id as AspectRatioId)} style={{ flex: 1, border: `1.5px solid ${slideAspectRatio === f.id ? themeAccent : "rgba(62,43,27,0.12)"}`, borderRadius: 9, padding: "7px 4px", background: slideAspectRatio === f.id ? `rgba(255,106,43,0.08)` : "rgba(255,255,255,0.8)", cursor: "pointer", transition: "all 0.14s" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: slideAspectRatio === f.id ? themeAccent : "#3b2f25" }}>{f.label}</div>
                  <div style={{ fontSize: 7, color: "#6d645b", marginTop: 2 }}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="section-label">Slides <InfoTooltip text="Número total de imagens que a IA vai gerar na hora de estruturar o roteiro (inclui a Capa e o CTA)." /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={selectedMode?.slideRange?.[0] || 3} max={selectedMode?.slideRange?.[1] || 12} value={slideCount} onChange={e => setSlideCount(Number(e.target.value))} style={{ flex: 1, accentColor: themeAccent }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: themeAccent, minWidth: 20 }}>{slideCount}</span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="section-label">Brand Kit <InfoTooltip text="Suas informações. O 'Handle' aparece no rodapé e o 'Nicho' ajusta a voz e os argumentos da IA." /></div>
            <div style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(62,43,27,0.10)", borderRadius: 14, padding: 12, boxShadow: "0 2px 10px rgba(110,75,38,0.07)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <div>
                  <div className="field-label">Handle</div>
                  <input type="text" value={brandHandle} onChange={e => setBrandHandle(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid rgba(62,43,27,0.14)", borderRadius: 8, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 10, color: "#1e1a16", background: "#fff" }} />
                </div>
                <div>
                  <div className="field-label">Nicho</div>
                  <input type="text" value={brandCategory} onChange={e => setBrandCategory(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid rgba(62,43,27,0.14)", borderRadius: 8, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 10, color: "#1e1a16", background: "#fff" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <label style={{ flex: 1 }}>
                  <div style={{ border: "1px dashed rgba(62,43,27,0.2)", borderRadius: 9, padding: "8px 6px", textAlign: "center", cursor: "pointer", transition: "all 0.14s", background: "rgba(255,255,255,0.7)" }}>
                    {brandProfileImage ? <img src={brandProfileImage} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ fontSize: 8, color: "#6d645b", fontWeight: 700 }}>AVATAR</div>}
                  </div>
                  <input type="file" accept="image/*" onChange={handleProfileImageUpload} style={{ display: "none" }} />
                </label>
                <label style={{ flex: 1 }}>
                  <div style={{ border: "1px dashed rgba(62,43,27,0.2)", borderRadius: 9, padding: "8px 6px", textAlign: "center", cursor: "pointer", transition: "all 0.14s", background: "rgba(255,255,255,0.7)" }}>
                    {brandLogoImage ? <img src={brandLogoImage} style={{ height: 28, maxWidth: 60, objectFit: "contain" }} /> : <div style={{ fontSize: 8, color: "#6d645b", fontWeight: 700 }}>LOGO</div>}
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Tema Visual <InfoTooltip text="Muda instantaneamente todas as cores, fontes e distribuição visual dos slides sem perder nenhum texto." /></div>
              <div style={{ display: "flex", gap: 6 }}>
                {!themeLocked && (
                  <label style={{ fontSize: 9, color: themeAccent, fontWeight: 800, border: `1px solid ${themeAccent}`, borderRadius: 6, padding: "2px 7px", cursor: "pointer", letterSpacing: "0.04em" }}>
                    + Importar JSON
                    <input type="file" accept="application/json" onChange={handleImportThemeJSON} style={{ display: "none" }} />
                  </label>
                )}
                {themeLocked && (
                  <button onClick={handleResetTheme} style={{ fontSize: 9, color: themeAccent, fontWeight: 800, background: "none", border: `1px solid ${themeAccent}`, borderRadius: 6, padding: "2px 7px", cursor: "pointer", letterSpacing: "0.04em" }}>↺ Trocar</button>
                )}
              </div>
            </div>
            {importError && (
              <div style={{ fontSize: 10, color: "#b91c1c", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, padding: "6px 8px", marginBottom: 8 }}>
                ⚠ {importError}
              </div>
            )}
            {importedThemesJson.length > 0 && !themeLocked && (
              <div style={{ fontSize: 8, color: "#6d645b", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                {importedThemesJson.length} tema{importedThemesJson.length > 1 ? "s" : ""} importado{importedThemesJson.length > 1 ? "s" : ""} · clique no × pra remover
              </div>
            )}
            {themeLocked ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,0.88)", border: `1.5px solid ${themeAccent}`, borderRadius: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: activeThemeObj.preview[0], border: `2px solid ${themeAccent}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#1e1a16" }}>{activeThemeObj.name}</div>
                  <div style={{ fontSize: 9, color: "#6d645b" }}>Tema travado — regere para trocar</div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {THEME_REGISTRY.map(t => {
                  const isImported = importedThemesJson.some((j: any) => j.id === t.id);
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <button onClick={() => !themeLocked && setSelectedTheme(t.id)} title={t.name}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 8, border: `1.5px solid ${selectedTheme === t.id ? themeAccent : "rgba(62,43,27,0.12)"}`, background: selectedTheme === t.id ? "rgba(255,106,43,0.07)" : "rgba(255,255,255,0.8)", cursor: "pointer", transition: "all 0.14s" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.preview[0], border: `1.5px solid ${t.preview[1]}`, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: selectedTheme === t.id ? themeAccent : "#3b2f25" }}>{t.name}</span>
                        {isImported && <span style={{ fontSize: 7, color: themeAccent, fontWeight: 800, marginLeft: 2 }}>●</span>}
                      </button>
                      {isImported && (
                        <button onClick={() => handleRemoveImportedTheme(t.id)} title="Remover tema importado"
                          style={{ fontSize: 9, color: "#b91c1c", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontWeight: 900 }}>×</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {themeLocked ? (
            <button onClick={handleResetTheme} style={{ width: "100%", padding: "13px", border: `2px solid ${themeAccent}`, borderRadius: 14, background: "rgba(255,255,255,0.9)", color: themeAccent, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RotateCcw size={15} /> Regerar com outro tema
            </button>
          ) : (
            <button onClick={generateCarousel} disabled={isGenerating || !selectedMode || !theme.trim()}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 14, background: `linear-gradient(120deg,${themeAccent},#f28d3f)`, color: "#fff", fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 20px rgba(255,106,43,0.35)", opacity: (isGenerating || !selectedMode || !theme.trim()) ? 0.5 : 1, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {isGenerating ? <><Loader2 size={15} className="spin" />Orquestrando...</> : <><Sparkles size={15} />Gerar Carrossel</>}
            </button>
          )}

          {error && <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10, fontSize: 11, color: "#b91c1c", fontWeight: 600, lineHeight: 1.4 }}>{error}</div>}
        </aside>

        {/* ── CANVAS ── */}
        <main className="panel-canvas">
          {isGenerating && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,14,0.9)", backdropFilter: "blur(12px)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30 }}>
              <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,106,43,0.3)", borderRadius: 16, width: "100%", maxWidth: 480, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.8)", fontFamily: "monospace" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, color: "#10b981", fontSize: 14, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 }}>
                  <Brain size={18} className="pulse-fast" /> Fluxo Agêntico
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {agentLogs.map((log, i) => (
                    <div key={i} style={{ color: log.includes("Master") ? "#10b981" : "#a1a1aa", fontSize: 12, lineHeight: 1.4, display: "flex", gap: 8 }}>
                      <span style={{ color: "#f97316" }}>{'>'}</span> {log}
                    </div>
                  ))}
                  {!agentLogs[agentLogs.length - 1]?.includes("Master") && (
                    <div style={{ color: "#666", fontSize: 12, display: "flex", gap: 8, animation: "pulse 1.5s infinite" }}>
                      <span style={{ color: "#f97316" }}>{'>'}</span> Processando...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {totalSlides > 0 && !isGenerating && (
            <button className="btn-icon" onClick={() => setActiveSlide(i => Math.max(0, i - 1))} disabled={activeSlide === 0} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 10, opacity: activeSlide === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={18} />
            </button>
          )}
          {totalSlides > 0 && !isGenerating && (
            <button className="btn-icon" onClick={() => setActiveSlide(i => Math.min(totalSlides - 1, i + 1))} disabled={activeSlide === totalSlides - 1} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 10, opacity: activeSlide === totalSlides - 1 ? 0.3 : 1 }}>
              <ChevronRight size={18} />
            </button>
          )}

          <div className="slide-preview-container" style={{ opacity: isGenerating ? 0 : 1 }}>
            {totalSlides > 0 && activeSlideData ? (
              <div className="slide-card" style={{ width: "100%", aspectRatio: slideAspectRatio, borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
                  {drawSlide(activeSlideData, activeSlide)}
                </div>
              </div>
            ) : (
              <div style={{ aspectRatio: "4/5", width: "100%", borderRadius: 16, background: "rgba(255,255,255,0.6)", border: "2px dashed rgba(62,43,27,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#ff6a2b22,#f7b14e22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={24} color={themeAccent} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#3b2f25", marginBottom: 4 }}>Nenhum slide ainda</div>
                  <div style={{ fontSize: 11, color: "#6d645b", padding: "0 20px" }}>Configure o briefing e clique em Gerar</div>
                </div>
              </div>
            )}
          </div>

          {totalSlides > 0 && !isGenerating && (
            <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(30,26,22,0.7)", backdropFilter: "blur(8px)", borderRadius: 999, padding: "5px 14px", fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", zIndex: 10 }}>
              {String(activeSlide + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
            </div>
          )}
        </main>

        {/* ── INSPECTOR ── */}
        <aside className="panel-inspector scr">
          <div style={{ display: "flex", borderBottom: "1px solid rgba(62,43,27,0.1)", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", zIndex: 5 }}>
            {(["layout", "content", "image", "actions"]).map(tab => (
              <button key={tab} className={`insp-tab${inspectorTab === tab ? " active" : ""}`} onClick={() => setInspectorTab(tab)}>
                {tab === "layout" ? "Layout" : tab === "content" ? "Conteúdo" : tab === "image" ? "Imagem" : "Ações"}
              </button>
            ))}
          </div>

          <div style={{ padding: 14 }}>
            {inspectorTab === "layout" && (
              <div>
                <div className="section-label">Tipo de Layout <InfoTooltip text="Força um layout de estrutura diferente para este slide (Ex: forçar uma capa no meio do carrossel)." /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 16 }}>
                  {visibleLayouts.map(lo => (
                    <div key={lo.id} className={`layout-opt${activeSlideData?.layout === lo.id ? " active" : ""}`}
                      onClick={() => activeSlideData && handleSlideLayoutChange(activeSlide, lo.id)}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{lo.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: activeSlideData?.layout === lo.id ? themeAccent : "#3b2f25" }}>{lo.label}</div>
                    </div>
                  ))}
                </div>
                <div className="section-label">Escala Global <InfoTooltip text="Muda o tamanho da fonte simultaneamente em TODOS os slides do carrossel." /></div>
                <div style={{ marginBottom: 12 }}>
                  <div className="field-label">Escala do Título — {titleScale}%</div>
                  <input type="range" min={50} max={140} value={titleScale} onChange={e => setTitleScale(Number(e.target.value))} style={{ accentColor: themeAccent }} />
                </div>
                <div>
                  <div className="field-label">Escala do Corpo — {contentScale}%</div>
                  <input type="range" min={50} max={140} value={contentScale} onChange={e => setContentScale(Number(e.target.value))} style={{ accentColor: themeAccent }} />
                </div>
                {activeSlideData?.scales && (
                  <div style={{ marginTop: 16 }}>
                    <div className="section-label">Escala deste Slide <InfoTooltip text="Isola a mudança de fonte apenas neste slide, sem afetar o resto." /></div>
                    <div style={{ marginBottom: 10 }}>
                      <div className="field-label">Título — {activeSlideData.scales?.title ?? titleScale}%</div>
                      <input type="range" min={50} max={140} value={activeSlideData.scales?.title ?? titleScale} onChange={e => handleSlideScaleChange(activeSlide, "title", e.target.value)} style={{ accentColor: themeAccent }} />
                    </div>
                    <div>
                      <div className="field-label">Corpo — {activeSlideData.scales?.content ?? contentScale}%</div>
                      <input type="range" min={50} max={140} value={activeSlideData.scales?.content ?? contentScale} onChange={e => handleSlideScaleChange(activeSlide, "content", e.target.value)} style={{ accentColor: themeAccent }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {inspectorTab === "content" && (
              <div>
                {activeSlideData ? (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div className="field-label">Título</div>
                      <textarea value={activeSlideData.titulo || ""} onChange={e => handleSlideTextChange(activeSlide, "titulo", e.target.value)}
                        style={{ width: "100%", minHeight: 60, padding: "8px 10px", border: "1px solid rgba(62,43,27,0.14)", borderRadius: 10, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 12, fontWeight: 700, color: "#1e1a16", background: "rgba(255,255,255,0.9)", resize: "vertical", lineHeight: 1.4 }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div className="field-label">Texto de Apoio</div>
                      <textarea value={activeSlideData.texto_apoio || ""} onChange={e => handleSlideTextChange(activeSlide, "texto_apoio", e.target.value)}
                        style={{ width: "100%", minHeight: 100, padding: "8px 10px", border: "1px solid rgba(62,43,27,0.14)", borderRadius: 10, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 11, color: "#3b2f25", background: "rgba(255,255,255,0.9)", resize: "vertical", lineHeight: 1.5 }} />
                    </div>
                    <div>
                      <div className="field-label">Sugestão Visual (EN)</div>
                      <textarea value={activeSlideData.sugestao_visual || ""} onChange={e => handleSlideTextChange(activeSlide, "sugestao_visual", e.target.value)}
                        style={{ width: "100%", minHeight: 60, padding: "8px 10px", border: "1px solid rgba(62,43,27,0.14)", borderRadius: 10, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 10, color: "#6d645b", background: "rgba(255,255,255,0.9)", resize: "vertical", lineHeight: 1.5 }} />
                    </div>
                  </>
                ) : <div style={{ textAlign: "center", padding: "32px 0", color: "#6d645b", fontSize: 12 }}>Gere o carrossel primeiro</div>}
              </div>
            )}

            {inspectorTab === "image" && (
              <div>
                {activeSlideData ? (
                  <>
                    {activeSlideData.imageUrl && (
                      <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", position: "relative" }}>
                        <img src={activeSlideData.imageUrl} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                      </div>
                    )}
                    {activeSlideData.imageUrl && (
                      <div style={{ marginBottom: 12 }}>
                        <div className="field-label">Posição vertical — {imagePositions[activeSlide] ?? 50}%</div>
                        <input type="range" min={0} max={100} value={imagePositions[activeSlide] ?? 50} onChange={e => handlePositionChange(activeSlide, Number(e.target.value))} style={{ accentColor: themeAccent }} />
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
                      <label style={{ flex: 1 }}>
                        <div className="btn-sm" style={{ width: "100%" }}><Upload size={11} />Upload</div>
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(activeSlide, e)} style={{ display: "none" }} />
                      </label>
                      <button className="btn-sm" style={{ flex: 1 }} disabled={loadingImages[activeSlide] || !activeSlideData.sugestao_visual} onClick={() => generateImageWithAI(activeSlide, activeSlideData.sugestao_visual)}>
                        {loadingImages[activeSlide] ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />}Gerar IA
                      </button>
                    </div>
                    {pdfImages.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div className="section-label">Imagens do PDF ({pdfImages.length})</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                          {pdfImages.map((img, i) => (
                            <div key={i} onClick={() => setSlides(prev => prev.map((s, idx) => idx === activeSlide ? { ...s, imageUrl: img } : s))}
                              style={{ aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", cursor: "pointer", border: activeSlideData.imageUrl === img ? `2px solid ${themeAccent}` : "1px solid rgba(62,43,27,0.14)" }}>
                              <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {loadingImages[activeSlide] && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px", justifyContent: "center", color: "#6d645b", fontSize: 11 }}>
                        <Loader2 size={16} className="spin" />Gerando imagem com IA...
                      </div>
                    )}
                  </>
                ) : <div style={{ textAlign: "center", padding: "32px 0", color: "#6d645b", fontSize: 12 }}>Gere o carrossel primeiro</div>}
              </div>
            )}

            {inspectorTab === "actions" && (
              <div>
                {activeSlideData ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <button className="btn-sm" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => duplicateSlide(activeSlide)}><CopyIcon size={13} />Duplicar slide</button>
                    <button className="btn-sm" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => setSlides(prev => prev.map((s, i) => i === activeSlide ? { ...s, positions: {} } : s))}><RotateCcw size={13} />Resetar posições</button>
                    <button className="btn-sm" style={{ width: "100%", justifyContent: "flex-start" }} onClick={addSlide}><Plus size={13} />Novo slide após</button>
                    <div style={{ borderTop: "1px solid rgba(62,43,27,0.1)", paddingTop: 8 }}>
                      <button className="btn-sm" style={{ width: "100%", justifyContent: "flex-start", color: "#b91c1c", borderColor: "rgba(220,38,38,0.2)" }} onClick={() => removeSlide(activeSlide)} disabled={slides.length <= 1}>
                        <Trash2 size={13} />Remover slide
                      </button>
                    </div>
                  </div>
                ) : <div style={{ textAlign: "center", padding: "32px 0", color: "#6d645b", fontSize: 12 }}>Gere o carrossel primeiro</div>}
              </div>
            )}
          </div>
        </aside>

        {/* ── TIMELINE ── */}
        <footer className="timeline scr">
          {slides.map((sl, idx) => {
            const parts = slideAspectRatio.split("/").map(Number);
            const nat = parts[0] / parts[1];
            const thumbW = Math.round(80 * nat);
            const fullW = 1080;
            const scale = thumbW / fullW;
            return (
              <div key={idx} className={`thumb-item${idx === activeSlide ? " active" : ""}`} onClick={() => setActiveSlide(idx)} style={{ height: 80, width: thumbW, flexShrink: 0 }}>
                <div style={{ height: "100%", width: "100%", transformOrigin: "top left", pointerEvents: "none", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ width: fullW, height: Math.round(80 / scale), transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
                    {drawSlide(sl, idx)}
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 3, right: 5, fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.6)", letterSpacing: "0.05em" }}>{String(idx + 1).padStart(2, "0")}</div>
              </div>
            );
          })}
          <button onClick={addSlide} className="btn-icon" style={{ height: 80, width: 56, borderStyle: "dashed", flexShrink: 0, borderRadius: 10 }} title="Adicionar slide">
            <Plus size={18} color="#6d645b" />
          </button>
        </footer>

        {/* ── MOBILE NAV ── */}
        <nav className="mobile-nav">
          <button className={`mobile-nav-btn ${mobileTab === "setup" ? "active" : ""}`} onClick={() => setMobileTab("setup")}>
            <Settings2 size={20} /><span>Config</span>
          </button>
          <button className={`mobile-nav-btn ${mobileTab === "preview" ? "active" : ""}`} onClick={() => setMobileTab("preview")}>
            <LayoutTemplate size={20} /><span>Preview</span>
          </button>
          <button className={`mobile-nav-btn ${mobileTab === "edit" ? "active" : ""}`} onClick={() => setMobileTab("edit")}>
            <SlidersHorizontal size={20} /><span>Editar</span>
          </button>
        </nav>

        <div className="app-credit">
          Criado por <a href="https://thiagocaliman.com.br" target="_blank" rel="noopener noreferrer">Thiago Caliman IA</a>
        </div>

        {/* ── MODAL DE TERMOS DE USO + DIREITO AUTORAL ── */}
        {!termsAccepted && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(20,16,14,0.88)", backdropFilter: "blur(14px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "rise 0.4s ease both" }}>
            <div style={{ background: "#fffaf1", borderRadius: 18, maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,0.5)", border: "1px solid rgba(255,106,43,0.3)" }}>
              <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(62,43,27,0.1)", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "conic-gradient(from 40deg,#ff6a2b,#ff8c54,#f7b14e,#ff6a2b)", boxShadow: "0 6px 20px rgba(255,106,43,0.4)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#1e1a16", letterSpacing: "-0.01em" }}>Bem-vindo à Fábrica de Carrosséis <span style={{ color: "#ff6a2b" }}>AI PRO</span></div>
                  <div style={{ fontSize: 11, color: "#6d645b", marginTop: 2 }}>Antes de começar, por favor leia os termos abaixo</div>
                </div>
              </div>

              <div style={{ padding: "20px 28px", fontSize: 12.5, color: "#3b2f25", lineHeight: 1.65 }}>
                <p style={{ marginBottom: 14 }}>
                  Este app é uma obra autoral de <strong>Thiago Caliman IA</strong> (<a href="https://thiagocaliman.com.br" target="_blank" rel="noopener noreferrer" style={{ color: "#ff6a2b", fontWeight: 700, textDecoration: "none" }}>thiagocaliman.com.br</a>).
                </p>

                <div style={{ background: "rgba(255,106,43,0.06)", border: "1px solid rgba(255,106,43,0.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff6a2b", marginBottom: 8 }}>✅ Uso Permitido</div>
                  <div style={{ fontSize: 12, color: "#3b2f25" }}>Criação de carrosséis para Instagram e uso pessoal ou comercial dos PNGs exportados.</div>
                </div>

                <div style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#b91c1c", marginBottom: 8 }}>© Direitos Autorais</div>
                  <div style={{ fontSize: 12, color: "#3b2f25" }}>O código, arquitetura, prompts de IA e temas visuais são propriedade de Thiago Caliman. Reprodução, revenda ou distribuição do app ou seus componentes é proibida sem autorização por escrito.</div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(62,43,27,0.1)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6d645b", marginBottom: 8 }}>⚠ Conteúdo Gerado</div>
                  <div style={{ fontSize: 12, color: "#3b2f25" }}>Você é responsável pelo texto e imagens que gerar. A IA pode produzir imprecisões — revise antes de publicar.</div>
                </div>

                <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#059669", marginBottom: 8 }}>🔒 Privacidade</div>
                  <div style={{ fontSize: 12, color: "#3b2f25" }}>Tudo roda no seu navegador. Nenhum conteúdo é enviado para servidores do autor.</div>
                </div>

                <div style={{ fontSize: 11, color: "#6d645b", marginTop: 16, textAlign: "center" }}>
                  Dúvidas? <a href="https://thiagocaliman.com.br" target="_blank" rel="noopener noreferrer" style={{ color: "#ff6a2b", fontWeight: 700, textDecoration: "none" }}>thiagocaliman.com.br</a>
                </div>
              </div>

              <div style={{ padding: "16px 28px 24px", borderTop: "1px solid rgba(62,43,27,0.1)", display: "flex", gap: 10 }}>
                <button
                  onClick={() => { alert("Sem aceitar os termos o app não pode ser usado. Recarregue a página se mudar de ideia."); window.location.href = "about:blank"; }}
                  style={{ flex: 1, padding: "12px", border: "1px solid rgba(62,43,27,0.15)", borderRadius: 10, background: "rgba(255,255,255,0.9)", color: "#6d645b", fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                >
                  Recusar
                </button>
                <button
                  onClick={handleAcceptTerms}
                  style={{ flex: 2, padding: "12px", border: "none", borderRadius: 10, background: "linear-gradient(120deg,#ff6a2b,#f28d3f)", color: "#fff", fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 16px rgba(255,106,43,0.35)", transition: "all 0.15s", letterSpacing: "0.02em" }}
                >
                  Aceito e quero continuar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 11 — TEMPLATE PARA NOVOS TEMAS
//
//  Copie o bloco abaixo, renomeie, preencha, e adicione em THEME_REGISTRY.
//  Toda a infra (UI, prompts, schema LLM, fallback) se ajusta automaticamente.
// ═══════════════════════════════════════════════════════════════════════════

/*
const meuTemaNovo: ThemeDefinition = {
  // ── IDENTIDADE ────────────────────────────────────────────────────────
  id: "meu_tema_novo",                  // id único, snake_case (usado em state, LLM, etc)
  name: "Meu Tema Novo",                // nome exibido na UI
  preview: ["#bg", "#accent", "#text"], // [fundo, cor de destaque, texto] para o chip de seleção
  desc: "Uma linha descrevendo o estilo visual",

  // ── COPY RULES ────────────────────────────────────────────────────────
  // Entram automaticamente no prompt do LLM via contextBlock.
  // Ajuste os números pro visual que seu tema suporta sem overflow.
  copyRules: {
    voiceTone: "Descreva o tom de voz esperado",
    capaTitleMaxWords: 6,
    bodyMaxWords: 80,
    imageLayoutMaxWords: 20,
    emphasisStyle: "Como seu tema destaca informação (bold, cor, caixa, etc)",
    ctaStyle: "Estilo de CTA esperado"
  },

  // ── LAYOUTS SUPORTADOS ────────────────────────────────────────────────
  // Declare quais layouts seu render() sabe desenhar.
  // Layouts não declarados caem no fallback (black_editorial para microblog_*).
  supportedLayouts: ["capa", "so_texto", "texto_imagem", "impacto", "foto_full"],

  // ── FALLBACK (opcional) ───────────────────────────────────────────────
  // Se seu tema é fallback para algum layout específico (como black_editorial
  // é fallback dos microblog_*), declare aqui. Caso contrário, omita.
  // fallbackFor: ["algum_layout"],

  // ── ESCALAS INICIAIS (opcional) ───────────────────────────────────────
  // Presets de fonte por aspect ratio × layout. Se omitir, o slide usa
  // titleScale/contentScale globais (100%).
  initialScales: {
    "1/1": { capa: { title: 80, content: 90 } },
    "4/5": { impacto: { title: 85 } },
    "4/3": { so_texto: { title: 62, content: 71 } }
  },

  // ── RENDER ────────────────────────────────────────────────────────────
  // Recebe RenderContext tipado. Use buildVisualCtx(ctx) para acessar
  // helpers (SmartEl, ImgBlock, escalas, brandKit, safe area de Stories).
  render: (ctx) => {
    const V = buildVisualCtx(ctx);
    const { AR, titFS, txtFS, SmartEl, ImgBlock, slide, brandHandle } = V;

    if (slide.layout === "capa") {
      return (
        <div style={{ aspectRatio: AR, width: "100%", background: "#000" }}>
          {SmartEl("titulo", (
            <h2 style={{ fontSize: `${titFS(40)}px`, color: "#fff" }}>{slide.titulo}</h2>
          ), null)}
          {SmartEl("texto_apoio", (
            <p style={{ fontSize: `${txtFS(12)}px`, color: "#ccc" }}>{slide.texto_apoio}</p>
          ), null)}
        </div>
      );
    }

    // ... outros layouts
    return null;
  }
};

// Depois adicione em THEME_REGISTRY (procure por "THEME_REGISTRY =" neste arquivo):
//
// const THEME_REGISTRY: ThemeDefinition[] = [
//   neoBrutalistTheme,
//   darkOrangeTheme,
//   darkRedTheme,
//   whiteRedTheme,
//   yellowBlackTheme,
//   blackEditorialTheme,
//   meuTemaNovo,  👈 aqui
// ];
*/