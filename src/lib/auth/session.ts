import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { RolUsuario } from '@prisma/client'

export const AUTH_COOKIE_NAME = 'eventos_auth_user_session'

export interface AuthSessionUser {
  id: string
  email: string
  nombre: string
  rol: RolUsuario
  carrera: string | null
  codigoEstudiantil: string | null
}

/**
 * Establece la sesión de usuario en una cookie HTTP-Only segura
 */
export async function setAuthSession(user: AuthSessionUser) {
  const cookieStore = await cookies()
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    carrera: user.carrera,
    codigoEstudiantil: user.codigoEstudiantil,
    issuedAt: Date.now(),
  })

  // Codificar de forma segura en Base64
  const encoded = Buffer.from(payload).toString('base64')

  cookieStore.set(AUTH_COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  })
}

/**
 * Obtiene la sesión actual desde las cookies en Server Components o Server Actions
 */
export async function getAuthSession(): Promise<AuthSessionUser | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(AUTH_COOKIE_NAME)
    if (!cookie?.value) return null

    const decoded = Buffer.from(cookie.value, 'base64').toString('utf-8')
    const session = JSON.parse(decoded) as AuthSessionUser

    if (!session?.id || !session?.rol) return null
    return session
  } catch {
    return null
  }
}

/**
 * Elimina la cookie de sesión (Logout)
 */
export async function clearAuthSession() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

/**
 * Valida si el usuario actual tiene permisos para un rol requerido
 */
export async function verificarPermiso(rolesPermitidos: RolUsuario[]): Promise<AuthSessionUser | null> {
  const session = await getAuthSession()
  if (!session) return null

  if (
    rolesPermitidos.includes(session.rol) ||
    session.rol === RolUsuario.SUPER_ADMIN ||
    session.rol === RolUsuario.ADMIN
  ) {
    return session
  }

  return null
}

