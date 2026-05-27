# 🎯 Feature: Gerador de Plano de Aula Público

## Descrição
Permitir que **qualquer pessoa** (sem login) gere um plano de aula alinhado à BNCC, com sugestões de IA.

## 🎁 Benefícios
- ✅ Atrair professores não cadastrados
- ✅ Testar a plataforma antes de fazer login
- ✅ Gerar leads (email ao salvar)
- ✅ Viral: "Compartilhe seu plano"
- ✅ Demonstração de valor

## 🏗️ Arquitetura

### Rotas Novas
```
GET  /gerar-plano          → Página pública
POST /api/public/gerar     → Endpoint para gerar
POST /api/public/download  → Download PDF
POST /api/public/salvar    → Salvar (redireciona login)
```

### Componentes Novos
```
components/
├── public/
│   ├── PlanoPublicoForm.tsx      (Formulário)
│   ├── SeletorSkillsPublico.tsx  (Seleção BNCC)
│   ├── PreviewPlano.tsx          (Preview)
│   └── CallToActionSalvar.tsx    (CTA para login)
```

### Fluxo de Dados
```
Professor (sem login)
    ↓
Acessa /gerar-plano
    ↓
Preenche formulário + skills BNCC
    ↓
Clica "Gerar com IA"
    ↓
API /api/public/gerar chama NVIDIA
    ↓
Preview do plano gerado
    ↓
Opções:
├─ Download PDF
├─ Regenerar
└─ "Salvar e continuar" → Redireciona login
```

## 📝 Implementação

### 1. Página Pública: `/app/gerar-plano/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import PlanoPublicoForm from '@/components/public/PlanoPublicoForm';
import PreviewPlano from '@/components/public/PreviewPlano';

