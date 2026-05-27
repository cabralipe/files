'use client'

import { useRef, useState } from 'react'
import { useStorage } from '@/hooks/useStorage'

interface AvatarUploadProps {
  userId: string
  currentUrl?: string
  onSuccess?: (url: string) => void
}

export default function AvatarUpload({
  userId,
  currentUrl,
  onSuccess,
}: AvatarUploadProps) {
  const { uploadAvatar } = useStorage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<string>(currentUrl || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')

    try {
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens são permitidas')
      }

      // Validar tamanho (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Arquivo muito grande (máximo 5MB)')
      }

      // Preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload
      setLoading(true)
      const result = await uploadAvatar(userId, file)

      setSuccess('Avatar atualizado com sucesso!')
      setPreview(result.url)

      if (onSuccess) {
        onSuccess(result.url)
      }

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload')
      setPreview(currentUrl || '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {success && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
          ✗ {error}
        </div>
      )}

      {/* Avatar Preview */}
      <div className="flex flex-col items-center">
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-indigo-200">
            <span className="text-4xl">👤</span>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={loading}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando...' : 'Alterar Avatar'}
        </button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center">
        Máximo 5MB • PNG, JPG ou WebP
      </p>
    </div>
  )
}
