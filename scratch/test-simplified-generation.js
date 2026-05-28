const apiKey = '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';

const prompt = `Você é especialista em educação básica e BNCC. Crie um PLANO DE AULA OBJETIVO e PRÁTICO para professores da rede pública municipal de Atalaia-AL.

DADOS DO PLANO:
• Professor(a): Eric
• Escola: Escola Municipal Jabes Francisco da Silva (Bairro Nova Olinda) — Atalaia/AL
• Ano/Turma: 5
• Componente Curricular: Computação
• Data: 28/05/2026
• Duração: 50 minutos
• Tema da Aula: Características dos materiais
• Recursos disponíveis: Quadro, caderno, celular ou computador compartilhado
• Observações do professor: nenhuma

▶ OBJETIVOS DO PROFESSOR (use como base):
(em branco — infira a partir do tema e das habilidades BNCC, e marque como sugestão da IA)

▶ METODOLOGIA ESCOLHIDA PELO PROFESSOR (use como base):
(em branco — proponha uma metodologia ativa compatível com o tema e marque como sugestão da IA)

HABILIDADES DA BNCC COMPUTAÇÃO (1 selecionadas):
[EF01CC01] Identificar características do próprio corpo e dos colegas, reconhecendo semelhanças e diferenças, usando recursos digitais para registro e expressão.

Escreva o plano de aula de forma concisa, direta ao ponto e objetiva seguindo EXATAMENTE este formato:

════════════════════════════════════════════
PLANO DE AULA: CARACTERÍSTICAS DOS MATERIAIS
════════════════════════════════════════════

▌ IDENTIFICAÇÃO
Professor(a): Eric
Escola: Escola Municipal Jabes Francisco da Silva | Município: Atalaia - AL
Ano/Turma: 5 | Componente: Computação
Data: 28/05/2026 | Duração: 50 minutos
Tema: Características dos materiais

────────────────────────────────────────────
▌ OBJETIVOS
────────────────────────────────────────────
OBJETIVO GERAL:
[Uma frase clara e concisa com verbo na Taxonomia de Bloom]

OBJETIVOS ESPECÍFICOS:
• [objetivo específico 1 — derivado da intenção do professor]
• [objetivo específico 2 — derivado das habilidades selecionadas]
• [objetivo específico 3 — prático e observável]

────────────────────────────────────────────
▌ HABILIDADES DA BNCC COMPUTAÇÃO
────────────────────────────────────────────
[EF01CC01] Identificar características do próprio corpo e dos colegas, reconhecendo semelhanças e diferenças, usando recursos digitais para registro e expressão.

────────────────────────────────────────────
▌ CONTEÚDOS (Conceituais, Procedimentais e Atitudinais)
────────────────────────────────────────────
• [conteúdo conceitual — o que saber]
• [conteúdo procedimental — saber fazer]
• [conteúdo atitudinal — saber ser]

────────────────────────────────────────────
▌ METODOLOGIA
────────────────────────────────────────────
[1-2 parágrafos objetivos explicando como a metodologia ativa se aplica a esta aula e como o pensamento computacional se integra com a realidade dos alunos em Atalaia-AL.]

────────────────────────────────────────────
▌ DESENVOLVIMENTO DA AULA (Momento Inicial, Desenvolvimento e Encerramento)
────────────────────────────────────────────
🟢 MOMENTO INICIAL (Aquecimento e Contextualização) [⏱ 10 min]:
[Como iniciar a aula conectando com o cotidiano local em Atalaia. Seja conciso, máximo 60 palavras.]

🔵 DESENVOLVIMENTO (Construção do Conhecimento) [⏱ 30 min]:
[Passo a passo prático da atividade principal usando os recursos disponíveis. Seja objetivo, máximo 120 palavras.]

🟡 ENCERRAMENTO (Síntese e Sistematização) [⏱ 10 min]:
[Como consolidar o aprendizado em grupo. Máximo 40 palavras.]

────────────────────────────────────────────
▌ RECURSOS DIDÁTICOS e AVALIAÇÃO
────────────────────────────────────────────
RECURSOS: [lista curta de recursos e uso]
AVALIAÇÃO: [mecanismo formativo simples e critérios essenciais]

────────────────────────────────────────────
▌ REFERÊNCIAS
────────────────────────────────────────────
• BRASIL. Base Nacional Comum Curricular (BNCC). Brasília: MEC, 2017.
• [referência 2 complementar sobre computação/educação]

════════════════════════════════════════════
Plano elaborado com base na BNCC Computação
Secretaria Municipal de Educação de Atalaia/AL
28/05/2026
════════════════════════════════════════════

ATENÇÃO: Seja altamente conciso, prático e vá direto ao ponto. Evite rodeios ou introduções. Escreva textos curtos e focados para que o plano seja gerado extremamente rápido.`;

async function test() {
  console.log("Iniciando geração do plano simplificado com z-ai/glm-5.1...");
  const callStartTime = Date.now();
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'z-ai/glm-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
        chat_template_kwargs: { enable_thinking: true, clear_thinking: false }
      })
    });
    console.log("Status:", res.status);
    const duration = Date.now() - callStartTime;
    console.log(`Duração total: ${duration}ms`);
    if (!res.ok) {
      const text = await res.text();
      console.error("Erro da API:", text);
      return;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    console.log(`Tamanho do plano: ${content.length} caracteres.`);
    console.log("\nPlano Gerado:\n", content);
  } catch (error) {
    console.error("Exceção:", error);
  }
}

test();
