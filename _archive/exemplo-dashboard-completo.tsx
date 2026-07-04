// app/(dashboard)/dashboard/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BookOpen,
  Award,
  Zap,
  TrendingUp,
  Star,
  Clock,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatsCards';

// Dados mockados para exemplo
const chartData = [
  { date: '01 Mai', pontos: 10, planos: 1 },
  { date: '02 Mai', pontos: 15, planos: 1 },
  { date: '03 Mai', pontos: 20, planos: 1 },
  { date: '04 Mai', pontos: 45, planos: 2 },
  { date: '05 Mai', pontos: 50, planos: 2 },
  { date: '06 Mai', pontos: 75, planos: 3 },
  { date: '07 Mai', pontos: 100, planos: 3 },
];

const recentActivities = [
  {
    id: 1,
    type: 'plano',
    title: 'Plano de Aula: Introdução a Algoritmos',
    points: 10,
    timestamp: 'Há 2 horas',
  },
  {
    id: 2,
    type: 'ia',
    title: 'Sugestão de IA aplicada ao plano',
    points: 5,
    timestamp: 'Há 5 horas',
  },
  {
    id: 3,
    type: 'experiencia',
    title: 'Experiência Exitosa: Robótica no 5º ano',
    points: 25,
    timestamp: 'Há 1 dia',
  },
  {
    id: 4,
    type: 'like',
    title: 'Você recebeu um like em uma experiência',
    points: 1,
    timestamp: 'Há 2 dias',
  },
];

const skillsProgress = [
  {
    code: 'EF01CP01',
    name: 'Planejamento Textual',
    progress: 45,
  },
  {
    code: 'EF01CP04',
    name: 'Publicação Digital',
    progress: 78,
  },
  {
    code: 'EF02PC01',
    name: 'Programação com Blocos',
    progress: 92,
  },
  {
    code: 'EF02CD01',
    name: 'Cidadania Digital',
    progress: 60,
  },
];

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Mockado para exemplo
      return {
        totalPoints: 100,
        planos: 3,
        experiencias: 1,
        ranking: 42,
      };
    },
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Bem-vindo(a), Professor(a)! 👋</h1>
        <p className="text-blue-100">
          Você tem uma jornada incrível pela frente. Continue criando planos
          inovadores e compartilhando experiências exitosas!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pontos Totais"
          value={stats?.totalPoints || 0}
          icon={<Award size={32} />}
          color="bg-gradient-to-br from-yellow-400 to-yellow-600"
        />
        <StatCard
          title="Planos Criados"
          value={stats?.planos || 0}
          icon={<BookOpen size={32} />}
          color="bg-gradient-to-br from-blue-400 to-blue-600"
        />
        <StatCard
          title="Experiências"
          value={stats?.experiencias || 0}
          icon={<Star size={32} />}
          color="bg-gradient-to-br from-green-400 to-green-600"
        />
        <StatCard
          title="Sua Posição"
          value={`#${stats?.ranking || 0}`}
          icon={<TrendingUp size={32} />}
          color="bg-gradient-to-br from-purple-400 to-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Progresso */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={24} />
            Seu Progresso
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPontos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="pontos"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorPontos)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Próximas Metas */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap size={24} />
            Próximas Metas
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">50 pontos</p>
                <p className="text-sm text-gray-600">80/50</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
              <p className="text-xs text-green-600 mt-1">✓ Concluído!</p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">150 pontos</p>
                <p className="text-sm text-gray-600">80/150</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '53%' }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 mt-1">70 pontos restantes</p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">500 pontos</p>
                <p className="text-sm text-gray-600">80/500</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: '16%' }}
                ></div>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                420 pontos restantes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividade Recente */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock size={24} />
            Atividade Recente
          </h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 pb-4 border-b last:border-b-0"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  {activity.type === 'plano' && <BookOpen size={20} />}
                  {activity.type === 'ia' && <Zap size={20} />}
                  {activity.type === 'experiencia' && <Star size={20} />}
                  {activity.type === 'like' && <Award size={20} />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.timestamp}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">+{activity.points}</p>
                  <p className="text-xs text-gray-600">pontos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Habilidades BNCC */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen size={24} />
            Habilidades BNCC
          </h2>
          <div className="space-y-4">
            {skillsProgress.map((skill) => (
              <div key={skill.code}>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-medium">{skill.name}</p>
                  <p className="text-sm text-gray-600">{skill.progress}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      skill.progress > 80
                        ? 'bg-green-500'
                        : skill.progress > 50
                        ? 'bg-blue-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${skill.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2">
          Pronto para criar algo novo? 🚀
        </h2>
        <p className="mb-4">
          Crie um novo plano de aula ou compartilhe uma experiência exitosa
        </p>
        <div className="flex gap-4">
          <a href="/planos/criar" className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100">
            Novo Plano
          </a>
          <a href="/experiencias/criar" className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-800">
            Compartilhar Experiência
          </a>
        </div>
      </div>
    </div>
  );
}
