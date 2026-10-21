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
      include: {
        eventoAsignado: true,
      },
    })

    if (!usuario) {
      return {
        success: false,
        error: 'Credenciales inválidas. Correo electrónico o contraseña incorrecta.',
      }
    }

    // Regla de Negocio: Los estudiantes (ALUMNO) no inician sesión. El acceso es solo para personal institucional
    if (usuario.rol === 'ALUMNO') {
      return {
        success: false,
        error:
          'El acceso con usuario y contraseña es exclusivo para personal docente, administrativo y de apoyo. Si eres estudiante, puedes consultar tus certificados y participar en eventos directamente desde el portal público sin necesidad de iniciar sesión.',
      }
    }

    // Nivel 1 de Defensa: Si el usuario es STAFF, validar que tenga un evento asignado y no haya expirado
    if (usuario.rol === 'STAFF') {
      if (!usuario.eventoAsignado || usuario.eventoAsignado.fechaFin < new Date()) {
        return {
          success: false,
          error:
            'Acceso inhabilitado: Tu credencial de Staff ha expirado tras finalizar el evento. ¡Gracias por tu colaboración!',
        }
      }
    }

    // Exigir contraseña obligatoria y rechazar cuentas sin hash configurado
    if (!usuario.passwordHash) {
      return {
        success: false,
        error: 'Esta cuenta no tiene contraseña habilitada. Contacta al administrador.',
      }
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash)
    const coincidePlano = usuario.passwordHash === password

    if (!passwordValida && !coincidePlano) {
      return {
        success: false,
        error: 'Credenciales inválidas. Correo electrónico o contraseña incorrecta.',
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
      debeCambiarPassword: usuario.debeCambiarPassword ?? false,
    })

    try {
      revalidatePath('/')
      revalidatePath('/admin')
      revalidatePath('/profesor')
      revalidatePath('/staff/asistencia')
    } catch {
      // Ignorar fuera de contexto HTTP
    }

    // Determinar ruta de redirección según el rol del usuario o forzar cambio de clave
    let destino = redirectParam || '/'
    if (usuario.debeCambiarPassword) {
      destino = '/cambiar-password'
    } else if (!redirectParam || redirectParam === '/') {
      if (usuario.rol === 'SUPER_ADMIN' || usuario.rol === 'ADMIN') destino = '/admin'
      else if (usuario.rol === 'PROFESOR') destino = '/profesor'
      else if (usuario.rol === 'STAFF') destino = '/staff/asistencia'
      else destino = '/'
    }

    return { success: true, redirectUrl: destino }
  } catch (err) {
    console.error('Error al iniciar sesión:', err)
    return { success: false, error: 'Ocurrió un error en el servidor al autenticar.' }
  }
}

export interface CambiarPasswordResult {
  success: boolean
  error?: string
  message?: string
  redirectUrl?: string
}

/**
 * Server Action para el cambio de contraseña obligatorio en el primer inicio de sesión
 */
export async function cambiarPasswordObligatorio(
  formData: FormData
): Promise<CambiarPasswordResult> {
  try {
    const session = await getAuthSession()
    if (!session) {
      return {
        success: false,
        error: 'Sesión no encontrada o expirada. Por favor inicia sesión nuevamente.',
        redirectUrl: '/login',
      }
    }

    const password = (formData.get('password') as string)?.trim()
    const confirmPassword = (formData.get('confirmPassword') as string)?.trim()

    if (!password) {
      return { success: false, error: 'Debes ingresar una nueva contraseña.' }
    }

    // 1. Longitud mínima de 8 caracteres
    if (password.length < 8) {
      return {
        success: false,
        error: 'La nueva contraseña debe tener como mínimo 8 caracteres.',
      }
    }

    // 2. Al menos una letra mayúscula
    if (!/[A-Z]/.test(password)) {
      return {
        success: false,
        error: 'La contraseña debe contener al menos una letra mayúscula (A-Z).',
      }
    }

    // 3. Al menos un número
    if (!/[0-9]/.test(password)) {
      return {
        success: false,
        error: 'La contraseña debe contener al menos un número (0-9).',
      }
    }

    // 4. Al menos un carácter especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      return {
        success: false,
        error: 'La contraseña debe contener al menos un carácter especial (ej. !@#$%&*).',
      }
    }

    // 5. Coincidencia de confirmación
    if (confirmPassword && password !== confirmPassword) {
      return {
        success: false,
        error: 'Las contraseñas no coinciden. Por favor verifícalas.',
      }
    }

    // Generar hash seguro con bcrypt
    const passwordHash = await bcrypt.hash(password, 10)

    // Actualizar usuario en Prisma y desactivar flag de cambio obligatorio
    await prisma.usuario.update({
      where: { id: session.id },
      data: {
        passwordHash,
        debeCambiarPassword: false,
      },
    })

    // Reemitir cookie de sesión con debeCambiarPassword: false
    await setAuthSession({
      ...session,
      debeCambiarPassword: false,
    })

    try {
      revalidatePath('/')
      revalidatePath('/admin')
      revalidatePath('/profesor')
      revalidatePath('/staff/asistencia')
      revalidatePath('/cambiar-password')
    } catch {
      // Ignorar fuera de contexto HTTP
    }

    // Determinar destino según rol
    let destino = '/'
    if (session.rol === 'SUPER_ADMIN' || session.rol === 'ADMIN') destino = '/admin'
    else if (session.rol === 'PROFESOR') destino = '/profesor'
    else if (session.rol === 'STAFF') destino = '/staff/asistencia'

    return {
      success: true,
      message: '¡Contraseña actualizada exitosamente! Bienvenido al sistema.',
      redirectUrl: destino,
    }
  } catch (err) {
    console.error('Error al cambiar contraseña:', err)
    return {
      success: false,
      error: 'Ocurrió un error en el servidor al intentar actualizar tu contraseña.',
    }
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
