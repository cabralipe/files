// lib/pdf-riso.ts
// Gerador de PDF compartilhado no estilo risográfico (papel quente + tinta chapada)
// usado pelos planos de aula, PEI e PAEE. Preserva toda a acentuação do português:
// as fontes padrão do jsPDF usam WinAnsi, que cobre á é í ó ú â ê ô ã õ ç à ü etc.

export type RGB = [number, number, number]

export interface RisoMetaRow {
  label: string
  value: string
}

export interface RisoExtraLine {
  text: string
  bold?: boolean
  /** Desenha uma linha pontilhada de assinatura após o rótulo */
  signature?: boolean
}

export interface RisoExtraSection {
  title: string
  lines: RisoExtraLine[]
}

export interface RisoPdfOptions {
  /** Tipo do documento, ex.: 'PLANO DE AULA', 'PEI', 'PAEE' */
  docType: string
  /** Subtítulo logo abaixo do tipo, ex.: nome por extenso ou rede/secretaria */
  docSubtitle?: string
  /** Linha institucional pequena do cabeçalho */
  masthead?: string
  /** Título do documento (nome do plano / aluno) */
  title?: string
  /** Cor da tinta (padrão: vermelho coral riso) */
  ink?: RGB
  /** Bloco de identificação (rótulo/valor) */
  meta?: RisoMetaRow[]
  metaTitle?: string
  /** Conteúdo principal (texto gerado, com seções em CAIXA ALTA ou markdown) */
  body?: string
  /** Nomes extras de seção a detectar no corpo */
  sectionNames?: string[]
  /** Linhas a ignorar no corpo (ex.: título repetido) */
  skipLines?: string[]
  /** Seções fixas adicionadas após o corpo (colaboração AEE, família, assinaturas...) */
  extraSections?: RisoExtraSection[]
  /** Texto à esquerda do rodapé */
  footerLeft?: string
  /** Nome do arquivo .pdf */
  fileName: string
}

// ── Texto ──────────────────────────────────────────────────────────────────────

const MOJIBAKE: Array<[RegExp, string]> = [
  [/Ã¡/g, 'á'], [/Ã /g, 'à'], [/Ã¢/g, 'â'], [/Ã£/g, 'ã'], [/Ã¤/g, 'ä'],
  [/Ã©/g, 'é'], [/Ãª/g, 'ê'], [/Ã¨/g, 'è'],
  [/Ã­/g, 'í'], [/Ã®/g, 'î'], [/Ã¬/g, 'ì'],
  [/Ã³/g, 'ó'], [/Ã´/g, 'ô'], [/Ãµ/g, 'õ'], [/Ã²/g, 'ò'],
  [/Ãº/g, 'ú'], [/Ã»/g, 'û'], [/Ã¼/g, 'ü'],
  [/Ã§/g, 'ç'], [/Ã±/g, 'ñ'],
  [/Ã‰/g, 'É'], [/ÃŠ/g, 'Ê'], [/Ã‡/g, 'Ç'], [/Ã“/g, 'Ó'], [/Ã”/g, 'Ô'],
  [/Ã•/g, 'Õ'], [/Ãš/g, 'Ú'], [/Ã‚/g, 'Â'], [/Ãƒ/g, 'Ã'], [/Ã€/g, 'À'],
  [/â€“|â€”/g, '–'], [/â€œ|â€/g, '"'], [/â€˜|â€™/g, "'"], [/â€¢/g, '•'],
  [/â€¦/g, '...'], [/Â/g, ''],
]

/**
 * Limpa o texto para o PDF SEM remover acentos:
 * corrige mojibake (UTF-8 lido como Latin-1), remove marcações markdown de
 * negrito, emojis e caracteres de desenho de caixa que a fonte não possui.
 */
export function sanitizePdfText(value: string): string {
  if (!value) return ''
  let out = value
  if (/Ã|â€/.test(out)) {
    for (const [pattern, replacement] of MOJIBAKE) out = out.replace(pattern, replacement)
  }
  return out
    .replace(/\*\*/g, '')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/[═─━╴╶╸╺╼╾]/g, '-')
    .replace(/[▌▋▊▉█■◽◾▪▫]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/�/g, '')
    .replace(/[ \t]+$/gm, '')
}

/** Gera um nome de arquivo seguro a partir de um título acentuado. */
export function pdfSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ── Detecção de seções ─────────────────────────────────────────────────────────

