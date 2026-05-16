import React from 'react';
import { Target, Users, TrendingUp, MessageSquare } from 'lucide-react';

/**
 * CRM Unificado — Placeholder (Fase 0)
 * 
 * Este módulo será substituído pela fusão dos dois CRMs:
 * - Prospecção/Gerenciador Inteligente de Leads
 * - CRM ProspectAI (Funil/Dossiê/Propostas/Tutor)
 * 
 * Visão Rápida + Visão Completa no mesmo lugar.
 */

const features = [
  { icon: Users, title: 'Funil de Vendas', desc: 'Gerencie leads do radar ao fechamento' },
  { icon: TrendingUp, title: 'Dossiê Inteligente', desc: 'Análise completa de cada prospect' },
  { icon: MessageSquare, title: 'Tutor de Vendas IA', desc: 'Coaching em tempo real para fechar negócios' },
  { icon: Target, title: 'Abordagem com IA', desc: 'Scripts personalizados com análise visual' },
];

export default function CrmUnificado() {
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
        width: 80,
        height: 80,
        borderRadius: 20,
        background: 'rgba(59, 130, 246, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        marginBottom: 24,
        boxShadow: '0 0 40px rgba(59, 130, 246, 0.1)'
      }}>
        🎯
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#e6edf3', marginBottom: 8, letterSpacing: '-0.02em' }}>
        CRM Inteligente
      </h2>
      <p style={{ fontSize: 14, color: '#8b949e', maxWidth: 420, lineHeight: 1.6, marginBottom: 32 }}>
        Gerencie seu funil de vendas com dossiê completo, abordagem personalizada com IA e tutor de vendas integrado.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        maxWidth: 520,
        width: '100%'
      }}>
        {features.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'left'
            }}>
              <Icon size={18} style={{ color: '#3b82f6', marginBottom: 8 }} />
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>{feat.title}</h4>
              <p style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.4 }}>{feat.desc}</p>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 28,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        color: '#34d399'
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        Módulo pronto — aguardando integração
      </div>
    </div>
  );
}
