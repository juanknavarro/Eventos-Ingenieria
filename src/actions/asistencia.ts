'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { MetodoAsistencia, EstadoPago } from '@prisma/client'

export interface ValidarAsistenciaInput {
  documento: string // Código estudiantil, cédula o email
  eventoId: string
  staffId?: string
  metodo?: 'QR' | 'MANUAL' | 'BIOMETRICO'
}

export type TipoResultadoAsistencia =
  | 'ACCESO_CONCEDIDO'
  | 'NO_ENCONTRADO'
  | 'NO_INSCRITO'
  | 'PAGO_PENDIENTE'
  | 'PAGO_RECHAZADO'
  | 'YA_REGISTRADO'
  | 'ERROR_SERVIDOR'

export interface ResultadoAsistencia {
  success: boolean
  tipo: TipoResultadoAsistencia
  mensaje: string
  usuario?: {
    id: string
    nombre: string
    codigoEstudiantil: string | null
    email: string
    carrera: string | null
  }
  evento?: {
    id: string
    titulo: string
    precio: number
    ubicacion: string
  }
  inscripcion?: {
    id: string
    asignatura_bonificacion: string | null
    profesor_responsable_dinero: string | null
    estado_pago: string
    montoPagado: number
  }
  asistencia?: {
    id: string
    fechaHoraRegistro: Date
    metodo: string
    registradoPorNombre?: string
  }
}

