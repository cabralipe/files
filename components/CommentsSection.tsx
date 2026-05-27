'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

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
        <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
          ✗ {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-800 rounded text-sm">
          ✓ {success}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="space-y-3 bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700">
          Adicionar Comentário
        </label>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Compartilhe seu pensamento..."
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {newComment.length}/500
          </span>
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Postando...' : 'Postar Comentário'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-gray-900">
          Comentários ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg">
            <p className="text-gray-500">Nenhum comentário ainda</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  {comment.user.avatar_url ? (
                    <img
                      src={comment.user.avatar_url}
                      alt={comment.user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
                      👤
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {comment.user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {comment.user.id === userId && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Deletar
                  </button>
                )}
              </div>

              <p className="text-gray-700">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
