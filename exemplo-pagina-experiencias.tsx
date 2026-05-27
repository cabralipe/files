// app/(dashboard)/experiencias/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SuccessfulExperience, Skill } from '@/types';
import { ExperienciaCard } from '@/components/experiencias/ExperienciaCard';
import Link from 'next/link';
import { Filter, Plus, Search, Award } from 'lucide-react';

const CATEGORIES = [
  { id: 'projeto', label: '🎯 Projeto' },
  { id: 'experimento', label: '🔬 Experimento' },
  { id: 'case', label: '✨ Case de Sucesso' },
];

const COMPETENCIES = [
  'Pensamento Computacional',
  'Mundo Digital',
  'Cultura Digital',
];

export default function ExperienciasPage() {
  const [category, setCategory] = useState('');
  const [competency, setCompetency] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Query com filtros
  const { data: result, isLoading } = useQuery({
    queryKey: ['experiencias', { category, competency, search, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (competency) params.append('competency', competency);
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', '12');

      const response = await fetch(`/api/experiencias?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar experiências');
      return response.json();
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
            <Award className="text-green-500" size={40} />
            Experiências Exitosas
          </h1>
          <p className="text-gray-600">
            Veja projetos, experimentos e cases de sucesso de outros professores
          </p>
        </div>
        <Link href="/experiencias/criar">
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Plus size={20} />
            Compartilhar Experiência
          </button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Filter size={20} />
          Filtros
        </h2>

        {/* Busca */}
        <div>
          <label className="block text-sm font-medium mb-2">Buscar</label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Digite para buscar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium mb-2">Categoria</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setCategory('');
                setPage(1);
              }}
              className={`p-2 rounded-lg text-sm font-medium transition ${
                !category
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={`p-2 rounded-lg text-sm font-medium transition ${
                  category === cat.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Competência */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Competência BNCC
          </label>
          <select
            value={competency}
            onChange={(e) => {
              setCompetency(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todas as competências</option>
            {COMPETENCIES.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : result?.data?.length ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.data.map((exp: SuccessfulExperience) => (
              <ExperienciaCard key={exp.id} experiencia={exp} />
            ))}
          </div>

          {/* Paginação */}
          {result.total > 12 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {page} de {Math.ceil(result.total / 12)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(result.total / 12)}
                className="px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            Nenhuma experiência encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            Seja o primeiro a compartilhar uma experiência exitosa!
          </p>
          <Link href="/experiencias/criar">
            <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              Compartilhar Experiência
            </button>
          </Link>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          💡 O que é uma Experiência Exitosa?
        </h3>
        <p className="text-green-800 mb-3">
          Compartilhe seus projetos, experimentos e cases de sucesso! Mostre
          como você integrou as habilidades da BNCC de forma inovadora,
          prática e impactante.
        </p>
        <ul className="list-disc list-inside text-green-800 space-y-1">
          <li>Descreva o projeto e seus objetivos</li>
          <li>Mostre quais habilidades BNCC foram trabalhadas</li>
          <li>Compartilhe os resultados e aprendizados</li>
          <li>Adicione imagens e documentos (opcional)</li>
        </ul>
      </div>
    </div>
  );
}
