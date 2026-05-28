import { get, put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim().replace(/^["']|["']$/g, '')
}

function safeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function toImageProxyUrl(pathname: string) {
  return `/api/uploads/experience-image?pathname=${encodeURIComponent(pathname)}`
}

export async function GET(request: Request) {
  try {
    const token = getBlobToken()
    if (!token) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN nao configurado no ambiente da Vercel' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const pathname = searchParams.get('pathname') || ''

    if (!pathname.startsWith('experiences/')) {
      return NextResponse.json({ error: 'Imagem invalida' }, { status: 400 })
    }

    const result = await get(pathname, {
      access: 'private',
      token,
    })

    if (!result) {
      return NextResponse.json({ error: 'Imagem nao encontrada' }, { status: 404 })
    }

    if (result.statusCode === 304 || !result.stream) {
      return new Response(null, { status: 304 })
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        'Cache-Control': result.blob.cacheControl || 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erro ao carregar imagem da experiencia:', error)
    return NextResponse.json({ error: 'Nao foi possivel carregar a imagem' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request)
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo de imagem obrigatorio' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Envie apenas arquivos de imagem' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Imagem deve ter no maximo 5MB' }, { status: 400 })
    }

    const token = getBlobToken()
    if (!token) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN nao configurado no ambiente da Vercel' },
        { status: 500 }
      )
    }

    const fileName = safeFileName(file.name) || 'experiencia.jpg'
    const blob = await put(`experiences/${user.id}/${Date.now()}-${fileName}`, file, {
      access: 'private',
      contentType: file.type,
      token,
    })

    return NextResponse.json({
      success: true,
      data: {
        url: toImageProxyUrl(blob.pathname),
        pathname: blob.pathname,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Login obrigatorio' }, { status: 401 })
    }

    console.error('Erro ao enviar imagem da experiencia:', error)
    const detail = error instanceof Error ? `: ${error.message}` : ''
    return NextResponse.json({ error: `Nao foi possivel enviar a imagem${detail}` }, { status: 500 })
  }
}
