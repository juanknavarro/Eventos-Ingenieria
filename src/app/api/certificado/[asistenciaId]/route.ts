import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generarPdfCertificado } from '@/lib/pdf/generadorCertificado'
import { obtenerConfiguracionPlantillas } from '@/lib/config/plantillas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asistenciaId: string }> }
) {
  try {
    const { asistenciaId } = await params

    const [asistencia, configPlantillas] = await Promise.all([
      prisma.asistencia.findUnique({
        where: { id: asistenciaId },
        include: {
          inscripcion: {
            include: {
              usuario: true,
              evento: {
                include: {
                  organizador: true,
                },
              },
            },
          },
        },
      }),
      obtenerConfiguracionPlantillas(),
    ])

    if (!asistencia) {
      return NextResponse.json(
        {
          error:
            'Registro de asistencia no encontrado. El certificado solo está disponible para alumnos con asistencia confirmada en el evento.',
        },
        { status: 404 }
      )
    }

    const { inscripcion } = asistencia
    const { usuario, evento } = inscripcion

    const pdfBytes = await generarPdfCertificado({
      asistenciaId: asistencia.id,
      alumnoNombre: usuario.nombre,
      alumnoCodigo: usuario.codigoEstudiantil || usuario.id,
      alumnoCarrera: usuario.carrera || 'Facultad de Ingenierías',
      eventoTitulo: evento.titulo,
      eventoUbicacion: evento.ubicacion,
      eventoFecha: evento.fechaInicio,
      organizadorNombre: evento.organizador?.nombre || 'Coordinación Académica',
      fechaRegistroAsistencia: asistencia.fechaHoraRegistro,
      colorPrimarioHex: configPlantillas.color_primario,
      colorSecundarioHex: configPlantillas.color_secundario,
      logoUniversidadUrl: configPlantillas.logo_url,
      firmaDecanoUrl: configPlantillas.firma_decano_url,
      nombreDecano: configPlantillas.nombre_decano,
      cargoFirmante: configPlantillas.cargo_firmante,
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="certificado_${usuario.codigoEstudiantil || 'asistencia'}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error al generar certificado PDF:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al generar el PDF del certificado' },
      { status: 500 }
    )
  }
}

