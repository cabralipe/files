/**
 * Script para criar/promover um usuário para admin.
 * 
 * Uso:
 *   node scripts/create-admin.js                     # Cria admin@bncc.local com senha padrão
 *   node scripts/create-admin.js email@exemplo.com   # Promove um usuário existente para admin
 * 
 * O script utiliza a Supabase Auth Admin API (service role key) para:
 * 1. Criar um novo usuário admin ou promover um existente
 * 2. Definir user_metadata.role = 'admin'
 */

const fs = require('fs')

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) return
  const key = trimmed.substring(0, eqIndex).trim()
  const value = trimmed.substring(eqIndex + 1).trim()
  envVars[key] = value
})

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrado no .env.local')
  process.exit(1)
}

const targetEmail = process.argv[2] || 'admin@bncc.local'
const defaultPassword = process.argv[3] || process.env.ADMIN_DEFAULT_PASSWORD || null

if (!defaultPassword) {
  console.error('Defina a senha via argumento ou variavel ADMIN_DEFAULT_PASSWORD')
  console.error('   Ex: node scripts/create-admin.js admin@bncc.local "MinhaSenh@Forte"')
  process.exit(1)
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/auth/v1/admin/${endpoint}`
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
  }
  if (body) options.body = JSON.stringify(body)
  
  const response = await fetch(url, options)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`API Error (${response.status}): ${JSON.stringify(data)}`)
  }
  return data
}

async function main() {
  console.log('🔑 Criando/Promovendo superusuário admin...')
  console.log(`   Email: ${targetEmail}`)
  console.log(`   URL: ${SUPABASE_URL}`)
  console.log('')

  try {
    // List all users to check if exists
    const usersData = await apiCall('users')
    const existingUser = usersData.users?.find(u => u.email === targetEmail)

    if (existingUser) {
      console.log(`👤 Usuário encontrado (ID: ${existingUser.id}). Promovendo para admin...`)
      
      const updated = await apiCall(`users/${existingUser.id}`, 'PUT', {
        user_metadata: {
          ...existingUser.user_metadata,
          role: 'admin',
          name: existingUser.user_metadata?.name || 'Superusuário',
        }
      })
      
      console.log('✅ Usuário promovido para admin com sucesso!')
      console.log(`   ID: ${updated.id}`)
      console.log(`   Email: ${updated.email}`)
      console.log(`   Role: ${updated.user_metadata?.role}`)
    } else {
      console.log(`📝 Criando novo usuário admin...`)
      
      const created = await apiCall('users', 'POST', {
        email: targetEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          name: 'Superusuário',
          role: 'admin',
          school: '',
          subject: '',
        }
      })
      
      console.log('✅ Superusuário criado com sucesso!')
      console.log(`   ID: ${created.id}`)
      console.log(`   Email: ${created.email}`)
      console.log(`   Senha: ${defaultPassword}`)
      console.log(`   Role: ${created.user_metadata?.role}`)
      console.log('')
      console.log('⚠️  IMPORTANTE: Troque a senha após o primeiro login!')
    }
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

main()