export async function registrarAsistenciaPorDocumento({
  documento,
  eventoId,
  staffId,
  metodo = 'QR',
}: ValidarAsistenciaInput): Promise<ResultadoAsistencia> {
  const docLimpio = documento.trim()

  if (!docLimpio) {
    return {
      success: false,
      tipo: 'NO_ENCONTRADO',
      mensaje: 'Por favor ingresa o escanea un número de documento/cédula válido.',
    }
  }

  if (!eventoId || eventoId === 'TODOS') {
    return {
      success: false,
      tipo: 'ERROR_SERVIDOR',
      mensaje: 'Debes seleccionar un evento específico para controlar la asistencia en puerta.',
    }
  }

  try {
    // 1. Buscar al usuario por código estudiantil, email o ID
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { codigoEstudiantil: docLimpio },
          { email: docLimpio },
          { id: docLimpio },
        ],
      },
    })

    if (!usuario) {
      return {
        success: false,
        tipo: 'NO_ENCONTRADO',
        mensaje: `Documento o Cédula "${docLimpio}" no encontrada en la base de datos universitaria.`,
      }
    }

    // 2. Buscar la inscripción en el evento seleccionado
    const inscripcion = await prisma.inscripcion.findUnique({
      where: {
        eventoId_usuarioId: {
          eventoId: eventoId,
          usuarioId: usuario.id,
        },
      },
      include: {
        evento: true,
        asistencia: {
          include: {
            registradoPor: true,
          },
        },
      },
    })

    const eventoInfo = inscripcion?.evento || (await prisma.evento.findUnique({ where: { id: eventoId } }))

    if (!inscripcion) {
      return {
        success: false,
        tipo: 'NO_INSCRITO',
        mensaje: `El estudiante ${usuario.nombre} no se encuentra inscrito en "${eventoInfo?.titulo ?? 'este evento'}".`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          codigoEstudiantil: usuario.codigoEstudiantil,
          email: usuario.email,
          carrera: usuario.carrera,
        },
        evento: eventoInfo
          ? {
              id: eventoInfo.id,
              titulo: eventoInfo.titulo,
              precio: eventoInfo.precio,
              ubicacion: eventoInfo.ubicacion,
            }
          : undefined,
      }
    }

    // 3. Validar estado de pago
    if (inscripcion.estado_pago === EstadoPago.PENDIENTE) {
      return {
        success: false,
        tipo: 'PAGO_PENDIENTE',
        mensaje: `Acceso denegado: El pago de la inscripción se encuentra PENDIENTE ($${inscripcion.evento.precio.toLocaleString('es-CO')} COP). Debe legalizar con el docente responsable (${inscripcion.profesor_responsable_dinero ?? 'Docente'}).`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          codigoEstudiantil: usuario.codigoEstudiantil,
          email: usuario.email,
          carrera: usuario.carrera,
        },
        evento: {
          id: inscripcion.evento.id,
          titulo: inscripcion.evento.titulo,
          precio: inscripcion.evento.precio,
          ubicacion: inscripcion.evento.ubicacion,
        },
        inscripcion: {
          id: inscripcion.id,
          asignatura_bonificacion: inscripcion.asignatura_bonificacion,
          profesor_responsable_dinero: inscripcion.profesor_responsable_dinero,
          estado_pago: inscripcion.estado_pago,
          montoPagado: inscripcion.montoPagado,
        },
      }
    }

    if (inscripcion.estado_pago === EstadoPago.RECHAZADO) {
      return {
        success: false,
        tipo: 'PAGO_RECHAZADO',
        mensaje: `Acceso denegado: La inscripción de ${usuario.nombre} fue RECHAZADA.`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          codigoEstudiantil: usuario.codigoEstudiantil,
          email: usuario.email,
          carrera: usuario.carrera,
        },
        evento: {
          id: inscripcion.evento.id,
          titulo: inscripcion.evento.titulo,
          precio: inscripcion.evento.precio,
          ubicacion: inscripcion.evento.ubicacion,
        },
        inscripcion: {
          id: inscripcion.id,
          asignatura_bonificacion: inscripcion.asignatura_bonificacion,
          profesor_responsable_dinero: inscripcion.profesor_responsable_dinero,
          estado_pago: inscripcion.estado_pago,
          montoPagado: inscripcion.montoPagado,
        },
      }
    }

    // 4. Validar si ya tiene asistencia registrada (Doble Check-in)
    if (inscripcion.asistencia) {
      return {
        success: false,
        tipo: 'YA_REGISTRADO',
        mensaje: `Atención: Asistencia ya registrada previamente a las ${new Date(
          inscripcion.asistencia.fechaHoraRegistro
        ).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          codigoEstudiantil: usuario.codigoEstudiantil,
          email: usuario.email,
          carrera: usuario.carrera,
        },
        evento: {
          id: inscripcion.evento.id,
          titulo: inscripcion.evento.titulo,
          precio: inscripcion.evento.precio,
          ubicacion: inscripcion.evento.ubicacion,
        },
        inscripcion: {
          id: inscripcion.id,
          asignatura_bonificacion: inscripcion.asignatura_bonificacion,
          profesor_responsable_dinero: inscripcion.profesor_responsable_dinero,
          estado_pago: inscripcion.estado_pago,
          montoPagado: inscripcion.montoPagado,
        },
        asistencia: {
          id: inscripcion.asistencia.id,
          fechaHoraRegistro: inscripcion.asistencia.fechaHoraRegistro,
          metodo: inscripcion.asistencia.metodo,
          registradoPorNombre: inscripcion.asistencia.registradoPor?.nombre,
        },
      }
    }

    // 5. Registrar asistencia exitosa en la base de datos
    const nuevaAsistencia = await prisma.asistencia.create({
      data: {
        inscripcionId: inscripcion.id,
        registradoPorId: staffId || null,
        metodo: (metodo as MetodoAsistencia) || MetodoAsistencia.QR,
        observaciones: 'Ingreso validado en puerta con lector de código de barras/cédula',
        fechaHoraRegistro: new Date(),
      },
      include: {
        registradoPor: true,
      },
    })

    try {
      revalidatePath('/')
      revalidatePath('/profesor')
      revalidatePath('/staff/asistencia')
    } catch {
      // Manejar llamadas fuera del ciclo de petición HTTP
    }

    return {
      success: true,
      tipo: 'ACCESO_CONCEDIDO',
      mensaje: `¡ACCESO PERMITIDO! Asistencia confirmada para ${usuario.nombre}.`,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        codigoEstudiantil: usuario.codigoEstudiantil,
        email: usuario.email,
        carrera: usuario.carrera,
      },
      evento: {
        id: inscripcion.evento.id,
        titulo: inscripcion.evento.titulo,
        precio: inscripcion.evento.precio,
        ubicacion: inscripcion.evento.ubicacion,
      },
      inscripcion: {
        id: inscripcion.id,
        asignatura_bonificacion: inscripcion.asignatura_bonificacion,
        profesor_responsable_dinero: inscripcion.profesor_responsable_dinero,
        estado_pago: inscripcion.estado_pago,
        montoPagado: inscripcion.montoPagado,
      },
      asistencia: {
        id: nuevaAsistencia.id,
        fechaHoraRegistro: nuevaAsistencia.fechaHoraRegistro,
        metodo: nuevaAsistencia.metodo,
        registradoPorNombre: nuevaAsistencia.registradoPor?.nombre,
      },
    }
  } catch (error) {
    console.error('Error al procesar asistencia:', error)
    return {
      success: false,
      tipo: 'ERROR_SERVIDOR',
      mensaje: 'Ocurrió un error inesperado en el servidor al verificar la asistencia.',
    }
  }
}