const DEFAULT_SECTIONS = [
  'IDENTIFICAÇÃO', 'IDENTIFICACAO',
  'OBJETIVOS', 'OBJETIVOS DO PROFESSOR',
  'HABILIDADES DA BNCC', 'HABILIDADES DA BNCC COMPUTAÇÃO', 'HABILIDADES DA BNCC COMPUTACAO',
  'HABILIDADES DO REFERENCIAL CURRICULAR', 'HABILIDADES',
  'CONTEÚDOS', 'CONTEUDOS', 'METODOLOGIA',
  'DESENVOLVIMENTO', 'DESENVOLVIMENTO DA AULA',
  'RECURSOS', 'RECURSOS DIDÁTICOS', 'RECURSOS DIDATICOS', 'RECURSOS DE ACESSIBILIDADE',
  'AVALIAÇÃO', 'AVALIACAO', 'AVALIAÇÃO E MONITORAMENTO', 'AVALIACAO E MONITORAMENTO',
  'OBSERVAÇÕES', 'OBSERVACOES', 'REFERÊNCIAS', 'REFERENCIAS', 'CRONOGRAMA',
  // PEI / PAEE
  'PERFIL DO ESTUDANTE', 'POTENCIALIDADES', 'BARREIRAS', 'NECESSIDADES ESPECÍFICAS',
  'NECESSIDADES ESPECIFICAS', 'ADAPTAÇÕES CURRICULARES', 'ADAPTACOES CURRICULARES',
  'ADAPTAÇÕES', 'ADAPTACOES', 'METAS', 'METAS E OBJETIVOS', 'ESTRATÉGIAS', 'ESTRATEGIAS',
  'ESTRATÉGIAS PEDAGÓGICAS', 'ESTRATEGIAS PEDAGOGICAS', 'ORGANIZAÇÃO DO ATENDIMENTO',
  'ORGANIZACAO DO ATENDIMENTO', 'OBJETIVOS DO ATENDIMENTO', 'PLANO DE ATIVIDADES',
  'ATIVIDADES', 'PARCERIAS', 'ARTICULAÇÃO COM A SALA COMUM', 'ARTICULACAO COM A SALA COMUM',
  'ACOMPANHAMENTO', 'ENCAMINHAMENTOS',
]

