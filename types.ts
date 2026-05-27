// ============================================
// TIPOS DO BANCO DE DADOS
// ============================================
export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  school_id: string | null;
  role: 'teacher' | 'coordinator';
  subject: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type School = {
  id: string;
  name: string;
  city: string;
  state: string;
  cnpj: string | null;
  created_at: string;
};

export type Skill = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  grade_level: string;
  competency: string;
  subject: string;
  axis: string;
  created_at: string;
};

export type Plan = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  grade_level: string;
  subject: string;
  content: string | null;
  duration: number | null;
  materials: string | null;
  objectives: string | null;
  pdf_url: string | null;
  is_published: boolean;
  views_count: number;
  coordinator_viewed_at: string | null;
  coordinator_id: string | null;
  coordinator_note: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  skills?: Skill[];
};

export type SuccessfulExperience = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  content: string | null;
  category: string;
  images: string[] | null;
  outcomes: string | null;
  grade_level: string | null;
  likes_count: number;
  views_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  skills?: Skill[];
  likes?: Like[];
  comments?: Comment[];
};

export type Like = {
  id: string;
  user_id: string;
  experience_id: string;
  created_at: string;
  user?: User;
};

export type Comment = {
  id: string;
  user_id: string;
  experience_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
};

export type PointsTransaction = {
  id: string;
  user_id: string;
  points_amount: number;
  reason: string;
  related_item_id: string | null;
  created_at: string;
};

export type RankingEntry = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  school_name: string | null;
  total_points: number;
  planos_criados: number;
  experiencias_compartilhadas: number;
  ranking_position: number;
};

// ============================================
// TIPOS DE FORMA/VALIDAÇÃO
// ============================================
export type CreatePlanInput = {
  title: string;
  description?: string;
  grade_level: string;
  subject: string;
  content?: string;
  duration?: number;
  materials?: string;
  objectives?: string;
  skill_ids: string[];
};

export type UpdatePlanInput = Partial<CreatePlanInput>;

export type CreateExperienceInput = {
  title: string;
  description: string;
  content?: string;
  category: string;
  images?: string[];
  outcomes?: string;
  grade_level?: string;
  skill_ids: string[];
};

export type UpdateExperienceInput = Partial<CreateExperienceInput>;

// ============================================
// TIPOS DE RESPOSTA DA API
// ============================================
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
