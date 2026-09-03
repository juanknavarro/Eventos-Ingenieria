import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import { obtenerConfiguracionPlantillas } from '@/lib/config/plantillas'
import { generarPdfInformeEjecutivo } from '@/lib/pdf/generadorInformeEjecutivo'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session || session.rol !== 'ADMIN') {
      return new NextResponse('Acceso denegado. Se requiere rol de Administrador.', { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const eventoId = searchParams.get('eventoId')

    const config = await obtenerConfiguracionPlantillas()

    let tituloEvento = 'Todos los Eventos Académicos'
    let ubicacion = 'Facultad de Ciencias e Ingenierías'
    let rangoFechas = 'Consolidado General 2026'

    const whereInscripcion = eventoId && eventoId !== 'todos' ? { eventoId } : {}
    const whereAsistencia = eventoId && eventoId !== 'todos' ? { inscripcion: { eventoId } } : {}

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

    const [inscripciones, asistencias] = await Promise.all([
      prisma.inscripcion.findMany({
        where: whereInscripcion,
        include: {
          usuario: true,
          evento: true,
          profesorResponsable: true,
        },
      }),
      prisma.asistencia.findMany({
        where: whereAsistencia,
      }),
    ])

    const totalInscritos = inscripciones.length
    const totalAsistentes = asistencias.length
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

    const pdfBytes = await generarPdfInformeEjecutivo({
      tituloEvento,
      rangoFechas,
      ubicacion,
      totalRecaudado,
      totalInscritos,
      totalAsistentes,
      tasaAsistencia,
      recaudoPorProfesor,
      inscritosPorCarrera,
      nombreAdmin: session.nombre || 'Administrador Unisinú',
      nombreDecano: config.nombre_decano || 'Ing. Roberto Gómez',
      cargoFirmante: config.cargo_firmante || 'Decano Facultad de Ciencias e Ingenierías',
      colorPrimarioHex: config.color_primario,
      colorSecundarioHex: config.color_secundario,
      logoUrl: config.logo_url,
    })

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Informe_Gestion_${Date.now()}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    console.error('Error al generar PDF de informe:', err)
    return new NextResponse('Error al generar el informe ejecutivo.', { status: 500 })
  }
}
