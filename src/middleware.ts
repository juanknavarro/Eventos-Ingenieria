import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const AUTH_COOKIE_NAME = 'eventos_auth_user_session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Verificar si la ruta requiere autorización especial
  const esRutaAdmin = pathname.startsWith('/admin')
  const esRutaProfesor = pathname.startsWith('/profesor')
  const esRutaStaff = pathname.startsWith('/staff')

  // Si no es una ruta protegida, permitir el paso inmediato (ej. /, /certificados, /login, /api)
  if (!esRutaAdmin && !esRutaProfesor && !esRutaStaff) {
    return NextResponse.next()
  }

  // 2. Extraer y decodificar la cookie de sesión de autenticación
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)
  let sessionData: { rol?: string; email?: string; nombre?: string } | null = null

  if (authCookie?.value) {
    try {
      const decoded = Buffer.from(authCookie.value, 'base64').toString('utf-8')
      sessionData = JSON.parse(decoded)
    } catch {
      sessionData = null
    }
  }

  // 3. Si no está autenticado, redirigir inmediatamente a /login con el parámetro de retorno
  if (!sessionData || !sessionData.rol) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('error', 'no_autenticado')
    return NextResponse.redirect(loginUrl)
  }

  const rol = sessionData.rol

  // 4. Regla estricta para /admin: ÚNICAMENTE rol 'ADMIN'
  if (esRutaAdmin) {
    if (rol !== 'ADMIN') {
      const errorUrl = new URL('/login', request.url)
      errorUrl.searchParams.set('error', 'acceso_denegado_admin')
      return NextResponse.redirect(errorUrl)
    }
  }

  // 5. Regla estricta para /profesor: Solo rol 'PROFESOR' o 'ADMIN'
  if (esRutaProfesor) {
    const tieneAcceso = rol === 'PROFESOR' || rol === 'ADMIN'
    if (!tieneAcceso) {
      const errorUrl = new URL('/login', request.url)
      errorUrl.searchParams.set('error', 'acceso_denegado_profesor')
      return NextResponse.redirect(errorUrl)
    }
  }

  // 6. Regla estricta para /staff: Solo rol 'STAFF' o 'ADMIN'
  if (esRutaStaff) {
    const tieneAcceso = rol === 'STAFF' || rol === 'ADMIN'
    if (!tieneAcceso) {
      const errorUrl = new URL('/login', request.url)
      errorUrl.searchParams.set('error', 'acceso_denegado_staff')
      return NextResponse.redirect(errorUrl)
    }
  }

  return NextResponse.next()
}

// Configurar matcher para interceptar únicamente las rutas protegidas
export const config = {
  matcher: [
    '/admin/:path*',
    '/profesor/:path*',
    '/staff/:path*',
  ],
}
