'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { EstadoPago } from '@prisma/client'

export interface RegistrarPagoInput {
  inscripcionId: string
  montoRecibido: number
  profesorNombre?: string
  observaciones?: string
}

export async function registrarPagoEfectivo({
  inscripcionId,
  montoRecibido,
  profesorNombre,
  observaciones,
}: RegistrarPagoInput) {
  try {
    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
      include: { evento: true, usuario: true },
    })

    if (!inscripcion) {
      return {
        success: false,
        error: 'La inscripción especificada no existe.',
      }
    }

    if (inscripcion.estado_pago === EstadoPago.PAGADO) {
      return {
        success: false,
        error: 'Esta inscripción ya se encuentra pagada.',
      }
    }

    // Actualizar estado de pago en la base de datos
    const inscripcionActualizada = await prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: {
        estado_pago: EstadoPago.PAGADO,
        montoPagado: montoRecibido ?? inscripcion.evento.precio,
        profesor_responsable_dinero:
          profesorNombre || inscripcion.profesor_responsable_dinero || 'Profesor de Turno',
        comprobanteUrl: observaciones
          ? `RECIBO_EFECTIVO: ${observaciones}`
          : `RECIBO_EFECTIVO_${Date.now()}`,
      },
    })

    // Revalidar rutas para actualización instantánea en Next.js
    try {
      revalidatePath('/')
      revalidatePath('/profesor')
    } catch {
      // Si se ejecuta fuera del contexto de una petición Next.js (ej. script o tests)
    }

    return {
      success: true,
      data: inscripcionActualizada,
      message: `Pago de $${(montoRecibido ?? inscripcion.evento.precio).toLocaleString('es-CO')} COP en efectivo registrado con éxito para ${inscripcion.usuario.nombre}.`,
    }
  } catch (error) {
    console.error('Error al registrar pago en efectivo:', error)
    return {
      success: false,
      error: 'Ocurrió un error en el servidor al intentar registrar el pago.',
    }
  }
}

export async function revertirPago(inscripcionId: string) {
  try {
    const inscripcion = await prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
      include: { usuario: true },
    })

    if (!inscripcion) {
      return { success: false, error: 'Inscripción no encontrada.' }
    }

    await prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: {
        estado_pago: EstadoPago.PENDIENTE,
        montoPagado: 0.0,
      },
    })

    try {
      revalidatePath('/')
      revalidatePath('/profesor')
    } catch {
      // Ignorar si se ejecuta fuera de contexto HTTP
    }

    return {
      success: true,
      message: `El estado de pago para ${inscripcion.usuario.nombre} ha sido revertido a PENDIENTE.`,
    }
  } catch (error) {
    console.error('Error al revertir pago:', error)
    return {
      success: false,
      error: 'No se pudo revertir el estado del pago.',
    }
  }
}
