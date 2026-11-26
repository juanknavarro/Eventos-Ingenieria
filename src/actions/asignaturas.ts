'use server'

import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

import { RolUsuario } from '@prisma/client'

async function verificarAdmin() {
  const session = await getAuthSession()
  if (!session || (session.rol !== RolUsuario.SUPER_ADMIN && session.rol !== RolUsuario.ADMIN)) {
    throw new Error('Acceso no autorizado. Se requieren privilegios de Administrador.')
  }
  return session
}

export async function crearAsignatura(formData: FormData) {
  try {
    const session = await verificarAdmin()

    const nombre = (formData.get('nombre') as string)?.trim()
    let programa_academico = (formData.get('programa_academico') as string)?.trim()

    if (session.rol === RolUsuario.ADMIN) {
      const programaSession = session.carrera?.trim()
      if (!programaSession) {
        return {
          success: false,
          error: 'Tu usuario administrador no tiene un programa académico asignado.',
        }
      }
      programa_academico = programaSession
    }

    if (!nombre || !programa_academico) {
      return { success: false, error: 'Todos los campos son obligatorios.' }
    }

    const duplicada = await prisma.asignatura.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        programa_academico: { equals: programa_academico, mode: 'insensitive' },
      },
    })

    if (duplicada) {
      return {
        success: false,
        error: 'Esta asignatura ya está registrada en ese programa académico.',
      }
    }

    const nueva = await prisma.asignatura.create({
      data: {
        nombre,
        programa_academico,
        activa: true,
      },
    })

    try {
      revalidatePath('/admin/asignaturas')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `Asignatura "${nueva.nombre}" registrada exitosamente.`,
      asignatura: nueva,
    }
  } catch (err: any) {
    console.error('Error al crear asignatura:', err)
    return { success: false, error: err.message || 'Error al crear la asignatura.' }
  }
}

export async function actualizarAsignatura(
  id: string,
  nombre: string,
  programa_academico: string
) {
  try {
    const session = await verificarAdmin()

    const nombreLimpio = nombre?.trim()
    let programaFinal = programa_academico?.trim()

    if (session.rol === RolUsuario.ADMIN) {
      const programaSession = session.carrera?.trim()
      if (!programaSession) {
        return {
          success: false,
          error: 'Tu usuario administrador no tiene un programa académico asignado.',
        }
      }
      const existente = await prisma.asignatura.findUnique({ where: { id } })
      if (
        !existente ||
        existente.programa_academico.toLowerCase() !== programaSession.toLowerCase()
      ) {
        return {
          success: false,
          error: 'No tienes permisos para editar asignaturas de otro programa académico.',
        }
      }
      programaFinal = programaSession
    }

    if (!id || !nombreLimpio || !programaFinal) {
      return { success: false, error: 'Datos incompletos para actualizar.' }
    }

    const duplicada = await prisma.asignatura.findFirst({
      where: {
        id: { not: id },
        nombre: { equals: nombreLimpio, mode: 'insensitive' },
        programa_academico: { equals: programaFinal, mode: 'insensitive' },
      },
    })

    if (duplicada) {
      return {
        success: false,
        error: 'Esta asignatura ya está registrada en ese programa académico.',
      }
    }

    const actualizada = await prisma.asignatura.update({
      where: { id },
      data: {
        nombre: nombreLimpio,
        programa_academico: programaFinal,
      },
    })

    try {
      revalidatePath('/admin/asignaturas')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `Asignatura actualizada exitosamente.`,
      asignatura: actualizada,
    }
  } catch (err: any) {
    console.error('Error al actualizar asignatura:', err)
    return { success: false, error: err.message || 'Error al actualizar la asignatura.' }
  }
}

export async function alternarEstadoAsignatura(id: string, nuevoEstado: boolean) {
  try {
    const session = await verificarAdmin()

    if (!id) {
      return { success: false, error: 'Identificador de asignatura inválido.' }
    }

    if (session.rol === RolUsuario.ADMIN) {
      const programaSession = session.carrera?.trim()
      const existente = await prisma.asignatura.findUnique({ where: { id } })
      if (
        !programaSession ||
        !existente ||
        existente.programa_academico.toLowerCase() !== programaSession.toLowerCase()
      ) {
        return {
          success: false,
          error: 'No tienes permisos para modificar asignaturas de otro programa académico.',
        }
      }
    }

    const actualizada = await prisma.asignatura.update({
      where: { id },
      data: {
        activa: nuevoEstado,
      },
    })

    try {
      revalidatePath('/admin/asignaturas')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `Asignatura marcada como ${actualizada.activa ? 'Activa' : 'Inactiva'}.`,
      asignatura: actualizada,
    }
  } catch (err: any) {
    console.error('Error al alternar estado de asignatura:', err)
    return { success: false, error: err.message || 'Error al cambiar estado de la asignatura.' }
  }
}

