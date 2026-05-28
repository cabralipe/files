const apiKey = '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';
const fallbackKey = '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';

async function testModel(modelName, key, label) {
  console.log(`\nTestando ${label} (${modelName})...`);
  const callStartTime = Date.now();
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Diga "Olá" em 3 palavras.' }],
        temperature: 0.7,
        max_tokens: 50,
        stream: false
      })
    });
    const duration = Date.now() - callStartTime;
    console.log(`Status ${label}:`, res.status, `| Tempo: ${duration}ms`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Resposta ${label}:`, data.choices?.[0]?.message?.content?.trim());
    } else {
      const text = await res.text();
      console.error(`Erro ${label}:`, text.slice(0, 150));
    }
  } catch (error) {
    console.error(`Exceção ${label}:`, error.message);
  }
}

async function run() {
  // Testar Gemma 4 31B
  await testModel('google/gemma-4-31b-it', fallbackKey, 'Gemma-4-31b');
  
  // Testar GLM 5.1
  await testModel('z-ai/glm-5.1', apiKey, 'GLM-5.1');

  // Testar DeepSeek v4 Pro
  await testModel('deepseek-ai/deepseek-v4-pro', apiKey, 'DeepSeek-v4-Pro');
}

run();
