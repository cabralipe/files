'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from '@/lib/m-link'
import { useMunicipality } from '@/lib/municipality-context'

type Skill = { code: string; subject?: string }

// Classificação de cada habilidade em um segmento, a partir do código.
function segOf(code: string): 'ei' | 'anos-iniciais' | 'anos-finais' | 'eja' | null {
  if (!code) return null
  if (code.startsWith('EJA')) return 'eja'
  if (code.startsWith('EI')) return 'ei'
  if (code.startsWith('EF')) {
    const yr = code.slice(2, 4)
    if (['06', '07', '08', '09', '67', '69', '89'].includes(yr)) return 'anos-finais'
    return 'anos-iniciais' // 01..05, 12, 15, 35 e demais
  }
  return null
}

const CARDS: Record<
  string,
  { stamp: string; cls: string; tag: string; title: [string, string]; desc: string; pills: string[] }
> = {
  ei: {
    stamp: 'EI',
    cls: 'portal-card-ai',
    tag: 'Referencial Curricular',
    title: ['Educação', 'Infantil'],
    desc: 'Campos de experiência da Educação Infantil, com desdobramentos territorializados para a realidade do município.',
    pills: ['Creche e Pré-escola', 'Campos de experiência'],
  },
  'anos-iniciais': {
    stamp: 'AI',
    cls: 'portal-card-ai',
    tag: 'Referencial Curricular',
    title: ['Anos', 'Iniciais'],
    desc: 'Referencial Curricular territorializado para o Ensino Fundamental — Anos Iniciais, contextualizado para o município.',
    pills: ['1º ao 5º Ano', 'Todas as disciplinas'],
  },
  'anos-finais': {
    stamp: 'AF',
    cls: 'portal-card-af',
    tag: 'Referencial Curricular',
    title: ['Anos', 'Finais'],
    desc: 'Referencial Curricular territorializado para o Ensino Fundamental — Anos Finais, contextualizado para o município.',
    pills: ['6º ao 9º Ano', 'Todas as disciplinas'],
  },
  eja: {
    stamp: 'EJA',
    cls: 'portal-card-comp',
    tag: 'Referencial Curricular',
    title: ['Educação de Jovens', 'e Adultos'],
    desc: 'Habilidades do 1º e 2º segmentos da EJA, com práticas voltadas ao mundo do trabalho e ao território.',
    pills: ['1º e 2º Segmentos', 'Práticas e territórios'],
  },
  computacao: {
    stamp: 'CO',
    cls: 'portal-card-comp',
    tag: 'BNCC Computação',
    title: ['BNCC', 'Computação'],
    desc: 'Complemento da BNCC Computação: pensamento computacional, cultura digital e mundo digital, contextualizado para o município.',
    pills: ['Pensamento computacional', 'Cultura digital'],
  },
}

// Computação é um eixo por componente (categoria), não uma etapa: por isso é
// contado separadamente, pelo subject normalizado das habilidades.
const ORDER = ['ei', 'anos-iniciais', 'anos-finais', 'eja', 'computacao'] as const

