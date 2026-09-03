'use server'

import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { RolUsuario, EstadoEvento } from '@prisma/client'
import { subirArchivoRecursosEventos } from '@/lib/supabase/storage'
import bcrypt from 'bcryptjs'

export interface ActionResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Valida que la sesión actual pertenezca a un usuario con rol ADMIN
 */
async function asegurarAdmin(): Promise<void> {
  const session = await getAuthSession()
  if (!session || session.rol !== 'ADMIN') {
    throw new Error('Acceso no autorizado: Se requieren privilegios de Administrador General.')
  }
}

/**
 * Cambia el rol de un usuario (para asignar o revocar accesos a PROFESOR, STAFF, ALUMNO)
 */
export async function cambiarRolUsuario(
  usuarioId: string,
  nuevoRol: RolUsuario
): Promise<ActionResult> {
  try {
    await asegurarAdmin()

    // Evitar que el administrador se quite a sí mismo el rol ADMIN
    const session = await getAuthSession()
    if (session?.id === usuarioId && nuevoRol !== 'ADMIN') {
      return {
        success: false,
        error: 'Por seguridad, el Administrador principal no puede revocar sus propios privilegios.',
      }
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: { rol: nuevoRol },
    })

    revalidatePath('/admin')
    revalidatePath('/profesor')
    revalidatePath('/staff/asistencia')

    return {
      success: true,
      message: `Rol de ${usuarioActualizado.nombre} actualizado a "${nuevoRol}" exitosamente.`,
    }
  } catch (err: unknown) {
    console.error('Error al cambiar rol:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al actualizar rol del usuario.',
    }
  }
}

/**
 * Crea un nuevo evento en la base de datos con soporte para subida de archivos o URLs
 */
export async function crearEvento(formData: FormData): Promise<ActionResult> {
  try {
    await asegurarAdmin()
    const session = await getAuthSession()

    const titulo = formData.get('titulo') as string
    const descripcion = formData.get('descripcion') as string
    const fechaInicioStr = formData.get('fechaInicio') as string
    const fechaFinStr = formData.get('fechaFin') as string
    const ubicacion = formData.get('ubicacion') as string
    const capacidadMaximaStr = formData.get('capacidadMaxima') as string
    const precioStr = formData.get('precio') as string
    const estado = (formData.get('estado') as EstadoEvento) || EstadoEvento.PUBLICADO
    const imagenUrl = (formData.get('imagenUrl') as string) || null

    let logoFondoUrl = (formData.get('logo_fondo_url') as string) || null
    let imagenCentralUrl = (formData.get('imagen_central_url') as string) || null
    let sponsorsUrl = (formData.get('sponsors_url') as string) || null

    if (!titulo || !descripcion || !fechaInicioStr || !ubicacion) {
      return { success: false, error: 'Por favor completa todos los campos requeridos.' }
    }

    // 1. Procesar archivo de Imagen Central si fue subido
    const archivoCentral = formData.get('archivo_imagen_central') as File | null
    if (archivoCentral && archivoCentral.size > 0) {
      const subida = await subirArchivoRecursosEventos(archivoCentral, 'central')
      if (subida.url) {
        imagenCentralUrl = subida.url
      }
    }

    // 2. Procesar archivo de Imagen de Fondo / Cabecera si fue subido
    const archivoFondo = formData.get('archivo_logo_fondo') as File | null
    if (archivoFondo && archivoFondo.size > 0) {
      const subida = await subirArchivoRecursosEventos(archivoFondo, 'cabecera')
      if (subida.url) {
        logoFondoUrl = subida.url
      }
    }

    // 3. Procesar archivo de Patrocinadores si fue subido
    const archivoSponsors = formData.get('archivo_sponsors') as File | null
    if (archivoSponsors && archivoSponsors.size > 0) {
      const subida = await subirArchivoRecursosEventos(archivoSponsors, 'sponsors')
      if (subida.url) {
        sponsorsUrl = subida.url
      }
    }

    await prisma.evento.create({
      data: {
        titulo,
        descripcion,
        fechaInicio: new Date(fechaInicioStr),
        fechaFin: fechaFinStr ? new Date(fechaFinStr) : new Date(fechaInicioStr),
        ubicacion,
        capacidadMaxima: capacidadMaximaStr ? parseInt(capacidadMaximaStr, 10) : null,
        precio: precioStr ? parseFloat(precioStr) : 0.0,
        estado,
        imagenUrl: imagenUrl || imagenCentralUrl,
        logo_fondo_url: logoFondoUrl,
        logo_universidad_url: '/imagen_2.png',
        imagen_central_url: imagenCentralUrl,
        sponsors_url: sponsorsUrl,
        organizadorId: session?.id || '',
      },
    })

    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath('/profesor')

    return { success: true, message: 'Evento y recursos gráficos creados exitosamente.' }
  } catch (err: unknown) {
    console.error('Error al crear evento:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al crear evento.',
    }
  }
}

