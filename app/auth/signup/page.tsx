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
        const role = data.user?.user_metadata?.role
        router.push(role === 'coordinator' ? '/coordinator' : role === 'aee_teacher' ? '/aee' : role === 'family' ? '/family' : '/')
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <Link href="/" className="logo mb-4 inline-flex">
            <div className="logo-ic">BN</div>
            <div className="text-left">
              <div className="logo-t">Portal BNCC Computação</div>
              <div className="logo-s">Secretaria Municipal de Educação · Atalaia/AL</div>
            </div>
          </Link>
          <h1 className="font-display font-black text-2xl text-gray-900 mt-2">
            Cadastro de Professor
          </h1>
          <p className="text-sm text-gray-600 mt-1">Crie sua conta para começar a criar experiências e planos</p>
        </div>

        {/* Card */}
        <div className="pc w-full">
          {/* Success Message */}
          {success && (
            <div className="al-ok mb-4">
              {success}
            </div>
          )}

          {/* Error Messages */}
          {(error || authError) && (
            <div className="al-error mb-4">
              {error || authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <option value="family">Família/responsável</option>
              </select>
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-pri mt-6"
            >
              {loading ? 'Carregando...' : 'Criar Conta'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Já tem conta?{' '}
            <Link
              href="/auth/login"
              className="text-indigo-600 hover:underline font-semibold"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
