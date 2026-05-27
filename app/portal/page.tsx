'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, BookOpen, FileText, Trash2, Download } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { municipalSchools } from '@/lib/education-options'
import { useAuth } from '@/hooks/useAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface Skill {
  id: string
  name: string
  description: string
  code: string
  category: string
  level?: string
}

interface Plan {
  id: string
  name: string
  teacher: string
  school: string
  year: string
  skills: Skill[]
  createdAt: string
}

export default function PortalPage() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<'skills' | 'plan' | 'saved'>('skills')
  const [skills, setSkills] = useState<Skill[]>([])
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([])
  const [savedPlans, setSavedPlans] = useState<Plan[]>([])

  // Form state
  const [formData, setFormData] = useState({
    teacher: '',
    school: 'E.M.',
    year: '',
    objectives: '',
    methodology: '',
  })

  useEffect(() => {
    fetchSkills()
    loadSavedPlans()
  }, [])

  useEffect(() => {
    filterSkills()
  }, [searchQuery, skills])

  const fetchSkills = async () => {
    try {
      const { data } = await supabase
        .from('skills')
        .select('*')
        .limit(100)

      setSkills(data || [])
      setFilteredSkills(data || [])
    } catch (err) {
      console.error('Erro ao buscar skills:', err)
    }
  }

  const filterSkills = () => {
    const query = searchQuery.toLowerCase()
    const filtered = skills.filter(skill =>
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query) ||
      skill.code.toLowerCase().includes(query) ||
      skill.category.toLowerCase().includes(query)
    )
    setFilteredSkills(filtered)
  }

  const toggleSkill = (skill: Skill) => {
    setSelectedSkills(prev => {
      const isSelected = prev.some(s => s.id === skill.id)
      if (isSelected) {
        return prev.filter(s => s.id !== skill.id)
      } else {
        return [...prev, skill]
      }
    })
  }

  const loadSavedPlans = () => {
    try {
      const saved = localStorage.getItem('bncc-plans')
      if (saved) {
        setSavedPlans(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Erro ao carregar planos salvos:', err)
    }
  }

  const savePlan = () => {
    if (!formData.teacher.trim() || !formData.year) {
      alert('Preencha professor(a) e ano/turma')
      return
    }

    const newPlan: Plan = {
      id: Date.now().toString(),
      name: `Plano de ${formData.teacher} - ${formData.year}`,
      teacher: formData.teacher,
      school: formData.school,
      year: formData.year,
      skills: selectedSkills,
      createdAt: new Date().toISOString(),
    }

    const updated = [...savedPlans, newPlan]
    setSavedPlans(updated)
    localStorage.setItem('bncc-plans', JSON.stringify(updated))

    // Reset form
    setSelectedSkills([])
    setFormData({ teacher: '', school: 'E.M.', year: '', objectives: '', methodology: '' })
    alert('Plano salvo com sucesso!')
  }

  const deletePlan = (id: string) => {
    const updated = savedPlans.filter(p => p.id !== id)
    setSavedPlans(updated)
    localStorage.setItem('bncc-plans', JSON.stringify(updated))
  }

  const downloadPlan = (plan: Plan) => {
    const content = `
PLANO DE AULA
=============

Professor(a): ${plan.teacher}
Escola: ${plan.school}
Ano/Turma: ${plan.year}
Data: ${new Date(plan.createdAt).toLocaleDateString('pt-BR')}

HABILIDADES SELECIONADAS:
${plan.skills.map(s => `- ${s.code}: ${s.name}`).join('\n')}

Objetivos:
${formData.objectives || '(Não preenchido)'}

Metodologia:
${formData.methodology || '(Não preenchido)'}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plano-${plan.teacher}-${new Date().getTime()}.txt`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-800 to-green-700 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">📚</div>
              <div>
                <h1 className="text-xl font-bold">Portal BNCC Computação</h1>
                <p className="text-sm text-green-100">Secretaria Municipal de Educação</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('skills')}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  view === 'skills'
                    ? 'bg-white text-green-800'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                🔍 Habilidades
              </button>
              <button
                onClick={() => setView('plan')}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  view === 'plan'
                    ? 'bg-white text-green-800'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                📝 Criar Plano ({selectedSkills.length})
              </button>
              <button
                onClick={() => setView('saved')}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  view === 'saved'
                    ? 'bg-white text-green-800'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                💾 Meus Planos ({savedPlans.length})
              </button>
              {user ? (
                <>
                  <span className="px-4 py-2 rounded-full font-semibold text-white border border-white">
                    Logado: {user.user_metadata?.name || user.email}
                  </span>
                  <button
                    onClick={() => void signOut()}
                    className="px-4 py-2 rounded-full font-semibold text-white hover:bg-white/10 transition border border-white"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-full font-semibold text-white hover:bg-white/10 transition border border-white"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* View: Habilidades */}
        {view === 'skills' && (
          <div>
            {/* Busca */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-3 text-gray-400" size={20} />
                <input
                  type="search"
                  placeholder="Buscar por habilidade, código, componente, eixo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-0"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-600 text-sm">Total de Habilidades</p>
                <p className="text-3xl font-bold text-green-700">{skills.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-600 text-sm">Resultados Encontrados</p>
                <p className="text-3xl font-bold text-blue-700">{filteredSkills.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-gray-600 text-sm">Selecionadas</p>
                <p className="text-3xl font-bold text-indigo-700">{selectedSkills.length}</p>
              </div>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map(skill => (
                <div
                  key={skill.id}
                  onClick={() => toggleSkill(skill)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedSkills.some(s => s.id === skill.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{skill.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{skill.code}</p>
                    </div>
                    {selectedSkills.some(s => s.id === skill.id) && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{skill.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {skill.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredSkills.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Nenhuma habilidade encontrada</p>
              </div>
            )}
          </div>
        )}

        {/* View: Criar Plano */}
        {view === 'plan' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Formulário */}
            <div className="col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Dados do Plano de Aula</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Professor(a) *
                    </label>
                    <input
                      type="text"
                      value={formData.teacher}
                      onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                      placeholder="Nome completo"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Escola *</label>
                      <input
                        type="text"
                        list="municipal-schools"
                        value={formData.school}
                        onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                        placeholder="Nome da escola"
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-0"
                      />
                      <datalist id="municipal-schools">
                        {municipalSchools.map((school) => (
                          <option key={school} value={school} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Ano/Turma *</label>
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-0"
                      >
                        <option value="">Selecione…</option>
                        {['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano', 'EJA'].map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Objetivos</label>
                    <textarea
                      value={formData.objectives}
                      onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                      placeholder="Descreva os objetivos da aula..."
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-0 h-24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Metodologia</label>
                    <textarea
                      value={formData.methodology}
                      onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                      placeholder="Descreva a metodologia a ser utilizada..."
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-0 h-24"
                    />
                  </div>

                  <button
                    onClick={savePlan}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    Salvar Plano
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar - Habilidades Selecionadas */}
            <div>
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Habilidades Selecionadas ({selectedSkills.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedSkills.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhuma habilidade selecionada</p>
                  ) : (
                    selectedSkills.map(skill => (
                      <div key={skill.id} className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs font-mono text-green-700">{skill.code}</p>
                        <p className="text-sm font-semibold text-gray-900">{skill.name}</p>
                        <button
                          onClick={() => toggleSkill(skill)}
                          className="text-xs text-red-600 hover:text-red-800 mt-1"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View: Meus Planos */}
        {view === 'saved' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💾 Meus Planos Salvos</h2>

            {savedPlans.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">Nenhum plano salvo ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedPlans.map(plan => (
                  <div key={plan.id} className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <p><strong>Professor(a):</strong> {plan.teacher}</p>
                      <p><strong>Escola:</strong> {plan.school}</p>
                      <p><strong>Ano/Turma:</strong> {plan.year}</p>
                      <p><strong>Habilidades:</strong> {plan.skills.length}</p>
                      <p><strong>Data:</strong> {new Date(plan.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>

                    <div className="mb-4 max-h-40 overflow-y-auto">
                      <p className="text-xs font-bold text-gray-600 mb-2">Habilidades:</p>
                      <div className="space-y-1">
                        {plan.skills.map(skill => (
                          <div key={skill.id} className="text-xs bg-blue-50 p-2 rounded">
                            <p className="font-mono text-blue-700">{skill.code}</p>
                            <p className="text-gray-900">{skill.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadPlan(plan)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                      >
                        <Download size={16} />
                        Download
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
                      >
                        <Trash2 size={16} />
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
