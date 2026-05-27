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
      router.push(data.user?.user_metadata?.role === 'coordinator' ? '/coordinator' : '/')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            BNCC Platform
          </h1>
          <p className="text-gray-600">Faça login na sua conta</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Error Messages */}
          {(error || authError) && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded">
              {error || authError}
            </div>
          )}

          {!showForgotPassword ? (
            <>
              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  />
                </div>

                {/* Forgot Password Link */}
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Esqueceu a senha?
                </button>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {loading ? 'Carregando...' : 'Fazer Login'}
                </button>
              </form>

              {/* Footer */}
              <p className="text-center text-sm text-gray-600 mt-6">
                Não tem conta?{' '}
                <Link
                  href="/auth/signup"
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Cadastre-se
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
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                />
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Enviar Link
                </button>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full bg-gray-200 text-gray-800 font-medium py-2 rounded-lg hover:bg-gray-300 transition"
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
