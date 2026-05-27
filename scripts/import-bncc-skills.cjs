const fs = require('fs')
const path = require('path')

const sourcePath =
  process.argv[2] || 'C:/Users/Felipe Cabral/Downloads/_MConverter.eu_BNNC DOCUMENTO FINAL.md'
const outPath = process.argv[3] || path.join(process.cwd(), 'bncc-skills.json')
const md = fs.readFileSync(sourcePath, 'utf8')
const lines = md.split(/\r?\n/)

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(new RegExp(String.fromCharCode(160), 'g'), ' ')
}

function fixMojibake(text) {
  return text
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã©/g, 'é')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/ÃŠ/g, 'Ê')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ã”/g, 'Ô')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Â/g, '')
    .replace(/â€“|â€”/g, '-')
    .replace(/â€œ|â€/g, '"')
    .replace(/â€˜|â€™/g, "'")
}

function cleanHtml(value) {
  return fixMojibake(decodeEntities(value))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\\/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanText(value) {
  return cleanHtml(value)
}

function gradeFromHeading(line) {
  const text = cleanText(line)
  const match = text.match(/(EDUCAÇÃO INFANTIL|[1-9]º\s*ANO)/i)
  if (!match) return null
  if (/INFANTIL/i.test(match[1])) return 'Educação Infantil'
  return match[1].replace(/\s+/g, ' ')
}

function componentFromLine(line) {
  const match = line.match(/COMPONENTE:\s*([^<*]+)/i)
  return match ? cleanText(match[1]) : ''
}

function subjectFromComponent(component) {
  const text = cleanText(component)
  if (/PORTUG/i.test(text)) return 'Português'
  if (/MATEM/i.test(text)) return 'Matemática'
  if (/CI|CIE|CIÊ|CIÃ/i.test(text) && /NCIA|NCIAS|NCIAS/i.test(text)) return 'Ciências'
  if (/HIST/i.test(text)) return 'História'
  if (/GEOG/i.test(text)) return 'Geografia'
  if (/F[ÍI]SICA/i.test(text)) return 'Educação Física'
  if (/INGL/i.test(text)) return 'Língua Inglesa'
  if (/RELIG/i.test(text)) return 'Ensino Religioso'
  if (/ARTE/i.test(text)) return 'Arte'
  return text || 'Computação'
}

function codeLike(value) {
  return /^(EI|EF)\d{2}[A-Z]{2,5}\d{2}$/i.test(value.trim())
}

function extractCode(value) {
  return value.match(/\b(EI|EF)\d{2}[A-Z]{2,5}\d{2}\b/i)?.[0] || ''
}

function competencyFromCode(code, fallback = '') {
  if (/CO|CP|PC|PM|PP/i.test(code)) return 'Pensamento Computacional'
  if (/MD|TM|CM|MATD/i.test(code)) return 'Mundo Digital'
  if (/CD|CC|TC|TD|TP/i.test(code)) return 'Cultura Digital'
  return fallback || 'Computação'
}

const skills = []
const seen = new Map()
let grade = ''
let component = ''
let axis = 'TECNOLOGIA'
let currentEiAxis = ''

function addSkill(skill) {
  if (!skill.code || !codeLike(skill.code)) return
  const key = skill.code.toUpperCase()
  const normalized = {
    code: key,
    name: cleanText(skill.name || key).slice(0, 160) || key,
    description: cleanText(skill.description || skill.name || key),
    grade_level:
      cleanText(skill.grade_level || '') ||
      (key.startsWith('EI') ? 'Educação Infantil' : key.match(/^EF(\d{2})/)?.[1] || ''),
    competency: cleanText(skill.competency || competencyFromCode(key)),
    subject: cleanText(skill.subject || 'Computação'),
    axis: cleanText(skill.axis || 'TECNOLOGIA').toUpperCase(),
  }

  if (!seen.has(key)) {
    seen.set(key, normalized)
    skills.push(normalized)
    return
  }

  const existing = seen.get(key)
  if (normalized.description.length > existing.description.length) {
    Object.assign(existing, normalized)
  }
}

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i]
  const gradeCandidate = gradeFromHeading(line)
  if (gradeCandidate) grade = gradeCandidate

  const componentCandidate = componentFromLine(line)
  if (componentCandidate) component = componentCandidate

  const eixoMatch = cleanText(line).match(/^EIXO:\s*(.+)$/i)
  if (eixoMatch) currentEiAxis = eixoMatch[1]

  if (!line.includes('<tr')) continue

  let row = line
  while (!row.includes('</tr>') && i + 1 < lines.length) {
    i += 1
    row += `\n${lines[i]}`
  }

  const rowComponentCandidate = componentFromLine(row)
  if (rowComponentCandidate) component = rowComponentCandidate

  const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
    cleanText(match[1]),
  )
  if (!cells.length) continue

  if (grade === 'Educação Infantil' && cells[0]) {
    const objectiveMatch = cells[0].match(/\((EI\d{2}[A-Z]{2}\d{2})\)\s*(.+)/i)
    if (objectiveMatch) {
      addSkill({
        code: objectiveMatch[1],
        name: objectiveMatch[2].replace(/[.;:]$/, ''),
        description: cells[0],
        grade_level: 'Educação Infantil',
        competency: currentEiAxis || competencyFromCode(objectiveMatch[1]),
        subject: 'Computação',
        axis: 'COMPUTAÇÃO',
      })
      continue
    }
  }

  const crm = extractCode(cells[cells.length - 1])
  if (!codeLike(crm)) continue

  let offset = 0
  if (cells.length >= 8) {
    if (cells[0]) axis = cells[0]
    offset = 1
  }

  const object = cells[offset] || crm
  const explanation = cells[offset + 2] || cells[offset + 1] || object

  addSkill({
    code: crm,
    name: object,
    description: explanation,
    grade_level: grade || crm.match(/^EF(\d{2})/)?.[1] || '',
    competency: competencyFromCode(crm),
    subject: subjectFromComponent(component),
    axis: axis || 'TECNOLOGIA',
  })
}

skills.sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }))
fs.writeFileSync(outPath, `${JSON.stringify({ skills }, null, 2)}\n`, 'utf8')

console.log(`Habilidades extraídas: ${skills.length}`)
console.log(`Arquivo atualizado: ${outPath}`)