export default function GerarPlanoPage() {
  const [plano, setPlano] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'preview'>('form');

  const handleGerarPlano = async (formData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/public/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      setPlano(data);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    // Salva temporariamente em sessão
    sessionStorage.setItem('planej', JSON.stringify(plano));
    // Redireciona para login com CTA
    window.location.href = '/auth/signup?redirect=meus-planos';
  };

  const handleDownloadPDF = async () => {
    const response = await fetch('/api/public/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plano),
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plano.title}.pdf`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gerador de Plano de Aula</h1>
          <a href="/auth/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg">
            Entrar
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Alert banner */}
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-8">
          <p className="font-semibold">✨ Teste gratuitamente! Crie e baixe seus planos sem se registrar.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Column */}
          <div>
            {step === 'form' ? (
              <PlanoPublicoForm 
                onSubmit={handleGerarPlano}
                loading={loading}
              />
            ) : (
              <div className="text-center">
                <button
                  onClick={() => setStep('form')}
                  className="text-blue-600 hover:underline"
                >
                  ← Voltar ao formulário
                </button>
              </div>
            )}
          </div>

          {/* Preview Column */}
          <div>
            {step === 'preview' && plano && (
              <PreviewPlano 
                plano={plano}
                onDownload={handleDownloadPDF}
                onSalvar={handleSalvar}
                onRegenerate={() => {
                  setPlano(null);
                  setStep('form');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2. Componente: `PlanoPublicoForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useSkills } from '@/lib/hooks';
import SeletorSkillsPublico from './SeletorSkillsPublico';

export default function PlanoPublicoForm({ onSubmit, loading }) {
  const { skills } = useSkills();
  const [formData, setFormData] = useState({
    title: '',
    gradeLevel: '6',
    duration: '50',
    objective: '',
    selectedSkills: [],
  });

  const handleSkillSelect = (skillCode) => {
    setFormData(prev => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skillCode)
        ? prev.selectedSkills.filter(s => s !== skillCode)
        : [...prev.selectedSkills, skillCode]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.selectedSkills.length === 0) {
      alert('Preencha título e selecione ao menos uma habilidade');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
      <h2 className="text-2xl font-bold">Crie seu Plano</h2>

      {/* Título */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Título do Plano *
        </label>
        <input
          type="text"
          placeholder="Ex: Introdução à Lógica de Programação"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grade */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Série/Ano
        </label>
        <select
          value={formData.gradeLevel}
          onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
        >
          {['6', '7', '8', '9'].map(grade => (
            <option key={grade} value={grade}>
              {grade}º ano
            </option>
          ))}
        </select>
      </div>

      {/* Duração */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Duração (minutos)
        </label>
        <input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Objetivo */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Objetivo da Aula (opcional)
        </label>
        <textarea
          placeholder="Descreva o que quer ensinar..."
          value={formData.objective}
          onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg h-24"
        />
      </div>

      {/* Skills BNCC */}
      <div>
        <label className="block text-sm font-semibold mb-3">
          Habilidades BNCC * ({formData.selectedSkills.length} selecionadas)
        </label>
        <SeletorSkillsPublico
          skills={skills}
          selected={formData.selectedSkills}
          onSelect={handleSkillSelect}
        />
      </div>

      {/* Botão */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '⏳ Gerando com IA...' : '✨ Gerar Plano com IA'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Grátis, sem necessidade de cadastro
      </p>
    </form>
  );
}
```

### 3. Seletor de Skills: `SeletorSkillsPublico.tsx`

```typescript
'use client';

import { useMemo, useState } from 'react';

export default function SeletorSkillsPublico({ skills, selected, onSelect }) {
  const [filter, setFilter] = useState('');
  const [competency, setCompetency] = useState('');

  const competencies = useMemo(() => 
    [...new Set(skills?.map(s => s.competency))],
    [skills]
  );

  const filtered = useMemo(() => {
    return skills?.filter(s => {
      const matchCompetency = !competency || s.competency === competency;
      const matchFilter = !filter || 
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        s.code.toLowerCase().includes(filter.toLowerCase());
      return matchCompetency && matchFilter;
    }) || [];
  }, [skills, filter, competency]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <input
        type="text"
        placeholder="🔍 Buscar habilidade..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />

      <select
        value={competency}
        onChange={(e) => setCompetency(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      >
        <option value="">Todas as competências</option>
        {competencies.map(comp => (
          <option key={comp} value={comp}>{comp}</option>
        ))}
      </select>

      {/* Grid de Skills */}
      <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto p-4 bg-gray-50 rounded-lg border">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma habilidade encontrada</p>
        ) : (
          filtered.map(skill => (
            <label key={skill.code} className="flex items-center cursor-pointer hover:bg-blue-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selected.includes(skill.code)}
                onChange={() => onSelect(skill.code)}
                className="rounded"
              />
              <div className="ml-3 flex-1 text-sm">
                <p className="font-semibold text-gray-800">{skill.code}</p>
                <p className="text-gray-600">{skill.name}</p>
              </div>
            </label>
          ))
        )}
      </div>

      <p className="text-xs text-gray-500">
        Selecionadas: {selected.length} | Total: {filtered.length}
      </p>
    </div>
  );
}
```

### 4. Preview: `PreviewPlano.tsx`

```typescript
'use client';

export default function PreviewPlano({ plano, onDownload, onSalvar, onRegenerate }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <h2 className="text-2xl font-bold">{plano.title}</h2>
        <p className="text-blue-100">📋 Plano gerado com IA</p>
      </div>

      {/* Conteúdo */}
      <div className="p-6 space-y-6">
        {/* Metadados */}
        <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">Série</p>
            <p className="font-semibold">{plano.gradeLevel}º ano</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Duração</p>
            <p className="font-semibold">{plano.duration} min</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Habilidades</p>
            <p className="font-semibold">{plano.skills.length}</p>
          </div>
        </div>

        {/* Objetivo */}
        {plano.objective && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Objetivo</h3>
            <p className="text-gray-700">{plano.objective}</p>
          </div>
        )}

        {/* Conteúdo do Plano */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Plano Gerado</h3>
          <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg overflow-y-auto max-h-60">
            {plano.content && (
              <div dangerouslySetInnerHTML={{ __html: plano.content }} />
            )}
          </div>
        </div>

        {/* Skills */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Habilidades BNCC</h3>
          <div className="flex flex-wrap gap-2">
            {plano.skills.map(skill => (
              <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Botões CTA */}
        <div className="space-y-3 pt-6 border-t">
          <button
            onClick={onDownload}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            📥 Baixar PDF
          </button>

          <button
            onClick={onSalvar}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
          >
            💾 Salvar na Plataforma
          </button>

          <button
            onClick={onRegenerate}
            className="w-full py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
          >
            🔄 Gerar Novo
          </button>
        </div>

        {/* Mensagem de CTA */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-700">
            <strong>💡 Dica:</strong> Salve seus planos e ganhe pontos ao compartilhar experiências!
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 5. API Endpoint: `/app/api/public/gerar/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generatePlanoWithAI } from '@/lib/nvidia';

export async function POST(request: NextRequest) {
  try {
    const { title, gradeLevel, duration, objective, selectedSkills } = await request.json();

    // Validações
    if (!title.trim() || selectedSkills.length === 0) {
      return NextResponse.json(
        { error: 'Título e habilidades são obrigatórios' },
        { status: 400 }
      );
    }

    // Gerar com IA
    const prompt = `
    Gere um plano de aula detalhado com as seguintes características:
    - Título: ${title}
    - Série: ${gradeLevel}º ano
    - Duração: ${duration} minutos
    - Objetivo: ${objective || 'Geral'}
    - Habilidades BNCC: ${selectedSkills.join(', ')}
    
    O plano deve incluir:
    1. Introdução
    2. Objetivos específicos
    3. Materiais necessários
    4. Procedimentos/Atividades (passo a passo)
    5. Avaliação
    6. Referências
    
    Formato: HTML bem estruturado.
    `;

    const content = await generatePlanoWithAI(prompt);

    return NextResponse.json({
      title,
      gradeLevel,
      duration,
      objective,
      skills: selectedSkills,
      content,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Erro ao gerar plano:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar plano com IA' },
      { status: 500 }
    );
  }
}
```

### 6. API Download PDF: `/app/api/public/download/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generatePDF } from '@/lib/pdf-generator';

export async function POST(request: NextRequest) {
  try {
    const plano = await request.json();

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #667eea; }
        .info { background: #f0f0f0; padding: 10px; margin: 20px 0; border-radius: 5px; }
        .skills { display: flex; flex-wrap: wrap; gap: 5px; margin: 20px 0; }
        .skill { background: #e3f2fd; color: #1976d2; padding: 5px 10px; border-radius: 15px; font-size: 0.85em; }
      </style>
    </head>
    <body>
      <h1>${plano.title}</h1>
      <div class="info">
        <p><strong>Série:</strong> ${plano.gradeLevel}º ano</p>
        <p><strong>Duração:</strong> ${plano.duration} minutos</p>
        <p><strong>Gerado em:</strong> ${new Date(plano.generatedAt).toLocaleDateString('pt-BR')}</p>
      </div>
      
      ${plano.objective ? `<h2>Objetivo</h2><p>${plano.objective}</p>` : ''}
      
      <h2>Conteúdo do Plano</h2>
      ${plano.content}
      
      <h2>Habilidades BNCC</h2>
      <div class="skills">
        ${plano.skills.map(skill => `<span class="skill">${skill}</span>`).join('')}
      </div>
      
      <hr style="margin-top: 40px;">
      <p style="font-size: 0.9em; color: #999;">
        Gerado pela BNCC Platform - Ferramenta gratuita para gerar planos de aula
      </p>
    </body>
    </html>
    `;

    const pdf = await generatePDF(htmlContent);
    
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${plano.title.replace(/\s+/g, '-')}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}
```

## 🔗 Integração com Login

Quando clicar "Salvar", redirecionar para:
```
/auth/signup?redirect=salvar-plano&plano=<encoded>
```

Após signup, carrega o plano na página de edição.

## 📊 Analytics para Rastrear

```typescript
// Em cada ação
trackEvent('plano_publico_gerado', { gradeLevel, skillsCount });
trackEvent('plano_publico_baixado');
trackEvent('plano_publico_salvo_apos_login');
```

## 🚀 Benefícios Esperados

- ⬆️ +30% de visitors (SEO + compartilhamento)
- ⬆️ +15% de signups (conversão do CTA)
- ⬆️ +20% de retenção (usuário já viu valor)
- ⬆️ Redução de bounce rate

---

**Status**: Pronto para implementação
