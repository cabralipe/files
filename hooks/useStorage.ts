import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export interface UploadProgress {
  progress: number
  fileName: string
}

export function useStorage() {
  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  // Upload de arquivo
  const uploadFile = async (
    bucket: string,
    file: File,
    path?: string,
    _onProgress?: (progress: UploadProgress) => void
  ) => {
    try {
      // Validar arquivo
      if (!file) {
        throw new Error('Nenhum arquivo selecionado')
      }

      // Gerar nome único
      const timestamp = Date.now()
      const fileName = `${timestamp}-${file.name}`
      const filePath = path ? `${path}/${fileName}` : fileName

      // Upload
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return {
        path: filePath,
        url: urlData.publicUrl,
        fileName,
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      throw error
    }
  }

  // Upload de Avatar
  const uploadAvatar = async (userId: string, file: File) => {
    try {
      const result = await uploadFile('avatars', file, userId)

      // Atualizar usuário com URL do avatar
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: result.url })
        .eq('id', userId)

      if (updateError) throw updateError

      return result
    } catch (error: any) {
      console.error('Erro ao fazer upload de avatar:', error)
      throw error
    }
  }

  // Upload de Imagem de Experiência
  const uploadExperienceImage = async (file: File) => {
    try {
      return await uploadFile('experience-images', file)
    } catch (error: any) {
      console.error('Erro ao fazer upload de imagem:', error)
      throw error
    }
  }

  const uploadExperienceImageBlob = async (file: File) => {
    try {
      if (!file) {
        throw new Error('Nenhum arquivo selecionado')
      }

      const formData = new FormData()
      formData.append('file', file)

      const token = await getAccessToken()
      const response = await fetch('/api/uploads/experience-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao enviar imagem')
      }

      return {
        path: payload.data.pathname,
        url: payload.data.url,
        fileName: file.name,
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload de imagem:', error)
      throw error
    }
  }

  // Upload de Anexo de Plano
  const uploadPlanAttachment = async (file: File) => {
    try {
      return await uploadFile('plan-attachments', file)
    } catch (error: any) {
      console.error('Erro ao fazer upload de anexo:', error)
      throw error
    }
  }

  // Deletar arquivo
  const deleteFile = async (bucket: string, path: string) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error

      return { success: true }
    } catch (error: any) {
      console.error('Erro ao deletar arquivo:', error)
      throw error
    }
  }

  // Listar arquivos
  const listFiles = async (bucket: string, path: string = '') => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path)

      if (error) throw error

      return data || []
    } catch (error: any) {
      console.error('Erro ao listar arquivos:', error)
      throw error
    }
  }

  return {
    uploadFile,
    uploadAvatar,
    uploadExperienceImage,
    uploadExperienceImageBlob,
    uploadPlanAttachment,
    deleteFile,
    listFiles,
  }
}
