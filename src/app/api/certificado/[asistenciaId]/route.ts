import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generarCertificadoPdf } from '@/lib/pdf/generador'
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
    const ev = evento as any

    const pdfBytes = await generarCertificadoPdf({
      asistenciaId: asistencia.id,
      alumnoNombre: usuario.nombre,
      alumnoDocumento: usuario.codigoEstudiantil || usuario.id,
      alumnoCarrera: usuario.carrera || 'Facultad de Ingenierías',
      eventoTitulo: evento.titulo,
      horasAcademicas: ev.horas_academicas || configPlantillas.horas_academicas_default || 4,
      fechaEvento: evento.fechaInicio,
      fondoUrl: ev.certificado_plantilla_url || configPlantillas.plantilla_fondo_default_url || '/imagen_2.png',
      firmaDecanoUrl: configPlantillas.firma_decano_url,
      nombreDecano: configPlantillas.nombre_decano,
      cargoDecano: configPlantillas.cargo_firmante,
      nombreFirmante1: ev.nombre_firmante_1,
      cargoFirmante1: ev.cargo_firmante_1,
      firmaOrganizadorUrl: ev.firma_organizador_url,
      firmaDirectorUrl: ev.firma_director_url,
      nombreFirmante2: ev.nombre_firmante_2,
      cargoFirmante2: ev.cargo_firmante_2,
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

