import React from 'react';
import { FileText, Wand2, Code, Download } from 'lucide-react';

/**
 * Gerador de Propostas — Placeholder (Fase 0)
 * 
 * Ferramenta original: Gerador_de_proposta.txt
 * Funcionalidades: Criação de propostas HTML visuais com IA,
 * antes/depois, simulação Instagram, download de HTML
 */

const features = [
  { icon: Wand2, title: 'Copy com IA', desc: 'Textos persuasivos gerados por Gemini' },
  { icon: FileText, title: 'Antes vs. Depois', desc: 'Comparativo visual que convence' },
  { icon: Code, title: 'HTML Profissional', desc: 'Proposta pronta para enviar ao cliente' },
  { icon: Download, title: 'Download Direto', desc: 'Baixe o arquivo e envie por WhatsApp' },
];

export default function GeradorPropostas() {
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
        background: 'rgba(99, 102, 241, 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 24,
        boxShadow: '0 0 40px rgba(99, 102, 241, 0.1)'
      }}>📄</div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#e6edf3', marginBottom: 8 }}>Gerador de Propostas</h2>
      <p style={{ fontSize: 14, color: '#8b949e', maxWidth: 420, lineHeight: 1.6, marginBottom: 32 }}>
        Crie propostas comerciais visuais em segundos. A IA gera o copy, você entrega o impacto.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 520, width: '100%' }}>
        {features.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px', textAlign: 'left' }}>
              <Icon size={18} style={{ color: '#6366f1', marginBottom: 8 }} />
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
