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
  'OBJETIVOS', 'OBJETIVO GERAL', 'OBJETIVOS ESPECÍFICOS', 'OBJETIVOS ESPECIFICOS',
  'OBJETIVOS DO PROFESSOR',
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

const PAPER: RGB = [250, 245, 227] // #FAF5E3
const RISO_RED: RGB = [229, 57, 75] // #E5394B
const BODY_INK: RGB = [30, 28, 24]

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

  const ink: RGB = options.ink || RISO_RED
  const tint: RGB = mix(PAPER, ink, 0.16) // tinta bem diluída para blocos
  const tintBorder: RGB = mix(PAPER, ink, 0.45)

  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const mx = 18
  const cw = pw - mx * 2
  const footerH = 18
  let y = 0

  const docType = sanitizePdfText(options.docType)
  const docSubtitle = sanitizePdfText(options.docSubtitle || '')
  const masthead = sanitizePdfText(options.masthead || '')
  const title = sanitizePdfText(options.title || '')

  const extraSections = new Set((options.sectionNames || []).map((s) => s.toUpperCase()))
  const skip = new Set(
    [options.docType, options.title, ...(options.skipLines || [])]
      .filter(Boolean)
      .map((s) => sanitizePdfText(String(s)).toUpperCase().trim()),
  )

  function paper() {
    doc.setFillColor(...PAPER)
    doc.rect(0, 0, pw, ph, 'F')
  }

  function rule(yy: number, width = 0.4, color: RGB = ink, dashed = false) {
    doc.setDrawColor(...color)
    doc.setLineWidth(width)
    if (dashed) doc.setLineDashPattern([1.1, 1.3], 0)
    doc.line(mx, yy, pw - mx, yy)
    if (dashed) doc.setLineDashPattern([], 0)
  }

  // Cabeçalho compacto das páginas de continuação
  function continuationHeader() {
    doc.setFont('courier', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...ink)
    doc.text(docType.toUpperCase(), mx, 14)
    if (title) {
      doc.setFont('courier', 'normal')
      doc.setTextColor(...BODY_INK)
      const short = title.length > 58 ? `${title.slice(0, 57)}…` : title
      doc.text(sanitizePdfText(short), pw - mx, 14, { align: 'right' })
    }
    rule(17, 0.5)
    y = 25
  }

  function needPage(h = 8) {
    if (y + h <= ph - footerH) return
    doc.addPage()
    paper()
    continuationHeader()
  }

  function addWrapped(
    text: string,
    opts?: { size?: number; bold?: boolean; indent?: number; color?: RGB; font?: 'helvetica' | 'courier'; gapAfter?: number },
  ) {
    const size = opts?.size ?? 9.5
    const indent = opts?.indent ?? 0
    const lh = size * 0.46
    doc.setFont(opts?.font || 'helvetica', opts?.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(opts?.color || BODY_INK))
    const lines = doc.splitTextToSize(text, cw - indent) as string[]
    for (const line of lines) {
      needPage(lh + 1)
      doc.text(line, mx + indent, y)
      y += lh
    }
    y += opts?.gapAfter ?? 1.6
  }

  function addBullet(text: string) {
    const size = 9.5
    const lh = size * 0.46
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...BODY_INK)
    const indent = 5
    const lines = doc.splitTextToSize(text, cw - indent) as string[]
    lines.forEach((line, i) => {
      needPage(lh + 1)
      if (i === 0) {
        doc.setFillColor(...ink)
        doc.rect(mx + 0.6, y - 2.1, 1.7, 1.7, 'F')
      }
      doc.text(line, mx + indent, y)
      y += lh
    })
    y += 1.4
  }

  function addSection(name: string) {
    needPage(16)
    y += 3
    const label = sanitizePdfText(normalizeHeading(name)).toUpperCase()
    // Bloco de tinta diluída atrás do título (efeito de sobreimpressão riso)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const tw = doc.getTextWidth(label)
    doc.setFillColor(...tint)
    doc.rect(mx - 1.5, y - 4.4, Math.min(tw + 7, cw + 3), 7, 'F')
    doc.setFillColor(...ink)
    doc.rect(mx - 1.5, y - 4.4, 2.2, 7, 'F')
    doc.setTextColor(...ink)
    doc.text(label, mx + 3.2, y + 0.4)
    doc.setDrawColor(...tintBorder)
    doc.setLineWidth(0.35)
    doc.setLineDashPattern([1.1, 1.3], 0)
    doc.line(mx + Math.min(tw + 7, cw - 2), y - 0.9, pw - mx, y - 0.9)
    doc.setLineDashPattern([], 0)
    y += 8.5
  }

  // ── Página 1: masthead risográfico ────────────────────────────────────────
  paper()
  y = 20

  if (masthead) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...mix(BODY_INK, PAPER, 0.25))
    doc.text(masthead.toUpperCase(), mx, y)
    y += 6
  }

  // Tipo do documento com leve "desregistro" de impressão riso
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...tintBorder)
  doc.text(docType.toUpperCase(), mx + 0.5, y + 0.5, { maxWidth: cw })
  doc.setTextColor(...ink)
  doc.text(docType.toUpperCase(), mx, y, { maxWidth: cw })
  const typeLines = (doc.splitTextToSize(docType.toUpperCase(), cw) as string[]).length
  y += typeLines * 9.2

  if (docSubtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...BODY_INK)
    doc.text(docSubtitle, mx, y, { maxWidth: cw })
    y += (doc.splitTextToSize(docSubtitle, cw) as string[]).length * 4.6 + 1
  }

  rule(y, 1.1)
  rule(y + 1.8, 0.35)
  y += 8

  if (title) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...BODY_INK)
    const titleLines = doc.splitTextToSize(title.toUpperCase(), cw) as string[]
    for (const line of titleLines) {
      needPage(7)
      doc.text(line, mx, y)
      y += 6.2
    }
    y += 2
  }

  // ── Bloco de identificação ────────────────────────────────────────────────
  if (options.meta && options.meta.length) {
    const rows = options.meta
      .map((row) => ({ label: sanitizePdfText(row.label).toUpperCase(), value: sanitizePdfText(row.value || '—') }))
      .filter((row) => row.label)
    const labelW = 34
    const valueW = cw - labelW - 8
    const rowLines = rows.map((row) => (doc.splitTextToSize(row.value, valueW) as string[]))
    const lineH = 4.4
    const padding = 4.5
    const headerHeight = 6.5
    const boxH = headerHeight + padding +
      rowLines.reduce((acc, lines) => acc + Math.max(1, lines.length) * lineH + 1.4, 0)

    needPage(boxH + 4)
    doc.setFillColor(...tint)
    doc.setDrawColor(...ink)
    doc.setLineWidth(0.45)
    doc.rect(mx, y, cw, boxH, 'FD')

    doc.setFont('courier', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...ink)
    doc.text((options.metaTitle || 'IDENTIFICAÇÃO').toUpperCase(), mx + 3, y + 4.6)
    doc.setDrawColor(...tintBorder)
    doc.setLineWidth(0.3)
    doc.line(mx + 3, y + headerHeight, mx + cw - 3, y + headerHeight)

    let ry = y + headerHeight + padding
    rows.forEach((row, i) => {
      doc.setFont('courier', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...ink)
      doc.text(row.label, mx + 3, ry)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...BODY_INK)
      rowLines[i].forEach((line, j) => {
        doc.text(line, mx + 3 + labelW, ry + j * lineH)
      })
      ry += Math.max(1, rowLines[i].length) * lineH + 1.4
    })
    y += boxH + 6
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
        needPage(12)
        y += 5
        const label = sanitizePdfText(line.text)
        doc.setDrawColor(...BODY_INK)
        doc.setLineWidth(0.3)
        doc.setLineDashPattern([0.9, 1.1], 0)
        doc.line(mx + 2, y, mx + cw * 0.62, y)
        doc.setLineDashPattern([], 0)
        doc.setFont('courier', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...mix(BODY_INK, PAPER, 0.2))
        doc.text(label.toUpperCase(), mx + 2, y + 3.6)
        y += 8
      } else {
        addWrapped(sanitizePdfText(line.text), { bold: line.bold })
      }
    }
  }

  // ── Rodapé em todas as páginas ────────────────────────────────────────────
  const total = doc.getNumberOfPages()
  const today = new Date().toLocaleDateString('pt-BR')
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setDrawColor(...ink)
    doc.setLineWidth(0.4)
    doc.setLineDashPattern([1.1, 1.3], 0)
    doc.line(mx, ph - 13, pw - mx, ph - 13)
    doc.setLineDashPattern([], 0)
    doc.setFont('courier', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...mix(BODY_INK, PAPER, 0.2))
    if (options.footerLeft) doc.text(sanitizePdfText(options.footerLeft), mx, ph - 8)
    doc.text(`PÁGINA ${p} DE ${total} · ${today}`, pw - mx, ph - 8, { align: 'right' })
  }

  doc.save(options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`)
}
