'use client'

import { useState, useMemo } from 'react'
import Link from '@/lib/m-link'

type Skill = {
  code: string
  discipline: string
  year: string
  campo: string
  pratica: string
  objeto: string
  habilidade: string
  desdobramento: string
}

const DISCIPLINE_COLORS: Record<string, string> = {
  'Língua Portuguesa': '#d62839',
  'Arte': '#9b5de5',
  'Educação Física': '#0096c7',
  'Geografia': '#06d6a0',
  'História': '#fb8500',
  'Ensino Religioso': '#4895ef',
  'Ciências': '#2dc653',
  'Matemática': '#023e8a',
  'História e Geografia de Atalaia': '#bc6c25',
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <span className="stat-n">{value}</span>
      <span className="stat-l">{label}</span>
    </div>
  )
}

export default function AnosIniciaisPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [year, setYear] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Load data lazily
  useMemo(() => {
    void import('../../../public/anos-iniciais-skills.json').then((mod) => {
      setSkills(mod.default as Skill[])
      setLoading(false)
    })
  }, [])

  const disciplines = useMemo(() => [...new Set(skills.map(s => s.discipline))].sort(), [skills])

  const years = useMemo(() => {
    const allYears = [...new Set(skills.map(s => s.year))]
    const ORDER = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano',
      '1º e 2º Ano', '3º ao 5º Ano', '1º ao 5º Ano',
      '1º e 2º Ano (EF)', '3º ao 5º Ano (EF)']
    return allYears.sort((a, b) => {
      const ia = ORDER.indexOf(a)
      const ib = ORDER.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b, 'pt-BR')
    })
  }, [skills])

  const filtered = useMemo(() => {
    return skills.filter(s => {
      if (discipline && s.discipline !== discipline) return false
      if (year && s.year !== year) return false
      if (query) {
        const q = normalizeText(query)
        return (
          normalizeText(s.code).includes(q) ||
          normalizeText(s.habilidade).includes(q) ||
          normalizeText(s.objeto).includes(q) ||
          normalizeText(s.campo).includes(q) ||
          normalizeText(s.discipline).includes(q)
        )
      }
      return true
    })
  }, [skills, discipline, year, query])

  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <div className="logo">
            <div className="logo-ic" style={{ background: '#06d6a0', color: '#fff' }}>AI</div>
            <div>
              <div className="logo-t">Referencial Curricular · Anos Iniciais</div>
              <div className="logo-s">Secretaria Municipal de Educação · Atalaia/AL</div>
            </div>
          </div>
          <nav className="hdr-nav" aria-label="Navegação">
            <Link className="nb" href="..">← Portal Computação</Link>
          </nav>
        </div>
      </header>

      {/* Portal switcher */}
      <div style={{
        background: '#f8f9fb',
        borderBottom: '1px solid #e2e6ee',
        padding: '8px 20px',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#888', marginRight: 4 }}>Referencial:</span>
        <Link
          href=".."
          style={{
            padding: '4px 14px',
            borderRadius: 20,
            background: 'white',
            border: '1px solid #ccc',
            fontSize: 13,
            color: '#555',
            textDecoration: 'none',
            fontWeight: 400,
          }}
        >
          💻 BNCC Computação
        </Link>
        <span style={{
          padding: '4px 14px',
          borderRadius: 20,
          background: '#1a1a2e',
          color: 'white',
          fontSize: 13,
          fontWeight: 600,
        }}>
          📚 Anos Iniciais
        </span>
      </div>

      <section className="pg">
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888' }}>
            Carregando habilidades...
          </div>
        ) : (
          <>
            <div className="stats">
              <Stat value={skills.length} label="habilidades" />
              <Stat value={disciplines.length} label="disciplinas" />
              <Stat value={years.length} label="anos/etapas" />
              <Stat value={filtered.length} label="resultados" />
            </div>

            <div className="fbar">
              <div className="sw">
                <span className="sw-icon">⌕</span>
                <input
                  type="search"
                  placeholder="Pesquisar por código, habilidade ou objeto..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select value={discipline} onChange={e => setDiscipline(e.target.value)} aria-label="Filtrar por disciplina">
                <option value="">Todas as disciplinas</option>
                {disciplines.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select value={year} onChange={e => setYear(e.target.value)} aria-label="Filtrar por ano">
                <option value="">Todos os anos</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {(discipline || year || query) && (
                <button
                  onClick={() => { setDiscipline(''); setYear(''); setQuery('') }}
                  style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                >
                  ✕ Limpar
                </button>
              )}
            </div>

            <div className="skill-list">
              {filtered.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>
                  Nenhuma habilidade encontrada com os filtros aplicados.
                </div>
              ) : (
                filtered.map(skill => {
                  const color = DISCIPLINE_COLORS[skill.discipline] ?? '#666'
                  const isOpen = expanded === skill.code
                  return (
                    <div
                      key={skill.code}
                      className={`sk ${isOpen ? 'sk-open' : ''}`}
                      onClick={() => setExpanded(isOpen ? null : skill.code)}
                      style={{ cursor: 'pointer', borderLeft: `4px solid ${color}` }}
                    >
                      <div className="sk-tags" style={{ marginBottom: 6 }}>
                        <span
                          className="sk-tag"
                          style={{
                            background: color + '18',
                            color,
                            border: `1px solid ${color}33`,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            marginRight: 4,
                          }}
                        >
                          {skill.discipline}
                        </span>
                        <span
                          style={{
                            background: '#f0f0f0',
                            color: '#555',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            marginRight: 4,
                          }}
                        >
                          {skill.year}
                        </span>
                        <span
                          style={{
                            background: '#1a1a2e',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          {skill.code}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{skill.objeto}</div>
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{skill.habilidade}</div>
                      {isOpen && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                            <strong>Campo:</strong> {skill.campo} &nbsp;·&nbsp;
                            <strong>Prática:</strong> {skill.pratica}
                          </p>
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                            Desdobramento territorializado:
                          </p>
                          <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
                            {skill.desdobramento}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
