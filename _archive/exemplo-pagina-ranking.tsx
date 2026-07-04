// app/(dashboard)/ranking/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RankingEntry } from '@/types';
import { PodiumLeaders } from '@/components/ranking/PodiumLeaders';
import { RankingTable } from '@/components/ranking/RankingTable';
import { Trophy, Zap, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RankingPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Query para buscar ranking
  const { data: ranking, isLoading: queryLoading } = useQuery({
    queryKey: ['ranking'],
    queryFn: async () => {
      const response = await fetch('/api/ranking?limit=100');
      if (!response.ok) throw new Error('Erro ao buscar ranking');
      return response.json() as Promise<RankingEntry[]>;
    },
  });

  useEffect(() => {
    if (queryLoading) setIsLoading(true);
    else setIsLoading(false);
  }, [queryLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
          <Trophy className="text-yellow-500" size={40} />
          Ranking de Professores
        </h1>
        <p className="text-gray-600">
          Conheça os professores que mais contribuem com inovação na plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total de Professores</p>
              <p className="text-3xl font-bold mt-2">{ranking?.length || 0}</p>
            </div>
            <Trophy size={40} className="opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Maior Pontuação</p>
              <p className="text-3xl font-bold mt-2">
                {ranking?.[0]?.total_points || 0}
              </p>
            </div>
            <Zap size={40} className="opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Sua Posição</p>
              <p className="text-3xl font-bold mt-2">—</p>
            </div>
            <Star size={40} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-8">🏆 Top 3 Professores</h2>
        {ranking && <PodiumLeaders leaders={ranking} />}
      </div>

      {/* Full Ranking Table */}
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6">📊 Ranking Completo</h2>
        {ranking && <RankingTable data={ranking} />}
      </div>

      {/* Badges/Achievements */}
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-8 rounded-lg border border-orange-200">
        <h2 className="text-2xl font-bold mb-6">🎖️ Conquistas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-3xl mb-2">🚀</p>
            <p className="font-semibold text-sm">Lançador</p>
            <p className="text-xs text-gray-600 mt-1">Crie seu 1º plano</p>
          </div>
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-3xl mb-2">⭐</p>
            <p className="font-semibold text-sm">Destaque</p>
            <p className="text-xs text-gray-600 mt-1">50 pontos</p>
          </div>
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-3xl mb-2">🤖</p>
            <p className="font-semibold text-sm">IA Especialista</p>
            <p className="text-xs text-gray-600 mt-1">5 sugestões IA</p>
          </div>
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-3xl mb-2">🌟</p>
            <p className="font-semibold text-sm">Campeão</p>
            <p className="text-xs text-gray-600 mt-1">1º lugar 1 mês</p>
          </div>
        </div>
      </div>

      {/* Como Ganhar Pontos */}
      <div className="bg-blue-50 p-8 rounded-lg border border-blue-200">
        <h2 className="text-2xl font-bold mb-4">💡 Como Ganhar Pontos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3">
            <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              +10
            </div>
            <div>
              <p className="font-semibold">Criar um plano de aula</p>
              <p className="text-sm text-gray-600">Publique um novo plano</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              +5
            </div>
            <div>
              <p className="font-semibold">Usar sugestão de IA</p>
              <p className="text-sm text-gray-600">Melhore com IA</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              +25
            </div>
            <div>
              <p className="font-semibold">Compartilhar experiência</p>
              <p className="text-sm text-gray-600">Publique um case exitoso</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              +1
            </div>
            <div>
              <p className="font-semibold">Receber like</p>
              <p className="text-sm text-gray-600">Sua experiência foi apreciada</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
