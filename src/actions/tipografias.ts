'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthSession } from '@/lib/auth/session'
import { esAdminOSuperior } from '@/lib/auth/multitenancy'
import { subirArchivoRecursosEventos, eliminarArchivoRecursos } from '@/lib/supabase/storage'
import path from 'path'

export interface FuenteCatalogoItem {
  id: string
  nombre: string
  familia: string
  archivo_nombre: string
  url: string
  formato: string
  peso_bytes: number | null
  subidoPorId: string | null
  subidoPor?: {
    nombre: string
  } | null
  _count?: {
    eventos: number
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Sube un archivo tipográfico (.ttf o .otf) al storage institucional y lo registra en el catálogo global
 */
export async function subirFuenteCatalogo(formData: FormData) {
  try {
    const session = await getAuthSession()
    if (!session || !esAdminOSuperior(session)) {
      return { success: false, error: 'Acceso denegado: Se requieren permisos de Administrador.' }
    }

    const archivo = formData.get('archivo_fuente') as File | null
    if (!archivo || archivo.size === 0) {
      return { success: false, error: 'Debes seleccionar un archivo de fuente (.ttf o .otf).' }
    }

    // Validar extensión
    const extension = path.extname(archivo.name).toLowerCase()
    if (extension !== '.ttf' && extension !== '.otf') {
      return {
        success: false,
        error: 'Formato inválido. Solo se admiten archivos TrueType (.ttf) u OpenType (.otf).',
      }
    }

    // Validar tamaño máximo (máx. 10 MB)
    if (archivo.size > 10 * 1024 * 1024) {
      return { success: false, error: 'El archivo excede el tamaño máximo permitido de 10 MB.' }
    }

    const nombreInput = (formData.get('nombre') as string)?.trim()
    const familiaInput = (formData.get('familia') as string)?.trim() || 'Sans-Serif'

    // Formatear nombre por defecto si no fue suministrado
    const nombreLimpio =
      nombreInput ||
      archivo.name
        .replace(extension, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())

    const formato = extension === '.otf' ? 'OTF' : 'TTF'

    // Subir mediante helper de storage unificado (Supabase o contingencia local)
    const subida = await subirArchivoRecursosEventos(archivo, 'catalogo_fuente')
    if (!subida.url) {
      return {
        success: false,
        error: subida.error || 'No se pudo almacenar el archivo de tipografía.',
      }
    }

    const nuevaFuente = await prisma.catalogoFuente.create({
      data: {
        nombre: nombreLimpio,
        familia: familiaInput,
        archivo_nombre: archivo.name,
        url: subida.url,
        formato,
        peso_bytes: archivo.size,
        subidoPorId: session.id,
      },
    })

    revalidatePath('/admin/recursos/tipografias')
    revalidatePath('/admin/eventos/nuevo')

    return {
      success: true,
      fuente: nuevaFuente,
      mensaje: `Tipografía "${nombreLimpio}" agregada exitosamente al catálogo global.`,
    }
  } catch (error) {
    console.error('Error al subir tipografía al catálogo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno al procesar la fuente.',
    }
  }
}

/**
 * Consulta todas las fuentes del catálogo global con conteo de eventos vinculados
 */
export async function listarFuentesCatalogo() {
  try {
    const session = await getAuthSession()
    if (!session || !esAdminOSuperior(session)) {
      return { success: false, error: 'Acceso no autorizado', fuentes: [] }
    }

    const fuentes = await prisma.catalogoFuente.findMany({
      include: {
        _count: {
          select: { eventos: true },
        },
        subidoPor: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, fuentes }
  } catch (error) {
    console.error('Error al listar fuentes del catálogo:', error)
    return { success: false, error: 'Error al consultar catálogo', fuentes: [] }
  }
}

/**
 * Elimina una fuente del catálogo si no está en uso por ningún evento
 */
export async function eliminarFuenteCatalogo(id: string) {
  try {
    const session = await getAuthSession()
    if (!session || !esAdminOSuperior(session)) {
      return { success: false, error: 'Acceso denegado: Se requieren permisos de Administrador.' }
    }

    const fuente = await prisma.catalogoFuente.findUnique({
      where: { id },
      include: {
        _count: { select: { eventos: true } },
      },
    })

    if (!fuente) {
      return { success: false, error: 'La tipografía no existe en el catálogo.' }
    }

    // Proteger fuentes que estén en uso activo
    if (fuente._count.eventos > 0) {
      return {
        success: false,
        error: `No es posible eliminar "${fuente.nombre}" porque actualmente está asignada a ${fuente._count.eventos} evento(s). Reasigna esos eventos a otra fuente antes de borrarla.`,
      }
    }

    // 1. Eliminar archivo físico de Supabase o local
    await eliminarArchivoRecursos(fuente.url)

    // 2. Eliminar registro en base de datos
    await prisma.catalogoFuente.delete({
      where: { id },
    })

    revalidatePath('/admin/recursos/tipografias')
    revalidatePath('/admin/eventos/nuevo')

    return {
      success: true,
      mensaje: `Tipografía "${fuente.nombre}" eliminada correctamente del catálogo.`,
    }
  } catch (error) {
    console.error('Error al eliminar fuente del catálogo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar la tipografía.',
    }
  }
}
