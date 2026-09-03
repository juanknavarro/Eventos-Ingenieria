'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export interface PreinscripcionResult {
  success: boolean
  message?: string
  error?: string
  inscripcionId?: string
}

/**
 * Verifica en tiempo real si una cédula ya se encuentra inscrita en un evento determinado
 */
export async function verificarCedulaInscrita(
  eventoId: string,
  cedula: string
): Promise<{ yaInscrito: boolean }> {
  try {
    const cedulaLimpia = cedula?.trim()
    if (!eventoId || !cedulaLimpia) {
      return { yaInscrito: false }
    }

    const inscripcionExistente = await prisma.inscripcion.findFirst({
      where: {
        eventoId,
        usuario: {
          OR: [
            { cedula: cedulaLimpia },
            { codigoEstudiantil: cedulaLimpia },
          ],
        },
      },
    })

    return { yaInscrito: !!inscripcionExistente }
  } catch (err) {
    console.error('Error al verificar cédula inscrita:', err)
    return { yaInscrito: false }
  }
}

/**
 * Registra la preinscripción pública de un estudiante a un evento académico
 */
export async function preinscribirAlumno(formData: FormData): Promise<PreinscripcionResult> {
  try {
    const eventoId = (formData.get('eventoId') as string)?.trim()
    const cedula = (formData.get('cedula') as string)?.trim()
    const nombre = (formData.get('nombre') as string)?.trim()
    const celular = (formData.get('celular') as string)?.trim()
    const emailInput = (formData.get('email') as string)?.trim().toLowerCase()
    const carrera = (formData.get('carrera') as string)?.trim()
    const semestre = (formData.get('semestre') as string)?.trim()
    const asignatura_bonificacion = (formData.get('asignatura_bonificacion') as string)?.trim()

    // 1. Validaciones básicas de campos obligatorios
    if (!eventoId) {
      return { success: false, error: 'Identificador de evento no válido.' }
    }
    if (!cedula || !nombre || !celular || !carrera || !semestre || !asignatura_bonificacion) {
      return {
        success: false,
        error: 'Por favor diligencia todos los campos requeridos del formulario, incluyendo tu teléfono celular.',
      }
    }

    // 2. Verificar disponibilidad y estado del evento
    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
      include: {
        _count: {
          select: { inscripciones: true },
        },
      },
    })

    if (!evento || evento.estado !== 'PUBLICADO') {
      return {
        success: false,
        error: 'Este evento no se encuentra actualmente disponible para inscripciones.',
      }
    }

    if (evento.capacidadMaxima && evento._count.inscripciones >= evento.capacidadMaxima) {
      return {
        success: false,
        error: 'Los cupos para este evento se encuentran agotados.',
      }
    }

    // 3. VALIDACIÓN CRÍTICA OBLIGATORIA:
    // Si la Cédula ingresada ya existe en la tabla Inscripciones para ese evento_id en particular,
    // bloquea el registro y muestra la alerta exacta solicitada.
    const inscripcionExistente = await prisma.inscripcion.findFirst({
      where: {
        eventoId,
        usuario: {
          OR: [
            { cedula },
            { codigoEstudiantil: cedula },
          ],
        },
      },
    })

    if (inscripcionExistente) {
      return {
        success: false,
        error: 'Esta identificación ya se encuentra registrada para este evento',
      }
    }

    // 4. Buscar o crear la cuenta de usuario con rol ALUMNO
    let usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cedula },
          { codigoEstudiantil: cedula },
        ],
      },
    })

    const emailFinal = emailInput || (usuario ? usuario.email : `${cedula}@unisinu.edu.co`)

    if (usuario) {
      // Actualizar información académica suministrada
      usuario = await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          nombre: nombre || usuario.nombre,
          telefono: celular || usuario.telefono,
          carrera: carrera || usuario.carrera,
          semestre: semestre || usuario.semestre,
          cedula: usuario.cedula || cedula,
          codigoEstudiantil: usuario.codigoEstudiantil || cedula,
        },
      })
    } else {
      // Si no existe, verificar si existe un usuario con el mismo email
      const usuarioPorEmail = await prisma.usuario.findUnique({
        where: { email: emailFinal },
      })

      if (usuarioPorEmail) {
        usuario = await prisma.usuario.update({
          where: { id: usuarioPorEmail.id },
          data: {
            nombre,
            telefono: celular,
            cedula,
            codigoEstudiantil: cedula,
            carrera,
            semestre,
          },
        })
      } else {
        usuario = await prisma.usuario.create({
          data: {
            nombre,
            email: emailFinal,
            telefono: celular,
            cedula,
            codigoEstudiantil: cedula,
            rol: 'ALUMNO',
            carrera,
            semestre,
          },
        })
      }
    }

    // Verificación de seguridad adicional en relación unique([eventoId, usuarioId])
    const inscripcionDirecta = await prisma.inscripcion.findUnique({
      where: {
        eventoId_usuarioId: {
          eventoId,
          usuarioId: usuario.id,
        },
      },
    })

    if (inscripcionDirecta) {
      return {
        success: false,
        error: 'Esta identificación ya se encuentra registrada para este evento',
      }
    }

    // 5. Insertar el registro con estado 'Pendiente de Pago' (PENDIENTE) y celular
    const nuevaInscripcion = await prisma.inscripcion.create({
      data: {
        eventoId,
        usuarioId: usuario.id,
        celular,
        asignatura_bonificacion,
        estado_pago: 'PENDIENTE',
        montoPagado: 0.0,
      },
      include: {
        evento: true,
        usuario: true,
      },
    })

    // 6. Revalidar vistas
    try {
      revalidatePath('/')
      revalidatePath('/profesor')
      revalidatePath('/admin')
    } catch {
      // Ignorar fuera del contexto HTTP de Next.js (ej. pruebas automatizadas)
    }

    return {
      success: true,
      message: '¡Cupo reservado con éxito! Tu preinscripción ha sido registrada con estado Pendiente de Pago.',
      inscripcionId: nuevaInscripcion.id,
    }
  } catch (err: unknown) {
    console.error('Error al procesar preinscripción:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al procesar la preinscripción.',
    }
  }
}
