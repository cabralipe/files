const apiKey = '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';

const prompt = `Você é especialista em educação básica e BNCC. Crie um PLANO DE AULA OBJETIVO e PRÁTICO para professores da rede pública municipal de Atalaia-AL.

DADOS DO PLANO:
• Professor: Eric
• Escola: Escola Municipal Jabes Francisco
• Ano/Turma: 5
• Componente: Computação
• Tema da Aula: Características dos materiais
• Habilidades: EF01CC01

Escreva o plano no seguinte formato conciso e direto:
PLANO DE AULA: CARACTERÍSTICAS DOS MATERIAIS
OBJETIVOS: [objetivos curtos]
DESENVOLVIMENTO: [passo a passo de até 150 palavras]
AVALIAÇÃO: [critérios curtos]`;

async function test() {
  console.log("Chamando GLM-5.1 SEM THINKING...");
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
        max_tokens: 600,
        stream: false
        // Sem chat_template_kwargs de thinking!
      })
    });
    console.log("Status:", res.status);
    const duration = Date.now() - callStartTime;
    console.log(`Duração: ${duration}ms`);
    if (!res.ok) {
      const text = await res.text();
      console.error("Erro da API:", text);
      return;
    }
    const data = await res.json();
    console.log("Payload de Resposta Cru:\n", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Exceção:", error);
  }
}

test();
