// lib/db/users.ts
// Funções de banco de dados para usuários

import { supabaseAdmin } from './supabase';
import { Database } from '@/types/database';

type User = Database['public']['Tables']['users']['Row'];

/**
 * Criar novo usuário no banco
 */
export async function createUser(
  authId: string,
  email: string,
  name: string,
  schoolId?: string
): Promise<{ success: boolean; user?: User; error?: Error }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: authId,
        email,
        name,
        school_id: schoolId,
        points: 0,
        is_teacher: true,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, user: data };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Buscar usuário por ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Buscar usuário por email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

/**
 * Verificar se email já existe
 */
export async function userExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    return !!data;
  } catch (error) {
    // Se erro é "no rows returned", significa que não existe
    return false;
  }
}

/**
 * Atualizar perfil do usuário
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    bio?: string;
    phone?: string;
    avatar_url?: string;
  }
): Promise<{ success: boolean; user?: User; error?: Error }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, user: data };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Adicionar pontos ao usuário
 */
export async function addPoints(
  userId: string,
  points: number,
  reason: string,
  relatedId?: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Criar transação de pontos
    const { error: transError } = await supabaseAdmin
      .from('points_transactions')
      .insert({
        user_id: userId,
        points,
        reason,
        related_id: relatedId,
      });

    if (transError) throw transError;

    // Atualizar pontos totais do usuário
    const { data: userData, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (getUserError) throw getUserError;

    const newPoints = (userData?.points || 0) + points;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ points: newPoints })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error adding points:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Remover pontos do usuário
 */
export async function removePoints(
  userId: string,
  points: number,
  reason: string,
  relatedId?: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Criar transação de pontos (negativa)
    const { error: transError } = await supabaseAdmin
      .from('points_transactions')
      .insert({
        user_id: userId,
        points: -points,
        reason,
        related_id: relatedId,
      });

    if (transError) throw transError;

    // Atualizar pontos totais do usuário
    const { data: userData, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (getUserError) throw getUserError;

    const newPoints = Math.max(0, (userData?.points || 0) - points);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ points: newPoints })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error removing points:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Obter ranking de usuários
 */
export async function getRanking(limit: number = 10, offset: number = 0) {
  try {
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select(
        `
        id,
        name,
        email,
        points,
        avatar_url,
        school:school_id(id, name),
        created_at
      `,
        { count: 'exact' }
      )
      .eq('is_teacher', true)
      .order('points', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Adicionar posição
    const ranking = data?.map((user, index) => ({
      position: offset + index + 1,
      ...user,
    }));

    return { success: true, ranking, total: count };
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return { success: false, error };
  }
}

/**
 * Obter posição do usuário no ranking
 */
export async function getUserRankingPosition(userId: string): Promise<number> {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (!user) return 0;

    const { data: betterUsers, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('is_teacher', true)
      .gt('points', user.points)
      .select('id', { count: 'exact' });

    if (error) throw error;

    return (betterUsers?.length || 0) + 1;
  } catch (error) {
    console.error('Error fetching user ranking position:', error);
    return 0;
  }
}

/**
 * Obter histórico de transações de pontos
 */
export async function getUserPointsHistory(
  userId: string,
  limit: number = 10
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('points_transactions')
      .select('id, points, reason, related_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, transactions: data };
  } catch (error) {
    console.error('Error fetching points history:', error);
    return { success: false, error };
  }
}

/**
 * Obter estatísticas de usuário
 */
export async function getUserStats(userId: string) {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('points, created_at')
      .eq('id', userId)
      .single();

    const { count: plansCount } = await supabaseAdmin
      .from('plans')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const { count: experiencesCount } = await supabaseAdmin
      .from('successful_experiences')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('published', true);

    const { count: likesCount } = await supabaseAdmin
      .from('likes')
      .select('id', { count: 'exact' })
      .join('successful_experiences', 'experience_id', 'id')
      .eq('successful_experiences.user_id', userId);

    const position = await getUserRankingPosition(userId);

    return {
      success: true,
      stats: {
        totalPoints: user?.points || 0,
        plansCount: plansCount || 0,
        experiencesCount: experiencesCount || 0,
        likesReceived: likesCount || 0,
        rankingPosition: position,
        memberSince: user?.created_at,
      },
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { success: false, error };
  }
}

/**
 * Listar todos os usuários (admin)
 */
export async function listUsers(
  limit: number = 20,
  offset: number = 0,
  search?: string
) {
  try {
    let query = supabaseAdmin
      .from('users')
      .select(
        'id, name, email, points, created_at, school:school_id(name)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return { success: true, users: data, total: count };
  } catch (error) {
    console.error('Error listing users:', error);
    return { success: false, error };
  }
}

/**
 * Deletar usuário (admin)
 */
export async function deleteUser(userId: string) {
  try {
    // Deletar do Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (authError) throw authError;

    // Deletar perfil
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) throw dbError;

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error };
  }
}
