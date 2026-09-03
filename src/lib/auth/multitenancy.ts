import { AuthSessionUser } from '@/lib/auth/session'
import { RolUsuario, Prisma } from '@prisma/client'

/**
 * Valida si la sesión actual corresponde a un SUPER_ADMIN
 */
export function esSuperAdmin(session: AuthSessionUser | null | undefined): boolean {
  return session?.rol === RolUsuario.SUPER_ADMIN
}

/**
 * Valida si la sesión actual tiene privilegios administrativos (SUPER_ADMIN o ADMIN de Programa)
 */
export function esAdminOSuperior(session: AuthSessionUser | null | undefined): boolean {
  return session?.rol === RolUsuario.SUPER_ADMIN || session?.rol === RolUsuario.ADMIN
}

/**
 * Obtiene el programa académico de la sesión normalizado
 */
export function obtenerProgramaAcademico(session: AuthSessionUser | null | undefined): string | null {
  if (!session?.carrera) return null
  return session.carrera.trim()
}

/**
 * Filtro de Eventos por Multi-Tenancy
 * - SUPER_ADMIN: Visión global de todos los eventos.
 * - ADMIN / PROFESOR / STAFF: Solo eventos de su programa académico o creados por personal de su programa.
 */
export function filtroEventosPorTenancy(session: AuthSessionUser): Prisma.EventoWhereInput {
  if (session.rol === RolUsuario.SUPER_ADMIN) {
    return {}
  }

  const programa = obtenerProgramaAcademico(session)
  if (!programa) return {}

  return {
    OR: [
      { programa_academico: programa },
      { programa_academico: 'Facultad de Ingenierías' },
      { organizador: { carrera: { contains: programa, mode: 'insensitive' } } },
    ],
  }
}

/**
 * Filtro de Usuarios por Multi-Tenancy
 * - SUPER_ADMIN: Visión global de todos los usuarios.
 * - ADMIN: Solo usuarios (docentes, staff, alumnos) de su mismo programa académico.
 */
export function filtroUsuariosPorTenancy(session: AuthSessionUser): Prisma.UsuarioWhereInput {
  if (session.rol === RolUsuario.SUPER_ADMIN) {
    return {}
  }

  const programa = obtenerProgramaAcademico(session)
  if (!programa) return {}

  return {
    carrera: {
      contains: programa,
      mode: 'insensitive',
    },
  }
}

/**
 * Filtro de Inscripciones y Recaudos Financieros por Multi-Tenancy
 * - SUPER_ADMIN: Visión global de todas las inscripciones.
 * - ADMIN / PROFESOR / STAFF: Inscripciones de estudiantes de su carrera, o eventos de su carrera, o pagos a cargo de docentes de su carrera.
 */
export function filtroInscripcionesPorTenancy(session: AuthSessionUser): Prisma.InscripcionWhereInput {
  if (session.rol === RolUsuario.SUPER_ADMIN) {
    return {}
  }

  const programa = obtenerProgramaAcademico(session)
  if (!programa) return {}

  return {
    OR: [
      { usuario: { carrera: { contains: programa, mode: 'insensitive' } } },
      { evento: { programa_academico: programa } },
      { profesorResponsable: { carrera: { contains: programa, mode: 'insensitive' } } },
    ],
  }
}

/**
 * Filtro de Asignaturas por Multi-Tenancy
 * - SUPER_ADMIN: Todas las materias de la facultad.
 * - ADMIN / PROFESOR: Solo las materias de su programa académico (o Ciencias Básicas transversales).
 */
export function filtroAsignaturasPorTenancy(session: AuthSessionUser): Prisma.AsignaturaWhereInput {
  if (session.rol === RolUsuario.SUPER_ADMIN) {
    return {}
  }

  const programa = obtenerProgramaAcademico(session)
  if (!programa) return {}

  return {
    OR: [
      { programa_academico: programa },
      { programa_academico: 'Ciencias Básicas' },
    ],
  }
}