export async function eliminarAsignatura(id: string) {
  try {
    const session = await verificarAdmin()

    if (!id) {
      return { success: false, error: 'Identificador de asignatura inválido.' }
    }

    if (session.rol === RolUsuario.ADMIN) {
      const programaSession = session.carrera?.trim()
      const existente = await prisma.asignatura.findUnique({ where: { id } })
      if (
        !programaSession ||
        !existente ||
        existente.programa_academico.toLowerCase() !== programaSession.toLowerCase()
      ) {
        return {
          success: false,
          error: 'No tienes permisos para eliminar asignaturas de otro programa académico.',
        }
      }
    }

    await prisma.asignatura.delete({
      where: { id },
    })

    try {
      revalidatePath('/admin/asignaturas')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: 'Asignatura eliminada permanentemente del sistema.',
    }
  } catch (err: any) {
    console.error('Error al eliminar asignatura:', err)
    return { success: false, error: err.message || 'Error al eliminar la asignatura.' }
  }
}

/**
 * Crea múltiples asignaturas en lote para un programa académico,
 * respetando permisos por rol y omitiendo duplicados internos o ya registrados en DB.
 */
export async function crearAsignaturasMasivo(
  nombres: string[],
  programaAcademico: string
) {
  try {
    const session = await verificarAdmin()

    let programaFinal = programaAcademico?.trim() || ''
    if (session.rol === RolUsuario.ADMIN) {
      const programaSession = session.carrera?.trim()
      if (!programaSession) {
        return {
          success: false,
          error: 'Tu usuario administrador no tiene un programa académico asignado.',
        }
      }
      programaFinal = programaSession
    }

    if (!programaFinal) {
      return {
        success: false,
        error: 'Debes seleccionar un programa académico válido.',
      }
    }

    const entradasLimpias = (Array.isArray(nombres) ? nombres : [])
      .map((n) => (typeof n === 'string' ? n.trim() : ''))
      .filter(Boolean)

    if (entradasLimpias.length === 0) {
      return {
        success: false,
        error: 'No se detectaron asignaturas válidas para registrar.',
      }
    }

    // Deduplicación interna insensible a mayúsculas/minúsculas
    const mapaUnicos = new Map<string, string>()
    for (const nombre of entradasLimpias) {
      const clave = nombre.toLowerCase()
      if (!mapaUnicos.has(clave)) {
        mapaUnicos.set(clave, nombre)
      }
    }

    // Consultar asignaturas ya existentes en ese programa
    const existentes = await prisma.asignatura.findMany({
      where: {
        programa_academico: { equals: programaFinal, mode: 'insensitive' },
      },
      select: { nombre: true },
    })

    const setExistentes = new Set(existentes.map((e) => e.nombre.trim().toLowerCase()))

    const nuevosNombres: string[] = []
    for (const [clave, nombreOriginal] of mapaUnicos.entries()) {
      if (!setExistentes.has(clave)) {
        nuevosNombres.push(nombreOriginal)
      }
    }

    const omitidas = entradasLimpias.length - nuevosNombres.length

    const asignaturasCreadas =
      nuevosNombres.length > 0
        ? await prisma.$transaction(
            nuevosNombres.map((nombre) =>
              prisma.asignatura.create({
                data: {
                  nombre,
                  programa_academico: programaFinal,
                  activa: true,
                },
              })
            )
          )
        : []

    try {
      revalidatePath('/admin/asignaturas')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      creadas: asignaturasCreadas.length,
      omitidas,
      asignaturasCreadas,
      message: `Carga masiva completada: ${asignaturasCreadas.length} asignatura(s) creada(s) y ${omitidas} omitida(s) por estar repetida(s).`,
    }
  } catch (err: any) {
    console.error('Error en carga masiva de asignaturas:', err)
    return {
      success: false,
      error: err?.message || 'Ocurrió un error al registrar las asignaturas en lote.',
    }
  }
}

