'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { municipalSchools, teacherSubjectOptions } from '@/lib/education-options'

export default function SignUp() {
  const router = useRouter()
  const { signUp, loading, error: authError } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'teacher',
    school: '',
    subject: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'role' && value !== 'teacher' ? { subject: '' } : {}),
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validação
    if (!formData.name || !formData.email || !formData.password || !formData.school) {
      setError('Todos os campos são obrigatórios')
      return
    }

    if (formData.role === 'teacher' && !formData.subject) {
      setError('Informe a disciplina que você leciona')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não correspondem')
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
        formData.role as 'teacher' | 'aee_teacher' | 'coordinator' | 'family',
        formData.school,
        formData.subject,
      )
      setSuccess('Cadastro realizado com sucesso.')
      setTimeout(() => {
        const meta = data.user?.user_metadata
        const role = meta?.role
        const slug = meta?.municipality_slug
        const dest = role === 'coordinator' ? 'coordinator' : role === 'aee_teacher' ? 'aee' : role === 'family' ? 'family' : ''
        // Rotas por papel vivem sob /[municipio]; sem o slug elas dao 404.
        router.push(slug ? `/${slug}${dest ? `/${dest}` : ''}` : '/')
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar')
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <div className="auth-head">
          <Link href="/" className="logo">
            <div className="logo-ic">BN</div>
            <div style={{ textAlign: 'left' }}>
              <div className="logo-t">Portal BNCC Computação</div>
              <div className="logo-s">Plataforma BNCC · Referencial Curricular Municipal</div>
            </div>
          </Link>
          <span className="auth-eyebrow">Primeira vez por aqui?</span>
          <h1 className="auth-title">Cadastro de <em>professor</em></h1>
          <p className="auth-sub">Crie sua conta para gerar planos, PEIs e PAEEs, e compartilhar experiências.</p>
        </div>

        <div className="auth-card">
          {success && (
            <div className="al-ok" style={{ marginBottom: 14 }}>
              {success}
            </div>
          )}

          {(error || authError) && (
            <div className="al-error" style={{ marginBottom: 14 }}>
              {error || authError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <label className="fgr">
              <span className="fl">Nome Completo</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="João Silva"
              />
            </label>

            <label className="fgr">
              <span className="fl">Tipo de acesso</span>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="teacher">Professor(a)</option>
                <option value="aee_teacher">Professor(a) AEE / sala especial</option>
                <option value="coordinator">Coordenador(a)</option>
              </select>
              <span className="fex">
                O acesso de família/responsável é criado pela coordenação da escola — não é necessário se cadastrar aqui.
              </span>
            </label>

            <label className="fgr">
              <span className="fl">Escola</span>
              <select
                name="school"
                value={formData.school}
                onChange={handleChange}
              >
                <option value="">Selecione a escola</option>
                {municipalSchools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </label>

            {formData.role === 'teacher' && (
              <label className="fgr">
                <span className="fl">Disciplina que leciona</span>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                >
                  <option value="">Selecione a disciplina</option>
                  {teacherSubjectOptions.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Email */}
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

            {/* Password */}
            <label className="fgr">
              <span className="fl">Senha</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </label>

            {/* Confirm Password */}
            <label className="fgr">
              <span className="fl">Confirmar Senha</span>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-pri btn-lg"
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? 'Criando conta...' : 'Criar conta →'}
            </button>
          </form>

          <p className="auth-alt">
            Já tem conta?{' '}
            <Link href="/auth/login" className="auth-link">
              Faça login
            </Link>
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/" className="auth-back">← Voltar aos portais</Link>
        </div>
      </div>
    </div>
  )
}
