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

    // 0. Tipo de vinculación y campos condicionales
    const tipoVinculacionRaw = (formData.get('tipo_vinculacion') as string)?.trim()
    const tipo_vinculacion = (['ESTUDIANTE_ACTIVO', 'EGRESADO', 'EXTERNO'].includes(tipoVinculacionRaw)
      ? tipoVinculacionRaw
      : 'ESTUDIANTE_ACTIVO') as 'ESTUDIANTE_ACTIVO' | 'EGRESADO' | 'EXTERNO'

    const carrera = (formData.get('carrera') as string)?.trim()
    const semestre = (formData.get('semestre') as string)?.trim()
    const asignatura_bonificacion = (formData.get('asignatura_bonificacion') as string)?.trim()
    const empresa = (formData.get('empresa') as string)?.trim() || null
    const pais = (formData.get('pais') as string)?.trim() || 'Colombia'
    const departamento = (formData.get('departamento') as string)?.trim() || null
    const ciudad = (formData.get('ciudad') as string)?.trim() || null

    // 1. Validaciones básicas de campos obligatorios universales
    if (!eventoId) {
      return { success: false, error: 'Identificador de evento no válido.' }
    }
    if (!cedula || !nombre || !celular) {
      return {
        success: false,
        error: 'Por favor diligencia tu número de identificación, nombre completo y teléfono celular.',
      }
    }

    // Validación condicional según el Tipo de Vinculación
    if (tipo_vinculacion === 'ESTUDIANTE_ACTIVO') {
      if (!carrera || !semestre || !asignatura_bonificacion) {
        return {
          success: false,
          error: 'Para estudiantes activos es obligatorio diligenciar el programa académico, semestre y la asignatura de interés.',
        }
      }
    } else if (tipo_vinculacion === 'EGRESADO') {
      if (!carrera) {
        return {
          success: false,
          error: 'Por favor selecciona el programa académico del cual egresaste.',
        }
      }
    } else if (tipo_vinculacion === 'EXTERNO') {
      if (!empresa || !ciudad) {
        return {
          success: false,
          error: 'Para participantes externos es obligatorio indicar la empresa o entidad de procedencia y la ciudad.',
        }
      }
    }

    // 2. Verificar disponibilidad, vigencia temporal y estado del evento
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

    // Candado de vigencia temporal: valida contra fecha_limite_inscripcion (fallback a fechaInicio si es nula)
    const ahora = new Date()
    const fechaLimite = (evento as any).fecha_limite_inscripcion
      ? new Date((evento as any).fecha_limite_inscripcion)
      : new Date(evento.fechaInicio)

    if (fechaLimite < ahora) {
      return {
        success: false,
        error: 'El período de preinscripción para este evento ha finalizado (plazo límite vencido).',
      }
    }

    // Candado de aforo: si ya alcanzó la capacidad máxima, bloquea la inscripción
    if (evento.capacidadMaxima && evento._count.inscripciones >= evento.capacidadMaxima) {
      return {
        success: false,
        error: 'Los cupos para este evento se encuentran agotados (aforo completo).',
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
      // Actualizar información suministrada según perfil
      const datosActualizar: Record<string, unknown> = {
        nombre: nombre || usuario.nombre,
        telefono: celular || usuario.telefono,
        cedula: usuario.cedula || cedula,
        codigoEstudiantil: usuario.codigoEstudiantil || cedula,
        tipo_vinculacion,
        empresa: empresa || usuario.empresa,
        pais: pais || usuario.pais,
        departamento: departamento || usuario.departamento,
        ciudad: ciudad || usuario.ciudad,
      }

      if (tipo_vinculacion === 'ESTUDIANTE_ACTIVO') {
        datosActualizar.carrera = carrera || usuario.carrera
        datosActualizar.semestre = semestre || usuario.semestre
      } else if (tipo_vinculacion === 'EGRESADO') {
        datosActualizar.carrera = carrera || usuario.carrera
      }

      usuario = await prisma.usuario.update({
        where: { id: usuario.id },
        data: datosActualizar,
      })
    } else {
      // Si no existe, verificar si existe un usuario con el mismo email
      const usuarioPorEmail = await prisma.usuario.findUnique({
        where: { email: emailFinal },
      })

      if (usuarioPorEmail) {
        const datosActualizar: Record<string, unknown> = {
          nombre,
          telefono: celular,
          cedula,
          codigoEstudiantil: cedula,
          tipo_vinculacion,
          empresa,
          pais,
          departamento,
          ciudad,
        }

        if (tipo_vinculacion === 'ESTUDIANTE_ACTIVO') {
          datosActualizar.carrera = carrera
          datosActualizar.semestre = semestre
        } else if (tipo_vinculacion === 'EGRESADO') {
          datosActualizar.carrera = carrera
        }

        usuario = await prisma.usuario.update({
          where: { id: usuarioPorEmail.id },
          data: datosActualizar,
        })
      } else {
        const datosCrear: Record<string, unknown> = {
          nombre,
          email: emailFinal,
          telefono: celular,
          cedula,
          codigoEstudiantil: cedula,
          rol: 'ALUMNO',
          tipo_vinculacion,
          empresa,
          pais,
          departamento,
          ciudad,
        }

        if (tipo_vinculacion === 'ESTUDIANTE_ACTIVO') {
          datosCrear.carrera = carrera
          datosCrear.semestre = semestre
        } else if (tipo_vinculacion === 'EGRESADO') {
          datosCrear.carrera = carrera
        }

        usuario = await prisma.usuario.create({
          data: datosCrear as any,
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
        tipo_vinculacion: tipo_vinculacion as any,
        empresa,
        pais,
        departamento,
        ciudad,
        asignatura_bonificacion: tipo_vinculacion === 'ESTUDIANTE_ACTIVO' ? asignatura_bonificacion : null,
        estado_pago: 'PENDIENTE',
        montoPagado: 0.0,
      } as any,
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
