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

/**
 * Credita `points` a `userId` APENAS UMA VEZ por (userId, sourceType, sourceId).
 * Previne farming (curtir/descurtir/curtir, spam de comentários). Opcionalmente
 * respeita um teto diário por tipo de evento.
 *
 * - Evento novo  -> registra em score_events e credita em points_transactions.
 * - Evento repetido (mesma tripla) -> não credita nada (idempotente).
 * - Sem tabela score_events (não migrado) -> degrada para addPoints legado.
 *
 * Retorna { awarded } indicando se houve crédito nesta chamada.
 */
export async function awardPointsOnce(
  userId: string,
  sourceType: string,
  sourceId: string,
  points: number,
  opts: { dailyCap?: number } = {},
): Promise<{ awarded: boolean }> {
  const supabase = getSupabaseAdmin()

  // 1) Idempotência: tenta registrar o evento. Conflito (23505) => já pontuado.
  const { error: insErr } = await supabase.from('score_events').insert({
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    points,
  })

  if (insErr) {
    if (insErr.code === '23505') {
      return { awarded: false } // duplicado — não credita de novo
    }
    // Tabela ausente (migração não aplicada): degrada para o modelo legado.
    if (['42P01', 'PGRST205', 'PGRST204'].includes(insErr.code || '')) {
      await addPoints(userId, points, sourceType, sourceId)
      return { awarded: true }
    }
    throw insErr
  }

  // 2) Teto diário opcional: soma os pontos já registrados hoje deste tipo
  //    (inclui o evento recém-inserido). Acima do teto, registra sem creditar.
  let credit = true
  if (opts.dailyCap && opts.dailyCap > 0) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const { data: todayEvents } = await supabase
      .from('score_events')
      .select('points')
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .gte('created_at', start.toISOString())
    const sumToday = (todayEvents || []).reduce((sum, e) => sum + Number(e.points || 0), 0)
    if (sumToday > opts.dailyCap) credit = false
  }

  // 3) Credita de fato (uma única vez).
  if (credit) {
    await addPoints(userId, points, sourceType, sourceId)
  }
  return { awarded: credit }
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
