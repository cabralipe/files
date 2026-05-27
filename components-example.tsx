// ============================================
// EXEMPLO DE COMPONENTES REACT
// ============================================

// 1. LOGIN FORM
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isLoading } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Login falhou');

      toast.success('Login realizado com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Erro ao fazer login');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          {...register('email')}
          type="email"
          className="w-full px-3 py-2 border rounded-md"
          placeholder="seu@email.com"
        />
        {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-medium">Senha</label>
        <input
          {...register('password')}
          type="password"
          className="w-full px-3 py-2 border rounded-md"
          placeholder="••••••"
        />
        {errors.password && <span className="text-red-500 text-sm">{errors.password.message}</span>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}

// 2. PLAN CARD COMPONENT
import { Plan } from '@/types';
import { Heart, MessageCircle, Eye } from 'lucide-react';
import Link from 'next/link';

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
      <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            {plan.grade_level}º ano
          </span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            {plan.subject}
          </span>
        </div>
      </div>

      <div className="flex gap-4 text-gray-500 text-sm mb-4">
        <span className="flex items-center gap-1">
          <Eye size={16} /> {plan.views_count}
        </span>
      </div>

      {plan.skills && plan.skills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">Habilidades BNCC:</p>
          <div className="flex flex-wrap gap-1">
            {plan.skills.map((skill) => (
              <span
                key={skill.id}
                className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs"
              >
                {skill.code}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link href={`/planos/${plan.id}`}>
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Ver Detalhes
        </button>
      </Link>
    </div>
  );
}

// 3. RANKING PODIUM
import { RankingEntry } from '@/types';
import { Trophy, Medal } from 'lucide-react';

export function PodiumLeaders({ leaders }: { leaders: RankingEntry[] }) {
  const podium = leaders.slice(0, 3);

  return (
    <div className="flex justify-center items-end gap-8 mb-8">
      {/* 2º lugar */}
      {podium[1] && (
        <div className="text-center">
          <div className="w-20 h-24 bg-gray-300 rounded-t flex items-center justify-center relative">
            <Medal className="text-gray-600" size={40} />
          </div>
          <div className="bg-gray-200 p-3 rounded-b w-24">
            <p className="font-bold text-sm">{podium[1].full_name}</p>
            <p className="text-xs">{podium[1].total_points} pts</p>
          </div>
        </div>
      )}

      {/* 1º lugar */}
      {podium[0] && (
        <div className="text-center">
          <div className="w-24 h-32 bg-yellow-400 rounded-t flex items-center justify-center relative">
            <Trophy className="text-yellow-700" size={50} />
          </div>
          <div className="bg-yellow-300 p-4 rounded-b w-28">
            <p className="font-bold">{podium[0].full_name}</p>
            <p className="text-sm">{podium[0].total_points} pts</p>
          </div>
        </div>
      )}

      {/* 3º lugar */}
      {podium[2] && (
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-400 rounded-t flex items-center justify-center relative">
            <Medal className="text-orange-600" size={40} />
          </div>
          <div className="bg-orange-300 p-3 rounded-b w-24">
            <p className="font-bold text-sm">{podium[2].full_name}</p>
            <p className="text-xs">{podium[2].total_points} pts</p>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. STATS CARDS DASHBOARD
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

export function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className={`${color} rounded-lg shadow p-6 text-white`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-4xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

// 5. SKILL SELECTOR
import { Skill } from '@/types';

interface SkillSelectorProps {
  skills: Skill[];
  selectedSkills: string[];
  onChange: (selectedIds: string[]) => void;
}

export function SkillSelector({ skills, selectedSkills, onChange }: SkillSelectorProps) {
  const toggleSkill = (skillId: string) => {
    const newSelected = selectedSkills.includes(skillId)
      ? selectedSkills.filter((id) => id !== skillId)
      : [...selectedSkills, skillId];
    onChange(newSelected);
  };

  // Agrupar por competência
  const grouped = skills.reduce((acc, skill) => {
    if (!acc[skill.competency]) acc[skill.competency] = [];
    acc[skill.competency].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([competency, compSkills]) => (
        <div key={competency}>
          <h4 className="font-semibold text-lg mb-2">{competency}</h4>
          <div className="grid grid-cols-2 gap-2">
            {compSkills.map((skill) => (
              <label
                key={skill.id}
                className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                  className="mr-2"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{skill.code}</p>
                  <p className="text-xs text-gray-600">{skill.name}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
