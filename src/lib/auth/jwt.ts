import { SignJWT, jwtVerify } from 'jose'

export const AUTH_COOKIE_NAME = 'eventos_auth_user_session'

export type RolUsuarioEnum = 'SUPER_ADMIN' | 'ADMIN' | 'PROFESOR' | 'STAFF' | 'ALUMNO'

export interface AuthSessionUser {
  id: string
  email: string
  nombre: string
  rol: RolUsuarioEnum
  carrera: string | null
  codigoEstudiantil: string | null
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || 'unisinu-eventos-ingenieria-secret-key-2026-min-32-chars-long'
  return new TextEncoder().encode(secret)
}

/**
 * Genera un JWT criptográficamente firmado con HS256 y expiración de 7 días.
 * Compatible con Node.js y Edge Runtime (Next.js Middleware).
 */
export async function signJwtSession(user: AuthSessionUser): Promise<string> {
  const secret = getJwtSecret()
  return await new SignJWT({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    carrera: user.carrera,
    codigoEstudiantil: user.codigoEstudiantil,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

/**
 * Valida la firma criptográfica del JWT y retorna el payload tipado.
 * Retorna null si el token fue manipulado, expiró o no es válido.
 */
export async function verifyJwtSession(token: string): Promise<AuthSessionUser | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    if (!payload || !payload.id || !payload.rol) {
      return null
    }

    return {
      id: payload.id as string,
      email: payload.email as string,
      nombre: payload.nombre as string,
      rol: payload.rol as RolUsuarioEnum,
      carrera: (payload.carrera as string) || null,
      codigoEstudiantil: (payload.codigoEstudiantil as string) || null,
    }
  } catch {
    return null
  }
}

