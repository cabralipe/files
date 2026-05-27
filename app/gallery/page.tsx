'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useStorage } from '@/hooks/useStorage'

interface UploadedFile {
  name: string
  id: string
  updated_at: string
  metadata?: {
    size: number
  }
}

export default function Gallery() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth()
  const { uploadExperienceImage, listFiles, deleteFile } = useStorage()

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchFiles()
    }
  }, [user, authLoading, isAuthenticated, router])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const data = await listFiles('experience-images')
      setFiles(data || [])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar galeria')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são permitidas')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande (máximo 10MB)')
      return
    }

    try {
      setUploading(true)
      setError('')
      setSuccess('')

      await uploadExperienceImage(file)
      setSuccess('Imagem enviada com sucesso!')

      // Recarregar arquivos
      await fetchFiles()
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Carregando galeria...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">📸 Galeria</h1>
          <button
            onClick={async () => {
              await signOut()
              router.push('/')
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded">
            ✗ {error}
          </div>
        )}

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`mb-8 rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-white'
          }`}
        >
          <div className="text-4xl mb-4">📤</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Envie suas imagens
          </h2>
          <p className="text-gray-600 mb-6">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <label className="inline-block">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0])
                }
              }}
              disabled={uploading}
              className="hidden"
            />
            <button
              onClick={(e) => {
                const input = (e.target as HTMLElement).parentElement?.querySelector(
                  'input'
                ) as HTMLInputElement
                input?.click()
              }}
              disabled={uploading}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
            </button>
          </label>
          <p className="text-xs text-gray-500 mt-4">
            Máximo 10MB • PNG, JPG ou WebP
          </p>
        </div>

        {/* Files Grid */}
        {files.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">Nenhuma imagem na galeria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => (
              <div key={file.name} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="aspect-square bg-gray-200 flex items-center justify-center">
                  <span className="text-4xl">📋</span>
                </div>
                <div className="p-4">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(file.updated_at).toLocaleDateString()}
                  </p>
                  <button className="mt-3 w-full bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm">
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
