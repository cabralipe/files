'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import Link from 'next/link'

interface SearchResult {
  skills: any[]
  experiences: any[]
  users: any[]
  plans: any[]
}

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({
    skills: [],
    experiences: [],
    users: [],
    plans: [],
  })
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        performSearch()
      } else {
        setResults({
          skills: [],
          experiences: [],
          users: [],
          plans: [],
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const performSearch = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
      const data = await response.json()
      if (data.success) {
        setResults(data.results)
        setShowResults(true)
      }
    } catch (err) {
      console.error('Erro ao buscar:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalResults =
    results.skills.length +
    results.experiences.length +
    results.users.length +
    results.plans.length

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar skills, experiências, usuários..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length > 0 && setShowResults(true)}
          className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults({
                skills: [],
                experiences: [],
                users: [],
                plans: [],
              })
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Buscando...</div>
          ) : totalResults === 0 && query.trim().length > 0 ? (
            <div className="p-4 text-center text-gray-500">Nenhum resultado encontrado</div>
          ) : (
            <div className="divide-y">
              {/* Skills Results */}
              {results.skills.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 font-semibold text-sm text-gray-700">
                    Skills ({results.skills.length})
                  </div>
                  {results.skills.map((skill) => (
                    <Link
                      key={skill.id}
                      href={`/skills?q=${encodeURIComponent(skill.name)}`}
                      className="block px-4 py-2 hover:bg-gray-50 transition"
                      onClick={() => setShowResults(false)}
                    >
                      <p className="font-medium text-gray-900">{skill.name}</p>
                      <p className="text-xs text-gray-500">{skill.category}</p>
                    </Link>
                  ))}
                </div>
              )}

              {/* Experiences Results */}
              {results.experiences.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 font-semibold text-sm text-gray-700">
                    Experiências ({results.experiences.length})
                  </div>
                  {results.experiences.map((exp) => (
                    <Link
                      key={exp.id}
                      href={`/experiences/${exp.id}`}
                      className="block px-4 py-2 hover:bg-gray-50 transition"
                      onClick={() => setShowResults(false)}
                    >
                      <p className="font-medium text-gray-900">{exp.title}</p>
                      <p className="text-xs text-gray-500">{exp.user?.name}</p>
                    </Link>
                  ))}
                </div>
              )}

              {/* Users Results */}
              {results.users.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 font-semibold text-sm text-gray-700">
                    Usuários ({results.users.length})
                  </div>
                  {results.users.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.id}`}
                      className="block px-4 py-2 hover:bg-gray-50 transition flex items-center gap-3"
                      onClick={() => setShowResults(false)}
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
                          👤
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.points} pontos</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Plans Results */}
              {results.plans.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 font-semibold text-sm text-gray-700">
                    Planos ({results.plans.length})
                  </div>
                  {results.plans.map((plan) => (
                    <Link
                      key={plan.id}
                      href={`/plans/${plan.id}`}
                      className="block px-4 py-2 hover:bg-gray-50 transition"
                      onClick={() => setShowResults(false)}
                    >
                      <p className="font-medium text-gray-900">{plan.title}</p>
                      <p className="text-xs text-gray-500">{plan.user?.name}</p>
                    </Link>
                  ))}
                </div>
              )}

              {/* View All Results */}
              {totalResults > 0 && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(query)}`)
                      setShowResults(false)
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                  >
                    Ver todos os resultados →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
