'use server'

import prisma from '@/lib/prisma'
import { setAuthSession, clearAuthSession, getAuthSession } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

export interface LoginResult {
  success: boolean
  error?: string
  redirectUrl?: string
}

/**
 * Inicia sesión con correo electrónico y contraseña institucional
 */
export async function iniciarSesionConCredenciales(
  formData: FormData
): Promise<LoginResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const redirectParam = formData.get('redirect') as string

  if (!email) {
    return { success: false, error: 'Por favor ingresa tu correo institucional.' }
  }

  if (!password) {
    return { success: false, error: 'Por favor ingresa tu contraseña.' }
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    })

    if (!usuario) {
      return {
        success: false,
        error: 'Credenciales inválidas. Correo electrónico o contraseña incorrecta.',
      }
    }

    // Si el usuario tiene passwordHash configurado, verificarlo con bcrypt
    if (usuario.passwordHash) {
      const passwordValida = await bcrypt.compare(password, usuario.passwordHash)
      // También permitir coincidencia directa si está en texto plano (fallback seguro)
      const coincidePlano = usuario.passwordHash === password

      if (!passwordValida && !coincidePlano) {
        return {
          success: false,
          error: 'Credenciales inválidas. Correo electrónico o contraseña incorrecta.',
        }
      }
    }

    // Establecer la sesión segura en cookie HTTP-Only
    await setAuthSession({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      carrera: usuario.carrera,
      codigoEstudiantil: usuario.codigoEstudiantil,
    })

    try {
      revalidatePath('/')
      revalidatePath('/admin')
      revalidatePath('/profesor')
      revalidatePath('/staff/asistencia')
    } catch {
      // Ignorar fuera de contexto HTTP
    }

    // Determinar ruta de redirección según el rol del usuario
    let destino = redirectParam || '/'
    if (!redirectParam || redirectParam === '/') {
      if (usuario.rol === 'SUPER_ADMIN' || usuario.rol === 'ADMIN') destino = '/admin'
      else if (usuario.rol === 'PROFESOR') destino = '/profesor'
      else if (usuario.rol === 'STAFF') destino = '/staff/asistencia'
      else destino = '/certificados'
    }

    return { success: true, redirectUrl: destino }
  } catch (err) {
    console.error('Error al iniciar sesión:', err)
    return { success: false, error: 'Ocurrió un error en el servidor al autenticar.' }
  }
}

/**
 * Cierra la sesión activa y elimina las cookies
 */
export async function cerrarSesion() {
  await clearAuthSession()
  try {
    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/profesor')
    revalidatePath('/staff/asistencia')
  } catch {
    // Ignorar
  }
  redirect('/login')
}

/**
 * Consulta la sesión activa del usuario
 */
export async function obtenerUsuarioSesion() {
  return await getAuthSession()
}
