/**
 * Seed do currículo de Colônia Leopoldina (RCCL) no tenant colonia-leopoldina-al.
 * Lê colonia-leopoldina-skills.json e faz upsert das skills vinculadas ao município.
 * Isolado: NÃO toca nas skills de outros municípios.
 *
 * Pré-requisito: rode antes o colonia-leopoldina-1-estrutura.sql (cria o município
 * e o índice único por (code, municipality_id)).
 *
 * Uso:
 *   node scripts/seed-colonia-leopoldina.cjs
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// carrega .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const SLUG = 'colonia-leopoldina-al'
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  // 1) descobre o id do município
  const { data: muni, error: mErr } = await supabase
    .from('municipalities').select('id').eq('slug', SLUG).maybeSingle()
  if (mErr || !muni) {
    console.error(`Município ${SLUG} não encontrado. Rode antes colonia-leopoldina-1-estrutura.sql.`)
    process.exit(1)
  }
  const municipality_id = muni.id

  // 2) lê o currículo
  const file = path.join(process.cwd(), 'colonia-leopoldina-skills.json')
  const { skills } = JSON.parse(fs.readFileSync(file, 'utf8'))
  const rows = skills.map((s) => ({
    code: s.code, name: s.name, description: s.description,
    grade_level: s.grade_level, competency: s.competency,
    subject: s.subject, axis: s.axis, municipality_id,
  }))

  // 3) upsert em lotes (conflito por code + municipality_id)
  const batch = 200
  let done = 0
  for (let i = 0; i < rows.length; i += batch) {
    const slice = rows.slice(i, i + batch)
    const { error } = await supabase
      .from('skills')
      .upsert(slice, { onConflict: 'code,municipality_id', ignoreDuplicates: false })
    if (error) { console.error('Erro no lote', i, error.message); process.exit(1) }
    done += slice.length
    console.log(`${done}/${rows.length}`)
  }

  const { count } = await supabase
    .from('skills').select('*', { count: 'exact', head: true })
    .eq('municipality_id', municipality_id)
  console.log(`OK. Total de habilidades em ${SLUG}: ${count}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
