const apiKey = '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';

async function test() {
  console.log("Testando geração com deepseek-ai/deepseek-v4-flash...");
  const callStartTime = Date.now();
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/deepseek-v4-flash',
        messages: [{ role: 'user', content: 'Diga "Olá" em 3 palavras.' }],
        temperature: 0.7,
        max_tokens: 50,
        stream: false
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
    console.log("Resposta da IA:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Exceção:", error);
  }
}

test();
