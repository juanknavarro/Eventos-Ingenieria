'use server'

import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import { RolUsuario } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface TutorialItem {
  id: string
  titulo: string
  categoria: string
  descripcion: string
  youtubeUrl: string | null
  orden: number
  activo: boolean
  creadoPorId: string | null
  creadoPor?: {
    nombre: string
    email: string
  } | null
  createdAt: Date | string
  updatedAt: Date | string
}

/**
 * Validador estricto en Base de Datos: Solo SUPER_ADMIN puede mutar tutoriales
 */
async function asegurarSuperAdmin() {
  const session = await getAuthSession()
  if (!session) {
    throw new Error('Sesión no encontrada o expirada.')
  }

  const usuarioDb = await prisma.usuario.findUnique({
    where: { id: session.id },
    select: { rol: true, id: true },
  })

  if (!usuarioDb || usuarioDb.rol !== RolUsuario.SUPER_ADMIN) {
    throw new Error('Acceso no autorizado: Se requieren privilegios de Súper Administrador.')
  }

  return usuarioDb
}

/**
 * Obtiene la lista de tutoriales (público para personal institucional autenticado)
 */
export async function obtenerTutoriales(filtroCategoria?: string): Promise<ActionResult<TutorialItem[]>> {
  try {
    const session = await getAuthSession()
    if (!session) {
      return { success: false, error: 'Debes iniciar sesión para consultar los tutoriales.' }
    }

    const esSuper = session.rol === RolUsuario.SUPER_ADMIN

    const tutoriales = await prisma.tutorial.findMany({
      where: {
        ...(esSuper ? {} : { activo: true }),
        ...(filtroCategoria && filtroCategoria !== 'TODAS' ? { categoria: filtroCategoria } : {}),
      },
      include: {
        creadoPor: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
    })

    return {
      success: true,
      data: tutoriales as unknown as TutorialItem[],
    }
  } catch (err) {
    console.error('Error al obtener tutoriales:', err)
    return {
      success: false,
      error: 'Error al consultar el catálogo de tutoriales.',
    }
  }
}

/**
 * Crea un nuevo tutorial (Exclusivo SUPER_ADMIN verificado en DB)
 */
export async function crearTutorial(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await asegurarSuperAdmin()

    const titulo = (formData.get('titulo') as string)?.trim()
    const categoria = (formData.get('categoria') as string)?.trim() || 'General'
    const descripcion = (formData.get('descripcion') as string)?.trim()
    const youtubeUrl = (formData.get('youtubeUrl') as string)?.trim() || null
    const ordenStr = (formData.get('orden') as string)?.trim()
    const orden = ordenStr ? parseInt(ordenStr, 10) : 0
    const activo = formData.get('activo') === 'true' || formData.get('activo') === 'on' || formData.get('activo') === null

    if (!titulo || !descripcion) {
      return {
        success: false,
        error: 'El título y la descripción o instrucciones son obligatorios.',
      }
    }

    const nuevoTutorial = await prisma.tutorial.create({
      data: {
        titulo,
        categoria,
        descripcion,
        youtubeUrl,
        orden: isNaN(orden) ? 0 : orden,
        activo,
        creadoPorId: admin.id,
      },
    })

    try {
      revalidatePath('/admin/tutoriales')
      revalidatePath('/profesor/tutoriales')
    } catch {
      // Ignorar fuera de contexto HTTP
    }

    return {
      success: true,
      data: nuevoTutorial,
      message: 'Tutorial publicado exitosamente.',
    }
  } catch (err) {
    console.error('Error al crear tutorial:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al crear el tutorial.',
    }
  }
}

/**
 * Actualiza un tutorial existente (Exclusivo SUPER_ADMIN verificado en DB)
 */
export async function actualizarTutorial(formData: FormData): Promise<ActionResult> {
  try {
    await asegurarSuperAdmin()

    const id = (formData.get('id') as string)?.trim()
    const titulo = (formData.get('titulo') as string)?.trim()
    const categoria = (formData.get('categoria') as string)?.trim() || 'General'
    const descripcion = (formData.get('descripcion') as string)?.trim()
    const youtubeUrl = (formData.get('youtubeUrl') as string)?.trim() || null
    const ordenStr = (formData.get('orden') as string)?.trim()
    const orden = ordenStr ? parseInt(ordenStr, 10) : 0
    const activo = formData.get('activo') === 'true' || formData.get('activo') === 'on'

    if (!id || !titulo || !descripcion) {
      return {
        success: false,
        error: 'Identificador, título y descripción son requeridos para actualizar.',
      }
    }

    const tutorialActualizado = await prisma.tutorial.update({
      where: { id },
      data: {
        titulo,
        categoria,
        descripcion,
        youtubeUrl,
        orden: isNaN(orden) ? 0 : orden,
        activo,
      },
    })

    try {
      revalidatePath('/admin/tutoriales')
      revalidatePath('/profesor/tutoriales')
    } catch {
      // Ignorar fuera de contexto HTTP
    }

    return {
      success: true,
      data: tutorialActualizado,
      message: 'Tutorial actualizado exitosamente.',
    }
  } catch (err) {
    console.error('Error al actualizar tutorial:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al actualizar el tutorial.',
    }
  }
}

/**
 * Elimina un tutorial (Exclusivo SUPER_ADMIN verificado en DB)
 */
export async function eliminarTutorial(id: string): Promise<ActionResult> {
  try {
    await asegurarSuperAdmin()

    if (!id) {
      return { success: false, error: 'Identificador no válido.' }
    }

    await prisma.tutorial.delete({
      where: { id },
    })

    try {
      revalidatePath('/admin/tutoriales')
      revalidatePath('/profesor/tutoriales')
    } catch {
      // Ignorar fuera de contexto HTTP
    }

    return {
      success: true,
      message: 'Tutorial eliminado exitosamente.',
    }
  } catch (err) {
    console.error('Error al eliminar tutorial:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al eliminar el tutorial.',
    }
  }
}

