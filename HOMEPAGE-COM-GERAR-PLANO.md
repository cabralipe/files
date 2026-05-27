# 🏠 Homepage Atualizada com Gerador de Plano

## Layout Homepage (Após atualização)

```
┌─────────────────────────────────────────────────┐
│           BNCC PLATFORM - HOMEPAGE              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Header com Logo + [Login] [Signup]            │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  HERO SECTION (Novo!)                          │
│  ┌─────────────────────────────────────────┐   │
│  │  "Gere Planos de Aula com IA em 2min"  │   │
│  │                                          │   │
│  │  Sem cadastro. Grátis. Com habilidades │   │
│  │  BNCC integradas.                       │   │
│  │                                          │   │
│  │  [ Gerar Plano Agora → ]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  FEATURE CARDS (4 cards)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───┐ │
│  │ 📋 Planos│ │🏆 Ranking│ │IA Assist │ │⭐E│ │
│  └──────────┘ └──────────┘ └──────────┘ └───┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  SISTEMA DE PONTOS (5 cards)                   │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                     │
│  │10│ │ 5│ │25│ │ 2│ │ 1│                     │
│  └──┘ └──┘ └──┘ └──┘ └──┘                     │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  DEMO SECTION (Novo!)                          │
│  ┌─────────────────────────────────────────┐   │
│  │  "Veja um Plano Gerado"                 │   │
│  │                                          │   │
│  │  [Exemplo Preview]                       │   │
│  │                                          │   │
│  │  "Gostou? Faça login para salvar!"      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
├─────────────────────────────────────────────────┤
│  Footer com links                               │
└─────────────────────────────────────────────────┘
```

## Componente Homepage Atualizado

