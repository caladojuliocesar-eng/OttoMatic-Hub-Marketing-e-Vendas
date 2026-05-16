import React from 'react';
import { Calendar, Sparkles, Image, PenTool } from 'lucide-react';

/**
 * Calendário Social — Placeholder (Fase 0)
 * 
 * Ferramenta original: calendario_redes_sociais.txt
 * Funcionalidades: Planejamento editorial, geração de ideias com IA,
 * pesquisa inteligente, geração de imagem com Imagen 4.0
 */

const features = [
  { icon: Calendar, title: 'Calendário Editorial', desc: 'Planeje posts por semanas ou meses' },
  { icon: Sparkles, title: 'Geração de Ideias IA', desc: 'Ideias de conteúdo por nicho e objetivo' },
  { icon: Image, title: 'Imagens com IA', desc: 'Crie visuais com Imagen direto no app' },
  { icon: PenTool, title: 'Roteiros Automáticos', desc: 'Scripts para Reels, Stories e Feed' },
];

export default function CalendarioSocial() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      textAlign: 'center',
      animation: 'fadeInUp 0.4s ease-out'
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: 'rgba(16, 185, 129, 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 24,
        boxShadow: '0 0 40px rgba(16, 185, 129, 0.1)'
      }}>📅</div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#e6edf3', marginBottom: 8 }}>Calendário Social</h2>
      <p style={{ fontSize: 14, color: '#8b949e', maxWidth: 420, lineHeight: 1.6, marginBottom: 32 }}>
        Planeje, gere e organize suas publicações com inteligência artificial. Do briefing à arte.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 520, width: '100%' }}>
        {features.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px', textAlign: 'left' }}>
              <Icon size={18} style={{ color: '#10b981', marginBottom: 8 }} />
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>{feat.title}</h4>
              <p style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.4 }}>{feat.desc}</p>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        Módulo pronto — aguardando integração
      </div>
    </div>
  );
}
