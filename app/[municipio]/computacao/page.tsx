'use client'

import { supabase } from '@/lib/supabase-client'

import { useEffect, useMemo, useState } from 'react'
import Link from '@/lib/m-link'
import { municipalSchools } from '@/lib/education-options'
import { useAuth } from '@/hooks/useAuth'
import PeiControls, { type PeiStudent, type PlanKind } from '@/components/PeiControls'
import { PortalTutorial, SkillsHowTo, usePortalTutorial, type TutorialStep } from '@/components/PortalTutorial'
import { downloadRisoPdf, sanitizePdfText, pdfSlug } from '@/lib/pdf-riso'


type Skill = {
  id: string
  code: string
  name: string
  description: string
  grade_level: string
  competency: string
  subject: string
  axis: string
}

type Plan = {
  id: string
  title: string
  teacher: string
  school: string
  grade_level: string
  subject: string
  date: string
  duration: string
  methodology: string
  objectives: string
  materials: string
  notes: string
  skill_ids: string[]
  content: string
  created_at: string
  coordinator_viewed_at?: string
  coordinator_name?: string
  coordinator_note?: string
  is_published?: boolean
  plan_status?: 'rascunho' | 'vigente' | 'arquivado' | 'substituido'
  is_pei?: boolean
  student_id?: string
  pei_snapshot?: Record<string, unknown>
  revisao_regente?: boolean
  colaboracao_aee?: AeeCollaboration
  consulta_familia?: FamilyConsultation
}

type AeeCollaboration = {
  professor_id: string
  nome: string
  data: string
  funcao: string
  contribuicoes: string
  recursos_indicados: string[]
  adaptacoes_sugeridas: string[]
  parecer: string
}

type FamilyConsultation = {
  responsavel_nome: string
  parentesco: string
  data_consulta: string
  formato: 'presencial' | 'telefone' | 'whatsapp' | 'reuniao_online' | 'outro'
  informacoes_relevantes: string
  expectativas: string
  concordancia: 'aprovado' | 'ciencia_sem_aprovacao' | 'pendente'
  observacoes: string
}

type PlanForm = {
  title: string
  teacher: string
  school: string
  grade_level: string
  subject: string
  date: string
  duration: string
  methodology: string
  objectives: string
  materials: string
  notes: string
}

const emptyForm: PlanForm = {
  title: '',
  teacher: '',
  school: '',
  grade_level: '5',
  subject: 'Computação',
  date: '',
  duration: '50 minutos',
  methodology: 'Aprendizagem baseada em projeto',
  objectives: '',
  materials: 'Quadro, caderno, celular ou computador compartilhado',
  notes: '',
}

const emptyAeeCollaboration: AeeCollaboration = {
  professor_id: '',
  nome: '',
  data: '',
  funcao: 'Professor da sala especial/AEE',
  contribuicoes: '',
  recursos_indicados: [],
  adaptacoes_sugeridas: [],
  parecer: '',
}

const emptyFamilyConsultation: FamilyConsultation = {
  responsavel_nome: '',
  parentesco: '',
  data_consulta: '',
  formato: 'presencial',
  informacoes_relevantes: '',
  expectativas: '',
  concordancia: 'pendente',
  observacoes: '',
}

function splitList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinList(value?: string[]) {
  return (value || []).join('\n')
}

const tagClass: Record<string, string> = {
  Portugues: 'tp',
  'Português': 'tp',
  Matematica: 'tm',
  'Matemática': 'tm',
  Ciencias: 'tc',
  'Ciências': 'tc',
  'Cultura Digital': 'tcd',
  Computacao: 'tcd',
  'Computação': 'tcd',
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}


const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: 'BN',
    iconStyle: { background: 'var(--red)', color: 'var(--paper-soft)' },
    title: 'Bem-vindo ao Portal BNCC!',
    body: 'Esta plataforma foi feita para professores de Atalaia/AL criarem planos de aula alinhados à BNCC Computação. Veja como funciona em poucos passos.',
    tip: null,
  },
  {
    icon: '⌕',
    iconStyle: { background: 'var(--blue-wash)', color: 'var(--ink)' },
    title: 'Pesquise as habilidades',
    body: 'Use a busca e os filtros de ano, componente e eixo temático para explorar as habilidades da BNCC Computação e encontrar as que combinam com a sua aula.',
    selector: '.fbar',
  },
  {
    icon: '▤',
    iconStyle: { background: 'var(--paper)', color: 'var(--ink)' },
    title: 'Conheça o card de habilidade',
    body: 'Cada card traz o código oficial, a habilidade e o eixo da BNCC. Clique em "Detalhes" para ver a descrição completa e em "+ Plano" para adicionar ao seu plano de aula.',
    selector: '.grid .scard',
  },
  {
    icon: '✎',
    iconStyle: { background: 'var(--mustard-wash)', color: 'var(--ink)' },
    title: 'Crie um plano de aula',
    body: 'Com habilidades selecionadas, vá para a aba "Plano", preencha os dados e clique em "Gerar plano". A IA cria um plano completo em segundos — você ainda pode editar!',
    tip: 'Plano',
  },
  {
    icon: '↓',
    iconStyle: { background: 'var(--teal-wash)', color: 'var(--ink)' },
    title: 'Salve e baixe em PDF',
    body: 'Cadastre-se para salvar seus planos na conta e acessá-los a qualquer momento. Você também pode baixar em PDF e levar impresso para a sala de aula.',
    tip: null,
  },
  {
    icon: '♡',
    iconStyle: { background: 'var(--plum-wash)', color: 'var(--ink)' },
    title: 'Compartilhe experiências',
    body: 'Clique em "Experiências" no menu para ver o que outros professores estão criando e compartilhar suas próprias práticas de sala de aula.',
    tip: 'Experiências',
  },
]

