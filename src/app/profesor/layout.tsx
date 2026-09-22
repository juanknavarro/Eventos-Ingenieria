import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth/session'
import { RolUsuario } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function ProfesorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthSession()

  // Barrera Server-Side Zero Trust
  if (!session) {
    redirect('/login?error=no_autenticado')
  }

  const tieneAcceso =
    session.rol === RolUsuario.PROFESOR ||
    session.rol === RolUsuario.ADMIN ||
    session.rol === RolUsuario.SUPER_ADMIN

  if (!tieneAcceso) {
    if (session.rol === RolUsuario.STAFF) {
      redirect('/staff/asistencia?error=acceso_denegado_profesor')
    }
    redirect('/login?error=acceso_denegado_profesor')
  }

  return <>{children}</>
}

