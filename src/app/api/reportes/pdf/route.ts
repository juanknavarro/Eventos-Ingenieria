import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import { obtenerConfiguracionPlantillas } from '@/lib/config/plantillas'
import { generarPdfInformeEjecutivo } from '@/lib/pdf/generadorInformeEjecutivo'

import { esAdminOSuperior, esSuperAdmin, filtroInscripcionesPorTenancy } from '@/lib/auth/multitenancy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session || !esAdminOSuperior(session)) {
      return new NextResponse('Acceso denegado. Se requiere rol de Administrador.', { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const eventoId = searchParams.get('eventoId')
    const anio = searchParams.get('anio')
    const semestre = searchParams.get('semestre')
    const programa = searchParams.get('programa')

    const config = await obtenerConfiguracionPlantillas()

    let tituloEvento = 'Todos los Eventos Académicos'
    let ubicacion = esSuperAdmin(session)
      ? (programa && programa !== 'todos' ? programa : 'Facultad de Ciencias e Ingenierías')
      : (session.carrera || 'Facultad de Ciencias e Ingenierías')
    let rangoFechas = 'Consolidado Histórico General'

    // Filtro temporal por Año y Semestre (UTC)
    let filtroFechaInscripcion: any = {}

    if (anio && anio !== 'todos') {
      const anioNum = parseInt(anio, 10)
      if (!isNaN(anioNum)) {
        let inicioAnio = new Date(Date.UTC(anioNum, 0, 1, 0, 0, 0, 0))
        let finAnio = new Date(Date.UTC(anioNum, 11, 31, 23, 59, 59, 999))
        let textoSemestre = ''

        if (semestre === '1') {
          finAnio = new Date(Date.UTC(anioNum, 5, 30, 23, 59, 59, 999))
          textoSemestre = ' - Semestre 1'
        } else if (semestre === '2') {
          inicioAnio = new Date(Date.UTC(anioNum, 6, 1, 0, 0, 0, 0))
          textoSemestre = ' - Semestre 2'
        }

        filtroFechaInscripcion = {
          evento: {
            fechaInicio: {
              gte: inicioAnio,
              lte: finAnio,
            },
          },
        }

        rangoFechas = `Vigencia ${anioNum}${textoSemestre}`
        tituloEvento = `Consolidado Vigencia ${anioNum}${textoSemestre}`
      }
    }

    // Filtro adicional por Programa Académico (Super Admin)
    let filtroProgramaInscripcion: any = {}
    if (programa && programa !== 'todos') {
      filtroProgramaInscripcion = {
        OR: [
          { usuario: { carrera: { contains: programa, mode: 'insensitive' } } },
          { evento: { programa_academico: { contains: programa, mode: 'insensitive' } } },
          { profesorResponsable: { carrera: { contains: programa, mode: 'insensitive' } } },
        ],
      }
    }

    const filtroTenancy = filtroInscripcionesPorTenancy(session)
    const whereInscripcion: any = {
      AND: [
        filtroTenancy,
        filtroFechaInscripcion,
        filtroProgramaInscripcion,
        ...(eventoId && eventoId !== 'todos' ? [{ eventoId }] : []),
      ],
    }

    if (eventoId && eventoId !== 'todos') {
      const evento = await prisma.evento.findUnique({
        where: { id: eventoId },
      })
      if (evento) {
        tituloEvento = evento.titulo
        ubicacion = evento.ubicacion
        rangoFechas = new Date(evento.fechaInicio).toLocaleDateString('es-CO', {
          dateStyle: 'medium',
        })
      }
    }

    const inscripciones = await prisma.inscripcion.findMany({
      where: whereInscripcion,
      include: {
        usuario: true,
        evento: true,
        profesorResponsable: true,
        asistencias: true,
      },
    })

    const totalInscritos = inscripciones.length
    // Alumnos únicos que asistieron (al menos 1 ingreso) para evitar tasas distorsionadas > 100% en eventos multidía
    const alumnosAsistentesUnicos = inscripciones.filter((i) => i.asistencias.length > 0).length
    const totalAsistentes = alumnosAsistentesUnicos
    const totalRecaudado = inscripciones.reduce(
      (acc, curr) => acc + (curr.estado_pago === 'PAGADO' ? curr.montoPagado : 0),
      0
    )
    const tasaAsistencia = totalInscritos > 0 ? (totalAsistentes / totalInscritos) * 100 : 0

    // Desglose por profesor
    const recaudoMap = new Map<string, { inscritos: number; totalRecaudado: number }>()
    for (const ins of inscripciones) {
      const nombreProf =
        ins.profesorResponsable?.nombre ||
        ins.profesor_responsable_dinero ||
        'Sin docente asignado'

      const actual = recaudoMap.get(nombreProf) || { inscritos: 0, totalRecaudado: 0 }
      actual.inscritos += 1
      if (ins.estado_pago === 'PAGADO') {
        actual.totalRecaudado += ins.montoPagado
      }
      recaudoMap.set(nombreProf, actual)
    }

    const recaudoPorProfesor = Array.from(recaudoMap.entries()).map(([nombre, val]) => ({
      nombre,
      inscritos: val.inscritos,
      totalRecaudado: val.totalRecaudado,
    }))

    // Distribución por carrera
    const carreraMap = new Map<string, number>()
    for (const ins of inscripciones) {
      const carrera = ins.usuario.carrera || 'Facultad de Ingenierías'
      carreraMap.set(carrera, (carreraMap.get(carrera) || 0) + 1)
    }

    const inscritosPorCarrera = Array.from(carreraMap.entries()).map(([carrera, total]) => ({
      carrera,
      total,
      porcentaje: totalInscritos > 0 ? (total / totalInscritos) * 100 : 0,
    }))

    const cargoAdmin = esSuperAdmin(session)
      ? 'Super Administrador del Sistema'
      : 'Administrador de Programa'

    const pdfBytes = await generarPdfInformeEjecutivo({
      institucion: config.institucion,
      facultad: config.facultad,
      seccional: config.seccional,
      tituloEvento,
      rangoFechas,
      ubicacion,
      totalRecaudado,
      totalInscritos,
      totalAsistentes,
      tasaAsistencia,
      recaudoPorProfesor,
      inscritosPorCarrera,
      nombreAdmin: session.nombre || 'Administrador Autorizado',
      cargoAdmin,
      nombreDecano: config.nombre_decano || 'Decano(a) de Facultad',
      cargoFirmante: config.cargo_firmante || 'Decano(a) de Facultad',
      colorPrimarioHex: config.color_primario,
      colorSecundarioHex: config.color_secundario,
      logoUrl: config.logo_url,
    })

    const prefijoPeriodo =
      anio && anio !== 'todos'
        ? `${anio}${semestre && semestre !== 'todos' ? `_S${semestre}` : ''}`
        : 'Historico'
    const nombreArchivoPdf = `Informe_Gestion_${prefijoPeriodo}_${Date.now()}.pdf`

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nombreArchivoPdf}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    console.error('Error al generar PDF de informe:', err)
    return new NextResponse('Error al generar el informe ejecutivo.', { status: 500 })
  }
}