export default function Home() {
  const { user, signOut } = useAuth()
  const isLoggedIn = Boolean(user)
  const [view, setView] = useState<'skills' | 'plan' | 'saved'>('skills')
  const [skills, setSkills] = useState<Skill[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [axis, setAxis] = useState('')
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [planKind, setPlanKind] = useState<PlanKind>('plano')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<PeiStudent | null>(null)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [revisaoRegente, setRevisaoRegente] = useState(false)
  const [aee, setAee] = useState<AeeCollaboration>(emptyAeeCollaboration)
  const [family, setFamily] = useState<FamilyConsultation>(emptyFamilyConsultation)
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)
  const [loadingPhrase, setLoadingPhrase] = useState('🧠 Pensando no plano...')
  const [progress, setProgress] = useState(0)
  const { open: tutorialOpen, openTutorial, closeTutorial } = usePortalTutorial('bncc_tutorial_seen')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    setForm((f) => f.date ? f : { ...f, date: today })
    setAee((a) => a.data ? a : { ...a, data: today })
    setFamily((fam) => fam.data_consulta ? fam : { ...fam, data_consulta: today })
  }, [])

  useEffect(() => {
    void loadSkills()
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'pageview', page: '/' }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (user) {
      void loadPlans()
    } else {
      setPlans([])
      if (view === 'saved') setView('skills')
    }
  }, [user, view])

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  useEffect(() => {
    if (!user) return

    setForm((current) => ({
      ...current,
      teacher: current.teacher || String(user.user_metadata?.name || user.user_metadata?.full_name || ''),
      school:
        current.school === emptyForm.school
          ? String(user.user_metadata?.school || current.school)
          : current.school,
      subject:
        current.subject === emptyForm.subject
          ? String(user.user_metadata?.subject || current.subject).replace(/^.*: /, '')
          : current.subject,
    }))
  }, [user])

  async function loadSkills() {
    const response = await fetch('/api/skills')
    const payload = await response.json()
    setSkills(payload.data || [])
  }

  async function loadPlans() {
    const token = await getAccessToken()
    if (!token) {
      setPlans([])
      return
    }

    const response = await fetch('/api/plans', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401) {
      setPlans([])
      return
    }
    const payload = await response.json()
    setPlans(payload.data || [])
  }

  const filteredSkills = useMemo(() => {
    const text = normalizeText(query)

    return skills.filter((skill) => {
      const matchesText = text
        ? normalizeText(`${skill.code} ${skill.name} ${skill.description} ${skill.subject} ${skill.axis}`).includes(text)
        : true
      const matchesGrade = grade ? skill.grade_level === grade : true
      const matchesSubject = subject ? skill.subject === subject : true
      const matchesAxis = axis ? skill.axis === axis : true

      return matchesText && matchesGrade && matchesSubject && matchesAxis
    })
  }, [axis, grade, query, skills, subject])

  useEffect(() => {
    setPage(1)
  }, [query, grade, subject, axis])

  const PAGE_SIZE = 24
  const totalPages = Math.ceil(filteredSkills.length / PAGE_SIZE)
  const pagedSkills = useMemo(
    () => filteredSkills.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredSkills, page],
  )

  const selectedSkills = useMemo(
    () => skills.filter((skill) => selected.includes(skill.id)),
    [selected, skills],
  )
  const grades = useMemo(() => [...new Set(skills.map((skill) => skill.grade_level))].sort(), [skills])
  const subjects = useMemo(() => [...new Set(skills.map((skill) => skill.subject))].sort(), [skills])
  const axes = useMemo(() => [...new Set(skills.map((skill) => skill.axis))].sort(), [skills])

  function showToast(text: string) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2800)
  }

  function toggleSkill(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function updateForm(field: keyof PlanForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateAee<K extends keyof AeeCollaboration>(field: K, value: AeeCollaboration[K]) {
    setAee((current) => ({ ...current, [field]: value }))
  }

  function updateFamily<K extends keyof FamilyConsultation>(field: K, value: FamilyConsultation[K]) {
    setFamily((current) => ({ ...current, [field]: value }))
  }

  function planPayload(content = generated, publish = false) {
    return {
      ...form,
      skill_ids: selected,
      content,
      is_pei: planKind === 'pei',
      student_id: planKind === 'pei' ? selectedStudentId : '',
      pei_snapshot: planKind === 'pei' ? { student: selectedStudent } : {},
      revisao_regente: revisaoRegente,
      colaboracao_aee: aee,
      consulta_familia: family,
      is_published: publish,
      plan_status: publish ? 'vigente' : 'rascunho',
    }
  }

  async function generatePlan() {
    if (!form.title.trim()) {
      showToast('Informe o tema do plano.')
      return
    }

    if (!selected.length) {
      showToast('Selecione ao menos uma habilidade.')
      return
    }

    if (planKind === 'pei' && !user) {
      showToast('Faça login para gerar PEI.')
      return
    }

    if (planKind === 'pei' && !selectedStudentId) {
      showToast('Selecione o aluno para gerar o PEI.')
      return
    }

    const phrases = [
      '🧠 Analisando as habilidades selecionadas...',
      '📚 Consultando as diretrizes da BNCC Computação...',
      '🔍 Pesquisando melhores práticas pedagógicas de computação...',
      '💡 Formulando objetivos didáticos alinhados ao ano escolar...',
      '✏️ Estruturando a introdução e o aquecimento da aula...',
      '🧩 Decompondo conceitos complexos em atividades simples...',
      '🕵️‍♂️ Mapeando padrões de aprendizagem para a turma...',
      '🤖 Integrando o Pensamento Computacional de forma lúdica...',
      '🎭 Desenvolvendo atividades criativas e contextualizadas...',
      '🍲 Temperando com a cultura e a história de Atalaia-AL...',
      '🛶 Inspirando dinâmicas nas águas do Rio Paraíba local...',
      '🌾 Conectando tecnologia ao cotidiano e à comunidade local...',
      '🛠️ Selecionando recursos e adaptando para a realidade escolar...',
      '📊 Definindo critérios inovadores para avaliação formativa...',
      '⚙️ Conectando com a IA da NVIDIA para gerar o plano...',
      '⚡ Processando os dados através de modelos de inteligência artificial...',
      '📝 Rascunhando o passo a passo detalhado do desenvolvimento...',
      '🤔 Criando perguntas norteadoras para estimular os alunos...',
      '💡 Elaborando desafios práticos para trabalho em equipe...',
      '🏫 Adequando a linguagem pedagógica para a rede municipal...',
      '🧼 Eliminando termos repetitivos para um plano bem objetivo...',
      '🎨 Refinando a estética e a estrutura do conteúdo...',
      '✍️ Revisando a ortografia e a formatação do texto...',
      '🤝 Garantindo que a acessibilidade esteja contemplada...',
      '🔋 Projetando alternativas para computação desplugada...',
      '🌟 Adicionando dicas exclusivas para o professor na regência...',
      '📅 Organizando a cronologia dos momentos da aula...',
      '🔍 Verificando o alinhamento com a Taxonomia de Bloom...',
      '💎 Polindo os objetivos gerais e específicos...',
      '📂 Preparando as referências bibliográficas...',
      '✨ Dando os últimos retoques pedagógicos no plano...'
    ]

    setLoading(true)
    setProgress(0)
    setLoadingPhrase(phrases[0])

    let currentProgress = 0
    const progressInterval = setInterval(() => {
      if (currentProgress < 40) {
        currentProgress += 1.0
      } else if (currentProgress < 75) {
        currentProgress += 0.35
      } else if (currentProgress < 90) {
        currentProgress += 0.15
      } else if (currentProgress < 97) {
        currentProgress += 0.07
      }
      setProgress(Math.min(currentProgress, 97))
    }, 200)

    let phraseIndex = 0
    const phraseInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length
      setLoadingPhrase(phrases[phraseIndex])
    }, 2200)

    try {
      const token = planKind === 'pei' ? await getAccessToken() : ''
      const response = await fetch(planKind === 'pei' ? '/api/pei/generate' : '/api/plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          planKind === 'pei'
            ? {
                student_id: selectedStudentId,
                portal: 'computacao',
                plan: planPayload(''),
                skills_context: selectedSkills
                  .map((skill) => `[${skill.code}] ${skill.name}\n${skill.description}\nEixo: ${skill.axis}`)
                  .join('\n\n'),
              }
            : planPayload(''),
        ),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao gerar')
      }

      const content: string = payload.data?.content || ''
      if (!content.trim()) {
        throw new Error('Plano gerado vazio. Tente novamente.')
      }

      clearInterval(progressInterval)
      clearInterval(phraseInterval)
      setProgress(100)
      setLoadingPhrase('✨ Escrevendo plano de aula...')

      setView('plan')

      const fullText = payload.data.content
      let currentLength = 0
      const chunkSize = 150

      const typingInterval = setInterval(() => {
        currentLength += chunkSize
        if (currentLength >= fullText.length) {
          clearInterval(typingInterval)
          setGenerated(fullText)
          setLoading(false)
          showToast('Plano gerado com sucesso! Você já pode editar ou salvar.')
        } else {
          setGenerated(fullText.slice(0, currentLength) + ' ▌')
          const textarea = document.getElementById('po') as HTMLTextAreaElement | null
          if (textarea) {
            textarea.scrollTop = textarea.scrollHeight
          }
        }
      }, 15)
    } catch (error) {
      clearInterval(progressInterval)
      clearInterval(phraseInterval)
      setLoading(false)
      showToast(error instanceof Error ? error.message : 'Erro ao gerar plano')
    }
  }

  async function savePlan(publish = false) {
    if (!user) {
      showToast('Faça login para salvar planos. Visitantes podem apenas gerar e baixar PDF.')
      return
    }

    if (!generated.trim()) {
      await generatePlan()
      return
    }

    setLoading(true)
    try {
      const token = await getAccessToken()
      const response = await fetch(editingPlanId ? `/api/plans/${editingPlanId}` : '/api/plans', {
        method: editingPlanId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(planPayload(generated, publish)),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao salvar')
      }

      await loadPlans()
      setEditingPlanId(payload.data?.id || editingPlanId)
      setView('saved')
      showToast(publish
        ? (planKind === 'pei' ? 'PEI publicado como vigente.' : 'Plano publicado.')
        : (planKind === 'pei' ? 'PEI salvo como rascunho.' : 'Plano salvo.'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar plano')
    } finally {
      setLoading(false)
    }
  }

  async function deleteSavedPlan(id: string) {
    const token = await getAccessToken()
    const response = await fetch(`/api/plans/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (response.ok) {
      await loadPlans()
      showToast('Plano excluído.')
    }
  }

  function loadSavedPlan(plan: Plan) {
    setEditingPlanId(plan.id)
    setForm({
      title: plan.title,
      teacher: plan.teacher,
      school: plan.school,
      grade_level: plan.grade_level,
      subject: plan.subject,
      date: plan.date,
      duration: plan.duration,
      methodology: plan.methodology,
      objectives: plan.objectives,
      materials: plan.materials,
      notes: plan.notes,
    })
    setSelected(plan.skill_ids)
    setGenerated(plan.content)
    setPlanKind(plan.is_pei ? 'pei' : 'plano')
    setSelectedStudentId(plan.student_id || '')
    setSelectedStudent((plan.pei_snapshot?.student as PeiStudent | undefined) || null)
    setRevisaoRegente(Boolean(plan.revisao_regente))
    setAee({ ...emptyAeeCollaboration, ...(plan.colaboracao_aee || {}) })
    setFamily({ ...emptyFamilyConsultation, ...(plan.consulta_familia || {}) })
    setView('plan')
    showToast('Plano carregado para edição.')
  }

  function startNewPlan() {
    setEditingPlanId(null)
    setForm((current) => ({
      ...emptyForm,
      teacher: current.teacher,
      school: current.school,
      subject: current.subject,
    }))
    setSelected([])
    setGenerated('')
    setPlanKind('plano')
    setSelectedStudentId('')
    setSelectedStudent(null)
    setRevisaoRegente(false)
    setAee(emptyAeeCollaboration)
    setFamily(emptyFamilyConsultation)
    setView('plan')
  }

  async function downloadPlanPdf(plan?: Plan) {
    const title = sanitizePdfText(plan?.title || form.title || 'plano')
    const text = sanitizePdfText(plan?.content || generated)
    if (!text.trim()) {
      showToast('Gere o plano antes de baixar em PDF.')
      return
    }

    const isPei = plan ? Boolean(plan.is_pei) : planKind === 'pei'
    const meta = plan || {
      title: form.title,
      teacher: form.teacher,
      school: form.school,
      grade_level: form.grade_level,
      subject: form.subject,
      date: form.date,
      duration: form.duration,
    }
    const aeePdf = plan?.colaboracao_aee || aee
    const familyPdf = plan?.consulta_familia || family
    const concordancia = (value: string, label: string) =>
      `${familyPdf.concordancia === value ? '(X)' : '( )'} ${label}`

    await downloadRisoPdf({
      docType: isPei ? 'PEI' : 'PLANO DE AULA',
      docSubtitle: isPei ? 'Plano Educacional Individualizado' : 'BNCC Computação',
      masthead: 'Portal BNCC Computação · Secretaria Municipal de Educação de Atalaia/AL',
      title,
      meta: [
        { label: 'Professor(a)', value: meta.teacher || 'Professor(a)' },
        { label: 'Escola', value: `${meta.school || 'Escola Municipal'} · Atalaia/AL` },
        ...(isPei && selectedStudent ? [{ label: 'Estudante', value: selectedStudent.full_name }] : []),
        { label: 'Ano/Turma', value: meta.grade_level || '—' },
        { label: 'Componente', value: meta.subject || '—' },
        { label: 'Data', value: meta.date || new Date().toLocaleDateString('pt-BR') },
        { label: 'Duração', value: meta.duration || '—' },
      ],
      body: text,
      sectionNames: ['HABILIDADES DA BNCC COMPUTAÇÃO', 'HABILIDADES DA BNCC COMPUTACAO'],
      skipLines: ['PLANO DE AULA', 'PEI', title, 'Secretaria Municipal de Educação de Atalaia/AL'],
      extraSections: [
        {
          title: 'Colaboração do professor da sala especial/AEE',
          lines: [
            { text: `Nome: ${aeePdf.nome || '—'}` },
            { text: `Função: ${aeePdf.funcao || 'Professor da sala especial/AEE'}` },
            { text: `Data: ${aeePdf.data || '—'}` },
            { text: `Contribuições registradas: ${aeePdf.contribuicoes || '—'}` },
            { text: `Recursos/adaptações sugeridos: ${[...(aeePdf.recursos_indicados || []), ...(aeePdf.adaptacoes_sugeridas || [])].join('; ') || '—'}` },
            { text: 'Professor(a) da sala especial/AEE', signature: true },
          ],
        },
        {
          title: 'Consulta e aprovação da família/responsável',
          lines: [
            { text: `Nome do responsável: ${familyPdf.responsavel_nome || '—'}` },
            { text: `Parentesco: ${familyPdf.parentesco || '—'}` },
            { text: `Data da consulta: ${familyPdf.data_consulta || '—'}` },
            { text: `Forma da consulta: ${familyPdf.formato || '—'}` },
            { text: `Contribuições da família: ${familyPdf.informacoes_relevantes || '—'}` },
            { text: `Status: ${concordancia('aprovado', 'Aprovado')}  ${concordancia('ciencia_sem_aprovacao', 'Ciência sem aprovação formal')}  ${concordancia('pendente', 'Pendente de nova reunião')}` },
            { text: 'Família / responsável', signature: true },
            { text: 'Coordenação pedagógica', signature: true },
            { text: 'Professor(a) regente', signature: true },
            { text: 'Professor(a) da sala especial/AEE', signature: true },
          ],
        },
      ],
      footerLeft: 'PORTAL BNCC COMPUTAÇÃO · ATALAIA/AL',
      fileName: `${isPei ? 'pei' : 'plano'}-${pdfSlug(title) || 'aula'}.pdf`,
    })
  }

  return (
    <main>
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
            <Link className="nb" href="/" style={{ opacity: .65, fontSize: 12 }}>← Portais</Link>
            <button className={`nb ${view === 'skills' ? 'on' : ''}`} onClick={() => setView('skills')}>
              Pesquisar
            </button>
            <button className={`nb ${view === 'plan' ? 'on' : ''}`} onClick={() => setView('plan')}>
              Plano <span className="nbadge">{selected.length}</span>
            </button>
            {isLoggedIn && (
              <button className={`nb ${view === 'saved' ? 'on' : ''}`} onClick={() => setView('saved')}>
                Meus Planos <span className="nbadge">{plans.length}</span>
              </button>
            )}
            <Link className="nb" href="/experiences">
              Experiências
            </Link>
            {user?.user_metadata?.role === 'coordinator' && (
              <Link className="nb" href="/coordinator">
                Coordenação
              </Link>
            )}
            {(['aee_teacher', 'coordinator', 'admin', 'municipality_admin', 'super_admin'].includes(String(user?.user_metadata?.role || '')) || user?.email === 'admin@bncc.local') && (
              <Link className="nb" href="/aee">
                AEE
              </Link>
            )}
            {(user?.user_metadata?.role === 'admin' || user?.email === 'admin@bncc.local') && (
              <Link className="nb" href="/admin" style={{ color: 'var(--red)' }}>
                ⚙ Admin
              </Link>
            )}
            {user ? (
              <>
                <span className="nb user-pill">Logado: {user.user_metadata?.name || user.email}</span>
                <button className="nb" onClick={() => void signOut()}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link className="nb nb-login" href="/auth/login">
                  <span className="nb-label">Login</span>
                  <span className="nb-icon-only" aria-hidden="true">→</span>
                </Link>
                <Link className="nb nb-cta" href="/auth/signup">
                  <span className="nb-label">Cadastrar professor</span>
                  <span className="nb-icon-only" aria-hidden="true">+</span>
                </Link>
              </>
            )}
            <button className="nb tut-open" onClick={openTutorial} aria-label="Abrir tutorial de uso" title="Como usar o portal">?</button>
          </nav>
        </div>
      </header>

      {view === 'skills' && (
        <section className="pg">
          <SkillsHowTo
            storageKey="bncc_howto_seen"
            accentVar="var(--red)"
            washVar="var(--red-wash)"
            referencialLabel="complemento da BNCC Computação (1º ao 9º Ano)"
            onOpenTutorial={openTutorial}
          />

          <div className="stats">
            <Stat value={skills.length} label="habilidades" />
            <Stat value={grades.length} label="anos/etapas" />
            <Stat value={subjects.length} label="componentes" />
            <Stat value={axes.length} label="eixos BNCC" />
          </div>

          <div className="fbar">
            <div className="sw">
              <span className="sw-icon">⌕</span>
              <input
                type="search"
                placeholder="Pesquisar por código, habilidade, eixo ou componente"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select value={grade} onChange={(event) => setGrade(event.target.value)} aria-label="Filtrar por ano">
              <option value="">Todos os anos</option>
              {grades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Filtrar por componente">
              <option value="">Componentes</option>
              {subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={axis} onChange={(event) => setAxis(event.target.value)} aria-label="Filtrar por eixo">
              <option value="">Eixos</option>
              {axes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {(query || grade || subject || axis) && (
              <button
                className="btn btn-out"
                style={{ padding: '8px 14px', fontSize: 12 }}
                onClick={() => { setQuery(''); setGrade(''); setSubject(''); setAxis('') }}
              >
                ✕ Limpar
              </button>
            )}
            <span className="fcount">
              {filteredSkills.length === 0
                ? '0 resultados'
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredSkills.length)} de ${filteredSkills.length}`}
            </span>
          </div>

          {filteredSkills.length === 0 && (
            <div className="est">
              <div className="est-icon">∅</div>
              Nenhuma habilidade encontrada com os filtros aplicados.
              <div style={{ marginTop: 14 }}>
                <button
                  className="btn btn-out"
                  onClick={() => { setQuery(''); setGrade(''); setSubject(''); setAxis('') }}
                >
                  ✕ Limpar filtros
                </button>
              </div>
            </div>
          )}

          <div className="grid">
            {pagedSkills.map((skill) => {
              const isSelected = selected.includes(skill.id)
              return (
                <article className={`scard ${isSelected ? 'in-plan' : ''}`} key={skill.id}>
                  <div className="ctags">
                    <span className="tag ta">{skill.grade_level}</span>
                    <span className={`tag ${tagClass[skill.subject] || 'tm'}`}>{skill.subject}</span>
                    <span className="tag tcd">{skill.axis}</span>
                    {isSelected && <span className="tag tc">No plano</span>}
                  </div>
                  <div className="ceixo">{skill.code}</div>
                  <h2 className="cobj">{skill.name}</h2>
                  <p className="chab">{skill.description}</p>
                  <div className="cmeta">{skill.competency}</div>
                  <div className="cacts">
                    <button className="bsm bdet" onClick={() => setActiveSkill(skill)}>
                      Detalhes
                    </button>
                    <button className="bsm bsug" onClick={() => {
                      setForm((current) => ({ ...current, title: skill.name, subject: skill.subject, grade_level: skill.grade_level }))
                      if (!selected.includes(skill.id)) toggleSkill(skill.id)
                      setView('plan')
                    }}>
                      Usar
                    </button>
                    <button className={`bsm badd ${isSelected ? 'added' : ''}`} onClick={() => toggleSkill(skill.id)}>
                      {isSelected ? 'Remover' : '+ Plano'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          {totalPages > 1 && (
            <nav className="pg-nav" aria-label="Paginação">
              <button
                className="pg-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Página anterior"
              >
                ‹
              </button>

              {(() => {
                const items: (number | 'ellipsis')[] = []
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) items.push(i)
                } else {
                  items.push(1)
                  if (page > 3) items.push('ellipsis')
                  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                    items.push(i)
                  }
                  if (page < totalPages - 2) items.push('ellipsis')
                  items.push(totalPages)
                }
                return items.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e${idx}`} className="pg-ellipsis">…</span>
                  ) : (
                    <button
                      key={item}
                      className={`pg-btn${page === item ? ' active' : ''}`}
                      onClick={() => setPage(item)}
                      aria-current={page === item ? 'page' : undefined}
                    >
                      {item}
                    </button>
                  )
                )
              })()}

              <button
                className="pg-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Próxima página"
              >
                ›
              </button>
            </nav>
          )}

          {selected.length > 0 && (
            <div className="selbar" role="status">
              <span className="selbar-txt">
                <strong>{selected.length}</strong> habilidade{selected.length > 1 ? 's' : ''} selecionada{selected.length > 1 ? 's' : ''} para o plano
              </span>
              <button className="btn btn-pri" onClick={() => setView('plan')}>
                Montar plano →
              </button>
            </div>
          )}
        </section>
      )}

      {view === 'plan' && (
        <section className="pg play">
          <div>
            <div className="stbar">
              <div className="sti active">
                <span className="stn">1</span>
                <span className="stl">Dados do plano</span>
              </div>
              <div className={`sti ${selected.length ? 'done' : ''}`}>
                <span className="stn">2</span>
                <span className="stl">Habilidades BNCC</span>
              </div>
              <div className={`sti ${generated ? 'done' : ''}`}>
                <span className="stn">3</span>
                <span className="stl">Plano gerado</span>
              </div>
              {planKind === 'pei' && (
                <>
                  <div className={`sti ${revisaoRegente && aee.nome && aee.contribuicoes ? 'done' : ''}`}>
                    <span className="stn">4</span>
                    <span className="stl">Revisao colaborativa</span>
                  </div>
                  <div className={`sti ${family.responsavel_nome && family.concordancia !== 'pendente' ? 'done' : ''}`}>
                    <span className="stn">5</span>
                    <span className="stl">Familia</span>
                  </div>
                </>
              )}
              <div className={`sti ${generated ? 'done' : ''}`}>
                <span className="stn">{planKind === 'pei' ? '6' : '4'}</span>
                <span className="stl">Salvar/Publicar</span>
              </div>
            </div>

            <div className="pc">
              <h1 className="pct">Criar plano de aula</h1>
              <PeiControls
                user={user}
                school={form.school}
                planKind={planKind}
                selectedStudentId={selectedStudentId}
                onPlanKindChange={setPlanKind}
                onStudentChange={(studentId, student) => {
                  setSelectedStudentId(studentId)
                  setSelectedStudent(student || null)
                }}
              />
              <div className="fg">
                <Field label="Professor(a)" hint="Seu nome, como deve aparecer no cabeçalho do plano." example="Ex.: Carlos Henrique Lima">
                  <input value={form.teacher} onChange={(event) => updateForm('teacher', event.target.value)} placeholder="Nome do professor" />
                </Field>
                <Field label="Escola" hint="Escola onde a aula será dada. Selecione na lista.">
                  <select
                    value={form.school}
                    onChange={(event) => updateForm('school', event.target.value)}
                  >
                    <option value="">Selecione a escola</option>
                    {municipalSchools.map((school) => (
                      <option key={school} value={school}>{school}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ano/Turma" hint="Ano escolar da turma. A IA ajusta a linguagem e as atividades à faixa etária." example="Ex.: 8º Ano">
                  <input value={form.grade_level} onChange={(event) => updateForm('grade_level', event.target.value)} placeholder="8º Ano" />
                </Field>
                <Field label="Componente" hint="Componente/área da aula." example="Ex.: Computação · Tecnologia e Sociedade">
                  <input value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} placeholder="Computação" />
                </Field>
                <Field label="Data" hint="Data prevista para a aula.">
                  <input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} />
                </Field>
                <Field label="Duração" hint="Tempo total da aula ou número de aulas." example="Ex.: 50 min · 2 aulas de 50 min">
                  <input value={form.duration} onChange={(event) => updateForm('duration', event.target.value)} placeholder="50 min" />
                </Field>
                <Field label="Tema da aula" wide required hint="O assunto central da aula. Seja específico — quanto mais claro o tema, melhor o plano gerado." example={<>Ex.: <strong>Fake news e cidadania digital</strong></>}>
                  <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ex.: Fake news e cidadania digital" />
                </Field>
                <Field label="Objetivos do professor" wide hint="O que você quer que os alunos aprendam ou consigam fazer ao fim da aula. Comece com verbos de ação." example={<>Ex.: <strong>Reconhecer notícias falsas e checar fontes antes de compartilhar.</strong></>}>
                  <textarea value={form.objectives} onChange={(event) => updateForm('objectives', event.target.value)} placeholder="O que os alunos vão aprender nesta aula" />
                </Field>
                <Field label="Metodologia" wide hint="Como a aula será conduzida: estratégias, dinâmicas e organização da turma. Opcional — a IA sugere se ficar em branco." example={<>Ex.: <strong>Análise de casos reais, debate em grupos e produção de um cartaz.</strong></>}>
                  <textarea value={form.methodology} onChange={(event) => updateForm('methodology', event.target.value)} placeholder="Como a aula será conduzida (opcional)" />
                </Field>
                <Field label="Recursos disponíveis" wide hint="Materiais e equipamentos que você tem para usar na aula." example={<>Ex.: <strong>Computadores, projetor, celulares dos alunos, internet.</strong></>}>
                  <textarea value={form.materials} onChange={(event) => updateForm('materials', event.target.value)} placeholder="Materiais e equipamentos disponíveis" />
                </Field>
              </div>

              <div className="brow">
                <button className="btn btn-out" onClick={() => setView('skills')}>Adicionar habilidades</button>
                <button className="btn btn-pri" disabled={loading} onClick={generatePlan}>
                  {loading ? 'Gerando...' : 'Gerar plano'}
                </button>
              </div>
            </div>

            <div className="oa">
              <div className="oa-toolbar">
                <span className="oa-label">Plano editável</span>
                <button className="btn btn-gh" onClick={() => void downloadPlanPdf()}>Baixar PDF</button>
                {isLoggedIn ? (
                  <>
                    <button className="btn btn-suc" disabled={loading || !generated} onClick={() => void savePlan(false)}>Salvar rascunho</button>
                    <button className="btn btn-pri" disabled={loading || !generated} onClick={() => void savePlan(true)}>Publicar vigente</button>
                  </>
                ) : (
                  <Link className="btn btn-suc" href="/auth/login">Login para salvar</Link>
                )}
              </div>
              {loading && (
                <div className="gbanner flex flex-col gap-3 p-4 border-2 border-black bg-[var(--paper-soft)] relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] my-4" style={{ borderRadius: '0px' }}>
                  <div className="flex items-center gap-3 w-full">
                    <span className="spin border-2 border-black border-t-transparent w-4 h-4" style={{ borderRadius: '50%' }} />
                    <span className="font-mono font-bold text-xs text-black">{loadingPhrase}</span>
                    <span className="font-mono font-bold text-xs text-black ml-auto">{Math.round(progress)}%</span>
                  </div>
                  
                  {/* Barra de Progresso Riso */}
                  <div className="w-full h-3 bg-white border-2 border-black relative overflow-hidden" style={{ borderRadius: '0px' }}>
                    <div 
                      className="h-full bg-[#A6B0DD] border-r-2 border-black transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
              <textarea
                id="po"
                value={generated}
                onChange={(event) => setGenerated(event.target.value)}
                placeholder="O plano gerado aparecerá aqui. Você pode editar o texto antes de salvar."
              />
              {planKind === 'pei' && (
                <div className="pei-flow">
                  <section className="pei-block pei-tutorial">
                    <div className="pei-tutorial-title">Como funciona o PEI</div>
                    <ol className="pei-tutorial-steps">
                      <li><strong>Passo 1–3</strong> — Preencha os dados do plano, selecione habilidades BNCC e gere o documento com IA.</li>
                      <li><strong>Passo 4 (AEE)</strong> — O professor da sala de recursos revisa e registra contribuicoes, recursos e adaptacoes.</li>
                      <li><strong>Passo 5 (Familia)</strong> — Registre a consulta com a familia e o grau de concordancia.</li>
                      <li><strong>Passo 6 (Salvar)</strong> — Salve como rascunho ou publique como vigente. Publicar exige revisao, AEE e consulta familiar registrados.</li>
                    </ol>
                    <p className="pei-note" style={{ marginTop: 8 }}>
                      O PEI e um documento pedagogico colaborativo. Nao substitui laudo clinico nem diagnostico medico.
                      Deve ser revisado bimestralmente e ficar acessivel a equipe pedagogica e a familia.
                    </p>
                  </section>
                  <section className="pei-block">
                    <div className="bnac-form-section">Passo 4 - Revisao colaborativa (AEE)</div>
                    <label className="pei-check">
                      <input type="checkbox" checked={revisaoRegente} onChange={(event) => setRevisaoRegente(event.target.checked)} />
                      Professor regente revisou as secoes do PEI
                    </label>
                    <div className="fg">
                      <Field label="Professor sala especial/AEE">
                        <input value={aee.nome} onChange={(event) => updateAee('nome', event.target.value)} placeholder="Nome do profissional" />
                      </Field>
                      <Field label="ID/matricula do AEE">
                        <input value={aee.professor_id} onChange={(event) => updateAee('professor_id', event.target.value)} placeholder="Opcional" />
                      </Field>
                      <Field label="Data da colaboracao">
                        <input type="date" value={aee.data} onChange={(event) => updateAee('data', event.target.value)} />
                      </Field>
                      <Field label="Funcao">
                        <input value={aee.funcao} onChange={(event) => updateAee('funcao', event.target.value)} />
                      </Field>
                      <Field label="Contribuicoes do AEE" wide>
                        <textarea value={aee.contribuicoes} onChange={(event) => updateAee('contribuicoes', event.target.value)} placeholder="Barreiras identificadas, estrategias de comunicacao, apoio na avaliacao e sugestoes de adaptacao." />
                      </Field>
                      <Field label="Recursos indicados" wide>
                        <textarea value={joinList(aee.recursos_indicados)} onChange={(event) => updateAee('recursos_indicados', splitList(event.target.value))} placeholder="Um recurso por linha" />
                      </Field>
                      <Field label="Adaptacoes sugeridas" wide>
                        <textarea value={joinList(aee.adaptacoes_sugeridas)} onChange={(event) => updateAee('adaptacoes_sugeridas', splitList(event.target.value))} placeholder="Uma adaptacao por linha" />
                      </Field>
                      <Field label="Parecer do AEE" wide>
                        <textarea value={aee.parecer} onChange={(event) => updateAee('parecer', event.target.value)} />
                      </Field>
                    </div>
                  </section>
                  <section className="pei-block">
                    <div className="bnac-form-section">Passo 5 - Consulta e aprovacao da familia</div>
                    <p className="pei-note" style={{ marginBottom: 12 }}>
                      A participacao da familia e prevista na Lei Brasileira de Inclusao. Registre a consulta mesmo que seja informal (telefone, WhatsApp).
                    </p>
                    <div className="fg">
                      <Field label="Responsavel consultado">
                        <input value={family.responsavel_nome} onChange={(event) => updateFamily('responsavel_nome', event.target.value)} />
                      </Field>
                      <Field label="Parentesco">
                        <input value={family.parentesco} onChange={(event) => updateFamily('parentesco', event.target.value)} />
                      </Field>
                      <Field label="Data da consulta">
                        <input type="date" value={family.data_consulta} onChange={(event) => updateFamily('data_consulta', event.target.value)} />
                      </Field>
                      <Field label="Formato">
                        <select value={family.formato} onChange={(event) => updateFamily('formato', event.target.value as FamilyConsultation['formato'])}>
                          <option value="presencial">Presencial</option>
                          <option value="telefone">Telefone</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="reuniao_online">Reuniao online</option>
                          <option value="outro">Outro</option>
                        </select>
                      </Field>
                      <Field label="Status da familia" wide>
                        <select value={family.concordancia} onChange={(event) => updateFamily('concordancia', event.target.value as FamilyConsultation['concordancia'])}>
                          <option value="pendente">Pendente</option>
                          <option value="aprovado">Aprovado pela familia</option>
                          <option value="ciencia_sem_aprovacao">Ciencia sem aprovacao formal</option>
                        </select>
                      </Field>
                      <Field label="Informacoes relevantes" wide>
                        <textarea value={family.informacoes_relevantes} onChange={(event) => updateFamily('informacoes_relevantes', event.target.value)} placeholder="Rotina, autonomia, comunicacao, interesses, dificuldades em casa, medicacao quando informada espontaneamente e acompanhamentos externos." />
                      </Field>
                      <Field label="Expectativas da familia" wide>
                        <textarea value={family.expectativas} onChange={(event) => updateFamily('expectativas', event.target.value)} />
                      </Field>
                      <Field label="Observacoes e encaminhamentos" wide>
                        <textarea value={family.observacoes} onChange={(event) => updateFamily('observacoes', event.target.value)} placeholder="Justificativa e encaminhamento para nova reuniao quando houver ciencia sem aprovacao." />
                      </Field>
                    </div>
                  </section>
                  <section className="pei-block">
                    <div className="bnac-form-section">Passo 6 - Salvar/Publicar</div>
                    <p className="pei-note">
                      Publicar como vigente exige revisao do professor regente, colaboracao do AEE registrada,
                      consulta familiar e aprovacao ou ciencia formal da familia. O PEI publicado fica visivel
                      para a coordenacao e para a conta de familia vinculada ao aluno.
                    </p>
                  </section>
                </div>
              )}
            </div>
          </div>

          <aside className="sb">
            <div className="sbt">
              Habilidades selecionadas <span className="sbc">{selected.length}</span>
            </div>
            {selectedSkills.length ? (
              selectedSkills.map((skill) => (
                <div className="ssi" key={skill.id}>
                  <button className="ssrm" onClick={() => toggleSkill(skill.id)} aria-label={`Remover ${skill.code}`}>
                    ×
                  </button>
                  <div className="ssic">{skill.code}</div>
                  <div className="ssio">{skill.name}</div>
                  <div className="ssims">{skill.subject} · {skill.axis}</div>
                </div>
              ))
            ) : (
              <div className="esel">Nenhuma habilidade selecionada. Use a aba Pesquisar para adicionar.</div>
            )}
          </aside>
        </section>
      )}

      {view === 'saved' && isLoggedIn && (
        <section className="pg">
          <div className="saved-head">
            <div>
              <h1>Meus Planos</h1>
              <p>Planos salvos na sua conta.</p>
            </div>
            <button className="btn btn-pri" onClick={startNewPlan}>+ Criar Novo Plano</button>
          </div>
          <div className="plans-grid">
            {plans.length ? (
              plans.map((plan) => (
                <article className="plan-item" key={plan.id}>
                  <div className="pi-header">
                    <div>
                      <h2 className="pi-title">{plan.title}</h2>
                      <div className="pi-date">Salvo em {new Date(plan.created_at).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                  <div className="pi-meta">
                    <span className="tag ta">{plan.grade_level}</span>
                    <span className={`tag ${tagClass[plan.subject] || 'tm'}`}>{plan.subject}</span>
                    <span className="tag ta">{plan.duration}</span>
                    <span className="tag ta">{plan.skill_ids.length} habilidades</span>
                    <span className="tag tcd">{plan.is_published ? 'Vigente' : 'Rascunho'}</span>
                  </div>
                  <p className="plan-preview">{plan.content.slice(0, 180)}...</p>
                  <div className="review-status">
                    {plan.coordinator_viewed_at ? (
                      <>
                        <strong>Visualizado pela coordenação</strong>
                        <span>
                          {plan.coordinator_name || 'Coordenador(a)'} em{' '}
                          {new Date(plan.coordinator_viewed_at).toLocaleString('pt-BR')}
                        </span>
                        {plan.coordinator_note && <p>{plan.coordinator_note}</p>}
                      </>
                    ) : (
                      <span>Aguardando visualização da coordenação</span>
                    )}
                  </div>
                  <div className="pi-actions">
                    <button className="btn btn-suc" onClick={() => void downloadPlanPdf(plan)}>PDF</button>
                    <button className="btn btn-pri" onClick={() => loadSavedPlan(plan)}>Editar</button>
                    <button className="btn btn-gh" onClick={() => deleteSavedPlan(plan.id)}>Excluir</button>
                  </div>
                </article>
              ))
            ) : (
              <div className="est">Nenhum plano salvo ainda. Crie e salve seu primeiro plano.</div>
            )}
          </div>
        </section>
      )}

      {activeSkill && (
        <div className="mbk" onClick={() => setActiveSkill(null)}>
          <div className="mdl" onClick={(event) => event.stopPropagation()}>
            <div className="mdl-hdr">
              <div>
                <div className="ceixo">{activeSkill.code}</div>
                <h2 className="mdl-title">{activeSkill.name}</h2>
              </div>
              <button className="mdl-close" onClick={() => setActiveSkill(null)}>×</button>
            </div>
            <div className="ms">
              <div className="mst">Descrição</div>
              <p className="mstx">{activeSkill.description}</p>
            </div>
            <div className="codes">
              <span className="chip">{activeSkill.grade_level}</span>
              <span className="chip">{activeSkill.subject}</span>
              <span className="chip chip-g">{activeSkill.axis}</span>
              <span className="chip">{activeSkill.competency}</span>
            </div>
            <div className="brow">
              <button className="btn btn-pri" onClick={() => {
                toggleSkill(activeSkill.id)
                setActiveSkill(null)
              }}>
                {selected.includes(activeSkill.id) ? 'Remover do plano' : 'Adicionar ao plano'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PortalTutorial
        open={tutorialOpen}
        onClose={closeTutorial}
        steps={TUTORIAL_STEPS}
        masthead="PORTAL BNCC · TUTORIAL"
      />

      {!user && (
        <div className="mob-cta">
          <Link className="btn btn-out mob-cta-btn" href="/auth/login">Entrar</Link>
          <Link className="btn btn-pri mob-cta-btn mob-cta-main" href="/auth/signup">Cadastrar professor</Link>
        </div>
      )}

      <div id="toast" className={message ? 'show' : ''}>{message}</div>
    </main>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="sc">
      <div className="sc-ic">•</div>
      <div>
        <div className="sc-n">{value}</div>
        <div className="sc-l">{label}</div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  wide,
  required,
  hint,
  example,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
  required?: boolean
  hint?: string
  example?: React.ReactNode
}) {
  return (
    <label className={`fgr ${wide ? 's2' : ''}`}>
      <span className="fl fl-row">
        {label}{required && <span className="req">*</span>}
        {hint && (
          <span className="fhint" tabIndex={0} role="note" aria-label={hint}>
            ?<span className="fbubble">{hint}</span>
          </span>
        )}
      </span>
      {children}
      {example && <span className="fex">{example}</span>}
    </label>
  )
}