function normalizeHeading(line: string): string {
  return line
    .replace(/^#+\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/:\s*$/, '')
    .trim()
}

function isSectionHeading(line: string, extra: Set<string>): boolean {
  const heading = normalizeHeading(line)
  if (!heading || heading.length > 70) return false
  const upper = heading.toUpperCase()
  if (extra.has(upper) || DEFAULT_SECTIONS.includes(upper)) return true
  if (/^#{1,3}\s/.test(line)) return true
  // Linha inteiramente em caixa alta = título de seção (evita códigos BNCC tipo EF05MA10)
  if (
    heading === upper &&
    /[A-ZÀ-Ü]/.test(heading) &&
    heading.length >= 4 &&
    !/\d{2}/.test(heading) &&
    !/^[-•(]/.test(heading)
  ) return true
  return false
}

// ── Gerador ────────────────────────────────────────────────────────────────────
// Paleta e linguagem visual idênticas ao site (globals.css):
// papel --paper, cards --paper-soft com borda grossa de tinta e sombra-carimbo
// deslocada, selo do logo rotacionado, títulos serifados e rótulos em mono.

const PAPER: RGB = [242, 233, 208]      // --paper       #F2E9D0
const CARD: RGB = [251, 245, 227]       // --paper-soft  #FBF5E3
const INK: RGB = [27, 26, 31]           // --ink         #1B1A1F
const INK_MUTED: RGB = [111, 106, 95]   // --ink-muted   #6F6A5F
const RISO_RED: RGB = [229, 57, 75]     // --red         #E5394B

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

export async function downloadRisoPdf(options: RisoPdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const accent: RGB = options.ink || RISO_RED
  const wash: RGB = mix(CARD, accent, 0.14)        // --*-wash sobre o card

  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const mx = 16
  const cw = pw - mx * 2
  const footerH = 17
  let y = 0

  const docType = sanitizePdfText(options.docType)
  const docSubtitle = sanitizePdfText(options.docSubtitle || '')
  const masthead = sanitizePdfText(options.masthead || '')
  const title = sanitizePdfText(options.title || '')

  const extraSections = new Set((options.sectionNames || []).map((s) => s.toUpperCase()))
  const skip = new Set(
    [
      options.docType,
      options.docSubtitle,
      options.title,
      `${docType} - ${docSubtitle}`,
      `${docType} – ${docSubtitle}`,
      `${docType}: ${docSubtitle}`,
      ...(options.skipLines || []),
    ]
      .filter(Boolean)
      .map((s) => sanitizePdfText(String(s)).toUpperCase().trim()),
  )

  function paper() {
    doc.setFillColor(...PAPER)
    doc.rect(0, 0, pw, ph, 'F')
  }

  /** Card do site: sombra-carimbo dura + borda grossa de tinta, cantos retos. */
  function stampRect(x: number, yy: number, w: number, h: number, fill: RGB, shadow = 1.4, border = 0.6, shadowColor: RGB = INK) {
    doc.setFillColor(...shadowColor)
    doc.rect(x + shadow, yy + shadow, w, h, 'F')
    doc.setFillColor(...fill)
    doc.setDrawColor(...INK)
    doc.setLineWidth(border)
    doc.rect(x, yy, w, h, 'FD')
  }

  /** Selo do logo (.logo-ic): quadrado de tinta chapada, rotacionado, com letra. */
  function logoStamp(x: number, yy: number, size: number, letter: string) {
    const rad = (-3 * Math.PI) / 180
    const ux = [Math.cos(rad) * size, Math.sin(rad) * size]
    const vy = [-Math.sin(rad) * size, Math.cos(rad) * size]
    const segs: Array<[number, number]> = [
      [ux[0], ux[1]],
      [vy[0], vy[1]],
      [-ux[0], -ux[1]],
      [-vy[0], -vy[1]],
    ]
    // sombra-carimbo
    doc.setFillColor(...INK)
    doc.lines(segs, x + 1.3, yy + 1.3, [1, 1], 'F', true)
    // bloco de tinta com borda
    doc.setFillColor(...accent)
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.55)
    doc.lines(segs, x, yy, [1, 1], 'FD', true)
    // letra central (serifada itálica, como o "B" do site)
    const cx = x + (ux[0] + vy[0]) / 2
    const cy = yy + (ux[1] + vy[1]) / 2
    doc.setTextColor(...CARD)
    if (letter.length <= 1) {
      doc.setFont('times', 'bolditalic')
      doc.setFontSize(size * 4.2)
    } else {
      doc.setFont('courier', 'bold')
      doc.setFontSize(letter.length > 3 ? size * 1.45 : size * 1.9)
    }
    doc.text(letter, cx, cy, { align: 'center', baseline: 'middle', angle: 3 })
  }

  function monoLabel(text: string, x: number, yy: number, size = 7, color: RGB = INK_MUTED, opts?: { align?: 'left' | 'right' | 'center'; maxWidth?: number }) {
    const label = text.toUpperCase()
    const charSpace = 0.45
    let fontSize = size
    doc.setFont('courier', 'bold')
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    // jsPDF não considera charSpace no alinhamento: medimos e posicionamos manualmente
    const measure = () => doc.getTextWidth(label) + charSpace * Math.max(0, label.length - 1)
    let width = measure()
    if (opts?.maxWidth && width > opts.maxWidth) {
      fontSize = Math.max(5, fontSize * (opts.maxWidth / width))
      doc.setFontSize(fontSize)
      width = measure()
    }
    const drawX = opts?.align === 'right' ? x - width : opts?.align === 'center' ? x - width / 2 : x
    doc.text(label, drawX, yy, { charSpace })
  }

  const logoLetter = docType.length <= 4 ? docType : 'B'

  // Cabeçalho compacto das páginas de continuação (como o header fixo do site)
  function continuationHeader() {
    logoStamp(mx, 9, 7, logoLetter.length <= 4 && logoLetter.length > 1 ? logoLetter : logoLetter.slice(0, 1))
    doc.setFont('times', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text(docType.toUpperCase(), mx + 11.5, 14.2)
    if (title) {
      const short = title.length > 44 ? `${title.slice(0, 43)}…` : title
      monoLabel(short, pw - mx, 14, 6.5, INK_MUTED, { align: 'right', maxWidth: cw * 0.55 })
    }
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.8)
    doc.line(mx, 19.5, pw - mx, 19.5)
    y = 27
  }

  function needPage(h = 8) {
    if (y + h <= ph - footerH) return
    doc.addPage()
    paper()
    continuationHeader()
  }

  function addWrapped(
    text: string,
    opts?: { size?: number; bold?: boolean; indent?: number; color?: RGB; gapAfter?: number },
  ) {
    const size = opts?.size ?? 9.5
    const indent = opts?.indent ?? 0
    const lh = size * 0.46
    const applyFont = () => {
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
      doc.setFontSize(size)
      doc.setTextColor(...(opts?.color || INK))
    }
    applyFont()
    const lines = doc.splitTextToSize(text, cw - indent) as string[]
    for (const line of lines) {
      needPage(lh + 1)
      applyFont() // a quebra de página altera fonte/cor no cabeçalho
      doc.text(line, mx + indent, y)
      y += lh
    }
    y += opts?.gapAfter ?? 1.6
  }

  function addBullet(text: string) {
    const size = 9.5
    const lh = size * 0.46
    const applyFont = () => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(size)
      doc.setTextColor(...INK)
    }
    applyFont()
    const indent = 5.2
    const lines = doc.splitTextToSize(text, cw - indent) as string[]
    lines.forEach((line, i) => {
      needPage(lh + 1)
      applyFont()
      if (i === 0) {
        // marcador quadrado com mini-sombra, como os blocos do site
        doc.setFillColor(...INK)
        doc.rect(mx + 1.1, y - 1.7, 1.8, 1.8, 'F')
        doc.setFillColor(...accent)
        doc.rect(mx + 0.6, y - 2.2, 1.8, 1.8, 'F')
      }
      doc.text(line, mx + indent, y)
      y += lh
    })
    y += 1.4
  }

  /** Título de seção no estilo do carimbo "✓ NO PLANO" dos cards do site. */
  function addSection(name: string) {
    needPage(18)
    y += 4
    const label = sanitizePdfText(normalizeHeading(name)).toUpperCase()
    doc.setFont('courier', 'bold')
    doc.setFontSize(8)
    const tw = doc.getTextWidth(label) + label.length * 0.45
    const chipW = Math.min(tw + 7, cw)
    const chipH = 7
    stampRect(mx, y - 5, chipW, chipH, accent, 1.2, 0.5)
    doc.setTextColor(...CARD)
    doc.text(label, mx + 3.5, y - 0.4, { charSpace: 0.45 })
    // filete até a margem direita, como as réguas dos cards
    if (chipW + 6 < cw) {
      doc.setDrawColor(...INK)
      doc.setLineWidth(0.4)
      doc.line(mx + chipW + 4, y - 1.5, pw - mx, y - 1.5)
    }
    y += 7.5
  }

  // ── Página 1: cabeçalho no estilo do site ─────────────────────────────────
  paper()

  if (masthead) monoLabel(masthead, pw - mx, 10, 6, INK_MUTED, { align: 'right', maxWidth: cw })

  logoStamp(mx, 12, 13, logoLetter)
  const headX = mx + 20
  doc.setFont('times', 'bold')
  doc.setFontSize(docType.length > 16 ? 17 : 23)
  doc.setTextColor(...INK)
  doc.text(docType.toUpperCase(), headX, 20, { maxWidth: cw - 20 })
  const dtLines = (doc.splitTextToSize(docType.toUpperCase(), cw - 20) as string[]).length
  let subY = 20 + (dtLines - 1) * (docType.length > 16 ? 7 : 9) + 5.5
  if (docSubtitle) {
    monoLabel(docSubtitle, headX, subY, 7.5, INK_MUTED)
    subY += 4
  }
  y = Math.max(subY + 4, 31)

  // régua dupla de tinta sob o cabeçalho (borda grossa do header do site)
  doc.setDrawColor(...INK)
  doc.setLineWidth(1.1)
  doc.line(mx, y, pw - mx, y)
  doc.setLineWidth(0.3)
  doc.line(mx, y + 1.7, pw - mx, y + 1.7)
  y += 9

  if (title) {
    doc.setFont('times', 'bold')
    doc.setFontSize(14.5)
    doc.setTextColor(...INK)
    const titleLines = doc.splitTextToSize(title.toUpperCase(), cw) as string[]
    for (const line of titleLines) {
      needPage(8)
      doc.text(line, mx, y)
      y += 6.6
    }
    y += 2.5
  }

  // ── Card de identificação (réplica do .scard) ─────────────────────────────
  if (options.meta && options.meta.length) {
    const rows = options.meta
      .map((row) => ({ label: sanitizePdfText(row.label).toUpperCase(), value: sanitizePdfText(row.value || '—') }))
      .filter((row) => row.label)
    const pad = 4
    const labelW = 33
    const valueW = cw - pad * 2 - labelW - 3
    const rowLines = rows.map((row) => (doc.splitTextToSize(row.value, valueW) as string[]))
    const lineH = 4.3
    const headerHeight = 7.5
    const boxH = headerHeight + pad +
      rowLines.reduce((acc, lines) => acc + Math.max(1, lines.length) * lineH + 1.6, 0) + 1

    needPage(boxH + 5)
    stampRect(mx, y, cw, boxH, CARD, 1.6, 0.65)

    // faixa de título do card em wash com borda inferior de tinta
    doc.setFillColor(...wash)
    doc.rect(mx + 0.33, y + 0.33, cw - 0.66, headerHeight - 0.5, 'F')
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.4)
    doc.line(mx, y + headerHeight, mx + cw, y + headerHeight)
    doc.setFillColor(...accent)
    doc.rect(mx + 3, y + 2.2, 3, 3, 'F')
    monoLabel(options.metaTitle || 'IDENTIFICAÇÃO', mx + 8.5, y + 5, 7.5, INK)

    let ry = y + headerHeight + pad + 1
    rows.forEach((row, i) => {
      monoLabel(row.label, mx + pad, ry, 6.5, INK_MUTED)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...INK)
      rowLines[i].forEach((line, j) => {
        doc.text(line, mx + pad + labelW + 3, ry + j * lineH)
      })
      ry += Math.max(1, rowLines[i].length) * lineH + 1.6
    })
    y += boxH + 8
  }

  // ── Corpo ─────────────────────────────────────────────────────────────────
  if (options.body) {
    const body = sanitizePdfText(options.body)
    body.split('\n').forEach((raw) => {
      const line = raw.trim()
      if (!line) { y += 1.8; return }
      const upper = line.toUpperCase().replace(/[:#]/g, '').trim()
      if (skip.has(upper) || skip.has(line.toUpperCase().trim())) return
      if (isSectionHeading(line, extraSections)) { addSection(line); return }
      if (/^[-•*]\s+/.test(line)) { addBullet(line.replace(/^[-•*]\s+/, '')); return }
      if (/^\d+[.)]\s/.test(line)) { addWrapped(line, { indent: 2 }); return }
      if (line.endsWith(':') || /^(Objetivo geral|Objetivos? espec|Momento inicial|Desenvolvimento|Encerramento|Acolhida|Retomada)/i.test(line)) {
        addWrapped(line, { bold: true, gapAfter: 1 })
        return
      }
      addWrapped(line)
    })
  }

  // ── Seções extras (AEE, família, assinaturas) ─────────────────────────────
  for (const section of options.extraSections || []) {
    addSection(section.title)
    for (const line of section.lines) {
      if (line.signature) {
        needPage(13)
        y += 5.5
        const label = sanitizePdfText(line.text)
        doc.setDrawColor(...INK)
        doc.setLineWidth(0.35)
        doc.setLineDashPattern([1, 1.1], 0)
        doc.line(mx + 2, y, mx + cw * 0.6, y)
        doc.setLineDashPattern([], 0)
        monoLabel(label, mx + 2, y + 3.6, 6.5, INK_MUTED)
        y += 8.5
      } else {
        addWrapped(sanitizePdfText(line.text), { bold: line.bold })
      }
    }
  }

  // ── Rodapé em todas as páginas (régua de tinta + mono, como o site) ──────
  const total = doc.getNumberOfPages()
  const today = new Date().toLocaleDateString('pt-BR')
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.8)
    doc.line(mx, ph - 12, pw - mx, ph - 12)
    if (options.footerLeft) monoLabel(options.footerLeft, mx, ph - 7.5, 6.5, INK_MUTED, { maxWidth: cw * 0.6 })
    // selinho de página em tinta, como o .nbadge do site
    const badge = `${p}/${total}`
    doc.setFont('courier', 'bold')
    doc.setFontSize(7)
    const bw = doc.getTextWidth(badge) + 3.4
    doc.setFillColor(...accent)
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.4)
    doc.rect(pw - mx - bw, ph - 10.6, bw, 4.6, 'FD')
    doc.setTextColor(...CARD)
    doc.text(badge, pw - mx - bw / 2, ph - 7.4, { align: 'center' })
    monoLabel(today, pw - mx - bw - 2.5, ph - 7.5, 6.5, INK_MUTED, { align: 'right' })
  }

  doc.save(options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`)
}
