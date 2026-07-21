'use client'

import { supabase } from '@/lib/supabase-client'

import Link from '@/lib/m-link'
import { useRouter } from '@/lib/m-link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStorage } from '@/hooks/useStorage'
import { municipalSchools } from '@/lib/education-options'

type Skill = {
  id: string
  code: string
  name: string
  subject: string
  grade_level: string
  axis: string
}

type ExperienceForm = {
  title: string
  teacher: string
  school: string
  subject: string
  grade_level: string
  description: string
  content: string
  outcomes: string
  image_url: string
}

const emptyForm: ExperienceForm = {
  title: '',
  teacher: '',
  school: 'Escola Municipal',
  subject: 'Computação',
  grade_level: '',
  description: '',
  content: '',
  outcomes: '',
  image_url: '',
}


export default function NewExperiencePage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, user, profile } = useAuth()
  const { uploadExperienceImageBlob } = useStorage()
  const [skills, setSkills] = useState<Skill[]>([])
  const [form, setForm] = useState<ExperienceForm>(emptyForm)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    setForm((current) => ({
      ...current,
      teacher: current.teacher || profile?.fullName || user?.email || '',
      school:
        current.school === emptyForm.school
          ? String(profile?.school?.name || current.school)
          : current.school,
      subject:
        current.subject === emptyForm.subject
          ? String(user?.user_metadata?.subject || current.subject).replace(/^.*: /, '')
          : current.subject,
    }))
    void loadSkills()
  }, [authLoading, isAuthenticated, router, user, profile])

  async function loadSkills() {
    const response = await fetch('/api/skills')
    const payload = await response.json()
    setSkills(payload.data || [])
  }

  const filteredSkills = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return skills
      .filter((skill) =>
        needle
          ? `${skill.code} ${skill.name} ${skill.description} ${skill.subject} ${skill.axis} ${skill.competency}`.toLowerCase().includes(needle)
          : true,
      )
      .slice(0, 8)
  }, [query, skills])

  function updateForm(field: keyof ExperienceForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleSkill(skill: Skill) {
    const isRemoving = selectedSkills.includes(skill.id)
    setSelectedSkills((current) =>
      current.includes(skill.id) ? current.filter((item) => item !== skill.id) : [...current, skill.id],
    )
    showToast(isRemoving ? `${skill.code} removida.` : `${skill.code} vinculada com sucesso.`)
  }

  function showToast(text: string) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2800)
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem.')
      return
    }

    setUploading(true)
    try {
      const uploaded = await uploadExperienceImageBlob(file)
      updateForm('image_url', uploaded.url)
      showToast('Imagem enviada.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function saveExperience(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    setLoading(true)

    try {
      const token = await getAccessToken()
      const response = await fetch('/api/experiences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          skill_ids: selectedSkills,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao cadastrar experiência')
      }

      setSaved(true)
      showToast('Experiência cadastrada com sucesso.')
      window.setTimeout(() => router.push('/experiences'), 1600)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao cadastrar experiência')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Verificando login...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <main>
      {/* Acoes da pagina (header global fica acima) */}
      <nav className="subnav" aria-label="Navegação de experiências">
        <Link className="nb" href="/experiences">
          ← Lista de experiências
        </Link>
      </nav>

      <section className="pg">
        <form className="pc exp-form" onSubmit={saveExperience}>
          <h1 className="pct">Cadastrar experiência exitosa</h1>
          <div className="fg">
            <label className="fgr">
              <span className="fl">Professor(a)</span>
              <input value={form.teacher} onChange={(event) => updateForm('teacher', event.target.value)} placeholder="Nome do professor" />
            </label>
            <label className="fgr">
              <span className="fl">Escola</span>
              <input
                list="experience-schools"
                value={form.school}
                onChange={(event) => updateForm('school', event.target.value)}
              />
              <datalist id="experience-schools">
                {municipalSchools.map((school) => (
                  <option key={school} value={school} />
                ))}
              </datalist>
            </label>
            <label className="fgr">
              <span className="fl">Ano/Turma</span>
              <input value={form.grade_level} onChange={(event) => updateForm('grade_level', event.target.value)} placeholder="Ex.: 5 ano" />
            </label>
            <label className="fgr">
              <span className="fl">Componente</span>
              <input value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} />
            </label>
            <label className="fgr s2">
              <span className="fl">Titulo da experiência</span>
              <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ex.: Jornal digital da turma" />
            </label>
            <label className="fgr s2">
              <span className="fl">Resumo</span>
              <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Conte em poucas linhas o que foi realizado." />
            </label>
            <label className="fgr s2">
              <span className="fl">Como aconteceu</span>
              <textarea value={form.content} onChange={(event) => updateForm('content', event.target.value)} placeholder="Descreva etapas, recursos, participacao dos estudantes e organizacao da aula." />
            </label>
            <label className="fgr s2">
              <span className="fl">Resultados observados</span>
              <textarea value={form.outcomes} onChange={(event) => updateForm('outcomes', event.target.value)} placeholder="Registre evidencias, aprendizados e proximos passos." />
            </label>
            <label className="fgr s2">
              <span className="fl">Imagem da experiência</span>
              <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} />
              {uploading && <span className="hint">Enviando imagem...</span>}
              {form.image_url && (
                <img className="experience-preview-image" src={form.image_url} alt="Prévia da experiência" />
              )}
            </label>
          </div>

          <div className="exp-skill-picker">
            <label className="fgr">
              <span className="fl">Vincular habilidades BNCC</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar habilidade para vincular" />
            </label>
            <div className={`exp-skill-summary${selectedSkills.length ? ' has-selection' : ''}`} role="status" aria-live="polite">
              {selectedSkills.length
                ? `${selectedSkills.length} habilidade${selectedSkills.length > 1 ? 's' : ''} vinculada${selectedSkills.length > 1 ? 's' : ''}.`
                : 'Nenhuma habilidade vinculada ainda.'}
            </div>
            <div className="mini-skill-list">
              {filteredSkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill.id)
                return (
                  <button
                    className={`mini-skill ${isSelected ? 'selected' : ''}`}
                    key={skill.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleSkill(skill)}
                  >
                    <strong>{skill.code}</strong>
                    <span>{skill.name}</span>
                    <span className="mini-skill-state">{isSelected ? '✓ Vinculada' : '+ Vincular'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {saved && (
            <div className="experience-save-success" role="status">
              <strong>Experiência cadastrada com sucesso.</strong>
              <span>Redirecionando para a lista de experiências...</span>
            </div>
          )}

          <div className="brow">
            <Link className="btn btn-out" href="/experiences">
              Cancelar
            </Link>
            <button className="btn btn-pri" disabled={loading || uploading || saved} type="submit">
              {saved ? 'Cadastrada ✓' : loading || uploading ? 'Salvando...' : 'Cadastrar experiência'}
            </button>
          </div>
        </form>
      </section>

      <div id="toast" role="status" aria-live="polite" className={message ? 'show' : ''}>{message}</div>
    </main>
  )
}
