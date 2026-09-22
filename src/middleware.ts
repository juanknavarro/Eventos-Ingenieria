import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, verifyJwtSession } from '@/lib/auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Identificar segmento institucional protegido
  // Nota: Las rutas públicas (/ , /certificados, /login, /api) NO se interceptan aquí
  const esRutaAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  const esRutaProfesor = pathname === '/profesor' || pathname.startsWith('/profesor/')
  const esRutaStaff = pathname === '/staff' || pathname.startsWith('/staff/')

  if (!esRutaAdmin && !esRutaProfesor && !esRutaStaff) {
    return NextResponse.next()
  }

  // 2. Extraer y verificar criptográficamente la sesión JWT del personal
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)
  const sessionUser = authCookie?.value ? await verifyJwtSession(authCookie.value) : null

  // 3. Si no hay sesión válida de personal, redirigir a /login
  if (!sessionUser) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('error', 'no_autenticado')

    const response = NextResponse.redirect(loginUrl)
    if (authCookie?.value) {
      response.cookies.delete(AUTH_COOKIE_NAME)
    }
    return response
  }

  const { rol } = sessionUser

  // 4. Protección para /admin (Exclusivo: SUPER_ADMIN o ADMIN)
  if (esRutaAdmin) {
    const tieneAcceso = rol === 'SUPER_ADMIN' || rol === 'ADMIN'
    if (!tieneAcceso) {
      if (rol === 'PROFESOR') {
        const redirectUrl = new URL('/profesor', request.url)
        redirectUrl.searchParams.set('error', 'acceso_denegado_admin')
        return NextResponse.redirect(redirectUrl)
      }

      if (rol === 'STAFF') {
        const redirectUrl = new URL('/staff/asistencia', request.url)
        redirectUrl.searchParams.set('error', 'acceso_denegado_admin')
        return NextResponse.redirect(redirectUrl)
      }

      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'acceso_denegado_admin')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 5. Protección para /profesor (Exclusivo: PROFESOR, ADMIN o SUPER_ADMIN)
  if (esRutaProfesor) {
    const tieneAcceso = rol === 'PROFESOR' || rol === 'ADMIN' || rol === 'SUPER_ADMIN'
    if (!tieneAcceso) {
      if (rol === 'STAFF') {
        const redirectUrl = new URL('/staff/asistencia', request.url)
        redirectUrl.searchParams.set('error', 'acceso_denegado_profesor')
        return NextResponse.redirect(redirectUrl)
      }

      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'acceso_denegado_profesor')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 6. Protección para /staff (Exclusivo: STAFF, ADMIN, PROFESOR o SUPER_ADMIN)
  if (esRutaStaff) {
    const tieneAcceso = rol === 'STAFF' || rol === 'ADMIN' || rol === 'PROFESOR' || rol === 'SUPER_ADMIN'
    if (!tieneAcceso) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'acceso_denegado_staff')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next()
}

// Matcher exclusivo para rutas del personal interno
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/profesor',
    '/profesor/:path*',
    '/staff',
    '/staff/:path*',
  ],
}
