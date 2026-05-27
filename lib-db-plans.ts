// lib/db/plans.ts
// Funções de banco de dados para planos de aula

import { supabaseAdmin } from './supabase';
import { Database } from '@/types/database';
import { addPoints } from './users';

type Plan = Database['public']['Tables']['plans']['Row'];

interface CreatePlanInput {
  title: string;
  description: string;
  content: string;
  gradeLevel: string;
  duration: number;
  skills: string[];
}

/**
 * Criar novo plano de aula
 */
export async function createPlan(
  userId: string,
  planData: CreatePlanInput
): Promise<{ success: boolean; planId?: string; error?: Error }> {
  try {
    // 1. Criar o plano
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .insert({
        user_id: userId,
        title: planData.title,
        description: planData.description,
        content: planData.content,
        grade_level: planData.gradeLevel,
        duration: planData.duration,
      })
      .select()
      .single();

    if (planError) throw planError;
    if (!plan) throw new Error('Failed to create plan');

    // 2. Associar skills
    if (planData.skills && planData.skills.length > 0) {
      const skillsData = planData.skills.map((skillCode) => ({
        plan_id: plan.id,
        skill_code: skillCode,
      }));

      const { error: skillsError } = await supabaseAdmin
        .from('plan_skills')
        .insert(skillsData);

      if (skillsError) throw skillsError;
    }

    // 3. Adicionar pontos (+10)
    await addPoints(userId, 10, 'create_plan', plan.id);

    return { success: true, planId: plan.id };
  } catch (error) {
    console.error('Error creating plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Buscar plano por ID
 */
export async function getPlanById(planId: string): Promise<Plan | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select(
        `
        *,
        user:user_id(id, name, email, avatar_url),
        plan_skills(skill_code)
      `
      )
      .eq('id', planId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching plan:', error);
    return null;
  }
}

/**
 * Buscar planos do usuário
 */
export async function getPlansByUser(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  search?: string
) {
  try {
    let query = supabaseAdmin
      .from('plans')
      .select(
        `
        id,
        title,
        description,
        grade_level,
        duration,
        created_at,
        updated_at,
        plan_skills(skill_code)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      success: true,
      plans: data,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Error fetching plans:', error);
    return { success: false, error };
  }
}

/**
 * Atualizar plano
 */
export async function updatePlan(
  planId: string,
  userId: string,
  updates: Partial<CreatePlanInput>
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Verificar propriedade
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('user_id')
      .eq('id', planId)
      .single();

    if (!plan || plan.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Atualizar plano
    const { error: updateError } = await supabaseAdmin
      .from('plans')
      .update({
        title: updates.title,
        description: updates.description,
        content: updates.content,
        grade_level: updates.gradeLevel,
        duration: updates.duration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);

    if (updateError) throw updateError;

    // Atualizar skills se fornecidas
    if (updates.skills) {
      // Deletar skills antigas
      const { error: deleteError } = await supabaseAdmin
        .from('plan_skills')
        .delete()
        .eq('plan_id', planId);

      if (deleteError) throw deleteError;

      // Adicionar novas skills
      if (updates.skills.length > 0) {
        const skillsData = updates.skills.map((skillCode) => ({
          plan_id: planId,
          skill_code: skillCode,
        }));

        const { error: insertError } = await supabaseAdmin
          .from('plan_skills')
          .insert(skillsData);

        if (insertError) throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Deletar plano
 */
export async function deletePlan(
  planId: string,
  userId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Verificar propriedade
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('user_id')
      .eq('id', planId)
      .single();

    if (!plan || plan.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Deletar skills
    const { error: skillsError } = await supabaseAdmin
      .from('plan_skills')
      .delete()
      .eq('plan_id', planId);

    if (skillsError) throw skillsError;

    // Deletar plano
    const { error: deleteError } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('id', planId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Error deleting plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Listar planos recentes (públicos)
 */
export async function getRecentPlans(limit: number = 5) {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select(
        `
        id,
        title,
        description,
        grade_level,
        duration,
        created_at,
        user:user_id(id, name, avatar_url),
        plan_skills(skill_code)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, plans: data };
  } catch (error) {
    console.error('Error fetching recent plans:', error);
    return { success: false, error };
  }
}

/**
 * Buscar planos por grade level
 */
export async function getPlansByGradeLevel(
  gradeLevel: string,
  limit: number = 10,
  offset: number = 0
) {
  try {
    const { data, error, count } = await supabaseAdmin
      .from('plans')
      .select(
        `
        id,
        title,
        description,
        duration,
        created_at,
        user:user_id(id, name),
        plan_skills(skill_code)
      `,
        { count: 'exact' }
      )
      .eq('grade_level', gradeLevel)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      success: true,
      plans: data,
      total: count,
    };
  } catch (error) {
    console.error('Error fetching plans by grade:', error);
    return { success: false, error };
  }
}

/**
 * Buscar planos por skill
 */
export async function getPlansBySkill(
  skillCode: string,
  limit: number = 10,
  offset: number = 0
) {
  try {
    const { data, error, count } = await supabaseAdmin
      .from('plan_skills')
      .select(
        `
        plan:plan_id(
          id,
          title,
          description,
          grade_level,
          duration,
          created_at,
          user:user_id(id, name)
        )
      `,
        { count: 'exact' }
      )
      .eq('skill_code', skillCode)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const plans = data?.map((item: any) => item.plan).filter(Boolean);

    return {
      success: true,
      plans,
      total: count,
    };
  } catch (error) {
    console.error('Error fetching plans by skill:', error);
    return { success: false, error };
  }
}

/**
 * Contar planos do usuário
 */
export async function countUserPlans(userId: string): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error counting user plans:', error);
    return 0;
  }
}

/**
 * Buscar planos populares (mais recentes)
 */
export async function getPopularPlans(limit: number = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select(
        `
        id,
        title,
        description,
        grade_level,
        duration,
        created_at,
        user:user_id(id, name, avatar_url),
        plan_skills(skill_code)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, plans: data };
  } catch (error) {
    console.error('Error fetching popular plans:', error);
    return { success: false, error };
  }
}
