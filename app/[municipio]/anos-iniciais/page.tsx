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

const DISCIPLINE_COLORS: Record<string, { bg: string; fg: string }> = {
  'Língua Portuguesa': { bg: 'var(--red-wash)',    fg: 'var(--red-deep)' },
  'Arte':             { bg: 'var(--plum-wash)',    fg: 'var(--plum)' },
  'Educação Física':  { bg: 'var(--blue-wash)',    fg: 'var(--blue)' },
  'Geografia':        { bg: 'var(--teal-wash)',    fg: 'var(--teal)' },
  'História':         { bg: 'var(--mustard-wash)', fg: 'var(--mustard-deep)' },
  'Ensino Religioso': { bg: 'var(--blue-wash)',    fg: 'var(--blue-deep)' },
  'Ciências':         { bg: 'var(--teal-wash)',    fg: 'var(--teal-deep)' },
  'Matemática':       { bg: 'var(--red-wash)',     fg: 'var(--red-deep)' },
  'História e Geografia de Atalaia': { bg: 'var(--mustard-wash)', fg: 'var(--mustard-deep)' },
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="sc">
      <div className="sc-ic" />
      <div>
        <div className="sc-n">{value}</div>
        <div className="sc-l">{label}</div>
      </div>
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
      '1º e 2º Ano', '3º ao 5º Ano', '1º ao 5º Ano']
    return allYears.sort((a, b) => {
      const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1; if (ib !== -1) return 1
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
            <div className="logo-ic ai-ic" />
            <div>
              <div className="logo-t">Referencial Curricular · Anos Iniciais</div>
              <div className="logo-s">Secretaria Municipal de Educação · Atalaia/AL</div>
            </div>
          </div>
          <nav className="hdr-nav" aria-label="Navegação">
            <Link className="nb" href="/">← Portais</Link>
            <Link className="nb" href="/computacao">💻 BNCC Computação</Link>
          </nav>
        </div>
      </header>

      <section className="pg">
        {loading ? (
          <div className="ai-loading">
            <div className="ai-loading-spin" />
            <span>Carregando referencial...</span>
          </div>
        ) : (
          <>
            <div className="stats">
              <StatCard value={skills.length} label="habilidades" />
              <StatCard value={disciplines.length} label="disciplinas" />
              <StatCard value={years.length} label="anos/etapas" />
              <StatCard value={filtered.length} label="resultados" />
            </div>

            <div className="fbar">
              <div className="sw">
                <span className="sw-icon">⌕</span>
                <input
                  type="search"
                  placeholder="Pesquisar por código, habilidade, objeto ou disciplina..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select value={discipline} onChange={e => setDiscipline(e.target.value)} aria-label="Filtrar por disciplina">
                <option value="">Todas as disciplinas</option>
                {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={year} onChange={e => setYear(e.target.value)} aria-label="Filtrar por ano">
                <option value="">Todos os anos</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {(discipline || year || query) && (
                <button
                  className="btn btn-out ai-clear"
                  onClick={() => { setDiscipline(''); setYear(''); setQuery('') }}
                >
                  ✕ Limpar
                </button>
              )}
              <span className="fcount">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {filtered.length === 0 ? (
              <div className="est">Nenhuma habilidade encontrada com os filtros aplicados.</div>
            ) : (
              <div className="ai-list">
                {filtered.map(skill => {
                  const color = DISCIPLINE_COLORS[skill.discipline] ?? { bg: 'var(--paper-deep)', fg: 'var(--ink)' }
                  const isOpen = expanded === skill.code
                  return (
                    <article
                      key={skill.code}
                      className={`ai-card${isOpen ? ' ai-card-open' : ''}`}
                      onClick={() => setExpanded(isOpen ? null : skill.code)}
                    >
                      <div className="ai-card-top">
                        <div className="ai-card-tags">
                          <span className="ai-chip ai-chip-disc" style={{ background: color.bg, color: color.fg, borderColor: color.fg + '44' }}>
                            {skill.discipline}
                          </span>
                          <span className="ai-chip">{skill.year}</span>
                          <span className="ai-chip ai-chip-code">{skill.code}</span>
                        </div>
                        <div className="ai-card-obj">{skill.objeto}</div>
                        <p className="ai-card-hab">{skill.habilidade}</p>
                        <div className="ai-card-toggle">{isOpen ? '▲' : '▼'}</div>
                      </div>

                      {isOpen && (
                        <div className="ai-card-detail" onClick={e => e.stopPropagation()}>
                          {(skill.campo || skill.pratica) && (
                            <p className="ai-card-meta">
                              {skill.campo && <><strong>Campo:</strong> {skill.campo}</>}
                              {skill.campo && skill.pratica && ' · '}
                              {skill.pratica && <><strong>Prática:</strong> {skill.pratica}</>}
                            </p>
                          )}
                          <p className="ai-card-desdobr-label">Desdobramento territorializado:</p>
                          <p className="ai-card-desdobr">{skill.desdobramento}</p>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>

      <style>{`
        /* logo override for AI variant */
        .ai-ic::before { content: "AI" !important; font-size: 14px !important; letter-spacing: -.05em; }
        .ai-ic { background: var(--teal) !important; }

        /* loading */
        .ai-loading {
          display: flex; align-items: center; gap: 12px;
          padding: 80px 0; justify-content: center;
          font-family: var(--font-mono); font-size: 13px; color: var(--ink-muted);
        }
        .ai-loading-spin {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid var(--ink); border-top-color: transparent;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* clear button */
        .ai-clear { padding: 8px 14px; font-size: 12px; }

        /* skill list */
        .ai-list { display: flex; flex-direction: column; gap: 10px; }

        /* skill card */
        .ai-card {
          background: var(--paper-soft);
          border: 2.5px solid var(--ink);
          box-shadow: 3px 3px 0 var(--ink);
          cursor: pointer;
          transition: transform .12s, box-shadow .12s;
          position: relative;
        }
        .ai-card:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--ink); }
        .ai-card-open { box-shadow: 5px 5px 0 var(--ink); }

        .ai-card-top {
          padding: 16px 42px 16px 16px;
          position: relative;
        }

        .ai-card-tags {
          display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;
        }

        .ai-chip {
          font-family: var(--font-mono); font-size: 10px; font-weight: 600;
          text-transform: uppercase; letter-spacing: .1em;
          padding: 3px 8px;
          border: 1.5px solid var(--ink);
          background: var(--paper);
          color: var(--ink);
        }
        .ai-chip-disc {
          border-width: 1.5px;
        }
        .ai-chip-code {
          background: var(--ink); color: var(--paper-soft);
          font-weight: 700;
        }

        .ai-card-obj {
          font-family: var(--font-mono); font-size: 10px; text-transform: uppercase;
          letter-spacing: .08em; color: var(--ink-muted); margin-bottom: 6px;
          font-weight: 500;
        }

        .ai-card-hab {
          font-size: 14px; line-height: 1.55; color: var(--ink); font-weight: 500;
          font-family: var(--font-body);
        }

        .ai-card-toggle {
          position: absolute; top: 16px; right: 16px;
          font-size: 10px; color: var(--ink-muted);
          font-family: var(--font-mono);
        }

        /* expanded detail */
        .ai-card-detail {
          border-top: 2px solid var(--ink);
          background: var(--paper);
          padding: 16px;
        }

        .ai-card-meta {
          font-family: var(--font-mono); font-size: 11px; color: var(--ink-muted);
          margin-bottom: 12px;
        }
        .ai-card-meta strong { color: var(--ink); }

        .ai-card-desdobr-label {
          font-family: var(--font-mono); font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .12em; color: var(--ink);
          margin-bottom: 8px;
        }

        .ai-card-desdobr {
          font-size: 13px; line-height: 1.7; color: var(--ink-soft);
          white-space: pre-wrap; font-family: var(--font-body);
        }

        @media (max-width: 600px) {
          .ai-card-top { padding: 14px 38px 14px 14px; }
        }
      `}</style>
    </main>
  )
}
