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
  
  // Metadatos de Certificación y Escarapela en PDF
  certificadoPlantillaUrl?: string | null
  escarapelaPlantillaUrl?: string | null
  horasAcademicas?: number | null
  nombreFirmante1?: string | null
  cargoFirmante1?: string | null
  firmaOrganizadorUrl?: string | null
  firmaDirectorUrl?: string | null
  eventoPrecio?: number
  nombreFirmante2?: string | null
  cargoFirmante2?: string | null
}

export interface EventoPendienteItem {
  inscripcionId: string
  eventoId: string
  eventoTitulo: string
  eventoFecha: Date
  eventoPrecio: number
  estadoPago: string
  escarapelaPlantillaUrl?: string | null
  motivo: 'PAGO_PENDIENTE' | 'SIN_ASISTENCIA' | 'PAGO_RECHAZADO' | 'EVENTO_EN_CURSO'
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
  configuracionGlobal?: {
    logoUrl?: string
    firmaDecanoUrl?: string | null
    nombreDecano?: string
    cargoFirmante?: string
    plantillaFondoDefaultUrl?: string | null
    horasAcademicasDefault?: number
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
    const [usuario, configPlantillas] = await Promise.all([
      prisma.usuario.findFirst({
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
              asistencias: {
                orderBy: { fechaHoraRegistro: 'desc' },
              },
            },
            orderBy: { fechaInscripcion: 'desc' },
          },
        },
      }),
      prisma.configuracionPlantillas.findUnique({
        where: { id: 'global_config' },
      }).catch(() => null),
    ])

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

    const ahora = new Date()

    for (const ins of usuario.inscripciones) {
      const ev = ins.evento as any
      const totalAsistencias = ins.asistencias.length
      const asistenciasMinimas = ins.evento.asistenciasMinimas ?? 1
      const cumpleAsistencias = totalAsistencias >= asistenciasMinimas
      const esEventoFinalizado = ev.estado === 'FINALIZADO' || (ev.fechaFin && new Date(ev.fechaFin) <= ahora)
      const estaSolvente = ev.precio === 0 || ins.estado_pago === 'PAGADO' || ins.estado_pago === 'EXENTO'

      // Triple condición para liberar Diploma Oficial:
      // 1. Asistencias mínimas cumplidas (asistencias.length >= evento.asistenciasMinimas)
      // 2. Evento Finalizado (post-evento)
      // 3. Solvencia Financiera (Gratis, Pagado o Exento)
      if (cumpleAsistencias && esEventoFinalizado && estaSolvente) {
        const ultimaAsistencia = ins.asistencias[0]
        eventosAsistidos.push({
          inscripcionId: ins.id,
          asistenciaId: ultimaAsistencia?.id || '',
          eventoId: ins.evento.id,
          eventoTitulo: ins.evento.titulo,
          eventoFecha: ins.evento.fechaInicio,
          eventoUbicacion: ins.evento.ubicacion,
          eventoPrecio: ins.evento.precio,
          asignaturaBonificacion: ins.asignatura_bonificacion,
          horaAsistencia: ultimaAsistencia?.fechaHoraRegistro || ins.fechaInscripcion,
          estadoPago: ins.estado_pago,
          certificadoPlantillaUrl: ev?.certificado_plantilla_url || null,
          escarapelaPlantillaUrl: ev?.escarapela_plantilla_url || null,
          horasAcademicas: ev?.horas_academicas || 4,
          nombreFirmante1: ev?.nombre_firmante_1 || null,
          cargoFirmante1: ev?.cargo_firmante_1 || null,
          firmaOrganizadorUrl: ev?.firma_organizador_url || null,
          firmaDirectorUrl: ev?.firma_director_url || null,
          nombreFirmante2: ev?.nombre_firmante_2 || null,
          cargoFirmante2: ev?.cargo_firmante_2 || null,
        })
      } else {
        let motivo: 'PAGO_PENDIENTE' | 'SIN_ASISTENCIA' | 'PAGO_RECHAZADO' | 'EVENTO_EN_CURSO' = 'SIN_ASISTENCIA'
        if (ins.estado_pago === 'RECHAZADO') {
          motivo = 'PAGO_RECHAZADO'
        } else if (!estaSolvente) {
          motivo = 'PAGO_PENDIENTE'
        } else if (cumpleAsistencias && !esEventoFinalizado) {
          motivo = 'EVENTO_EN_CURSO'
        } else {
          motivo = 'SIN_ASISTENCIA'
        }

        eventosPendientes.push({
          inscripcionId: ins.id,
          eventoId: ins.evento.id,
          eventoTitulo: ins.evento.titulo,
          eventoFecha: ins.evento.fechaInicio,
          eventoPrecio: ins.evento.precio,
          estadoPago: ins.estado_pago,
          escarapelaPlantillaUrl: ev?.escarapela_plantilla_url || null,
          motivo,
        })
      }
    }

    const cfg = configPlantillas as any
    const configuracionGlobal = cfg
      ? {
          logoUrl: cfg.logo_url || '/imagen_2.png',
          firmaDecanoUrl: cfg.firma_decano_url || null,
          nombreDecano: cfg.nombre_decano || 'Ing. Roberto Gómez',
          cargoFirmante: cfg.cargo_firmante || 'Decano Facultad de Ciencias e Ingenierías',
          plantillaFondoDefaultUrl: cfg.plantilla_fondo_default_url || '/imagen_2.png',
          horasAcademicasDefault: cfg.horas_academicas_default || 4,
        }
      : undefined

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
      configuracionGlobal,
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

