// lib/db/experiences.ts
// Funções de banco de dados para experiências exitosas

import { supabaseAdmin } from './supabase';
import { Database } from '@/types/database';
import { addPoints, removePoints } from './users';

type Experience = Database['public']['Tables']['successful_experiences']['Row'];

interface CreateExperienceInput {
  title: string;
  description: string;
  content: string;
  category: string;
  skills: string[];
  images?: string[];
}

/**
 * Criar nova experiência exitosa
 */
export async function createExperience(
  userId: string,
  experienceData: CreateExperienceInput
): Promise<{ success: boolean; experienceId?: string; error?: Error }> {
  try {
    // 1. Criar experiência
    const { data: experience, error: expError } = await supabaseAdmin
      .from('successful_experiences')
      .insert({
        user_id: userId,
        title: experienceData.title,
        description: experienceData.description,
        content: experienceData.content,
        category: experienceData.category,
        published: true,
        likes_count: 0,
      })
      .select()
      .single();

    if (expError) throw expError;
    if (!experience) throw new Error('Failed to create experience');

    // 2. Associar skills
    if (
      experienceData.skills &&
      experienceData.skills.length > 0
    ) {
      const skillsData = experienceData.skills.map((skillCode) => ({
        experience_id: experience.id,
        skill_code: skillCode,
      }));

      const { error: skillsError } = await supabaseAdmin
        .from('experience_skills')
        .insert(skillsData);

      if (skillsError) throw skillsError;
    }

    // 3. Adicionar pontos (+25)
    await addPoints(userId, 25, 'publish_experience', experience.id);

    return { success: true, experienceId: experience.id };
  } catch (error) {
    console.error('Error creating experience:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Buscar experiência por ID
 */
export async function getExperienceById(experienceId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('successful_experiences')
      .select(
        `
        *,
        user:user_id(id, name, avatar_url, email),
        experience_skills(skill_code),
        comments(
          id,
          text,
          created_at,
          user:user_id(id, name, avatar_url)
        )
      `
      )
      .eq('id', experienceId)
      .eq('published', true)
      .single();

    if (error) throw error;
    return { success: true, experience: data };
  } catch (error) {
    console.error('Error fetching experience:', error);
    return { success: false, error };
  }
}

/**
 * Buscar experiências do usuário
 */
export async function getExperiencesByUser(
  userId: string,
  limit: number = 10,
  offset: number = 0
) {
  try {
    const { data, error, count } = await supabaseAdmin
      .from('successful_experiences')
      .select(
        `
        id,
        title,
        description,
        category,
        likes_count,
        created_at,
        experience_skills(skill_code)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      success: true,
      experiences: data,
      total: count,
    };
  } catch (error) {
    console.error('Error fetching experiences:', error);
    return { success: false, error };
  }
}

/**
 * Listar experiências públicas com filtros
 */
export async function listPublicExperiences(
  limit: number = 10,
  offset: number = 0,
  filters?: {
    category?: string;
    skill?: string;
    search?: string;
  }
) {
  try {
    let query = supabaseAdmin
      .from('successful_experiences')
      .select(
        `
        id,
        title,
        description,
        category,
        likes_count,
        created_at,
        user:user_id(id, name, avatar_url),
        experience_skills(skill_code)
      `,
        { count: 'exact' }
      )
      .eq('published', true)
      .order('likes_count', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) throw error;

    // Filtrar por skill se necessário
    let filtered = data;
    if (filters?.skill) {
      filtered = data?.filter((exp: any) =>
        exp.experience_skills.some((s: any) => s.skill_code === filters.skill)
      );
    }

    return {
      success: true,
      experiences: filtered,
      total: count,
    };
  } catch (error) {
    console.error('Error listing experiences:', error);
    return { success: false, error };
  }
}

/**
 * Atualizar experiência
 */
export async function updateExperience(
  experienceId: string,
  userId: string,
  updates: Partial<CreateExperienceInput>
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Verificar propriedade
    const { data: experience } = await supabaseAdmin
      .from('successful_experiences')
      .select('user_id')
      .eq('id', experienceId)
      .single();

    if (!experience || experience.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Atualizar experiência
    const { error } = await supabaseAdmin
      .from('successful_experiences')
      .update({
        title: updates.title,
        description: updates.description,
        content: updates.content,
        category: updates.category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', experienceId);

    if (error) throw error;

    // Atualizar skills se fornecidas
    if (updates.skills) {
      const { error: deleteError } = await supabaseAdmin
        .from('experience_skills')
        .delete()
        .eq('experience_id', experienceId);

      if (deleteError) throw deleteError;

      if (updates.skills.length > 0) {
        const skillsData = updates.skills.map((skillCode) => ({
          experience_id: experienceId,
          skill_code: skillCode,
        }));

        const { error: insertError } = await supabaseAdmin
          .from('experience_skills')
          .insert(skillsData);

        if (insertError) throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating experience:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Deletar experiência
 */
export async function deleteExperience(
  experienceId: string,
  userId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Verificar propriedade
    const { data: experience } = await supabaseAdmin
      .from('successful_experiences')
      .select('user_id')
      .eq('id', experienceId)
      .single();

    if (!experience || experience.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Deletar skills
    const { error: skillsError } = await supabaseAdmin
      .from('experience_skills')
      .delete()
      .eq('experience_id', experienceId);

    if (skillsError) throw skillsError;

    // Deletar comentários
    const { error: commentsError } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('experience_id', experienceId);

    if (commentsError) throw commentsError;

    // Deletar likes
    const { error: likesError } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('experience_id', experienceId);

    if (likesError) throw likesError;

    // Deletar experiência
    const { error: deleteError } = await supabaseAdmin
      .from('successful_experiences')
      .delete()
      .eq('id', experienceId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Error deleting experience:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Adicionar like a experiência
 */
export async function addLike(
  experienceId: string,
  userId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Verificar se já tem like
    const { data: existingLike } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('experience_id', experienceId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      throw new Error('Already liked');
    }

    // Adicionar like
    const { error: likeError } = await supabaseAdmin
      .from('likes')
      .insert({
        experience_id: experienceId,
        user_id: userId,
      });

    if (likeError) throw likeError;

    // Atualizar contagem
    const { data: likesData } = await supabaseAdmin
      .from('likes')
      .select('id', { count: 'exact' })
      .eq('experience_id', experienceId);

    const likesCount = likesData?.length || 0;

    await supabaseAdmin
      .from('successful_experiences')
      .update({ likes_count: likesCount })
      .eq('id', experienceId);

    // Adicionar pontos ao autor (+1)
    const { data: experience } = await supabaseAdmin
      .from('successful_experiences')
      .select('user_id')
      .eq('id', experienceId)
      .single();

    if (experience) {
      await addPoints(experience.user_id, 1, 'received_like', experienceId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding like:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Remover like de experiência
 */
export async function removeLike(
  experienceId: string,
  userId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Remover like
    const { error } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('experience_id', experienceId)
      .eq('user_id', userId);

    if (error) throw error;

    // Atualizar contagem
    const { data: likesData } = await supabaseAdmin
      .from('likes')
      .select('id', { count: 'exact' })
      .eq('experience_id', experienceId);

    const likesCount = likesData?.length || 0;

    await supabaseAdmin
      .from('successful_experiences')
      .update({ likes_count: likesCount })
      .eq('id', experienceId);

    // Remover pontos do autor (-1)
    const { data: experience } = await supabaseAdmin
      .from('successful_experiences')
      .select('user_id')
      .eq('id', experienceId)
      .single();

    if (experience) {
      await removePoints(experience.user_id, 1, 'removed_like', experienceId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing like:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Adicionar comentário
 */
export async function addComment(
  experienceId: string,
  userId: string,
  text: string
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        experience_id: experienceId,
        user_id: userId,
        text,
      })
      .select('*, user:user_id(id, name, avatar_url)')
      .single();

    if (error) throw error;

    return { success: true, comment: data };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error };
  }
}

/**
 * Buscar comentários da experiência
 */
export async function getExperienceComments(experienceId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('*, user:user_id(id, name, avatar_url)')
      .eq('experience_id', experienceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, comments: data };
  } catch (error) {
    console.error('Error fetching comments:', error);
    return { success: false, error };
  }
}

/**
 * Buscar experiências populares
 */
export async function getPopularExperiences(limit: number = 5) {
  try {
    const { data, error } = await supabaseAdmin
      .from('successful_experiences')
      .select(
        `
        id,
        title,
        description,
        category,
        likes_count,
        created_at,
        user:user_id(id, name, avatar_url),
        experience_skills(skill_code)
      `
      )
      .eq('published', true)
      .order('likes_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, experiences: data };
  } catch (error) {
    console.error('Error fetching popular experiences:', error);
    return { success: false, error };
  }
}

/**
 * Contar experiências do usuário
 */
export async function countUserExperiences(userId: string): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('successful_experiences')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('published', true);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error counting experiences:', error);
    return 0;
  }
}
