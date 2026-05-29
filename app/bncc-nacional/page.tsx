'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Skill = {
  id: string
  code: string
  disciplina: string
  ano: string
  unidade_tematica: string
  objeto_conhecimento: string
  habilidade: string
  habilidade_raw: string
}

const PAGE_SIZE = 24

const discColor: Record<string, string> = {
  'Computação': 'tcd',
  'Língua Portuguesa': 'tp',
  'Matemática': 'tm',
  'Ciências': 'tc',
  'Arte': 'ta',
  'Língua Inglesa': 'ti',
  'História': 'th',
  'Geografia': 'tg',
  'Educação Física': 'tef',
  'Ensino Religioso': 'ter',
}

function normalizeText(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function BnccNacionalPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [query, setQuery] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [ano, setAno] = useState('')
  const [unidade, setUnidade] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/bncc-nacional-skills.json')
      .then((r) => r.json())
      .then(setSkills)
  }, [])

  useEffect(() => { setPage(1) }, [query, disciplina, ano, unidade])
  useEffect(() => { setUnidade('') }, [disciplina])

  const disciplinas = useMemo(() => [...new Set(skills.map((s) => s.disciplina))].sort(), [skills])

  const anos = useMemo(() => {
    const base = disciplina ? skills.filter((s) => s.disciplina === disciplina) : skills
    const all = base.flatMap((s) => s.ano.split(',').map((a) => a.trim())).filter(Boolean)
    return [...new Set(all)].sort((a, b) => {
      const num = (x: string) => parseInt(x) || 999
      return num(a) - num(b)
    })
  }, [skills, disciplina])

  const unidades = useMemo(() => {
    const base = disciplina ? skills.filter((s) => s.disciplina === disciplina) : skills
    return [...new Set(base.map((s) => s.unidade_tematica).filter(Boolean))].sort()
  }, [skills, disciplina])

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    return skills.filter((s) => {
      const text = normalizeText(`${s.code} ${s.habilidade} ${s.disciplina} ${s.unidade_tematica} ${s.objeto_conhecimento}`)
      const matchText = q ? text.includes(q) : true
      const matchDisc = disciplina ? s.disciplina === disciplina : true
      const matchAno = ano ? s.ano.includes(ano) : true
      const matchUnidade = unidade ? s.unidade_tematica === unidade : true
      return matchText && matchDisc && matchAno && matchUnidade
    })
  }, [skills, query, disciplina, ano, unidade])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <div className="logo">
            <div className="logo-ic" style={{ background: 'var(--blue)' }}>BN</div>
            <div>
              <div className="logo-t">BNCC Nacional</div>
              <div className="logo-s">Base Nacional Comum Curricular · Todas as disciplinas</div>
            </div>
          </div>
          <nav className="hdr-nav" aria-label="Navegação">
            <Link className="nb" href="/">← Portal BNCC Computação</Link>
          </nav>
        </div>
      </header>

      <section className="pg">
        <div className="bnac-hero">
          <h1 className="bnac-title">Base Nacional Comum Curricular</h1>
          <p className="bnac-sub">
            {skills.length > 0
              ? `${skills.length.toLocaleString('pt-BR')} habilidades · ${disciplinas.length} disciplinas · Educação Básica completa`
              : 'Carregando habilidades...'}
          </p>
        </div>

        <div className="fbar">
          <div className="sw">
            <span className="sw-icon">⌕</span>
            <input
              type="search"
              placeholder="Pesquisar por código, habilidade, disciplina ou unidade temática"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} aria-label="Filtrar por disciplina">
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={ano} onChange={(e) => setAno(e.target.value)} aria-label="Filtrar por ano">
            <option value="">Todos os anos</option>
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} aria-label="Filtrar por unidade temática" disabled={!disciplina}>
            <option value="">Unidades temáticas</option>
            {unidades.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <span className="fcount">
            {filtered.length === 0
              ? '0 resultados'
              : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
          </span>
        </div>

        <div className="grid">
          {paged.map((skill) => (
            <article className="scard bnac-card" key={skill.id}>
              <div className="ctags">
                <span className={`tag ${discColor[skill.disciplina] || 'tm'}`}>{skill.disciplina}</span>
                <span className="tag ta">{skill.ano}</span>
              </div>
              {skill.code && <div className="ceixo">{skill.code}</div>}
              <h2 className="cobj">{skill.unidade_tematica}</h2>
              <p className="chab">{skill.habilidade}</p>
              {expanded === skill.id && (
                <p className="bnac-objeto">
                  <strong>Objeto:</strong> {skill.objeto_conhecimento}
                </p>
              )}
              <div className="cacts">
                <button
                  className="bsm bdet"
                  onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}
                >
                  {expanded === skill.id ? 'Fechar' : 'Detalhes'}
                </button>
                <Link
                  className="bsm bsug"
                  href={`/?q=${encodeURIComponent(skill.disciplina)}`}
                >
                  Ver no portal
                </Link>
              </div>
            </article>
          ))}
        </div>

        {skills.length === 0 && (
          <div className="bnac-loading">
            <div className="bnac-spinner" />
            <p>Carregando habilidades da BNCC...</p>
          </div>
        )}

        {skills.length > 0 && filtered.length === 0 && (
          <div className="bnac-empty">
            <p>Nenhuma habilidade encontrada para os filtros selecionados.</p>
            <button className="bsm bdet" onClick={() => { setQuery(''); setDisciplina(''); setAno(''); setUnidade('') }}>
              Limpar filtros
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="pg-nav" aria-label="Paginação">
            <button
              className="pg-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              ‹
            </button>

            {(() => {
              const items: (number | 'ellipsis')[] = []
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) items.push(i)
              } else {
                items.push(1)
                if (page > 3) items.push('ellipsis')
                for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                  items.push(i)
                }
                if (page < totalPages - 2) items.push('ellipsis')
                items.push(totalPages)
              }
              return items.map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e${idx}`} className="pg-ellipsis">…</span>
                ) : (
                  <button
                    key={item}
                    className={`pg-btn${page === item ? ' active' : ''}`}
                    onClick={() => setPage(item)}
                    aria-current={page === item ? 'page' : undefined}
                  >
                    {item}
                  </button>
                )
              )
            })()}

            <button
              className="pg-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Próxima página"
            >
              ›
            </button>
          </nav>
        )}
      </section>
    </main>
  )
}