/**
 * Actualiza un evento existente con soporte para subida de archivos o URLs
 */
export async function actualizarEvento(formData: FormData): Promise<ActionResult> {
  try {
    await asegurarAdmin()

    const eventoId = formData.get('eventoId') as string
    const titulo = formData.get('titulo') as string
    const descripcion = formData.get('descripcion') as string
    const fechaInicioStr = formData.get('fechaInicio') as string
    const fechaFinStr = formData.get('fechaFin') as string
    const ubicacion = formData.get('ubicacion') as string
    const capacidadMaximaStr = formData.get('capacidadMaxima') as string
    const precioStr = formData.get('precio') as string
    const estado = formData.get('estado') as EstadoEvento
    const imagenUrl = (formData.get('imagenUrl') as string) || null

    let logoFondoUrl = (formData.get('logo_fondo_url') as string) || null
    let imagenCentralUrl = (formData.get('imagen_central_url') as string) || null
    let sponsorsUrl = (formData.get('sponsors_url') as string) || null

    if (!eventoId || !titulo || !descripcion) {
      return { success: false, error: 'Identificador o campos obligatorios faltantes.' }
    }

    // 1. Procesar archivo de Imagen Central si fue subido
    const archivoCentral = formData.get('archivo_imagen_central') as File | null
    if (archivoCentral && archivoCentral.size > 0) {
      const subida = await subirArchivoRecursosEventos(archivoCentral, 'central')
      if (subida.url) {
        imagenCentralUrl = subida.url
      }
    }

    // 2. Procesar archivo de Imagen de Fondo / Cabecera si fue subido
    const archivoFondo = formData.get('archivo_logo_fondo') as File | null
    if (archivoFondo && archivoFondo.size > 0) {
      const subida = await subirArchivoRecursosEventos(archivoFondo, 'cabecera')
      if (subida.url) {
        logoFondoUrl = subida.url
      }
    }

    // 3. Procesar archivo de Patrocinadores si fue subido
    const archivoSponsors = formData.get('archivo_sponsors') as File | null
    if (archivoSponsors && archivoSponsors.size > 0) {
      const subida = await subirArchivoRecursosEventos(archivoSponsors, 'sponsors')
      if (subida.url) {
        sponsorsUrl = subida.url
      }
    }

    await prisma.evento.update({
      where: { id: eventoId },
      data: {
        titulo,
        descripcion,
        fechaInicio: fechaInicioStr ? new Date(fechaInicioStr) : undefined,
        fechaFin: fechaFinStr ? new Date(fechaFinStr) : undefined,
        ubicacion,
        capacidadMaxima: capacidadMaximaStr ? parseInt(capacidadMaximaStr, 10) : null,
        precio: precioStr ? parseFloat(precioStr) : 0.0,
        estado,
        imagenUrl: imagenUrl || imagenCentralUrl,
        logo_fondo_url: logoFondoUrl,
        imagen_central_url: imagenCentralUrl,
        sponsors_url: sponsorsUrl,
      },
    })

    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath('/profesor')

    return { success: true, message: 'Evento actualizado correctamente.' }
  } catch (err: unknown) {
    console.error('Error al actualizar evento:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al actualizar evento.',
    }
  }
}

/**
 * Elimina un evento
 */
export async function eliminarEvento(eventoId: string): Promise<ActionResult> {
  try {
    await asegurarAdmin()

    await prisma.evento.delete({
      where: { id: eventoId },
    })

    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath('/profesor')

    return { success: true, message: 'Evento eliminado correctamente.' }
  } catch (err: unknown) {
    console.error('Error al eliminar evento:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al eliminar evento.',
    }
  }
}

