import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env.local')

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=').trim()
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = value.replace(/^["']|["']$/g, '')
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Variaveis de ambiente nao configuradas')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'ok' : 'faltando')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'ok' : 'faltando')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seed() {
  const skillsPath = path.join(process.cwd(), 'bncc-skills.json')
  const skillsData = JSON.parse(fs.readFileSync(skillsPath, 'utf-8')) as {
    skills: Array<{
      code: string
      name: string
      description: string
      grade_level: string
      competency: string
      subject: string
      axis: string
    }>
  }
  const fullSchemaSkills = skillsData.skills.map((skill) => ({
    code: skill.code,
    name: skill.name,
    description: skill.description,
    grade_level: skill.grade_level,
    competency: skill.competency,
    subject: skill.subject,
    axis: skill.axis,
  }))

  const legacySchemaSkills = skillsData.skills.map((skill) => ({
    code: skill.code,
    name: skill.name,
    description: skill.description,
    category: skill.subject,
    grade_level: skill.grade_level,
    axis: skill.axis,
    active: true,
  }))

  console.log(`Importando ${fullSchemaSkills.length} habilidades...`)

  const batchSize = 100
  let imported = 0
  let useLegacySchema = false

  for (let index = 0; index < fullSchemaSkills.length; index += batchSize) {
    const batch = (useLegacySchema ? legacySchemaSkills : fullSchemaSkills).slice(
      index,
      index + batchSize,
    ) as any[]
    const { error } = await supabase.from('skills').upsert(batch, { onConflict: 'code' })

    if (error) {
      if (!useLegacySchema && error.message.includes('schema cache')) {
        useLegacySchema = true
        const legacyBatch = legacySchemaSkills.slice(index, index + batchSize)
        const retry = await supabase.from('skills').upsert(legacyBatch, { onConflict: 'code' })
        if (!retry.error) {
          imported += legacyBatch.length
          console.log(`${imported}/${fullSchemaSkills.length}`)
          continue
        }
        console.error('Erro ao importar habilidades:', retry.error.message)
        process.exit(1)
      }
      console.error('Erro ao importar habilidades:', error.message)
      process.exit(1)
    }

    imported += batch.length
    console.log(`${imported}/${fullSchemaSkills.length}`)
  }

  const importedCodes = new Set(fullSchemaSkills.map((skill) => skill.code))
  const { data: existingSkills, error: existingError } = await supabase.from('skills').select('code')

  if (existingError) {
    console.error('Erro ao verificar habilidades antigas:', existingError.message)
    process.exit(1)
  }

  const staleCodes = (existingSkills || [])
    .map((skill) => skill.code as string)
    .filter((code) => !importedCodes.has(code))

  for (let index = 0; index < staleCodes.length; index += batchSize) {
    const staleBatch = staleCodes.slice(index, index + batchSize)
    const { error } = await supabase.from('skills').delete().in('code', staleBatch)

    if (error) {
      console.error('Erro ao remover habilidades antigas:', error.message)
      process.exit(1)
    }
  }

  if (staleCodes.length) {
    console.log(`Habilidades antigas removidas: ${staleCodes.length}`)
  }

  const { count, error } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Erro ao contar habilidades:', error.message)
    process.exit(1)
  }

  console.log(`Total no banco: ${count}`)
}

seed().catch((error) => {
  console.error('Erro:', error instanceof Error ? error.message : error)
  process.exit(1)
})
