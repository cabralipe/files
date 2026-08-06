'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { teacherSubjectOptions } from '@/lib/education-options'

type MunicipalityOption = {
  id: string
  slug: string
  name: string
  state: string
  schools?: string[]
  school_options?: { id: string; name: string }[]
}

const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapa' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceara' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espirito Santo' },
  { uf: 'GO', name: 'Goias' },
  { uf: 'MA', name: 'Maranhao' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Para' },
  { uf: 'PB', name: 'Paraiba' },
  { uf: 'PR', name: 'Parana' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piaui' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondonia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'Sao Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
]

export default function SignUp() {
  const router = useRouter()
  const { signUp, loading, error: authError } = useAuth()

  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([])
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(true)
  const [municipalityError, setMunicipalityError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    state: '',
    municipality_id: '',
    school_ids: [] as string[],
    role: 'teacher' as 'teacher' | 'aee_teacher' | 'coordinator',
    subject: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    async function loadMunicipalities() {
      try {
        setLoadingMunicipalities(true)
        setMunicipalityError('')
        const response = await fetch('/api/municipalities')
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Erro ao carregar municipios')
        if (active) setMunicipalities(payload.data || [])
      } catch (err) {
        if (active) setMunicipalityError(err instanceof Error ? err.message : 'Erro ao carregar municipios')
      } finally {
        if (active) setLoadingMunicipalities(false)
      }
    }
    void loadMunicipalities()
    return () => {
      active = false
    }
  }, [])

  const stateMunicipalities = useMemo(
    () => municipalities.filter((municipality) => municipality.state === formData.state),
    [municipalities, formData.state],
  )

  const selectedMunicipality = useMemo(
    () => municipalities.find((municipality) => municipality.id === formData.municipality_id) || null,
    [municipalities, formData.municipality_id],
  )

  const schoolOptions = selectedMunicipality?.school_options || []

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'state' ? { municipality_id: '', school_ids: [] } : {}),
      ...(name === 'municipality_id' ? { school_ids: [] } : {}),
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.state || !formData.municipality_id) {
      setError('Informe o estado e o municipio da sua rede de ensino')
      return
    }

    if (!selectedMunicipality) {
      setError('Municipio invalido ou indisponivel')
      return
    }

    if (!formData.name || !formData.email || !formData.password || !formData.school_ids.length) {
      setError('Todos os campos sao obrigatorios')
      return
    }

    if (!formData.subject) {
      setError('Informe a disciplina que voce leciona')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas nao correspondem')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      const data = await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.school_ids,
        formData.subject,
        formData.municipality_id,
        formData.role,
      )
      setSuccess('Cadastro realizado com sucesso.')
      setTimeout(() => {
        const slug = data.municipality?.slug || selectedMunicipality.slug
        router.push(slug ? `/${slug}` : '/bncc-nacional')
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar')
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <div className="auth-head">
          <Link href="/bncc-nacional" className="logo">
            <div className="logo-ic">BN</div>
            <div style={{ textAlign: 'left' }}>
              <div className="logo-t">Portal BNCC</div>
              <div className="logo-s">Plataforma BNCC - Referencial Curricular Municipal</div>
            </div>
          </Link>
          <span className="auth-eyebrow">Primeira vez por aqui?</span>
          <h1 className="auth-title">Cadastro de <em>professor</em></h1>
          <p className="auth-sub">Escolha seu estado e municipio para acessar o referencial curricular correto.</p>
        </div>

        <div className="auth-card">
          {success && (
            <div className="al-ok" style={{ marginBottom: 14 }}>
              {success}
            </div>
          )}

          {(error || authError || municipalityError) && (
            <div className="al-error" style={{ marginBottom: 14 }}>
              {error || authError || municipalityError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="fgr">
              <span className="fl">Estado</span>
              <select name="state" value={formData.state} onChange={handleChange} disabled={loadingMunicipalities}>
                <option value="">{loadingMunicipalities ? 'Carregando municipios...' : 'Selecione o estado'}</option>
                {BRAZIL_STATES.map((state) => (
                  <option key={state.uf} value={state.uf}>
                    {state.uf} - {state.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="fgr">
              <span className="fl">Municipio</span>
              <select
                name="municipality_id"
                value={formData.municipality_id}
                onChange={handleChange}
                disabled={!formData.state || loadingMunicipalities}
              >
                <option value="">
                  {!formData.state
                    ? 'Selecione o estado primeiro'
                    : stateMunicipalities.length
                    ? 'Selecione o municipio'
                    : 'Nenhum municipio ativo neste estado'}
                </option>
                {stateMunicipalities.map((municipality) => (
                  <option key={municipality.id} value={municipality.id}>
                    {municipality.name}/{municipality.state}
                  </option>
                ))}
              </select>
              {formData.state && !loadingMunicipalities && stateMunicipalities.length === 0 && (
                <span className="fex">
                  Este estado ainda nao possui referencial municipal cadastrado na plataforma. A area publica nacional continua disponivel.
                </span>
              )}
            </label>

            <label className="fgr">
              <span className="fl">Nome Completo</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Joao Silva"
              />
            </label>

            <div className="al-info" style={{ marginBottom: 14 }}>
              O cadastro público cria uma conta de professor. Acesso AEE e coordenação são concedidos pela administração da rede.
            </div>

            <label className="fgr">
              <span className="fl">Perfil de acesso</span>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="teacher">Professor(a) regente</option>
                <option value="aee_teacher">Professor(a) do AEE</option>
                <option value="coordinator">Coordenador(a) pedagógico(a)</option>
              </select>
            </label>

            <label className="fgr">
              <span className="fl">Escola</span>
              {schoolOptions.length ? (
                <select multiple name="school_ids" value={formData.school_ids} onChange={(e) => setFormData((prev) => ({ ...prev, school_ids: Array.from(e.target.selectedOptions, (option) => option.value) }))} disabled={!selectedMunicipality}>
                  {schoolOptions.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="fex">
                  {selectedMunicipality
                    ? 'Nenhuma escola cadastrada nesta rede. Procure a Secretaria de Educação para liberar o cadastro.'
                    : 'Selecione o município primeiro.'}
                </span>
              )}
              {schoolOptions.length > 1 && <span className="fex">Segure Ctrl (Windows) ou Command (Mac) para selecionar mais de uma escola.</span>}
            </label>

            <label className="fgr">
              <span className="fl">Disciplina que leciona</span>
              <select name="subject" value={formData.subject} onChange={handleChange}>
                <option value="">Selecione a disciplina</option>
                {teacherSubjectOptions.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </label>

            <label className="fgr">
              <span className="fl">Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
              />
            </label>

            <label className="fgr">
              <span className="fl">Senha</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
              />
            </label>

            <label className="fgr">
              <span className="fl">Confirmar Senha</span>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="********"
              />
            </label>

            <button
              type="submit"
              disabled={loading || loadingMunicipalities || !municipalities.length || !schoolOptions.length}
              className="btn btn-pri btn-lg"
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? 'Criando conta...' : 'Criar conta ->'}
            </button>
          </form>

          <p className="auth-alt">
            Ja tem conta?{' '}
            <Link href="/auth/login" className="auth-link">
              Faca login
            </Link>
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/bncc-nacional" className="auth-back">Voltar ao BNCC Nacional</Link>
        </div>
      </div>
    </div>
  )
}
