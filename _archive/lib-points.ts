// lib/points.ts
// Utilitários para cálculo e gerenciamento de pontos

export const POINTS_VALUES = {
  // Planos
  CREATE_PLAN: 10,
  USE_IA_SUGGESTION: 5,

  // Experiências
  PUBLISH_EXPERIENCE: 25,
  RECEIVED_LIKE: 1,
  REMOVED_LIKE: -1,

  // Comentários
  COMMENT_CREATED: 0, // Sem pontos por enquanto
  COMMENT_HELPFUL: 2,

  // Ranking
  FIRST_PLACE: 100,
  SECOND_PLACE: 50,
  THIRD_PLACE: 25,

  // Achievements
  FIRST_100_POINTS: 10,
  FIRST_PLAN_PUBLISHED: 5,
  FIRST_EXPERIENCE_SHARED: 10,
} as const;

export const POINT_REASONS = {
  create_plan: 'Criar plano de aula',
  use_ia: 'Usar sugestões com IA',
  publish_experience: 'Publicar experiência exitosa',
  received_like: 'Receber like na experiência',
  removed_like: 'Like removido',
  comment_helpful: 'Comentário marcado como útil',
  achievement_unlocked: 'Achievement desbloqueado',
  bonus_weekly: 'Bônus semanal',
  bonus_monthly: 'Bônus mensal',
} as const;

/**
 * Obter valor de pontos para uma ação
 */
export function getPointsForAction(
  action: keyof typeof POINTS_VALUES
): number {
  return POINTS_VALUES[action];
}

/**
 * Obter descrição de uma ação
 */
export function getReasonDescription(
  reason: keyof typeof POINT_REASONS
): string {
  return POINT_REASONS[reason];
}

/**
 * Calcular bônus por streak (dias consecutivos)
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays < 3) return 0;
  if (streakDays < 7) return 5;
  if (streakDays < 14) return 10;
  if (streakDays < 30) return 20;
  return 50; // 30+ dias
}

/**
 * Calcular bônus semanal baseado em atividade
 */
export function calculateWeeklyBonus(
  activitiesThisWeek: number
): number {
  if (activitiesThisWeek < 1) return 0;
  if (activitiesThisWeek < 3) return 5;
  if (activitiesThisWeek < 5) return 10;
  if (activitiesThisWeek < 7) return 15;
  return 20; // 7+ atividades
}

/**
 * Calcular multiplicador de pontos por nível
 */
export interface UserLevel {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  multiplier: number;
}

export const USER_LEVELS: UserLevel[] = [
  {
    level: 1,
    name: 'Iniciante',
    minPoints: 0,
    maxPoints: 99,
    multiplier: 1.0,
  },
  {
    level: 2,
    name: 'Aprendiz',
    minPoints: 100,
    maxPoints: 299,
    multiplier: 1.1,
  },
  {
    level: 3,
    name: 'Educador',
    minPoints: 300,
    maxPoints: 599,
    multiplier: 1.2,
  },
  {
    level: 4,
    name: 'Mestre',
    minPoints: 600,
    maxPoints: 999,
    multiplier: 1.3,
  },
  {
    level: 5,
    name: 'Especialista',
    minPoints: 1000,
    maxPoints: 1999,
    multiplier: 1.4,
  },
  {
    level: 6,
    name: 'Lenda',
    minPoints: 2000,
    maxPoints: Infinity,
    multiplier: 1.5,
  },
];

/**
 * Obter nível do usuário baseado em pontos
 */
export function getUserLevel(totalPoints: number): UserLevel {
  return (
    USER_LEVELS.find(
      (level) =>
        totalPoints >= level.minPoints && totalPoints <= level.maxPoints
    ) || USER_LEVELS[0]
  );
}

/**
 * Obter progressão até próximo nível
 */
export function getProgressToNextLevel(
  totalPoints: number
): { current: number; next: number; progress: number } {
  const currentLevel = getUserLevel(totalPoints);
  const nextLevel = USER_LEVELS[currentLevel.level] || USER_LEVELS[USER_LEVELS.length - 1];

  const progress = totalPoints - currentLevel.minPoints;
  const nextTarget = nextLevel.minPoints - currentLevel.minPoints;

  return {
    current: currentLevel.minPoints,
    next: nextLevel.minPoints,
    progress: Math.min(100, (progress / nextTarget) * 100),
  };
}

/**
 * Calcular multiplicador de pontos
 */