/**
 * Registra manualmente un nuevo usuario PROFESOR o STAFF en el sistema
 */
export async function registrarPersonal(formData: FormData): Promise<ActionResult> {
  try {
    await asegurarAdmin()

    const nombre = (formData.get('nombre') as string)?.trim()
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const cedula = (formData.get('cedula') as string)?.trim()
    const carrera = (formData.get('carrera') as string)?.trim() || 'Facultad de Ingenierías'
    const rol = formData.get('rol') as RolUsuario
    const password = (formData.get('password') as string)?.trim()

    // Validaciones de campos obligatorios
    if (!nombre || !email || !cedula || !password) {
      return {
        success: false,
        error: 'Todos los campos obligatorios (*) deben ser completados.',
      }
    }

    // Regla estricta: Excluir rol ALUMNO y permitir exclusivamente PROFESOR o STAFF
    if (rol !== RolUsuario.PROFESOR && rol !== RolUsuario.STAFF) {
      return {
        success: false,
        error: 'Solo se permite registrar personal docente (PROFESOR) o administrativo (STAFF).',
      }
    }

    // Verificar si el correo ya está registrado
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    })

    if (usuarioExistente) {
      return {
        success: false,
        error: `Ya existe un usuario con el correo institucional "${email}".`,
      }
    }

    // Verificar si la cédula ya está registrada
    const cedulaExistente = await prisma.usuario.findFirst({
      where: {
        OR: [{ cedula }, { codigoEstudiantil: cedula }],
      },
    })

    if (cedulaExistente) {
      return {
        success: false,
        error: `Ya existe un usuario registrado con la cédula "${cedula}".`,
      }
    }

    // Hashear la contraseña temporal con bcryptjs
    const passwordHash = await bcrypt.hash(password, 10)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        cedula,
        codigoEstudiantil: cedula,
        carrera,
        rol,
        passwordHash,
      },
    })

    revalidatePath('/admin')
    revalidatePath('/profesor')
    revalidatePath('/staff/asistencia')

    return {
      success: true,
      message: `Personal "${nuevoUsuario.nombre}" registrado exitosamente con rol ${nuevoUsuario.rol}.`,
    }
  } catch (err: unknown) {
    console.error('Error al registrar personal:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al registrar personal.',
    }
  }
}

/**
 * Actualiza la configuración global de las plantillas PDF (logo, firma, nombre decano y colores de franjas)
 */
export async function actualizarConfiguracionPlantillas(formData: FormData): Promise<ActionResult> {
  try {
    await asegurarAdmin()

    let logoUrl = (formData.get('logo_url') as string)?.trim() || '/imagen_2.png'
    let firmaDecanoUrl = (formData.get('firma_decano_url') as string)?.trim() || null
    const nombreDecano = (formData.get('nombre_decano') as string)?.trim() || 'Ing. Roberto Gómez'
    const cargoFirmante = (formData.get('cargo_firmante') as string)?.trim() || 'Decano Facultad de Ciencias e Ingenierías'
    const colorPrimario = (formData.get('color_primario') as string)?.trim() || '#0B305B'
    const colorSecundario = (formData.get('color_secundario') as string)?.trim() || '#D2202E'

    // 1. Procesar archivo de logo si fue subido
    const archivoLogo = formData.get('archivo_logo') as File | null
    if (archivoLogo && archivoLogo.size > 0) {
      const subida = await subirArchivoRecursosEventos(archivoLogo, 'logo_institucional')
      if (subida.url) {
        logoUrl = subida.url
      }
    }

    // 2. Procesar archivo de firma del decano si fue subido
    const archivoFirma = formData.get('archivo_firma_decano') as File | null
    if (archivoFirma && archivoFirma.size > 0) {
      const subida = await subirArchivoRecursosEventos(archivoFirma, 'firma_decano')
      if (subida.url) {
        firmaDecanoUrl = subida.url
      }
    }

    await prisma.configuracionPlantillas.upsert({
      where: { id: 'global_config' },
      create: {
        id: 'global_config',
        logo_url: logoUrl,
        firma_decano_url: firmaDecanoUrl,
        nombre_decano: nombreDecano,
        cargo_firmante: cargoFirmante,
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
      },
      update: {
        logo_url: logoUrl,
        firma_decano_url: firmaDecanoUrl,
        nombre_decano: nombreDecano,
        cargo_firmante: cargoFirmante,
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
      },
    })

    revalidatePath('/admin')
    revalidatePath('/')

    return {
      success: true,
      message: 'Configuración global de plantillas PDF actualizada exitosamente.',
    }
  } catch (err: unknown) {
    console.error('Error al actualizar configuración de plantillas:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al guardar la configuración de plantillas.',
    }
  }
}

