'use server'

import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

async function verificarAdmin() {
  const session = await getAuthSession()
  if (!session || session.rol !== 'ADMIN') {
    throw new Error('Acceso no autorizado. Se requiere rol de Administrador.')
  }
  return session
}

export async function crearAsignatura(formData: FormData) {
  try {
    await verificarAdmin()

    const nombre = (formData.get('nombre') as string)?.trim()
    const programa_academico = (formData.get('programa_academico') as string)?.trim()

    if (!nombre || !programa_academico) {
      return { success: false, error: 'Todos los campos son obligatorios.' }
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
    await verificarAdmin()

    if (!id || !nombre?.trim() || !programa_academico?.trim()) {
      return { success: false, error: 'Datos incompletos para actualizar.' }
    }

    const actualizada = await prisma.asignatura.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        programa_academico: programa_academico.trim(),
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
    await verificarAdmin()

    if (!id) {
      return { success: false, error: 'Identificador de asignatura inválido.' }
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
    await verificarAdmin()

    if (!id) {
      return { success: false, error: 'Identificador de asignatura inválido.' }
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