export function calculatePointsWithMultiplier(
  basePoints: number,
  userPoints: number,
  applyStreakBonus?: boolean
): {
  base: number;
  multiplier: number;
  total: number;
  bonus?: number;
} {
  const level = getUserLevel(userPoints);
  const multipliedPoints = Math.floor(basePoints * level.multiplier);

  return {
    base: basePoints,
    multiplier: level.multiplier,
    total: multipliedPoints,
  };
}

/**
 * Verificar se usuário desbloqueou achievement
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredPoints?: number;
  requiredActions?: {
    action: string;
    count: number;
  };
  reward: number;
  unlockedAt?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_plan',
    name: 'Primeiro Plano',
    description: 'Criar seu primeiro plano de aula',
    icon: '📝',
    reward: 5,
  },
  {
    id: 'first_experience',
    name: 'Experiência Compartilhada',
    description: 'Publicar sua primeira experiência exitosa',
    icon: '🎯',
    reward: 10,
  },
  {
    id: 'five_plans',
    name: 'Planejador Dedicado',
    description: 'Criar 5 planos de aula',
    icon: '📚',
    requiredActions: [{ action: 'create_plan', count: 5 }],
    reward: 15,
  },
  {
    id: 'first_like',
    name: 'Admirador',
    description: 'Receber seu primeiro like',
    icon: '❤️',
    reward: 5,
  },
  {
    id: 'ten_likes',
    name: 'Popular',
    description: 'Receber 10 likes nas suas experiências',
    icon: '💫',
    requiredActions: [{ action: 'received_like', count: 10 }],
    reward: 20,
  },
  {
    id: 'hundred_points',
    name: 'Centenário',
    description: 'Alcançar 100 pontos',
    icon: '⭐',
    requiredPoints: 100,
    reward: 10,
  },
  {
    id: 'thousand_points',
    name: 'Milionário',
    description: 'Alcançar 1000 pontos',
    icon: '👑',
    requiredPoints: 1000,
    reward: 50,
  },
  {
    id: 'master_educator',
    name: 'Mestre Educador',
    description: 'Atingir nível 4 (Mestre)',
    icon: '🎓',
    requiredPoints: 600,
    reward: 0, // Já incluso nos pontos
  },
];

/**
 * Verificar achievements desbloqueados
 */
export function checkAchievements(
  userPoints: number,
  userStats: { plans: number; experiences: number; likes: number }
): Achievement[] {
  const unlocked: Achievement[] = [];

  ACHIEVEMENTS.forEach((achievement) => {
    // Verificar por pontos
    if (achievement.requiredPoints && userPoints >= achievement.requiredPoints) {
      unlocked.push(achievement);
    }

    // Verificar por ações
    if (achievement.requiredActions) {
      achievement.requiredActions.forEach((req) => {
        if (
          req.action === 'create_plan' &&
          userStats.plans >= req.count
        ) {
          unlocked.push(achievement);
        }
        if (
          req.action === 'received_like' &&
          userStats.likes >= req.count
        ) {
          unlocked.push(achievement);
        }
      });
    }

    // Verificar primeiras ações
    if (
      achievement.id === 'first_plan' &&
      userStats.plans >= 1
    ) {
      unlocked.push(achievement);
    }
    if (
      achievement.id === 'first_experience' &&
      userStats.experiences >= 1
    ) {
      unlocked.push(achievement);
    }
    if (
      achievement.id === 'first_like' &&
      userStats.likes >= 1
    ) {
      unlocked.push(achievement);
    }
  });

  // Retornar achievements únicos
  return [...new Map(unlocked.map((a) => [a.id, a])).values()];
}

/**
 * Calcular total de pontos esperados até um certo nível
 */
export function getPointsForLevel(level: number): number {
  const targetLevel = USER_LEVELS[Math.min(level - 1, USER_LEVELS.length - 1)];
  return targetLevel.minPoints;
}

/**
 * Gerar relatório de pontos
 */
export function generatePointsReport(
  totalPoints: number,
  transactionCount: number,
  lastActivityDate?: Date
) {
  const level = getUserLevel(totalPoints);
  const progress = getProgressToNextLevel(totalPoints);

  return {
    totalPoints,
    level: {
      number: level.level,
      name: level.name,
      multiplier: level.multiplier,
    },
    progression: {
      currentLevelStart: progress.current,
      nextLevelStart: progress.next,
      percentToNextLevel: progress.progress,
    },
    activity: {
      transactionCount,
      lastActivityDate,
    },
    achievements: checkAchievements(totalPoints, {
      plans: 0,
      experiences: 0,
      likes: 0,
    }),
  };
}
