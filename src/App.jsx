import React, { useState, Suspense, lazy } from 'react';
import {
  Target,
  Calendar,
  FileText,
  Mic2,
  Layers,
  Menu,
  X,
  Zap
} from 'lucide-react';
import './index.css';

// ═══════════════════════════════════════════════════════
//  OTTOMATIC HUB — Shell Principal (Fase 0)
//
//  Este arquivo é a "casca" do Hub. Ele gerencia:
//  - Navegação entre módulos (sidebar)
//  - Carregamento lazy de cada ferramenta
//  - Layout responsivo
//
//  Os módulos são carregados sob demanda para performance.
// ═══════════════════════════════════════════════════════

// Lazy-loaded modules
const CrmUnificado = lazy(() => import('./modules/CrmUnificado'));
const CalendarioSocial = lazy(() => import('./modules/CalendarioSocial'));
const GeradorPropostas = lazy(() => import('./modules/GeradorPropostas'));
const VoiceStudio = lazy(() => import('./modules/VoiceStudio'));
const FabricaCarrossel = lazy(() => import('./modules/FabricaCarrossel'));

// Module definitions
const MODULES = [
  {
    id: 'crm',
    name: 'CRM Inteligente',
    shortName: 'CRM',
    description: 'Funil, dossiê, abordagem IA e tutor de vendas',
    icon: '🎯',
    lucideIcon: Target,
    color: '#3b82f6',
    component: CrmUnificado,
    status: 'ready'
  },
  {
    id: 'calendario',
    name: 'Calendário Social',
    shortName: 'Calendário',
    description: 'Planejamento editorial com IA e geração de imagem',
    icon: '📅',
    lucideIcon: Calendar,
    color: '#10b981',
    component: CalendarioSocial,
    status: 'ready'
  },
  {
    id: 'propostas',
    name: 'Gerador de Propostas',
    shortName: 'Propostas',
    description: 'Propostas visuais HTML com IA persuasiva',
    icon: '📄',
    lucideIcon: FileText,
    color: '#6366f1',
    component: GeradorPropostas,
    status: 'ready'
  },
  {
    id: 'voice',
    name: 'Voice Studio',
    shortName: 'Voice',
    description: 'Narração profissional e análise de direção vocal',
    icon: '🎙️',
    lucideIcon: Mic2,
    color: '#f59e0b',
    component: VoiceStudio,
    status: 'ready'
  },
  {
    id: 'carrossel',
    name: 'Fábrica de Carrossel',
    shortName: 'Carrossel',
    description: 'Carrosséis pro com temas, layouts e exportação',
    icon: '🎨',
    lucideIcon: Layers,
    color: '#ec4899',
    component: FabricaCarrossel,
    status: 'ready'
  }
];

// Loading fallback component
function ModuleLoader() {
  return (
    <div className="module-welcome animate-in">
      <div className="module-welcome-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
        <Zap size={36} style={{ color: '#10b981' }} />
      </div>
      <h2>Carregando módulo...</h2>
      <p>Preparando sua ferramenta de trabalho.</p>
    </div>
  );
}

// Placeholder for modules not yet wired
function ModulePlaceholder({ module }) {
  const Icon = module.lucideIcon;
  return (
    <div className="module-welcome animate-in">
      <div
        className="module-welcome-icon"
        style={{ background: `${module.color}22` }}
      >
        <span>{module.icon}</span>
      </div>
      <h2>{module.name}</h2>
      <p>{module.description}</p>
      <div className={`status-badge ${module.status === 'ready' ? 'ready' : 'coming'}`}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: module.status === 'ready' ? '#10b981' : '#3b82f6',
          display: 'inline-block'
        }} />
        {module.status === 'ready' ? 'Pronto para uso' : 'Em desenvolvimento'}
      </div>
    </div>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState('crm');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentModule = MODULES.find(m => m.id === activeModule);

  const handleModuleClick = (moduleId) => {
    setActiveModule(moduleId);
    setSidebarOpen(false);
  };

  const renderModule = () => {
    if (!currentModule) return null;

    const ModuleComponent = currentModule.component;

    return (
      <Suspense fallback={<ModuleLoader />}>
        <div className="module-container">
          <ModuleComponent />
        </div>
      </Suspense>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={20} />
          </div>
          <div className="sidebar-logo-text">
            <h1>Otto<span>Matic</span></h1>
            <p>Marketing & Vendas</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Módulos</div>

          {MODULES.map((mod) => {
            const Icon = mod.lucideIcon;
            const isActive = activeModule === mod.id;

            return (
              <div
                key={mod.id}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => handleModuleClick(mod.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleModuleClick(mod.id);
                }}
              >
                <div
                  className="sidebar-item-icon"
                  style={{
                    background: isActive ? `${mod.color}22` : 'rgba(255,255,255,0.04)',
                    color: isActive ? mod.color : 'var(--hub-text-secondary)'
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="sidebar-item-text">
                  <h3>{mod.name}</h3>
                  <p>{mod.description}</p>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <p className="sidebar-footer-version">OttoMatic Hub v1.0 · Fase 0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="main-header-left">
            <button
              className="mobile-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Menu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {currentModule && (
              <div className="main-header-breadcrumb">
                <span className="module-icon">{currentModule.icon}</span>
                <div>
                  <h2>{currentModule.name}</h2>
                  <p>{currentModule.description}</p>
                </div>
              </div>
            )}
          </div>
          <div className="main-header-status">
            <div className="status-dot" />
            <span>Conectado</span>
          </div>
        </header>

        {/* Module body */}
        <div className="main-body">
          {renderModule()}
        </div>
      </main>
    </>
  );
}
