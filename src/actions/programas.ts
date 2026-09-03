'use server'

import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { RolUsuario } from '@prisma/client'

export interface ActionResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Valida estrictamente que la sesión actual pertenezca a un SUPER_ADMIN
 */
async function asegurarSuperAdmin() {
  const session = await getAuthSession()
  if (!session || session.rol !== RolUsuario.SUPER_ADMIN) {
    throw new Error('Acceso no autorizado: Se requieren privilegios de Súper Administrador.')
  }
  return session
}

/**
 * Registra un nuevo programa académico en la facultad
 */
export async function crearPrograma(formData: FormData): Promise<ActionResult> {
  try {
    await asegurarSuperAdmin()

    const nombre = (formData.get('nombre') as string)?.trim()
    const estado_activo = formData.get('estado_activo') !== 'false'

    if (!nombre) {
      return { success: false, error: 'El nombre del programa es obligatorio.' }
    }

    const programaExistente = await prisma.programa.findUnique({
      where: { nombre },
    })

    if (programaExistente) {
      return { success: false, error: 'El programa ya existe en el sistema.' }
    }

    const nuevoPrograma = await prisma.programa.create({
      data: {
        nombre,
        estado_activo,
      },
    })

    revalidatePath('/admin/programas')
    revalidatePath('/admin')
    revalidatePath('/admin/reportes')
    revalidatePath('/admin/eventos/nuevo')

    return {
      success: true,
      message: 'Programa registrado exitosamente.',
    }
  } catch (err: unknown) {
    console.error('Error al crear programa:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al crear programa.',
    }
  }
}

/**
 * Actualiza los datos de un programa académico existente
 */
export async function actualizarPrograma(
  id: string,
  nombre: string,
  estado_activo: boolean
): Promise<ActionResult> {
  try {
    await asegurarSuperAdmin()

    const nombreLimpio = nombre?.trim()
    if (!id || !nombreLimpio) {
      return { success: false, error: 'Identificador y nombre del programa requeridos.' }
    }

    const programaExistente = await prisma.programa.findFirst({
      where: {
        nombre: nombreLimpio,
        NOT: { id },
      },
    })

    if (programaExistente) {
      return {
        success: false,
        error: 'Ya existe otro programa con este nombre.',
      }
    }

    const actualizado = await prisma.programa.update({
      where: { id },
      data: {
        nombre: nombreLimpio,
        estado_activo,
      },
    })

    revalidatePath('/admin/programas')
    revalidatePath('/admin')
    revalidatePath('/admin/reportes')
    revalidatePath('/admin/eventos/nuevo')

    return {
      success: true,
      message: 'Programa actualizado correctamente.',
    }
  } catch (err: unknown) {
    console.error('Error al actualizar programa:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al actualizar programa.',
    }
  }
}

/**
 * Alterna el estado activo/inactivo de un programa
 */
export async function alternarEstadoPrograma(
  id: string,
  nuevoEstado: boolean
): Promise<ActionResult> {
  try {
    await asegurarSuperAdmin()

    if (!id) {
      return { success: false, error: 'Identificador de programa inválido.' }
    }

    const actualizado = await prisma.programa.update({
      where: { id },
      data: { estado_activo: nuevoEstado },
    })

    revalidatePath('/admin/programas')
    revalidatePath('/admin')
    revalidatePath('/admin/reportes')
    revalidatePath('/admin/eventos/nuevo')

    return {
      success: true,
      message: 'Estado del programa actualizado correctamente.',
    }
  } catch (err: unknown) {
    console.error('Error al alternar estado de programa:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al cambiar estado del programa.',
    }
  }
}

/**
 * Elimina un programa si no tiene dependencias críticas
 */
export async function eliminarPrograma(id: string): Promise<ActionResult> {
  try {
    await asegurarSuperAdmin()

    if (!id) {
      return { success: false, error: 'Identificador de programa inválido.' }
    }

    const programa = await prisma.programa.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            usuarios: true,
            eventos: true,
            asignaturas: true,
          },
        },
      },
    })

    if (!programa) {
      return { success: false, error: 'El programa no existe.' }
    }

    if (programa._count.usuarios > 0 || programa._count.eventos > 0) {
      return {
        success: false,
        error: 'No es posible eliminar el programa porque tiene registros vinculados. Se recomienda deshabilitarlo.',
      }
    }

    await prisma.programa.delete({
      where: { id },
    })

    revalidatePath('/admin/programas')
    revalidatePath('/admin')
    revalidatePath('/admin/reportes')
    revalidatePath('/admin/eventos/nuevo')

    return {
      success: true,
      message: 'Programa eliminado permanentemente.',
    }
  } catch (err: unknown) {
    console.error('Error al eliminar programa:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al eliminar programa.',
    }
  }
}

/**
 * Obtiene la lista de programas activos para desplegables
 */
export async function obtenerProgramasActivos() {
  return prisma.programa.findMany({
    where: { estado_activo: true },
    orderBy: { nombre: 'asc' },
  })
}