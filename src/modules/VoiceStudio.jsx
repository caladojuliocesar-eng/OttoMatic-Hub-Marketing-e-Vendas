import React from 'react';
import { Mic2, Volume2, Sparkles, Image } from 'lucide-react';

/**
 * Voice Studio — Placeholder (Fase 0)
 * 
 * Ferramenta original: voice_studio.txt
 * Funcionalidades: TTS profissional, análise multimodal de referência,
 * melhoria de roteiro, direção vocal com IA
 */

const features = [
  { icon: Mic2, title: 'Narração Profissional', desc: 'Vozes de elite com Gemini TTS' },
  { icon: Sparkles, title: 'Melhoria de Roteiro', desc: 'IA refina seu texto para o áudio' },
  { icon: Image, title: 'Análise de Referência', desc: 'Envie áudio/imagem para direção vocal' },
  { icon: Volume2, title: 'Multi-vozes', desc: 'Escolha entre vozes masculinas e femininas' },
];

export default function VoiceStudio() {
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
        background: 'rgba(245, 158, 11, 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 24,
        boxShadow: '0 0 40px rgba(245, 158, 11, 0.1)'
      }}>🎙️</div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#e6edf3', marginBottom: 8 }}>Voice Studio</h2>
      <p style={{ fontSize: 14, color: '#8b949e', maxWidth: 420, lineHeight: 1.6, marginBottom: 32 }}>
        Transforme roteiros em narrações profissionais. Direção vocal e análise multimodal com IA.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 520, width: '100%' }}>
        {features.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px', textAlign: 'left' }}>
              <Icon size={18} style={{ color: '#f59e0b', marginBottom: 8 }} />
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
