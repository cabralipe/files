'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

interface CommentsSectionProps {
  experienceId: string
  userId: string
  onCommentAdded?: () => void
}


export default function CommentsSection({
  experienceId,
  userId,
  onCommentAdded,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchComments()
  }, [experienceId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/comments?experienceId=${experienceId}`
      )
      const data = await response.json()

      if (data.success) {
        setComments(data.comments)
      }
    } catch (err: any) {
      console.error('Erro ao carregar comentários:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newComment.trim()) {
      setError('Comentário não pode ser vazio')
      return
    }

    try {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          experienceId,
          content: newComment,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Comentário adicionado com sucesso!')
        setNewComment('')
        fetchComments()
        onCommentAdded?.()

        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erro ao adicionar comentário')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar comentário')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Deseja deletar este comentário?')) return

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch('/api/comments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          commentId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Comentário deletado')
        fetchComments()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erro ao deletar comentário')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar comentário')
    }
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="al-error">
          {error}
        </div>
      )}
      {success && (
        <div className="al-ok">
          {success}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="pc space-y-4 flex flex-col">
        <label className="fgr">
          <span className="fl">Adicionar Comentário</span>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Compartilhe seu pensamento ou feedback sobre esta aula..."
            maxLength={500}
            rows={3}
            className="resize-none"
          />
        </label>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs font-mono font-bold text-gray-600">
            {newComment.length}/500 caracteres
          </span>
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="btn btn-pri"
          >
            {loading ? 'Postando...' : 'Postar Comentário'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        <h3 className="pct font-display font-black text-lg text-gray-900 mb-4">
          Comentários ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <div className="pc text-center py-8">
            <p className="text-gray-500 font-semibold">Nenhum comentário feito ainda. Seja o primeiro!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="pc">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {comment.user.avatar_url ? (
                      <img
                        src={comment.user.avatar_url}
                        alt={comment.user.name}
                        className="w-10 h-10 border-2 border-black object-cover select-none"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <div className="w-10 h-10 border-2 border-black bg-[#A6B0DD] flex items-center justify-center text-xl select-none" style={{ borderRadius: '0px' }}>
                        👤
                      </div>
                    )}
                    <div>
                      <p className="font-display font-black text-sm text-gray-900">
                        {comment.user.name}
                      </p>
                      <p className="text-xs font-mono font-semibold text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {comment.user.id === userId && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs font-bold text-red-600 hover:text-red-800 underline"
                    >
                      Deletar
                    </button>
                  )}
                </div>

                <p className="font-body text-sm text-gray-800 bg-var(--paper) border-l-[3px] border-black pl-3 py-1">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
