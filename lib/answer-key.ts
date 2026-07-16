const ANSWER_KEY_HEADING = /^GABARITO(?:\s+COMENTADO|\s+E\s+CRIT[ÉE]RIOS\s+DE\s+CORRE[ÇC][ÃA]O)?\s*:?$/i
const FOOTER_START = /^(?:DOCUMENTO|MATERIAL|LISTA|ATIVIDADE)\s+ELABORAD[AO]\b|^\(A IA\b/i

function normalizedLine(line: string) {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^\*\*(.*)\*\*$/, '$1')
    .trim()
}

export function hasAnswerKey(content: string): boolean {
  return content.split(/\r?\n/).some((line) => ANSWER_KEY_HEADING.test(normalizedLine(line)))
}

/** Retorna a versão destinada ao aluno, preservando eventuais rodapés institucionais. */
export function withoutAnswerKey(content: string): string {
  const lines = content.split(/\r?\n/)
  const start = lines.findIndex((line) => ANSWER_KEY_HEADING.test(normalizedLine(line)))
  if (start < 0) return content

  const relativeEnd = lines.slice(start + 1).findIndex((line) => FOOTER_START.test(normalizedLine(line)))
  const end = relativeEnd < 0 ? lines.length : start + 1 + relativeEnd
  return [...lines.slice(0, start), ...lines.slice(end)]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
