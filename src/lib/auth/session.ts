import { cookies } from 'next/headers'
import { RolUsuario } from '@prisma/client'
import {
  AUTH_COOKIE_NAME,
  AuthSessionUser,
  signJwtSession,
  verifyJwtSession,
} from './jwt'

export { AUTH_COOKIE_NAME }
export type { AuthSessionUser }

/**
 * Establece la sesión de usuario en una cookie HTTP-Only segura firmada con JWT.
 * El token está sellado con HMAC-SHA256 usando AUTH_SECRET.
 */
export async function setAuthSession(user: AuthSessionUser) {
  const cookieStore = await cookies()
  const token = await signJwtSession(user)

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  })
}

/**
 * Obtiene la sesión actual desde las cookies y verifica rigurosamente su firma criptográfica.
 * Retorna null si la cookie no existe, fue manipulada en el cliente o ha expirado.
 */
export async function getAuthSession(): Promise<AuthSessionUser | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(AUTH_COOKIE_NAME)
    if (!cookie?.value) return null

    return await verifyJwtSession(cookie.value)
  } catch {
    return null
  }
}

/**
 * Elimina la cookie de sesión (Cerrar sesión / Logout)
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
    rolesPermitidos.includes(session.rol as RolUsuario) ||
    session.rol === RolUsuario.SUPER_ADMIN ||
    session.rol === RolUsuario.ADMIN
  ) {
    return session
  }

  return null
}
