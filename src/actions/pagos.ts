'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { EstadoPago, RolUsuario } from '@prisma/client'
import { getAuthSession } from '@/lib/auth/session'

export type TipoMetodoPago = 'EFECTIVO' | 'TRANSFERENCIA'

export interface RegistrarPagoInput {
  inscripcionId: string
  montoRecibido: number
  metodoPago?: TipoMetodoPago
  numeroReferencia?: string
  profesorNombre?: string
  observaciones?: string
}

/**
 * Resuelve el método de pago con retrocompatibilidad estricta:
 * Si una inscripción tiene estado_pago === 'PAGADO' pero metodo_pago es nulo,
 * se asume automáticamente como 'EFECTIVO'.
 */
function resolverMetodoPago(ins: {
  estado_pago: string
  metodo_pago?: string | null
}): TipoMetodoPago | null {
  if (ins.metodo_pago === 'TRANSFERENCIA') return 'TRANSFERENCIA'
  if (ins.metodo_pago === 'EFECTIVO') return 'EFECTIVO'
  if (ins.estado_pago === 'PAGADO') return 'EFECTIVO'
  return null
}

/**
 * Registra un pago de inscripción (Efectivo o Transferencia Electrónica)
 */
export async function registrarPago({
  inscripcionId,
  montoRecibido,
  metodoPago = 'EFECTIVO',
  numeroReferencia,
  profesorNombre,
  observaciones,
}: RegistrarPagoInput) {
  try {
    const session = await getAuthSession()
    if (
      !session ||
      (session.rol !== RolUsuario.PROFESOR &&
        session.rol !== RolUsuario.ADMIN &&
        session.rol !== RolUsuario.SUPER_ADMIN)
    ) {
      return {
        success: false,
        error: 'Acceso no autorizado: Se requieren privilegios de Docente o Administrador.',
      }
    }

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

    if (metodoPago === 'TRANSFERENCIA' && !numeroReferencia?.trim()) {
      return {
        success: false,
        error: 'Para pagos por transferencia electrónica es obligatorio registrar el número de referencia o CUS.',
      }
    }

    // Formatear referencia / comprobante según método
    let comprobanteTexto = ''
    if (metodoPago === 'TRANSFERENCIA') {
      const refLimpia = numeroReferencia ? `CUS: ${numeroReferencia.trim()}` : ''
      const obsLimpia = observaciones?.trim() ? ` | ${observaciones.trim()}` : ''
      comprobanteTexto = `TRANSFERENCIA [${refLimpia}${obsLimpia}]`
    } else {
      comprobanteTexto = observaciones?.trim()
        ? `RECIBO_EFECTIVO: ${observaciones.trim()}`
        : `RECIBO_EFECTIVO_${Date.now()}`
    }

    // Actualizar estado de pago en la base de datos
    const inscripcionActualizada = await prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: {
        estado_pago: EstadoPago.PAGADO,
        metodo_pago: (metodoPago as any) || 'EFECTIVO',
        montoPagado: montoRecibido ?? inscripcion.evento.precio,
        profesor_responsable_dinero:
          profesorNombre || session.nombre || inscripcion.profesor_responsable_dinero || 'Profesor de Turno',
        profesorResponsableId: session.id,
        comprobanteUrl: comprobanteTexto,
      } as any,
    })

    // Revalidar rutas para actualización instantánea en Next.js
    try {
      revalidatePath('/')
      revalidatePath('/profesor')
      revalidatePath('/admin/reportes')
    } catch {
      // Ignorar fuera de contexto HTTP
    }

    const valorFormateado = `$${(montoRecibido ?? inscripcion.evento.precio).toLocaleString('es-CO')} COP`
    const metodoLabel = metodoPago === 'TRANSFERENCIA' ? 'transferencia electrónica' : 'efectivo'

    return {
      success: true,
      data: inscripcionActualizada,
      message: `Pago de ${valorFormateado} registrado por ${metodoLabel} con éxito para ${inscripcion.usuario.nombre}.`,
    }
  } catch (error) {
    console.error('Error al registrar pago:', error)
    return {
      success: false,
      error: 'Ocurrió un error en el servidor al intentar registrar el pago.',
    }
  }
}

/**
 * Alias retrocompatible para el pago en efectivo
 */
export async function registrarPagoEfectivo(input: RegistrarPagoInput) {
  return registrarPago(input)
}

/**
 * Revierte el estado de pago a PENDIENTE
 */
export async function revertirPago(inscripcionId: string) {
  try {
    const session = await getAuthSession()
    if (
      !session ||
      (session.rol !== RolUsuario.PROFESOR &&
        session.rol !== RolUsuario.ADMIN &&
        session.rol !== RolUsuario.SUPER_ADMIN)
    ) {
      return {
        success: false,
        error: 'Acceso no autorizado: Se requieren privilegios de Docente o Administrador.',
      }
    }

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
        metodo_pago: null,
      } as any,
    })

    try {
      revalidatePath('/')
      revalidatePath('/profesor')
      revalidatePath('/admin/reportes')
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
