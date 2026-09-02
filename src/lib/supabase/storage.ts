import { createClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://crhgebheptqlnwkupnvb.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabaseStorage = createClient(supabaseUrl, supabaseKey)

export const BUCKET_RECURSOS = 'recursos_eventos'

/**
 * Asegura que el bucket recursos_eventos exista y sea público en Supabase Storage
 */
export async function asegurarBucketRecursosEventos() {
  try {
    // 1. Intentar mediante la base de datos relacional de Supabase (100% confiable)
    await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('${BUCKET_RECURSOS}', '${BUCKET_RECURSOS}', true)
      ON CONFLICT (id) DO UPDATE SET public = true;
    `)
  } catch (err) {
    console.error('Error asegurando bucket recursos_eventos:', err)
  }
}

/**
 * Sube un archivo de imagen al bucket recursos_eventos de Supabase Storage.
 * Si las credenciales API de Supabase son un placeholder temporal, guarda como contingencia
 * en public/uploads/ para garantizar que la plataforma nunca se interrumpa.
 */
export async function subirArchivoRecursosEventos(
  archivo: File,
  prefijo: string = 'evento'
): Promise<{ url: string; origen: 'supabase' | 'local'; error?: string }> {
  try {
    await asegurarBucketRecursosEventos()

    const buffer = Buffer.from(await archivo.arrayBuffer())
    const extension = path.extname(archivo.name) || '.png'
    const nombreLimpio = archivo.name
      .replace(extension, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase()
    const nombreArchivo = `${prefijo}_${Date.now()}_${nombreLimpio}${extension}`

    // 1. Intentar subir a Supabase Storage API
    try {
      const { data, error } = await supabaseStorage.storage
        .from(BUCKET_RECURSOS)
        .upload(nombreArchivo, buffer, {
          contentType: archivo.type || 'image/png',
          upsert: true,
        })

      if (!error && data) {
        const {
          data: { publicUrl },
        } = supabaseStorage.storage.from(BUCKET_RECURSOS).getPublicUrl(nombreArchivo)

        return { url: publicUrl, origen: 'supabase' }
      } else {
        console.warn('Supabase Storage API respondió con error:', error?.message)
      }
    } catch (apiErr) {
      console.warn('Excepción al conectar con Supabase Storage API:', apiErr)
    }

    // 2. Modo contingencia transparente: Guardar en public/uploads/
    const dirUploads = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(dirUploads)) {
      fs.mkdirSync(dirUploads, { recursive: true })
    }

    const rutaLocal = path.join(dirUploads, nombreArchivo)
    fs.writeFileSync(rutaLocal, buffer)

    return { url: `/uploads/${nombreArchivo}`, origen: 'local' }
  } catch (err) {
    console.error('Error general al procesar subida de imagen:', err)
    return {
      url: '',
      origen: 'local',
      error: err instanceof Error ? err.message : 'Error al procesar archivo de imagen.',
    }
  }
}