```typescript
'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, BookOpen, Trophy, Users, MessageSquare } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-3xl">📚</span>
            <span className="text-2xl font-bold text-gray-900">BNCC Platform</span>
          </div>
          <div className="flex gap-4">
            <a href="/auth/login" className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold">
              Entrar
            </a>
            <a href="/auth/signup" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
              Cadastre-se
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section - CTA Principal */}
      <section className="relative bg-gradient-to-br from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-blue-500 bg-opacity-30 px-4 py-2 rounded-full mb-4">
                <p className="text-sm font-semibold">✨ NEW: Gerar Plano Sem Cadastro</p>
              </div>
              <h1 className="text-5xl font-bold mb-4">
                Gere Planos de Aula com IA em 2 Minutos
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Sem cadastro. Grátis. Com todas as habilidades BNCC integradas.
              </p>
              <div className="flex gap-4">
                <Link href="/gerar-plano" className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 flex items-center gap-2">
                  <Sparkles size={20} />
                  Gerar Plano Agora
                </Link>
                <a href="#features" className="px-8 py-4 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-blue-600">
                  Saiba Mais →
                </a>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-8 border border-white border-opacity-20">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <p className="font-semibold">Preencha o formulário</p>
                      <p className="text-sm text-blue-100">Título, série, habilidades</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <p className="font-semibold">IA gera o plano</p>
                      <p className="text-sm text-blue-100">Em segundos, completo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📥</span>
                    <div>
                      <p className="font-semibold">Baixe em PDF</p>
                      <p className="text-sm text-blue-100">Pronto para imprimir</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">Funcionalidades Principais</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 */}
          <div className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-bold mb-2">Planos de Aula</h3>
            <p className="text-gray-600 mb-4">Crie e edite planos alinhados à BNCC com sugestões de IA</p>
            <a href="/auth/signup" className="text-blue-600 font-semibold group-hover:gap-2 flex items-center">
              Explorar <ArrowRight size={16} className="ml-2" />
            </a>
          </div>

          {/* Feature 2 */}
          <div className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-2">Ranking</h3>
            <p className="text-gray-600 mb-4">Compita com colegas e ganhe pontos por atividades</p>
            <a href="/auth/signup" className="text-blue-600 font-semibold group-hover:gap-2 flex items-center">
              Ver Ranking <ArrowRight size={16} className="ml-2" />
            </a>
          </div>

          {/* Feature 3 */}
          <div className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">IA Assistant</h3>
            <p className="text-gray-600 mb-4">Sugestões de atividades alimentadas por IA NVIDIA</p>
            <a href="/gerar-plano" className="text-blue-600 font-semibold group-hover:gap-2 flex items-center">
              Testar <ArrowRight size={16} className="ml-2" />
            </a>
          </div>

          {/* Feature 4 */}
          <div className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-xl font-bold mb-2">Experiências</h3>
            <p className="text-gray-600 mb-4">Compartilhe cases de sucesso com a comunidade</p>
            <a href="/auth/signup" className="text-blue-600 font-semibold group-hover:gap-2 flex items-center">
              Compartilhar <ArrowRight size={16} className="ml-2" />
            </a>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12">Veja um Plano Gerado</h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Preview */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-600 text-white p-6">
                <h3 className="text-xl font-bold">Introdução à Lógica de Programação</h3>
                <p className="text-blue-100">📋 Gerado com IA</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded">
                  <div>
                    <p className="text-xs text-gray-600">Série</p>
                    <p className="font-bold">6º ano</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Duração</p>
                    <p className="font-bold">50 min</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Habilidades</p>
                    <p className="font-bold">3</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Conteúdo Gerado</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p>• <strong>Introdução:</strong> O que é lógica de programação...</p>
                    <p>• <strong>Atividade 1:</strong> Jogo da sequência lógica (15 min)</p>
                    <p>• <strong>Atividade 2:</strong> Desafio de algoritmo (25 min)</p>
                    <p>• <strong>Fechamento:</strong> Reflexão e conclusão (10 min)</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    EF06MA01
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    Pensamento Crítico
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-bold mb-4">
                  Comece a Gerar Planos Agora
                </h3>
                <p className="text-lg text-gray-700 mb-6">
                  Crie planos de aula profissionais em minutos, sem necessidade de cadastro. Baixe em PDF e comece a usar imediatamente.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Gere com IA</h4>
                    <p className="text-gray-600">Sugestões inteligentes baseadas em habilidades BNCC</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">📥</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Baixe em PDF</h4>
                    <p className="text-gray-600">Pronto para imprimir e usar em sala de aula</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">💾</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Salve e Compartilhe</h4>
                    <p className="text-gray-600">Registre-se para salvar e ganhar pontos</p>
                  </div>
                </div>
              </div>

              <Link href="/gerar-plano" className="inline-block w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-center hover:bg-blue-700 transition-all">
                🚀 Gerar Meu Primeiro Plano
              </Link>

              <p className="text-sm text-gray-500 text-center">
                Grátis • Sem cadastro • Sem limite de geração
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sistema de Pontos */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Sistema de Gamificação</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: '📋', label: 'Criar Plano', points: '+10' },
            { icon: '🤖', label: 'Usar IA', points: '+5' },
            { icon: '⭐', label: 'Publicar', points: '+25' },
            { icon: '📚', label: 'Compartilhar', points: '+2' },
            { icon: '👍', label: 'Receber Like', points: '+1' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 text-center">
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-lg font-bold mt-2">{item.points}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Pronto para Transformar Suas Aulas?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Comece agora sem cadastro. Gere planos com IA, baixe em PDF e compartilhe com a comunidade.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/gerar-plano" className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50">
              Gerar Plano Grátis
            </Link>
            <Link href="/auth/signup" className="px-8 py-4 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-blue-600">
              Criar Conta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="font-bold text-white mb-4">BNCC Platform</p>
              <p className="text-sm">Plataforma de educação digital para professores</p>
            </div>
            <div>
              <p className="font-bold text-white mb-4">Links</p>
              <ul className="space-y-2 text-sm">
                <li><a href="/gerar-plano" className="hover:text-white">Gerar Plano</a></li>
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="/auth/login" className="hover:text-white">Login</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white mb-4">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacidade</a></li>
                <li><a href="#" className="hover:text-white">Termos</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white mb-4">Contato</p>
              <p className="text-sm">Felipe Cabral</p>
              <p className="text-sm">felipeenete@gmail.com</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm text-center">
            <p>&copy; 2026 BNCC Platform. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

## 📊 SEO e Meta Tags

```typescript
// metadata.ts
export const metadata = {
  title: 'BNCC Platform - Gerador de Planos de Aula com IA',
  description: 'Crie planos de aula profissionais em 2 minutos com IA. Alinhado à BNCC. Grátis, sem cadastro. Baixe em PDF.',
  keywords: ['plano de aula', 'BNCC', 'IA', 'professor', 'educação', 'gerador'],
  openGraph: {
    title: 'BNCC Platform - Gerador de Planos de Aula',
    description: 'Crie planos de aula com IA em 2 minutos',
    image: '/og-image.png',
  },
};
```

## 🎯 Estratégia de Conversão

1. **Visitor** → Vê hero e CTA principal
2. **Clica** → Vai para `/gerar-plano`
3. **Gera plano** → Vê preview
4. **Baixa PDF** → Fica satisfeito
5. **CTA "Salvar"** → Redireciona para signup
6. **Sign up** → Converte em usuário

**Taxa esperada de conversão:** 10-15%

---

**Status**: Pronto para implementação