export default function MunicipioHome() {
  const { municipality } = useMunicipality()
  const name = municipality?.name || 'Município'
  const uf = municipality?.state || ''
  const secretaria = `Secretaria Municipal de Educação · ${name}${uf ? '/' + uf : ''}`

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/skills')
      .then((r) => r.json())
      .then((payload) => {
        if (!active) return
        const c: Record<string, number> = {}
        for (const s of (payload?.data || []) as Skill[]) {
          const k = segOf(s.code)
          if (k) c[k] = (c[k] || 0) + 1
          // Computação é transversal às etapas: conta pelo componente.
          if (s.subject === 'Computação') c.computacao = (c.computacao || 0) + 1
        }
        setCounts(c)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    return () => {
      active = false
    }
  }, [])

  const cards = useMemo(() => ORDER.filter((k) => (counts[k] || 0) > 0), [counts])

  return (
    <main>
      <section className="pg portal-sel-pg">
        <div className="portal-sel-hero">
          <p className="portal-sel-eyebrow">{secretaria}</p>
          <h1 className="portal-sel-title">Qual portal você quer acessar?</h1>
          <p className="portal-sel-sub">Escolha o referencial curricular para começar.</p>
          <p className="portal-sel-hint">
            O <strong>referencial curricular</strong> é o documento que organiza o que os alunos devem aprender
            em cada etapa. Escolha abaixo o referencial da etapa em que você atua — nele você explora as
            habilidades de {name} e cria planos de aula com ajuda de IA.
          </p>
        </div>

        <div className="portal-sel-grid">
          {!loaded && <p className="portal-sel-sub">Carregando habilidades de {name}…</p>}
          {loaded && cards.length === 0 && (
            <p className="portal-sel-sub">Nenhuma habilidade cadastrada para este município ainda.</p>
          )}
          {cards.map((k) => {
            const c = CARDS[k]
            const total = counts[k] || 0
            const href = k === 'computacao'
              ? `/computacao?subject=${encodeURIComponent('Computação')}`
              : `/computacao?seg=${k}`
            return (
              <Link key={k} href={href} className={`portal-card ${c.cls}`}>
                <div className="portal-card-stamp">{c.stamp}</div>
                <div className="portal-card-body">
                  <div className="portal-card-tag">
                    {c.tag} · {name}
                  </div>
                  <h2 className="portal-card-title">
                    {c.title[0]}
                    <br />
                    {c.title[1]}
                  </h2>
                  <p className="portal-card-desc">{c.desc}</p>
                  <div className="portal-card-pills">
                    {c.pills.map((p) => (
                      <span key={p}>{p}</span>
                    ))}
                    <span>{total} habilidades</span>
                  </div>
                </div>
                <div className="portal-card-arrow">→</div>
              </Link>
            )
          })}
        </div>

        <div className="portal-how">
          <div className="portal-how-title">Como funciona, em 3 passos</div>
          <div className="portal-how-grid">
            <div className="portal-how-step">
              <span className="portal-how-n">1</span>
              <div>
                <strong>Escolha o referencial</strong>
                <p>Clique no card da etapa em que você atua. Só aparecem as etapas com habilidades cadastradas em {name}.</p>
              </div>
            </div>
            <div className="portal-how-step">
              <span className="portal-how-n">2</span>
              <div>
                <strong>Explore as habilidades</strong>
                <p>Busque por código ou palavra-chave, filtre por disciplina e ano, e veja o desdobramento de cada habilidade para a realidade de {name}.</p>
              </div>
            </div>
            <div className="portal-how-step">
              <span className="portal-how-n">3</span>
              <div>
                <strong>Gere planos de aula com IA</strong>
                <p>Selecione habilidades, preencha os dados da aula e a IA escreve um plano completo — editável, salvável e exportável em PDF.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="portal-faq">
          <div className="portal-faq-title">Dúvidas frequentes</div>

          <details className="portal-faq-item">
            <summary>Qual portal devo escolher?</summary>
            <p>
              Depende da etapa em que você leciona: professores da <strong>Educação Infantil</strong>, dos
              <strong> Anos Iniciais</strong> (1º–5º), dos <strong>Anos Finais</strong> (6º–9º) ou da
              <strong> EJA</strong> acessam o card correspondente. Cada card abre o explorador de habilidades
              já filtrado para aquela etapa.
            </p>
          </details>

          <details className="portal-faq-item">
            <summary>O que é um referencial curricular?</summary>
            <p>
              É o documento oficial que organiza <strong>o que os alunos devem aprender</strong> em cada etapa e
              disciplina. O referencial de {name} é <strong>territorializado</strong>: parte da BNCC
              (Base Nacional Comum Curricular) e contextualiza cada habilidade para a história, a cultura e a
              realidade do município.
            </p>
          </details>

          <details className="portal-faq-item">
            <summary>O que significa cada código (ex.: EF67LP01)?</summary>
            <p>
              É o código oficial da habilidade na BNCC. <strong>EF</strong> indica Ensino Fundamental,
              os números seguintes indicam o(s) ano(s) (<strong>67</strong> = 6º e 7º ano), as letras indicam o
              componente (<strong>LP</strong> = Língua Portuguesa, <strong>MA</strong> = Matemática...) e o número
              final é a posição da habilidade na sequência.
            </p>
          </details>

          <details className="portal-faq-item">
            <summary>O que é o "desdobramento territorializado"?</summary>
            <p>
              É a versão da habilidade adaptada para {name}: sugestões de como trabalhar o mesmo objetivo de
              aprendizagem usando exemplos, espaços e saberes locais do município. Você vê o desdobramento ao
              clicar em <strong>"Detalhes"</strong> em qualquer habilidade.
            </p>
          </details>

          <details className="portal-faq-item">
            <summary>Como a IA gera os planos de aula? Preciso de conta?</summary>
            <p>
              Você seleciona as habilidades, informa tema, turma e objetivos, e a IA monta um plano completo
              (objetivos, metodologia, desenvolvimento da aula, avaliação) alinhado ao referencial. O plano é
              <strong> totalmente editável</strong> antes de salvar ou baixar em PDF. Para gerar e salvar planos,
              basta fazer login com sua conta de professor da rede.
            </p>
          </details>
        </div>
      </section>

      <style>{`
        .portal-sel-pg { min-height: calc(100vh - 74px); display: flex; flex-direction: column; justify-content: center; }
        .portal-sel-hero { text-align: center; margin-bottom: 40px; }
        .portal-sel-eyebrow { font-family: var(--font-mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .16em; color: var(--ink-muted); margin-bottom: 12px; }
        .portal-sel-title { font-family: var(--font-display); font-weight: 900; font-size: clamp(28px, 5vw, 52px); line-height: 1; letter-spacing: -.03em; color: var(--ink); font-variation-settings: "opsz" 144; margin-bottom: 12px; }
        .portal-sel-sub { font-size: 15px; color: var(--ink-muted); font-family: var(--font-mono); }
        .portal-sel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; max-width: 1200px; margin: 0 auto; }
        .portal-card { display: flex; flex-direction: column; gap: 20px; padding: 28px 24px 24px; border: 3px solid var(--ink); box-shadow: var(--stamp-lg); background: var(--paper-soft); text-decoration: none; color: var(--ink); transition: transform .15s, box-shadow .15s; position: relative; overflow: hidden; }
        .portal-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(var(--ink) 1px, transparent 1.4px); background-size: 8px 8px; opacity: .04; }
        .portal-card:hover { transform: translate(-3px, -3px); box-shadow: 8px 8px 0 var(--ink); }
        .portal-card-comp { background: var(--red-wash); }
        .portal-card-comp:hover { box-shadow: 8px 8px 0 var(--red-deep); }
        .portal-card-ai { background: var(--teal-wash); }
        .portal-card-ai:hover { box-shadow: 8px 8px 0 var(--teal-deep); }
        .portal-card-af { background: var(--blue-wash); }
        .portal-card-af:hover { box-shadow: 8px 8px 0 var(--blue-deep); }
        .portal-card-stamp { width: 52px; height: 52px; display: grid; place-items: center; border: 2px solid var(--ink); box-shadow: var(--stamp); font-family: var(--font-display); font-weight: 900; font-style: italic; font-size: 18px; transform: rotate(-3deg); flex-shrink: 0; }
        .portal-card-comp .portal-card-stamp { background: var(--red); color: var(--paper-soft); }
        .portal-card-ai .portal-card-stamp { background: var(--teal); color: var(--paper-soft); }
        .portal-card-af .portal-card-stamp { background: var(--blue); color: var(--paper-soft); }
        .portal-card-body { flex: 1; }
        .portal-card-tag { font-family: var(--font-mono); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .14em; color: var(--ink-muted); margin-bottom: 8px; }
        .portal-card-title { font-family: var(--font-display); font-weight: 900; font-size: 36px; line-height: .95; letter-spacing: -.03em; color: var(--ink); font-variation-settings: "opsz" 144; margin-bottom: 14px; }
        .portal-card-desc { font-size: 13px; line-height: 1.6; color: var(--ink-soft); margin-bottom: 16px; }
        .portal-card-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .portal-card-pills span { font-family: var(--font-mono); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; padding: 4px 10px; border: 1.5px solid var(--ink); background: var(--paper); color: var(--ink); }
        .portal-card-arrow { font-size: 24px; font-weight: 900; text-align: right; color: var(--ink-muted); transition: color .15s; }
        .portal-card:hover .portal-card-arrow { color: var(--ink); }
        .portal-sel-hint { max-width: 62ch; margin: 14px auto 0; font-size: 13.5px; line-height: 1.65; color: var(--ink-soft); }
        .portal-sel-hint strong { color: var(--ink); }
        .portal-how { max-width: 1200px; margin: 48px auto 0; }
        .portal-how-title, .portal-faq-title { font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .2em; color: var(--ink-muted); margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
        .portal-how-title::after, .portal-faq-title::after { content: ''; flex: 1; height: 2px; background: var(--ink-faint); }
        .portal-how-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .portal-how-step { display: flex; gap: 14px; align-items: flex-start; background: var(--paper-soft); border: 2px solid var(--ink); box-shadow: 4px 4px 0 var(--ink); padding: 16px 18px; }
        .portal-how-n { width: 32px; height: 32px; flex-shrink: 0; display: grid; place-items: center; border: 2px solid var(--ink); background: var(--mustard-wash); font-family: var(--font-display); font-weight: 900; font-size: 16px; transform: rotate(-3deg); }
        .portal-how-step strong { display: block; font-size: 14px; font-weight: 800; color: var(--ink); margin-bottom: 4px; }
        .portal-how-step p { font-size: 12.5px; line-height: 1.6; color: var(--ink-soft); margin: 0; }
        .portal-faq { max-width: 1200px; margin: 40px auto 24px; }
        .portal-faq-item { border: 2px solid var(--ink); background: var(--paper-soft); margin-bottom: 10px; box-shadow: 3px 3px 0 var(--ink); }
        .portal-faq-item summary { cursor: pointer; list-style: none; padding: 14px 18px; font-weight: 800; font-size: 14px; color: var(--ink); display: flex; align-items: center; gap: 10px; user-select: none; }
        .portal-faq-item summary::before { content: '+'; font-family: var(--font-display); font-weight: 900; font-size: 18px; color: var(--red); width: 18px; flex-shrink: 0; transition: transform .15s; }
        .portal-faq-item[open] summary::before { content: '−'; }
        .portal-faq-item summary::-webkit-details-marker { display: none; }
        .portal-faq-item summary:hover { background: var(--mustard-wash); }
        .portal-faq-item p { padding: 0 18px 16px 46px; font-size: 13px; line-height: 1.7; color: var(--ink-soft); margin: 0; }
        .portal-faq-item p strong { color: var(--ink); }
        @media (max-width: 600px) {
          .portal-sel-grid { grid-template-columns: 1fr; }
          .portal-card-title { font-size: 28px; }
          .portal-how { margin-top: 32px; }
          .portal-faq-item p { padding-left: 18px; }
        }
      `}</style>
    </main>
  )
}
