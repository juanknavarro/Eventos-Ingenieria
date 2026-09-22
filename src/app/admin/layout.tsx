import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth/session'
import { esAdminOSuperior } from '@/lib/auth/multitenancy'
import { RolUsuario } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthSession()

  // Barrera Server-Side Zero Trust
  if (!session) {
    redirect('/login?error=no_autenticado')
  }

  if (!esAdminOSuperior(session)) {
    if (session.rol === RolUsuario.PROFESOR) {
      redirect('/profesor?error=acceso_denegado_admin')
    }
    if (session.rol === RolUsuario.STAFF) {
      redirect('/staff/asistencia?error=acceso_denegado_admin')
    }
    redirect('/login?error=acceso_denegado_admin')
  }

  return <>{children}</>
}

