import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generarPdfEscarapela } from '@/lib/pdf/generadorEscarapela'
import { obtenerConfiguracionPlantillas } from '@/lib/config/plantillas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inscripcionId: string }> }
) {
  try {
    const { inscripcionId } = await params

    const [inscripcion, configPlantillas] = await Promise.all([
      prisma.inscripcion.findUnique({
        where: { id: inscripcionId },
        include: {
          usuario: true,
          evento: true,
        },
      }),
      obtenerConfiguracionPlantillas(),
    ])

    if (!inscripcion) {
      return NextResponse.json(
        { error: 'Inscripción no encontrada' },
        { status: 404 }
      )
    }

    const pdfBytes = await generarPdfEscarapela({
      alumnoNombre: inscripcion.usuario.nombre,
      alumnoCedula: inscripcion.usuario.cedula || inscripcion.usuario.codigoEstudiantil || '1000000000',
      alumnoCodigo: inscripcion.usuario.codigoEstudiantil || inscripcion.usuario.id,
      alumnoCarrera: inscripcion.usuario.carrera || 'Facultad de Ingenierías',
      alumnoSemestre: inscripcion.usuario.semestre || 'Semestre en Curso',
      eventoTitulo: inscripcion.evento.titulo,
      eventoLogoFondoUrl: inscripcion.evento.logo_fondo_url,
      eventoLogoUniversidadUrl: configPlantillas.logo_url || inscripcion.evento.logo_universidad_url,
      eventoImagenCentralUrl: inscripcion.evento.imagen_central_url || inscripcion.evento.imagenUrl,
      eventoSponsorsUrl: inscripcion.evento.sponsors_url,
      estadoPago: inscripcion.estado_pago,
      colorPrimarioHex: configPlantillas.color_primario,
      colorSecundarioHex: configPlantillas.color_secundario,
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="escarapela_${inscripcion.usuario.codigoEstudiantil || 'alumno'}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error al generar escarapela PDF:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al generar el PDF de la escarapela' },
      { status: 500 }
    )
  }
}
