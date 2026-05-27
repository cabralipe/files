'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Heart } from 'lucide-react'

interface LikesButtonProps {
  experienceId: string
  userId: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
)

export default function LikesButton({ experienceId, userId }: LikesButtonProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLikesInfo()
  }, [experienceId, userId])

  const fetchLikesInfo = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch(
        `/api/likes?experienceId=${experienceId}&userId=${userId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )
      const data = await response.json()

      if (data.success) {
        setLikeCount(data.likeCount)
        setLiked(data.userLiked)
      }
    } catch (err: any) {
      console.error('Erro ao carregar likes:', err)
    }
  }

  const handleToggleLike = async () => {
    try {
      setLoading(true)
      setError('')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          experienceId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLiked(data.liked)
        // Refetch like count to get accurate number
        await fetchLikesInfo()
      } else {
        setError(data.error || 'Erro ao curtir')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao curtir')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleLike}
        disabled={loading}
        className={`btn font-mono text-sm font-bold ${
          liked
            ? 'bg-[#E5394B] text-[#FBF5E3] hover:bg-[#B82433] !important'
            : 'btn-out'
        }`}
      >
        <Heart
          size={18}
          fill={liked ? 'currentColor' : 'none'}
          className="transition-transform duration-100 active:scale-125"
        />
        <span>{likeCount} likes</span>
      </button>
      {error && <span className="text-xs font-mono font-bold text-[#E5394B] ml-2">{error}</span>}
    </div>
  )
}
