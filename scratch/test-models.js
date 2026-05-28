const apiKey = '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';

async function test() {
  console.log("Iniciando teste de modelos NVIDIA NIM...");
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    console.log("Status da resposta:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("Erro da API:", text);
      return;
    }
    const data = await res.json();
    console.log("Modelos disponíveis (filtrados por 'deepseek' ou 'gemma' ou 'glm'):");
    const filtered = data.data.filter(m => 
      m.id.toLowerCase().includes('deepseek') || 
      m.id.toLowerCase().includes('gemma') || 
      m.id.toLowerCase().includes('glm')
    );
    filtered.forEach(m => console.log(` - ${m.id}`));
    console.log(`\nTotal de modelos compatíveis: ${filtered.length}`);
  } catch (error) {
    console.error("Erro ao fazer requisição:", error);
  }
}

test();
