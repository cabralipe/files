const fs = require('node:fs')
const path = require('node:path')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function extractText(payload) {
  if (payload.output_text) return payload.output_text.trim()

  return (payload.output || [])
    .filter((item) => !item.type || item.type === 'message')
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .filter(Boolean)
    .join('\n')
    .trim()
}

loadEnvFile(path.join(__dirname, '..', '.env.local'))

const apiKey = process.env.OPENAI_API_KEY
const model = process.env.OPENAI_MODEL || 'gpt-5-nano'
const maxTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 3000)
const reasoningEffort = process.env.OPENAI_REASONING_EFFORT || 'minimal'
const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 30000)

if (!apiKey) {
  throw new Error('Configure OPENAI_API_KEY em .env.local antes de testar.')
}

const prompt = `Voce e especialista em educacao basica, BNCC Computacao e tecnologia educacional. Gere um plano de aula pronto para uso por professores da rede municipal de Atalaia-AL.

DADOS DO PLANO:
- Professor(a): Eric
- Escola: Escola Municipal Jabes Francisco da Silva | Municipio: Atalaia-AL
- Ano/Turma: 5 ano
- Componente Curricular: Computacao
- Data: 28/05/2026
- Duracao: 50 minutos
- Tema: Caracteristicas dos materiais
- Recursos disponiveis: Quadro, caderno, celular ou computador compartilhado
- Observacoes: nenhuma

OBJETIVOS DO PROFESSOR:
[Sugestao da IA - ajuste conforme sua intencao pedagogica] Inferir objetivos a partir do tema e das habilidades selecionadas.

METODOLOGIA INFORMADA:
[Sugestao da IA - ajuste conforme sua intencao pedagogica] Propor metodologia ativa simples e viavel para a turma.

HABILIDADES DA BNCC COMPUTACAO (1 selecionada):
[EF01CC01] Identificar caracteristicas do proprio corpo e dos colegas, reconhecendo semelhancas e diferencas, usando recursos digitais para registro e expressao.

Escreva em portugues do Brasil, com linguagem clara, direta e pratica. O plano deve ser completo, mas curto: entre 500 e 800 palavras. Evite introducoes longas, decoracao visual e repeticoes.

Use exatamente esta estrutura:
PLANO DE AULA
1. IDENTIFICACAO
2. OBJETIVOS
3. HABILIDADES BNCC
4. CONTEUDOS
5. METODOLOGIA
6. DESENVOLVIMENTO DA AULA
7. RECURSOS DIDATICOS
8. AVALIACAO
9. REFERENCIAS

Feche com: Plano elaborado com base na BNCC Computacao - Secretaria Municipal de Educacao de Atalaia/AL.`

async function main() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    console.log(`Testando ${model} com timeout ${timeoutMs}ms, max_output_tokens ${maxTokens}, reasoning ${reasoningEffort}...`)

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: maxTokens,
        reasoning: { effort: reasoningEffort },
        text: { verbosity: 'low' },
        store: false,
      }),
      signal: controller.signal,
    })

    const elapsed = Date.now() - startedAt
    console.log(`Status: ${response.status}`)
    console.log(`Duracao: ${elapsed}ms`)

    if (!response.ok) {
      console.error(await response.text())
      process.exitCode = 1
      return
    }

    const data = await response.json()
    const content = extractText(data)
    const words = content.split(/\s+/).filter(Boolean).length

    console.log(`Caracteres: ${content.length}`)
    console.log(`Palavras: ${words}`)
    console.log(`Tokens: ${JSON.stringify(data.usage || {})}`)
    console.log(`Dentro do alvo de tempo: ${elapsed <= timeoutMs ? 'sim' : 'nao'}`)
    console.log('\nPrevia:\n')
    console.log(content.slice(0, 2200))
  } catch (error) {
    const elapsed = Date.now() - startedAt
    console.error(`Falha apos ${elapsed}ms:`, error)
    process.exitCode = 1
  } finally {
    clearTimeout(timer)
  }
}

main()
