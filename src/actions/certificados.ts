'use server'

import prisma from '@/lib/prisma'

export interface EventoAsistidoItem {
  inscripcionId: string
  asistenciaId: string
  eventoId: string
  eventoTitulo: string
  eventoFecha: Date
  eventoUbicacion: string
  asignaturaBonificacion: string | null
  horaAsistencia: Date
  estadoPago: string
}

export interface EventoPendienteItem {
  inscripcionId: string
  eventoId: string
  eventoTitulo: string
  eventoFecha: Date
  estadoPago: string
  motivo: 'PAGO_PENDIENTE' | 'SIN_ASISTENCIA' | 'PAGO_RECHAZADO'
}

export interface ConsultaEstudianteResultado {
  success: boolean
  mensaje: string
  usuario?: {
    id: string
    nombre: string
    codigoEstudiantil: string | null
    email: string
    carrera: string | null
  }
  eventosAsistidos: EventoAsistidoItem[]
  eventosPendientes: EventoPendienteItem[]
}

export async function consultarCertificadosEstudiante(
  documento: string
): Promise<ConsultaEstudianteResultado> {
  const doc = documento.trim()

  if (!doc) {
    return {
      success: false,
      mensaje: 'Por favor ingresa tu cédula o código estudiantil.',
      eventosAsistidos: [],
      eventosPendientes: [],
    }
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { codigoEstudiantil: doc },
          { email: doc },
          { id: doc },
        ],
      },
      include: {
        inscripciones: {
          include: {
            evento: true,
            asistencia: true,
          },
          orderBy: { fechaInscripcion: 'desc' },
        },
      },
    })

    if (!usuario) {
      return {
        success: false,
        mensaje: `No se encontró ningún registro universitario con el documento o código "${doc}".`,
        eventosAsistidos: [],
        eventosPendientes: [],
      }
    }

    const eventosAsistidos: EventoAsistidoItem[] = []
    const eventosPendientes: EventoPendienteItem[] = []

    for (const ins of usuario.inscripciones) {
      if (ins.asistencia) {
        eventosAsistidos.push({
          inscripcionId: ins.id,
          asistenciaId: ins.asistencia.id,
          eventoId: ins.evento.id,
          eventoTitulo: ins.evento.titulo,
          eventoFecha: ins.evento.fechaInicio,
          eventoUbicacion: ins.evento.ubicacion,
          asignaturaBonificacion: ins.asignatura_bonificacion,
          horaAsistencia: ins.asistencia.fechaHoraRegistro,
          estadoPago: ins.estado_pago,
        })
      } else {
        let motivo: 'PAGO_PENDIENTE' | 'SIN_ASISTENCIA' | 'PAGO_RECHAZADO' = 'SIN_ASISTENCIA'
        if (ins.estado_pago === 'PENDIENTE') motivo = 'PAGO_PENDIENTE'
        if (ins.estado_pago === 'RECHAZADO') motivo = 'PAGO_RECHAZADO'

        eventosPendientes.push({
          inscripcionId: ins.id,
          eventoId: ins.evento.id,
          eventoTitulo: ins.evento.titulo,
          eventoFecha: ins.evento.fechaInicio,
          estadoPago: ins.estado_pago,
          motivo,
        })
      }
    }

    return {
      success: true,
      mensaje:
        eventosAsistidos.length > 0
          ? `¡Hola, ${usuario.nombre}! Encontramos ${eventosAsistidos.length} certificado(s) disponible(s) para descarga.`
          : `Hola, ${usuario.nombre}. No tienes asistencias registradas aún en eventos finalizados.`,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        codigoEstudiantil: usuario.codigoEstudiantil,
        email: usuario.email,
        carrera: usuario.carrera,
      },
      eventosAsistidos,
      eventosPendientes,
    }
  } catch (error) {
    console.error('Error al consultar certificados:', error)
    return {
      success: false,
      mensaje: 'Ocurrió un error al consultar los certificados en la base de datos.',
      eventosAsistidos: [],
      eventosPendientes: [],
    }
  }
}