/**
 * Actualiza los datos de un usuario (nombre, correo, cédula y programa académico)
 */
export async function actualizarUsuario(formData: FormData): Promise<ActionResult> {
  try {
    await asegurarAdmin()

    const usuarioId = formData.get('usuarioId') as string
    const nombre = (formData.get('nombre') as string)?.trim()
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const cedula = (formData.get('cedula') as string)?.trim()
    const carrera = (formData.get('carrera') as string)?.trim()

    if (!usuarioId || !nombre || !email) {
      return { success: false, error: 'El nombre y correo electrónico son obligatorios.' }
    }

    // Validar que el nuevo correo no esté tomado por otro usuario
    const correoEnUso = await prisma.usuario.findFirst({
      where: {
        email,
        NOT: { id: usuarioId },
      },
    })

    if (correoEnUso) {
      return { success: false, error: `El correo "${email}" ya se encuentra registrado por otro usuario.` }
    }

    // Validar que la cédula no esté tomada por otro usuario (si se suministra)
    if (cedula) {
      const cedulaEnUso = await prisma.usuario.findFirst({
        where: {
          OR: [{ cedula }, { codigoEstudiantil: cedula }],
          NOT: { id: usuarioId },
        },
      })

      if (cedulaEnUso) {
        return { success: false, error: `La cédula "${cedula}" ya se encuentra registrada por otro usuario.` }
      }
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre,
        email,
        cedula: cedula || null,
        codigoEstudiantil: cedula || undefined,
        carrera: carrera || null,
      },
    })

    revalidatePath('/admin')
    revalidatePath('/profesor')
    revalidatePath('/staff/asistencia')

    return {
      success: true,
      message: `Usuario "${usuarioActualizado.nombre}" actualizado correctamente.`,
    }
  } catch (err: unknown) {
    console.error('Error al actualizar usuario:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al actualizar usuario.',
    }
  }
}

/**
 * Elimina permanentemente un usuario del sistema (con protecciones de seguridad para ADMIN)
 */
export async function eliminarUsuario(usuarioId: string): Promise<ActionResult> {
  try {
    await asegurarAdmin()
    const session = await getAuthSession()

    // 1. Regla de seguridad: Evitar autoborrado accidental del usuario autenticado
    if (session?.id === usuarioId) {
      return {
        success: false,
        error: 'Operación no permitida: No puedes eliminar tu propia cuenta de Administrador mientras estás en sesión.',
      }
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        eventosOrganizados: true,
      },
    })

    if (!usuario) {
      return { success: false, error: 'El usuario especificado no existe.' }
    }

    // 2. Proteger al Super Administrador institucional oficial
    if (usuario.email === 'juannavarro@unisinu.edu.co') {
      return {
        success: false,
        error: 'La cuenta principal de Super Administrador (Juan Carlos Navarro Ramos) está protegida contra eliminación.',
      }
    }

    // Si tiene eventos organizados, reasignarlos temporalmente al admin en sesión para no violar Restrict
    if (usuario.eventosOrganizados.length > 0 && session?.id) {
      await prisma.evento.updateMany({
        where: { organizadorId: usuarioId },
        data: { organizadorId: session.id },
      })
    }

    // Proceder a la eliminación (las inscripciones se eliminan en cascada por Prisma)
    await prisma.usuario.delete({
      where: { id: usuarioId },
    })

    revalidatePath('/admin')
    revalidatePath('/profesor')
    revalidatePath('/staff/asistencia')

    return {
      success: true,
      message: `Usuario "${usuario.nombre}" eliminado exitosamente del sistema.`,
    }
  } catch (err: unknown) {
    console.error('Error al eliminar usuario:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al eliminar usuario.',
    }
  }
}



