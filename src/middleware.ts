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
  const esRutaCambiarPassword = pathname === '/cambiar-password' || pathname.startsWith('/cambiar-password/')

  if (!esRutaAdmin && !esRutaProfesor && !esRutaStaff && !esRutaCambiarPassword) {
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

  // 4. Intercepción de Cambio de Contraseña Obligatorio
  // Si debe cambiar clave y está intentando acceder a cualquier otra ruta protegida
  if (sessionUser.debeCambiarPassword && !esRutaCambiarPassword) {
    return NextResponse.redirect(new URL('/cambiar-password', request.url))
  }

  // Si ya no debe cambiar clave e intenta ingresar a /cambiar-password, redirigir a su dashboard
  if (!sessionUser.debeCambiarPassword && esRutaCambiarPassword) {
    let dashboard = '/'
    if (sessionUser.rol === 'SUPER_ADMIN' || sessionUser.rol === 'ADMIN') dashboard = '/admin'
    else if (sessionUser.rol === 'PROFESOR') dashboard = '/profesor'
    else if (sessionUser.rol === 'STAFF') dashboard = '/staff/asistencia'
    return NextResponse.redirect(new URL(dashboard, request.url))
  }

  if (esRutaCambiarPassword) {
    return NextResponse.next()
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

// Matcher exclusivo para rutas del personal interno y cambio obligatorio de clave
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/profesor',
    '/profesor/:path*',
    '/staff',
    '/staff/:path*',
    '/cambiar-password',
    '/cambiar-password/:path*',
  ],
}
