const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = 3000;
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || '';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

// ── Proxy NVIDIA API (streaming) ─────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + NVIDIA_KEY,
      },
      body: JSON.stringify(req.body),
    });

    res.setHeader('Content-Type',  upstream.headers.get('content-type') || 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');

    upstream.body.pipe(res);
  } catch (err) {
    console.error('Erro proxy:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   Portal BNCC Computação · Atalaia/AL        ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log('  ║                                              ║');
  console.log('  ║   Acesse no navegador:                       ║');
  console.log(`  ║   👉  http://localhost:${PORT}                  ║`);
  console.log('  ║                                              ║');
  console.log('  ║   Para encerrar: pressione Ctrl + C          ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');

  // Auto-open browser on Windows
  const { exec } = require('child_process');
  exec(`start http://localhost:${PORT}/portal_professor_bncc_v2.html`);
});
