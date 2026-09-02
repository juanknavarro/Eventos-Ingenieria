import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import {
  Calendar,
  Users,
  CreditCard,
  CheckCircle2,
  Clock,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  MapPin,
  DollarSign,
  BookOpen,
  Award,
  Sparkles,
  HandCoins,
  ArrowRight,
  ScanBarcode,
  LogIn,
  User,
} from 'lucide-react'

// Revalidar en cada solicitud para reflejar cambios en la base de datos
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Consultas a la base de datos relacional mediante Prisma y sesión activa
  const [usuarios, eventos, inscripciones, asistencias, sesion] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.evento.findMany({
      include: {
        organizador: true,
        _count: {
          select: { inscripciones: true },
        },
      },
      orderBy: { fechaInicio: 'asc' },
    }),
    prisma.inscripcion.findMany({
      include: {
        usuario: true,
        evento: true,
        profesorResponsable: true,
        asistencia: {
          include: {
            registradoPor: true,
          },
        },
      },
      orderBy: { fechaInscripcion: 'desc' },
    }),
    prisma.asistencia.findMany({
      include: {
        inscripcion: {
          include: {
            usuario: true,
            evento: true,
          },
        },
        registradoPor: true,
      },
      orderBy: { fechaHoraRegistro: 'desc' },
    }),
    getAuthSession(),
  ])

  // Métricas calculadas
  const totalRecaudado = inscripciones.reduce(
    (acc, curr) => acc + (curr.estado_pago === 'PAGADO' ? curr.montoPagado : 0),
    0
  )

  const rolesCount = {
    ADMIN: usuarios.filter((u) => u.rol === 'ADMIN').length,
    PROFESOR: usuarios.filter((u) => u.rol === 'PROFESOR').length,
    STAFF: usuarios.filter((u) => u.rol === 'STAFF').length,
    ALUMNO: usuarios.filter((u) => u.rol === 'ALUMNO').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/50">
      {/* Header Institucional Unisinú */}
      <header className="border-b-2 border-[#D2202E]/20 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#0B305B] text-white rounded-xl shadow-md border-t-2 border-[#D2202E]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-[#D2202E] tracking-wider uppercase">
                  Universidad del Sinú
                </span>
                <span className="h-3 w-px bg-slate-300"></span>
                <span className="text-[11px] font-bold text-slate-500">Seccional Cartagena</span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-[#0B305B] tracking-tight leading-tight">
                Facultad de Ciencias e Ingenierías
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/certificados"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#D2202E] hover:bg-[#B01824] rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              <Award className="w-4 h-4" />
              Descargar Certificados
            </Link>

            {/* Navegación diferenciada según el Rol del usuario autenticado */}
            {sesion?.rol === 'ADMIN' && (
              <>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-sm transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Panel Maestro (/admin)
                </Link>
                <Link
                  href="/profesor"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl shadow-sm transition-all"
                >
                  <HandCoins className="w-4 h-4" />
                  Panel Docente
                </Link>
                <Link
                  href="/staff/asistencia"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all"
                >
                  <ScanBarcode className="w-4 h-4 text-[#0B305B]" />
                  Staff (Puerta)
                </Link>
              </>
            )}

            {sesion?.rol === 'PROFESOR' && (
              <Link
                href="/profesor"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <HandCoins className="w-4 h-4 text-white" />
                Aprobar Pagos (Docente)
              </Link>
            )}

            {sesion?.rol === 'STAFF' && (
              <Link
                href="/staff/asistencia"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl shadow-sm transition-all"
              >
                <ScanBarcode className="w-4 h-4" />
                Control en Puerta (Staff)
              </Link>
            )}

            {/* Estado de Autenticación */}
            {sesion ? (
              <div className="flex items-center gap-2 bg-[#F0F4F9] pl-3 pr-1.5 py-1 rounded-xl border border-[#C2D3E7] text-xs">
                <div className="text-left">
                  <span className="font-bold text-[#0B305B] block truncate max-w-[110px]">
                    {sesion.nombre.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-extrabold text-[#D2202E] uppercase">
                    {sesion.rol}
                  </span>
                </div>
                <BotonCerrarSesion />
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0B305B] bg-[#E1E9F3] hover:bg-[#C2D3E7] rounded-xl transition"
              >
                <LogIn className="w-4 h-4" />
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Banner Informativo Institucional Unisinú */}
        <section className="bg-gradient-to-r from-[#0B305B] via-[#08213E] to-[#04101E] text-white rounded-3xl p-6 sm:p-9 shadow-2xl shadow-[#0B305B]/20 relative overflow-hidden border-t-4 border-[#D2202E]">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D2202E]/20 backdrop-blur-sm border border-[#D2202E]/40 text-xs font-bold text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#D2202E]" /> Plataforma Universitaria Oficial
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Control Académico, Financiero y Certificación Digital
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Trazabilidad integral para la Facultad de Ingenierías: gestión centralizada de eventos,
              aprobación docente de <strong className="text-white font-semibold">recaudo en efectivo</strong>,
              control de acceso en puerta con <strong className="text-white font-semibold">lector de código de barras</strong> y emisión de{' '}
              <strong className="text-[#F6CDD1] font-bold">certificados oficiales y escarapelas en PDF</strong>.
            </p>
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              {sesion?.rol === 'ADMIN' ? (
                <>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D2202E] hover:bg-[#B01824] text-white font-extrabold text-xs transition shadow-lg shadow-[#D2202E]/30"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Panel Maestro de Control (/admin)
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/profesor"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-sm border border-white/20 transition"
                  >
                    <HandCoins className="w-4 h-4 text-[#F6CDD1]" />
                    Gestión de Pagos Docente
                  </Link>
                  <Link
                    href="/staff/asistencia"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs border border-white/15 transition"
                  >
                    <ScanBarcode className="w-4 h-4" />
                    Control en Puerta (Staff)
                  </Link>
                </>
              ) : sesion?.rol === 'PROFESOR' ? (
                <>
                  <Link
                    href="/profesor"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D2202E] hover:bg-[#B01824] text-white font-extrabold text-xs transition shadow-lg shadow-[#D2202E]/30"
                  >
                    <HandCoins className="w-4 h-4" />
                    Aprobar Pagos de Preinscritos
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/certificados"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-sm border border-white/20 transition"
                  >
                    <Award className="w-4 h-4" />
                    Portal de Certificados
                  </Link>
                </>
              ) : sesion?.rol === 'STAFF' ? (
                <>
                  <Link
                    href="/staff/asistencia"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D2202E] hover:bg-[#B01824] text-white font-extrabold text-xs transition shadow-lg shadow-[#D2202E]/30"
                  >
                    <ScanBarcode className="w-4 h-4" />
                    Ingresar al Escáner de Asistencia
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/certificados"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-sm border border-white/20 transition"
                  >
                    <Award className="w-4 h-4" />
                    Portal de Certificados
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/certificados"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D2202E] hover:bg-[#B01824] text-white font-extrabold text-xs transition shadow-lg shadow-[#D2202E]/30"
                  >
                    <Award className="w-4 h-4" />
                    Portal de Certificados para Estudiantes
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-sm border border-white/20 transition"
                  >
                    <LogIn className="w-4 h-4" />
                    Iniciar Sesión Institucional
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
            <GraduationCap className="w-80 h-80 text-white" />
          </div>
        </section>

        {/* Tarjetas KPI / Métricas */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Eventos Activos
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{eventos.length}</p>
            <p className="text-xs text-slate-500 mt-1">Facultad de Ingenierías</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Usuarios Registrados
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{usuarios.length}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap text-[11px] font-medium text-slate-600">
              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                Admin: {rolesCount.ADMIN}
              </span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                Prof: {rolesCount.PROFESOR}
              </span>
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                Staff: {rolesCount.STAFF}
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                Alum: {rolesCount.ALUMNO}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Inscripciones
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{inscripciones.length}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              Recaudado: ${totalRecaudado.toLocaleString('es-CO')} COP
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Asistencias (Check-in)
              </span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{asistencias.length}</p>
            <p className="text-xs text-slate-500 mt-1">Validado por Staff / QR</p>
          </div>
        </section>

        {/* Listado de Eventos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Eventos de la Facultad
            </h3>
            <span className="text-xs text-slate-500">
              {eventos.length} eventos configurados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {eventos.map((evento) => (
              <div
                key={evento.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {evento.estado}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {evento.precio === 0
                        ? 'Gratuito'
                        : `$${evento.precio.toLocaleString('es-CO')} COP`}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base leading-snug">
                    {evento.titulo}
                  </h4>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {evento.descripcion}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(evento.fechaInicio).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{evento.ubicacion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Organizador: {evento.organizador.nombre}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Capacidad: {evento.capacidadMaxima ?? 'Ilimitada'}</span>
                  <span className="text-indigo-600 font-semibold">
                    {evento._count.inscripciones} inscritos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tabla Principal: Inscripciones con Campos Especiales Requeridos */}
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Control de Inscripciones y Bonificaciones Académicas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Campos clave: <code className="text-indigo-600 font-mono">asignatura_bonificacion</code>,{' '}
                <code className="text-indigo-600 font-mono">profesor_responsable_dinero</code> y{' '}
                <code className="text-indigo-600 font-mono">estado_pago</code>
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md self-start sm:self-auto">
              Total: {inscripciones.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#0B305B] text-white font-bold tracking-wider text-[11px] border-b-2 border-[#D2202E]">
                <tr>
                  <th className="px-4 py-3.5">Estudiante / Alumno</th>
                  <th className="px-4 py-3.5">Evento</th>
                  <th className="px-4 py-3.5">Asignatura Bonificación</th>
                  <th className="px-4 py-3.5">Profesor Responsable Dinero</th>
                  <th className="px-4 py-3.5">Estado de Pago</th>
                  <th className="px-4 py-3.5">Asistencia (Check-in)</th>
                  <th className="px-4 py-3.5 text-right">Documentos PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inscripciones.map((ins) => (
                  <tr key={ins.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      <div className="font-bold text-[#0B305B]">{ins.usuario.nombre}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {ins.usuario.codigoEstudiantil ?? ins.usuario.email}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-800 font-semibold">
                      {ins.evento.titulo}
                    </td>

                    <td className="px-4 py-3.5">
                      {ins.asignatura_bonificacion ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 font-semibold">
                          <BookOpen className="w-3 h-3 text-amber-700" />
                          {ins.asignatura_bonificacion}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No aplica</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">
                        {ins.profesor_responsable_dinero ?? 'Sin asignar'}
                      </div>
                      {ins.profesorResponsable && (
                        <div className="text-[10px] text-slate-400">
                          {ins.profesorResponsable.carrera ?? 'Docente'}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          ins.estado_pago === 'PAGADO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ins.estado_pago === 'EXENTO'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : ins.estado_pago === 'PENDIENTE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {ins.estado_pago === 'PAGADO' && <CheckCircle2 className="w-3 h-3" />}
                        {ins.estado_pago === 'PENDIENTE' && <Clock className="w-3 h-3" />}
                        {ins.estado_pago}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {ins.asistencia ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            CONFIRMADA ({ins.asistencia.metodo})
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Por: {ins.asistencia.registradoPor?.nombre ?? 'Staff'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Sin registro</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <a
                          href={`/api/escarapela/${ins.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                          title="Descargar Escarapela (85x54mm)"
                        >
                          <ScanBarcode className="w-3 h-3 text-[#0B305B]" />
                          Escarapela
                        </a>
                        {ins.asistencia && (
                          <a
                            href={`/api/certificado/${ins.asistencia.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#D2202E] hover:bg-[#B01824] text-white transition shadow-sm"
                            title="Descargar Certificado Oficial"
                          >
                            <Award className="w-3 h-3" />
                            Certificado
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección de Usuarios y Roles del Sistema */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tarjeta de Roles */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Matriz de Usuarios y Roles del Sistema
            </h3>
            <div className="space-y-2.5">
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{u.nombre}</div>
                    <div className="text-[11px] text-slate-500">
                      {u.email} &bull; {u.carrera ?? 'Sin departamento'}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      u.rol === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : u.rol === 'PROFESOR'
                        ? 'bg-blue-100 text-blue-800'
                        : u.rol === 'STAFF'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {u.rol}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta de Asistencias Recientes */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              Registro de Check-in y Asistencia en Vivo
            </h3>
            <div className="space-y-2.5">
              {asistencias.map((ast) => (
                <div
                  key={ast.id}
                  className="p-3 rounded-lg bg-teal-50/50 border border-teal-100 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      {ast.inscripcion.usuario.nombre}
                    </span>
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                      Método: {ast.metodo}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Evento: {ast.inscripcion.evento.titulo}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Validado por: {ast.registradoPor?.nombre ?? 'Staff'}</span>
                    <span>
                      {new Date(ast.fechaHoraRegistro).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  {ast.observaciones && (
                    <p className="text-[10px] text-slate-500 italic bg-white/60 p-1.5 rounded border border-teal-100/50">
                      &quot;{ast.observaciones}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          Facultad de Ingenierías &bull; Sistema de Gestión de Eventos Universitarios
        </p>
        <p className="mt-1 text-slate-400">
          Diseñado con Next.js 16 (App Router), TailwindCSS, Prisma ORM y TypeScript.
        </p>
      </footer>
    </div>
  )
}
