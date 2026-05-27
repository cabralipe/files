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
    <main>
      {/* Header */}
      <header id="hdr">
        <div className="hdr-in">
          <div className="logo">
            <div className="logo-ic">BN</div>
            <div>
              <div className="logo-t">Portal BNCC Computação</div>
              <div className="logo-s">Secretaria Municipal de Educação · Atalaia/AL</div>
            </div>
          </div>
          <nav className="hdr-nav" aria-label="Navegação principal">
            <button className={`nb ${view === 'skills' ? 'on' : ''}`} onClick={() => setView('skills')}>
              Habilidades
            </button>
            <button className={`nb ${view === 'plan' ? 'on' : ''}`} onClick={() => setView('plan')}>
              Criar Plano <span className="nbadge">{selectedSkills.length}</span>
            </button>
            <button className={`nb ${view === 'saved' ? 'on' : ''}`} onClick={() => setView('saved')}>
              Meus Planos <span className="nbadge">{savedPlans.length}</span>
            </button>
            {user ? (
              <>
                <span className="nb user-pill">Logado: {user.user_metadata?.name || user.email}</span>
                <button className="nb" onClick={() => void signOut()}>
                  Sair
                </button>
              </>
            ) : (
              <Link className="nb" href="/auth/login">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <section className="pg">
        {/* View: Habilidades */}
        {view === 'skills' && (
          <div>
            {/* Busca */}
            <div className="pc">
              <div className="fbar">
                <input
                  type="search"
                  placeholder="Buscar por habilidade, código, componente, eixo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="coord-stats mb-6">
              <div>
                <strong>{skills.length}</strong>
                <span>Total de Habilidades</span>
              </div>
              <div>
                <strong>{filteredSkills.length}</strong>
                <span>Habilidades Encontradas</span>
              </div>
              <div>
                <strong>{selectedSkills.length}</strong>
                <span>Selecionadas</span>
              </div>
            </div>

            {/* Skills Grid */}
            <div className="plans-grid">
              {filteredSkills.map(skill => (
                <div
                  key={skill.id}
                  onClick={() => toggleSkill(skill)}
                  className={`pc cursor-pointer transition-all ${
                    selectedSkills.some(s => s.id === skill.id)
                      ? 'bg-[#D7EAE5] border-[3px]'
                      : ''
                  }`}
                >
                  <div className="pi-header mb-2 flex justify-between items-start">
                    <div>
                      <h3 className="pi-title">{skill.name}</h3>
                      <span className="font-mono text-xs font-bold text-gray-500">{skill.code}</span>
                    </div>
                    {selectedSkills.some(s => s.id === skill.id) && (
                      <span className="tag tcd">✓ Selecionada</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{skill.description}</p>
                  <div className="flex gap-2">
                    <span className="tag tm">{skill.category}</span>
                  </div>
                </div>
              ))}
            </div>

            {filteredSkills.length === 0 && (
              <div className="pc text-center py-12">
                <p className="text-gray-500 text-lg font-semibold">Nenhuma habilidade encontrada</p>
              </div>
            )}
          </div>
        )}

        {/* View: Criar Plano */}
        {view === 'plan' && (
          <div className="play">
            {/* Formulário */}
            <div className="pc">
              <h2 className="pct">📋 Dados do Plano de Aula</h2>

              <div className="fg mb-6">
                <label className="fgr s2">
                  <span className="fl">Professor(a) *</span>
                  <input
                    type="text"
                    value={formData.teacher}
                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                    placeholder="Nome completo"
                  />
                </label>

                <label className="fgr">
                  <span className="fl">Escola *</span>
                  <input
                    type="text"
                    list="municipal-schools"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    placeholder="Nome da escola"
                  />
                  <datalist id="municipal-schools">
                    {municipalSchools.map((school) => (
                      <option key={school} value={school} />
                    ))}
                  </datalist>
                </label>

                <label className="fgr">
                  <span className="fl">Ano/Turma *</span>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano', 'EJA'].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </label>

                <label className="fgr s2">
                  <span className="fl">Objetivos</span>
                  <textarea
                    value={formData.objectives}
                    onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                    placeholder="Descreva os objetivos da aula..."
                    rows={3}
                  />
                </label>

                <label className="fgr s2">
                  <span className="fl">Metodologia</span>
                  <textarea
                    value={formData.methodology}
                    onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                    placeholder="Descreva a metodologia a ser utilizada..."
                    rows={3}
                  />
                </label>
              </div>

              <button
                onClick={savePlan}
                className="w-full btn btn-pri"
              >
                <Plus size={16} /> Salvar Plano
              </button>
            </div>

            {/* Sidebar - Habilidades Selecionadas */}
            <div className="pc">
              <h3 className="pct">
                Selecionadas ({selectedSkills.length})
              </h3>
              <div className="space-y-3">
                {selectedSkills.length === 0 ? (
                  <p className="text-sm text-gray-500 font-semibold">Nenhuma habilidade selecionada</p>
                ) : (
                  selectedSkills.map(skill => (
                    <div key={skill.id} className="pc mb-2 !p-3">
                      <span className="font-mono text-xs font-black text-teal-deep">{skill.code}</span>
                      <p className="text-sm font-bold text-gray-900 mt-1 leading-tight">{skill.name}</p>
                      <button
                        onClick={() => toggleSkill(skill)}
                        className="text-xs font-bold text-red-600 hover:text-red-800 mt-2 underline"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* View: Meus Planos */}
        {view === 'saved' && (
          <div>
            <div className="saved-head">
              <div>
                <h1>💾 Meus Planos Salvos</h1>
                <p>Acesse seu histórico local de planos de aula construídos.</p>
              </div>
            </div>

            {savedPlans.length === 0 ? (
              <div className="pc text-center py-12">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg font-semibold">Nenhum plano salvo ainda</p>
              </div>
            ) : (
              <div className="plans-grid">
                {savedPlans.map(plan => (
                  <article className="plan-item" key={plan.id}>
                    <div className="pi-header">
                      <h3 className="pi-title">{plan.name}</h3>
                    </div>
                    <div className="pi-meta">
                      <span className="tag ta">Prof: {plan.teacher}</span>
                      <span className="tag tcd">{plan.school}</span>
                      <span className="tag tm">{plan.year}</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-gray-500 mb-4 mt-2">
                      Data: {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-mono font-black text-gray-600 uppercase mb-2">Habilidades:</p>
                      <div className="space-y-2">
                        {plan.skills.map(skill => (
                          <div key={skill.id} className="pc mb-2 !p-3 !bg-[#FBF5E3]">
                            <span className="font-mono text-xs font-bold text-blue-deep">{skill.code}</span>
                            <p className="text-sm font-semibold text-gray-800 leading-tight">{skill.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 brow mt-6">
                      <button
                        onClick={() => downloadPlan(plan)}
                        className="btn btn-pri flex-1"
                      >
                        <Download size={14} /> Download
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="btn btn-out flex-1"
                      >
                        Deletar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
