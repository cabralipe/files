'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/lib/m-link'
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
  const { user, isAuthenticated, loading: authLoading } = useAuth()
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

  const handleDelete = async (fileName: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta imagem?')) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await deleteFile('experience-images', fileName)
      setSuccess('Imagem excluída com sucesso!')
      await fetchFiles()
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir imagem')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="auth-state">
        <div className="spin" />
        <p>Carregando galeria...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <main>

      {/* Main Content */}
      <section className="pg">
        <div className="saved-head">
          <div>
            <h1>📸 Galeria de Experiências</h1>
            <p>Envie e gerencie fotos das aulas práticas de computação realizadas na rede municipal.</p>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="al-ok mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="al-error mb-6">
            {error}
          </div>
        )}

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`pc text-center transition-all duration-120 ${
            dragActive
              ? 'bg-[#E9DDF0] border-dashed border-[3px]'
              : 'bg-var(--paper-soft) border-dashed border-[3px]'
          }`}
          style={{ cursor: 'pointer' }}
        >
          <div className="text-4xl mb-4 select-none">📤</div>
          <h2 className="pct justify-center">
            Envie suas imagens de experiência
          </h2>
          <p className="text-sm text-gray-600 mb-6 font-semibold">
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
              className="btn btn-pri"
            >
              {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
            </button>
          </label>
          <p className="text-xs font-mono mt-4 text-gray-500 font-semibold">
            Limite: 10MB • Imagens PNG, JPG ou WebP
          </p>
        </div>

        {/* Files Grid */}
        {files.length === 0 ? (
          <div className="pc text-center py-12">
            <p className="text-gray-500 text-lg font-semibold">Nenhuma imagem na galeria ainda.</p>
          </div>
        ) : (
          <div className="plans-grid">
            {files.map((file) => (
              <div key={file.name} className="pc flex flex-col justify-between overflow-hidden">
                <div className="aspect-square bg-[#E8DCB8] border-2 border-black flex items-center justify-center relative select-none">
                  <span className="text-5xl">📸</span>
                </div>
                <div className="pt-4 flex flex-col flex-grow justify-between">
                  <div>
                    <p className="font-display font-black text-base text-gray-900 truncate mb-1" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs font-mono font-semibold text-gray-500 mb-4">
                      {new Date(file.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="w-full btn btn-out"
                  >
                    Deletar imagem
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
