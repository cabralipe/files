'use client'

import Link from '@/lib/m-link'

export default function MunicipioHome() {
  return (
    <main>
      <header id="hdr">
        <div className="hdr-in">
          <div className="logo">
            <div className="logo-ic" />
            <div>
              <div className="logo-t">Portal Educacional</div>
              <div className="logo-s">Secretaria Municipal de Educação · Atalaia/AL</div>
            </div>
          </div>
        </div>
      </header>

      <section className="pg portal-sel-pg">
        <div className="portal-sel-hero">
          <p className="portal-sel-eyebrow">Secretaria Municipal de Educação · Atalaia/AL</p>
          <h1 className="portal-sel-title">Qual portal você quer acessar?</h1>
          <p className="portal-sel-sub">Escolha o referencial curricular para começar.</p>
        </div>

        <div className="portal-sel-grid">
          {/* BNCC Computação */}
          <Link href="/computacao" className="portal-card portal-card-comp">
            <div className="portal-card-stamp">BN</div>
            <div className="portal-card-body">
              <div className="portal-card-tag">BNCC · Computação</div>
              <h2 className="portal-card-title">BNCC<br />Computação</h2>
              <p className="portal-card-desc">
                Habilidades do Ensino Fundamental de Computação. Crie planos de aula com IA, selecione
                habilidades e compartilhe experiências com outros professores.
              </p>
              <div className="portal-card-pills">
                <span>1º ao 9º Ano</span>
                <span>IA para planos</span>
                <span>Pensamento computacional</span>
              </div>
            </div>
            <div className="portal-card-arrow">→</div>
          </Link>

          {/* Anos Iniciais */}
          <Link href="/anos-iniciais" className="portal-card portal-card-ai">
            <div className="portal-card-stamp">AI</div>
            <div className="portal-card-body">
              <div className="portal-card-tag">Referencial Curricular · Atalaia</div>
              <h2 className="portal-card-title">Anos<br />Iniciais</h2>
              <p className="portal-card-desc">
                Referencial Curricular territorializado de Atalaia para o Ensino Fundamental — Anos Iniciais,
                com desdobramentos contextualizados para a realidade do município.
              </p>
              <div className="portal-card-pills">
                <span>1º ao 5º Ano</span>
                <span>9 disciplinas</span>
                <span>681 habilidades</span>
              </div>
            </div>
            <div className="portal-card-arrow">→</div>
          </Link>
        </div>
      </section>

      <style>{`
        .portal-sel-pg {
          min-height: calc(100vh - 74px);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .portal-sel-hero {
          text-align: center;
          margin-bottom: 40px;
        }
        .portal-sel-eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .16em;
          color: var(--ink-muted);
          margin-bottom: 12px;
        }
        .portal-sel-title {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: clamp(28px, 5vw, 52px);
          line-height: 1;
          letter-spacing: -.03em;
          color: var(--ink);
          font-variation-settings: "opsz" 144;
          margin-bottom: 12px;
        }
        .portal-sel-sub {
          font-size: 15px;
          color: var(--ink-muted);
          font-family: var(--font-mono);
        }
        .portal-sel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          max-width: 900px;
          margin: 0 auto;
        }
        .portal-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 28px 24px 24px;
          border: 3px solid var(--ink);
          box-shadow: var(--stamp-lg);
          background: var(--paper-soft);
          text-decoration: none;
          color: var(--ink);
          transition: transform .15s, box-shadow .15s;
          position: relative;
          overflow: hidden;
        }
        .portal-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(var(--ink) 1px, transparent 1.4px);
          background-size: 8px 8px;
          opacity: .04;
        }
        .portal-card:hover {
          transform: translate(-3px, -3px);
          box-shadow: 8px 8px 0 var(--ink);
        }
        .portal-card-comp { background: var(--red-wash); }
        .portal-card-comp:hover { box-shadow: 8px 8px 0 var(--red-deep); }
        .portal-card-ai { background: var(--teal-wash); }
        .portal-card-ai:hover { box-shadow: 8px 8px 0 var(--teal-deep); }
        .portal-card-stamp {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border: 2px solid var(--ink);
          box-shadow: var(--stamp);
          font-family: var(--font-display);
          font-weight: 900;
          font-style: italic;
          font-size: 18px;
          transform: rotate(-3deg);
          flex-shrink: 0;
        }
        .portal-card-comp .portal-card-stamp { background: var(--red); color: var(--paper-soft); }
        .portal-card-ai .portal-card-stamp { background: var(--teal); color: var(--paper-soft); }
        .portal-card-body { flex: 1; }
        .portal-card-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .14em;
          color: var(--ink-muted);
          margin-bottom: 8px;
        }
        .portal-card-title {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 36px;
          line-height: .95;
          letter-spacing: -.03em;
          color: var(--ink);
          font-variation-settings: "opsz" 144;
          margin-bottom: 14px;
        }
        .portal-card-desc {
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin-bottom: 16px;
        }
        .portal-card-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .portal-card-pills span {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .1em;
          padding: 4px 10px;
          border: 1.5px solid var(--ink);
          background: var(--paper);
          color: var(--ink);
        }
        .portal-card-arrow {
          font-size: 24px;
          font-weight: 900;
          text-align: right;
          color: var(--ink-muted);
          transition: color .15s;
        }
        .portal-card:hover .portal-card-arrow { color: var(--ink); }
        @media (max-width: 600px) {
          .portal-sel-grid { grid-template-columns: 1fr; }
          .portal-card-title { font-size: 28px; }
        }
      `}</style>
    </main>
  )
}
