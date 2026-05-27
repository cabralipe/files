import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function addPoints(
  userId: string,
  amount: number,
  reason: string,
  relatedItemId?: string | null,
) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('points_transactions').insert({
    user_id: userId,
    points_amount: amount,
    reason,
    related_item_id: relatedItemId || null,
  })

  if (!error) {
    return
  }

  if (error.code !== 'PGRST204') {
    throw error
  }

  const { error: fallbackError } = await supabase.from('points_transactions').insert({
    user_id: userId,
    points: amount,
    reason,
  })

  if (fallbackError) {
    throw fallbackError
  }

  const { data: profile } = await supabase.from('users').select('points').eq('id', userId).maybeSingle()
  await supabase
    .from('users')
    .update({ points: Number(profile?.points || 0) + amount })
    .eq('id', userId)
}

export async function getTotalPoints(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('points_transactions')
    .select('points_amount')
    .eq('user_id', userId)

  if (!error) {
    return (data || []).reduce((total, transaction) => total + Number(transaction.points_amount || 0), 0)
  }

  if (error.code !== 'PGRST204') {
    throw error
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('points_transactions')
    .select('points')
    .eq('user_id', userId)

  if (fallbackError) {
    throw fallbackError
  }

  return (fallbackData || []).reduce((total, transaction) => total + Number(transaction.points || 0), 0)
}
