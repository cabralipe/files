'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const router = useRouter()
  const { signIn, loading, error: authError } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('Email e senha são obrigatórios')
      return
    }

    try {
      const data = await signIn(formData.email, formData.password)
      const role = data.user?.user_metadata?.role
      router.push(role === 'coordinator' ? '/coordinator' : role === 'aee_teacher' ? '/aee' : role === 'family' ? '/family' : '/')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
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
            Acesso à Plataforma
          </h1>
          <p className="text-sm text-gray-600 mt-1">Faça login para salvar e gerenciar seus planos de aula</p>
        </div>

        {/* Card */}
        <div className="pc w-full">
          {/* Error Messages */}
          {(error || authError) && (
            <div className="al-error mb-4">
              {error || authError}
            </div>
          )}

          {!showForgotPassword ? (
            <>
              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
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

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-semibold text-gray-600 hover:text-indigo-700 underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn btn-pri mt-6"
                >
                  {loading ? 'Carregando...' : 'Fazer Login'}
                </button>
              </form>

              {/* Footer */}
              <p className="text-center text-sm text-gray-600 mt-6">
                Não tem conta?{' '}
                <Link
                  href="/auth/signup"
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Cadastre-se como professor
                </Link>
              </p>
            </>
          ) : (
            <>
              {/* Forgot Password Form */}
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Digite seu email para receber um link de redefinição de senha.
                </p>
                <label className="fgr">
                  <span className="fl">Email</span>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                  />
                </label>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full btn btn-pri mt-4"
                >
                  Enviar Link
                </button>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full btn btn-out mt-2"
                >
                  Voltar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
