// lib/hooks.ts
// Hooks React customizados para BNCC Platform

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { Plan, SuccessfulExperience, RankingEntry } from '@/types';

// ============================================
// HOOKS DE AUTENTICAÇÃO
// ============================================

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      setUser(data.user);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setUser(data.user);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { user, isLoading, signup, login, logout };
}

// ============================================
// HOOKS DE PLANOS
// ============================================

export function usePlans(filters?: { gradeLevel?: string; subject?: string }) {
  return useQuery({
    queryKey: ['plans', filters],
    queryFn: async () => {
      let query = supabase
        .from('plans')
        .select('*, user:users(*), plan_skills(skill:skills(*))')
        .eq('is_published', true);

      if (filters?.gradeLevel) {
        query = query.eq('grade_level', filters.gradeLevel);
      }
      if (filters?.subject) {
        query = query.eq('subject', filters.subject);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) throw error;
      return data as Plan[];
    },
  });
}

export function usePlanDetail(planId: string) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*, user:users(*), plan_skills(skill:skills(*))')
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data as Plan;
    },
    enabled: !!planId,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planData: any) => {
      const { data, error } = await supabase
        .from('plans')
        .insert([planData])
        .select()
        .single();

      if (error) throw error;
      return data as Plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Plan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan', data.id] });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

// ============================================
// HOOKS DE EXPERIÊNCIAS EXITOSAS
// ============================================

export function useExperiences(filters?: {
  category?: string;
  gradeLevel?: string;
}) {
  return useQuery({
    queryKey: ['experiences', filters],
    queryFn: async () => {
      let query = supabase
        .from('successful_experiences')
        .select(
          '*, user:users(*), experience_skills(skill:skills(*)), likes(count), comments(count)'
        );

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.gradeLevel) {
        query = query.eq('grade_level', filters.gradeLevel);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) throw error;
      return data as SuccessfulExperience[];
    },
  });
}

export function useCreateExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expData: any) => {
      const { data, error } = await supabase
        .from('successful_experiences')
        .insert([expData])
        .select()
        .single();

      if (error) throw error;
      return data as SuccessfulExperience;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
    },
  });
}

// ============================================
// HOOKS DE RANKING
// ============================================

export function useRanking(limit: number = 10) {
  return useQuery({
    queryKey: ['ranking', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ranking_view')
        .select('*')
        .limit(limit)
        .order('ranking_position', { ascending: true });

      if (error) throw error;
      return data as RankingEntry[];
    },
  });
}

export function useUserRanking(userId: string) {
  return useQuery({
    queryKey: ['user-ranking', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ranking_view')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as RankingEntry;
    },
    enabled: !!userId,
  });
}

// ============================================
// HOOKS DE PONTOS
// ============================================

export function useUserPoints(userId: string) {
  return useQuery({
    queryKey: ['user-points', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ============================================
// HOOKS DE HABILIDADES BNCC
// ============================================

export function useSkills(filters?: { gradeLevel?: string; subject?: string }) {
  return useQuery({
    queryKey: ['skills', filters],
    queryFn: async () => {
      let query = supabase.from('skills').select('*');

      if (filters?.gradeLevel) {
        query = query.eq('grade_level', filters.gradeLevel);
      }
      if (filters?.subject) {
        query = query.eq('subject', filters.subject);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ============================================
// HOOKS DE IA
// ============================================

export function useAISuggestion() {
  return useMutation({
    mutationFn: async ({
      prompt,
      skills,
      planId,
      userId,
    }: {
      prompt: string;
      skills?: any[];
      planId?: string;
      userId: string;
    }) => {
      const response = await fetch('/api/nvidia/ia-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, skills, plan_id: planId, userId }),
      });

      if (!response.ok) throw new Error('Erro ao gerar sugestão');
      return response.json();
    },
  });
}

// ============================================
// HOOKS DE LIKES
// ============================================

export function useLikeExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      experienceId,
      userId,
    }: {
      experienceId: string;
      userId: string;
    }) => {
      const { error } = await supabase.from('likes').insert({
        experience_id: experienceId,
        user_id: userId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
    },
  });
}

export function useUnlikeExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      experienceId,
      userId,
    }: {
      experienceId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('experience_id', experienceId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
    },
  });
}

// ============================================
// EXEMPLO DE USO EM COMPONENTE
// ============================================

/*
export function MyComponent() {
  const { user } = useAuth();
  const { data: plans } = usePlans({ gradeLevel: '1', subject: 'Português' });
  const { data: ranking } = useRanking(10);
  const { data: skills } = useSkills();
  const createPlan = useCreatePlan();

  const handleCreate = async () => {
    try {
      await createPlan.mutateAsync({
        user_id: user.id,
        title: 'Meu plano',
        grade_level: '1',
        subject: 'Português',
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      {plans?.map((plan) => (
        <div key={plan.id}>{plan.title}</div>
      ))}
    </div>
  );
}
*/
