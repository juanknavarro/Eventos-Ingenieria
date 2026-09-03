'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Users,
  FileText,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  DollarSign,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  X,
  UserPlus,
  Palette,
  PenTool,
  Save,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { RolUsuario, EstadoEvento } from '@prisma/client'
import {
  eliminarEvento,
  cambiarRolUsuario,
  registrarPersonal,
  actualizarConfiguracionPlantillas,
  actualizarUsuario,
  eliminarUsuario,
} from '@/actions/admin'
import SelectorRecursoGrafico from './SelectorRecursoGrafico'
import { ConfiguracionPlantillasData } from '@/lib/config/plantillas'

interface EventoData {
  id: string
  titulo: string
  descripcion: string
  fechaInicio: Date | string
  fechaFin: Date | string
  ubicacion: string
  capacidadMaxima: number | null
  precio: number
  estado: EstadoEvento
  imagenUrl: string | null
  logo_fondo_url: string | null
  imagen_central_url: string | null
  sponsors_url: string | null
  _count?: {
    inscripciones: number
  }
}

interface UsuarioData {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  cedula: string | null
  codigoEstudiantil: string | null
  carrera: string | null
  semestre: string | null
  createdAt: Date | string
}

interface Props {
  eventos: EventoData[]
  usuarios: UsuarioData[]
  configPlantillas: ConfiguracionPlantillasData
  adminActual: {
    nombre: string
    email: string
  }
}

export default function PanelAdminCliente({
  eventos,
  usuarios,
  configPlantillas,
  adminActual,
}: Props) {
  const [tabActiva, setTabActiva] = useState<'eventos' | 'usuarios' | 'plantillas'>('eventos')

  // Estados de notificación y carga
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)
  const [cargandoAccion, setCargandoAccion] = useState(false)

  // Estado de Modal de Registro de Personal (Profesor / Staff)
  const [modalPersonalAbierto, setModalPersonalAbierto] = useState(false)

  // Estados para Edición y Eliminación de Usuarios
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<UsuarioData | null>(null)
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioData | null>(null)

  // Filtro de búsqueda en usuarios
  const [busquedaUsuario, setBusquedaUsuario] = useState('')

  // Estados interactivos para previsualización y formulario de Plantillas PDF
  const [colorPrimario, setColorPrimario] = useState(configPlantillas?.color_primario || '#0B305B')
  const [colorSecundario, setColorSecundario] = useState(configPlantillas?.color_secundario || '#D2202E')
  const [nombreDecanoInput, setNombreDecanoInput] = useState(
    configPlantillas?.nombre_decano || 'Ing. Roberto Gómez'
  )
  const [cargoFirmanteInput, setCargoFirmanteInput] = useState(
    configPlantillas?.cargo_firmante || 'Decano Facultad de Ciencias e Ingenierías'
  )

  const mostrarMensaje = (exito: boolean, texto: string) => {
    if (exito) {
      setMensajeExito(texto)
      setMensajeError(null)
    } else {
      setMensajeError(texto)
      setMensajeExito(null)
    }
    setTimeout(() => {
      setMensajeExito(null)
      setMensajeError(null)
    }, 4500)
  }

  // Manejo de guardado interactivo de plantillas PDF
  const handleGuardarPlantillas = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCargandoAccion(true)
    const formData = new FormData(e.currentTarget)
    const res = await actualizarConfiguracionPlantillas(formData)
    setCargandoAccion(false)
    mostrarMensaje(res.success, res.message || res.error || '')
  }

  // Manejo de registro manual de personal (Profesor o Staff)
  const handleRegistrarPersonal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCargandoAccion(true)
    const formData = new FormData(e.currentTarget)
    const res = await registrarPersonal(formData)
    setCargandoAccion(false)

    if (res.success) {
      setModalPersonalAbierto(false)
      mostrarMensaje(true, res.message || 'Personal registrado exitosamente.')
    } else {
      mostrarMensaje(false, res.error || 'Error al registrar personal.')
    }
  }

  // Manejo de cambio de rol de usuario
  const handleCambioRol = async (usuarioId: string, nuevoRol: RolUsuario) => {
    setCargandoAccion(true)
    const res = await cambiarRolUsuario(usuarioId, nuevoRol)
    setCargandoAccion(false)
    mostrarMensaje(res.success, res.message || res.error || '')
  }

  // Manejo de actualización de datos de usuario (nombre, correo, cédula, carrera)
  const handleActualizarUsuario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!usuarioEnEdicion) return
    setCargandoAccion(true)
    const formData = new FormData(e.currentTarget)
    formData.append('usuarioId', usuarioEnEdicion.id)
    const res = await actualizarUsuario(formData)
    setCargandoAccion(false)

    if (res.success) {
      setUsuarioEnEdicion(null)
      mostrarMensaje(true, res.message || 'Usuario actualizado exitosamente.')
    } else {
      mostrarMensaje(false, res.error || 'Error al actualizar usuario.')
    }
  }

  // Manejo de eliminación permanente de usuario
  const handleConfirmarEliminarUsuario = async () => {
    if (!usuarioAEliminar) return
    setCargandoAccion(true)
    const res = await eliminarUsuario(usuarioAEliminar.id)
    setCargandoAccion(false)

    if (res.success) {
      setUsuarioAEliminar(null)
      mostrarMensaje(true, res.message || 'Usuario eliminado permanentemente.')
    } else {
      mostrarMensaje(false, res.error || 'Error al eliminar usuario.')
    }
  }

  const handleEliminarEvento = async (eventoId: string, titulo: string) => {
    if (!confirm(`¿Estás seguro de eliminar el evento "${titulo}"? Se eliminarán también las inscripciones asociadas.`)) {
      return
    }
    setCargandoAccion(true)
    const res = await eliminarEvento(eventoId)
    setCargandoAccion(false)
    mostrarMensaje(res.success, res.message || res.error || '')
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busquedaUsuario.toLowerCase()
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.cedula && u.cedula.toLowerCase().includes(q)) ||
      (u.carrera && u.carrera.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Alertas de Notificación Flotantes */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Barra de Navegación por Pestañas del Panel Maestro */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
        <button
          onClick={() => setTabActiva('eventos')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            tabActiva === 'eventos'
              ? 'bg-[#0B305B] text-white shadow-md shadow-[#0B305B]/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Gestión de Eventos ({eventos.length})
        </button>

        <button
          onClick={() => setTabActiva('usuarios')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            tabActiva === 'usuarios'
              ? 'bg-[#0B305B] text-white shadow-md shadow-[#0B305B]/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios y Accesos ({usuarios.length})
        </button>

        <button
          onClick={() => setTabActiva('plantillas')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            tabActiva === 'plantillas'
              ? 'bg-[#0B305B] text-white shadow-md shadow-[#0B305B]/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          Configurar Plantillas PDF
        </button>

        <Link
          href="/admin/asignaturas"
          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-slate-700 bg-white hover:text-[#0B305B] hover:shadow-xs border border-slate-200/80 sm:ml-auto"
        >
          <BookOpen className="w-4 h-4 text-[#0B305B]" />
          Catálogo Asignaturas
        </Link>

        <Link
          href="/admin/reportes"
          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-slate-700 bg-white hover:text-[#0B305B] hover:shadow-xs border border-slate-200/80"
        >
          <BarChart3 className="w-4 h-4 text-[#D2202E]" />
          Reportes y Auditoría
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: GESTIÓN DE EVENTOS */}
      {/* ========================================================================= */}
      {tabActiva === 'eventos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-[#0B305B]">Catálogo de Eventos Académicos</h2>
              <p className="text-xs text-slate-500">
                Administra congresos, talleres, hackathons y sus recursos visuales (fondos, fotos centrales y patrocinadores).
              </p>
            </div>
            <Link
              href="/admin/eventos/nuevo"
              className="px-4 py-2 bg-[#D2202E] hover:bg-[#B01824] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear Nuevo Evento
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventos.map((evento) => (
              <div
                key={evento.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Cabecera visual del evento */}
                  <div className="h-32 bg-slate-100 relative overflow-hidden">
                    {evento.imagenUrl || evento.logo_fondo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evento.imagenUrl || evento.logo_fondo_url || ''}
                        alt={evento.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0B305B] flex items-center justify-center text-white/40">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm ${
                          evento.estado === 'PUBLICADO'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {evento.estado}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {evento.titulo}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {evento.descripcion}
                    </p>

                    <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#D2202E]" />
                        <span className="truncate">{evento.ubicacion}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {evento._count?.inscripciones || 0} inscritos /{' '}
                          {evento.capacidadMaxima ? `${evento.capacidadMaxima} cupos` : 'Ilimitado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-slate-900">
                          {evento.precio > 0 ? `$${evento.precio.toLocaleString()} COP` : 'Entrada Gratuita'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones del Evento */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/eventos/nuevo?id=${evento.id}`}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#0B305B]" />
                    Editar
                  </Link>
                  <button
                    onClick={() => handleEliminarEvento(evento.id, evento.titulo)}
                    disabled={cargandoAccion}
                    className="py-1.5 px-3 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: GESTIÓN DE USUARIOS Y ROLES (RBAC) */}
      {/* ========================================================================= */}
      {tabActiva === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-[#0B305B]">Control de Accesos y Permisos (RBAC)</h2>
              <p className="text-xs text-slate-500">
                Asigna o revoca roles en tiempo real o da de alta a docentes y personal de apoyo logístico.
              </p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o cédula..."
                  value={busquedaUsuario}
                  onChange={(e) => setBusquedaUsuario(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B305B] focus:bg-white"
                />
              </div>

              {/* Botón Primario Destacado: + Registrar Personal */}
              <button
                type="button"
                onClick={() => setModalPersonalAbierto(true)}
                className="px-4 py-2 bg-[#0B305B] hover:bg-[#071F3B] text-white font-bold text-xs rounded-xl shadow-md shadow-[#0B305B]/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4 text-[#D2202E]" />
                + Registrar Personal
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B305B] text-white border-b-2 border-[#D2202E]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Usuario / Nombre</th>
                    <th className="py-3 px-4 font-bold">Correo Institucional</th>
                    <th className="py-3 px-4 font-bold">Cédula / Identificación</th>
                    <th className="py-3 px-4 font-bold">Programa Académico</th>
                    <th className="py-3 px-4 font-bold">Rol Actual</th>
                    <th className="py-3 px-4 font-bold text-center">Asignar Permisos</th>
                    <th className="py-3 px-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuariosFiltrados.map((u) => {
                    const esAdminPrincipal = u.email === 'juannavarro@unisinu.edu.co'
                    const esMismoAdmin = u.email === adminActual.email
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.nombre}</div>
                          {u.semestre && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {u.semestre}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {u.cedula || u.codigoEstudiantil || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {u.carrera || 'Facultad de Ingenierías'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                              u.rol === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : u.rol === 'PROFESOR'
                                ? 'bg-blue-100 text-blue-800'
                                : u.rol === 'STAFF'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.rol === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
                            {u.rol === 'PROFESOR' && <GraduationCap className="w-3 h-3" />}
                            {u.rol === 'STAFF' && <Briefcase className="w-3 h-3" />}
                            {u.rol === 'ALUMNO' && <User className="w-3 h-3" />}
                            {u.rol}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {esAdminPrincipal ? (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                              Super Administrador
                            </span>
                          ) : (
                            <select
                              value={u.rol}
                              disabled={cargandoAccion}
                              onChange={(e) =>
                                handleCambioRol(u.id, e.target.value as RolUsuario)
                              }
                              className="px-2.5 py-1 bg-white border border-slate-200 focus:border-[#0B305B] rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="ALUMNO">ALUMNO (Estudiante)</option>
                              <option value="PROFESOR">PROFESOR (Aprobar Pagos)</option>
                              <option value="STAFF">STAFF (Control en Puerta)</option>
                              <option value="ADMIN">ADMIN (Acceso Total)</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* 1) Botón Editar (ícono de lápiz) */}
                            <button
                              type="button"
                              onClick={() => setUsuarioEnEdicion(u)}
                              title="Editar datos del usuario"
                              className="p-1.5 text-[#0B305B] hover:text-white hover:bg-[#0B305B] rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 2 y 3) Botón Eliminar con Regla de Seguridad para Administrador */}
                            {esAdminPrincipal || esMismoAdmin ? (
                              <span
                                title="Cuenta protegida contra eliminación"
                                className="p-1.5 text-slate-300 cursor-not-allowed inline-flex items-center"
                              >
                                <Trash2 className="w-3.5 h-3.5 opacity-30" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setUsuarioAEliminar(u)}
                                title="Eliminar usuario permanentemente"
                                className="p-1.5 text-rose-600 hover:text-white hover:bg-[#D2202E] rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: CONFIGURACIÓN DINÁMICA DE PLANTILLAS PDF */}
      {/* ========================================================================= */}
      {tabActiva === 'plantillas' && (
        <form onSubmit={handleGuardarPlantillas} className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#D2202E]" />
                Personalización Dinámica de Plantillas PDF (Escarapelas y Certificados)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Modifica el logo institucional, la firma digital del decano, los datos del firmante y la paleta de colores. Los cambios se aplican en tiempo real en los documentos oficiales.
              </p>
            </div>

            <button
              type="submit"
              disabled={cargandoAccion}
              className="px-5 py-2.5 bg-[#0B305B] hover:bg-[#071F3B] text-white font-bold text-xs rounded-xl shadow-md shadow-[#0B305B]/20 transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              {cargandoAccion ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando Cambios...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#D2202E]" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMNA IZQUIERDA: FORMULARIO DE CONFIGURACIÓN (7 Columnas) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Sección 1: Recursos Gráficos Institucionales */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <ImageIcon className="w-4 h-4 text-[#0B305B]" />
                  Recursos Gráficos Institucionales
                </h3>

                {/* 1. Logo Oficial */}
                <SelectorRecursoGrafico
                  etiqueta="Logo Oficial de la Universidad del Sinú"
                  descripcion="Encabezado de las escarapelas verticales y membrete superior de los certificados."
                  nombreCampoUrl="logo_url"
                  nombreCampoArchivo="archivo_logo"
                  valorInicialUrl={configPlantillas?.logo_url || '/imagen_2.png'}
                  aspectoRecomendado="Horizontal (4:1 o 5:1)"
                />

                {/* 2. Firma Escaneada del Decano */}
                <SelectorRecursoGrafico
                  etiqueta="Firma Escaneada del Decano / Autoridad"
                  descripcion="Imagen de la firma estampada sobre la línea de validación en el certificado de asistencia."
                  nombreCampoUrl="firma_decano_url"
                  nombreCampoArchivo="archivo_firma_decano"
                  valorInicialUrl={configPlantillas?.firma_decano_url || ''}
                  aspectoRecomendado="PNG con fondo transparente (2.5:1 o 3:1)"
                />
              </div>

              {/* Sección 2: Datos de la Autoridad Firmante */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <PenTool className="w-4 h-4 text-[#0B305B]" />
                  Datos de la Autoridad Firmante
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Nombre del Firmante</label>
                    <input
                      type="text"
                      name="nombre_decano"
                      value={nombreDecanoInput}
                      onChange={(e) => setNombreDecanoInput(e.target.value)}
                      required
                      placeholder="Ej. Ing. Roberto Gómez o Juan Carlos Navarro"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Cargo / Dependencia</label>
                    <input
                      type="text"
                      name="cargo_firmante"
                      value={cargoFirmanteInput}
                      onChange={(e) => setCargoFirmanteInput(e.target.value)}
                      required
                      placeholder="Ej. Decano Facultad de Ciencias e Ingenierías"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Paleta de Colores de Franjas y Ribetes */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#D2202E]" />
                    Colores Institucionales de Franjas y Bordes
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setColorPrimario('#0B305B')
                      setColorSecundario('#D2202E')
                    }}
                    className="text-[10px] font-bold text-[#0B305B] hover:text-[#D2202E] underline cursor-pointer"
                  >
                    Restablecer Unisinú Oficial
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Color Primario */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">Color Primario</label>
                      <span className="text-[10px] text-slate-500">Cabecera y Marco Exterior</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={colorPrimario}
                        onChange={(e) => setColorPrimario(e.target.value)}
                        className="w-10 h-10 rounded-lg border-2 border-white shadow-xs cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        name="color_primario"
                        value={colorPrimario}
                        onChange={(e) => setColorPrimario(e.target.value)}
                        placeholder="#0B305B"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#0B305B] rounded-xl text-xs font-mono font-bold outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Color Secundario */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">Color Secundario / Acento</label>
                      <span className="text-[10px] text-slate-500">Franja de Evento y Ribete</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={colorSecundario}
                        onChange={(e) => setColorSecundario(e.target.value)}
                        className="w-10 h-10 rounded-lg border-2 border-white shadow-xs cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        name="color_secundario"
                        value={colorSecundario}
                        onChange={(e) => setColorSecundario(e.target.value)}
                        placeholder="#D2202E"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#0B305B] rounded-xl text-xs font-mono font-bold outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: PREVISUALIZACIÓN EN VIVO (5 Columnas) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 sticky top-20">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Simulación Visual en Vivo
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Sincronizado
                  </span>
                </div>

                {/* Mockup 1: Escarapela Vertical */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700">1. Escarapela Oficial (90 x 130 mm):</span>
                  <div className="w-56 mx-auto bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden text-center text-[9px]">
                    {/* Cabecera Color Primario */}
                    <div
                      className="p-2 text-white flex items-center justify-between transition-colors"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      <div className="text-left leading-tight">
                        <span className="font-black text-[10px] block">UNIVERSIDAD DEL SINÚ</span>
                        <span className="text-[7px] opacity-80">FACULTAD DE INGENIERÍAS</span>
                      </div>
                      <span
                        className="px-1.5 py-0.5 text-[6px] font-black rounded text-white"
                        style={{ backgroundColor: colorSecundario }}
                      >
                        2026
                      </span>
                    </div>

                    {/* Franja Color Secundario */}
                    <div
                      className="py-1 px-2 text-white font-bold text-[8px] transition-colors truncate"
                      style={{ backgroundColor: colorSecundario }}
                    >
                      CONGRESO INTERNACIONAL DE IA
                    </div>

                    {/* Imagen central */}
                    <div className="p-2 bg-slate-50">
                      <div className="h-10 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-[8px]">
                        Imagen Central Temática
                      </div>
                    </div>

                    {/* Tarjeta Estudiante */}
                    <div className="p-2 border-t border-slate-100 space-y-0.5">
                      <span className="text-[7px] font-extrabold block" style={{ color: colorPrimario }}>
                        ESTUDIANTE / PARTICIPANTE
                      </span>
                      <p className="font-bold text-slate-900 text-[9px]">MATEO MORALES SILVA</p>
                      <p className="font-bold text-[8px]" style={{ color: colorSecundario }}>
                        CÉDULA: 1047892341
                      </p>
                      <div className="pt-1 flex justify-center">
                        <div className="h-4 w-28 bg-slate-800 rounded-xs flex items-center justify-center text-white text-[6px] font-mono">
                          |||||||||||||||||||||||||
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mockup 2: Certificado Horizontal */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700">2. Certificado de Asistencia (A4 Paisaje):</span>
                  <div
                    className="p-3 bg-amber-50/20 rounded-xl border-2 transition-all text-center space-y-1.5"
                    style={{ borderColor: colorPrimario }}
                  >
                    <div
                      className="p-2 border border-dashed rounded-lg"
                      style={{ borderColor: colorSecundario }}
                    >
                      <span className="font-bold text-[8px] block" style={{ color: colorSecundario }}>
                        UNIVERSIDAD DEL SINÚ
                      </span>
                      <span className="font-extrabold text-[10px] block" style={{ color: colorPrimario }}>
                        CERTIFICADO DE ASISTENCIA
                      </span>
                      <p className="text-[7px] text-slate-500 pt-0.5">
                        Certifica la asistencia de <strong>ALUMNO PARTICIPANTE</strong>
                      </p>
                      
                      {/* Firma del Decano */}
                      <div className="pt-2 flex justify-center gap-6 text-[7px]">
                        <div className="text-center">
                          <div className="w-20 border-b border-slate-400 mx-auto mb-0.5"></div>
                          <span className="font-bold block text-slate-800">{nombreDecanoInput}</span>
                          <span className="text-[6px] text-slate-500">{cargoFirmanteInput}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR PERSONAL (PROFESOR / STAFF) */}
      {/* ========================================================================= */}
      {modalPersonalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="bg-[#0B305B] text-white p-5 border-b-2 border-[#D2202E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <UserPlus className="w-5 h-5 text-[#D2202E]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Registrar Personal Institucional</h3>
                  <p className="text-xs text-slate-300">
                    Alta manual de docentes y staff para control de eventos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalPersonalAbierto(false)}
                className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPersonal} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                <strong>Aviso de Seguridad:</strong> Este formulario es de uso exclusivo para registrar
                docentes con acceso a aprobación de pagos (<strong>PROFESOR</strong>) y personal de apoyo
                para check-in en puerta (<strong>STAFF</strong>). El rol ALUMNO está excluido, ya que ellos
                se registran mediante el flujo público de preinscripción.
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Dr. Roberto Gómez o Lic. María Pérez"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Correo Institucional *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="usuario@unisinu.edu.co"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Cédula de Ciudadanía *</label>
                  <input
                    type="text"
                    name="cedula"
                    required
                    placeholder="Ej. 1047891234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Rol a Asignar *</label>
                  <select
                    name="rol"
                    required
                    defaultValue="PROFESOR"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none font-bold text-slate-800"
                  >
                    <option value="PROFESOR">PROFESOR (Aprobar pagos en efectivo)</option>
                    <option value="STAFF">STAFF (Control de asistencia en puerta)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Facultad / Carrera</label>
                  <input
                    type="text"
                    name="carrera"
                    defaultValue="Facultad de Ingenierías"
                    placeholder="Ej. Ingeniería de Sistemas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Contraseña Temporal *</label>
                  <span className="text-[10px] text-slate-400">Podrá ser cambiada luego</span>
                </div>
                <input
                  type="text"
                  name="password"
                  defaultValue="Unisinu2026*"
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalPersonalAbierto(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargandoAccion}
                  className="px-5 py-2 bg-[#0B305B] hover:bg-[#071F3B] text-white font-bold rounded-xl shadow-md shadow-[#0B305B]/20 transition flex items-center gap-2 cursor-pointer"
                >
                  {cargandoAccion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-[#D2202E]" />
                      Guardar y Asignar Rol
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR USUARIO */}
      {/* ========================================================================= */}
      {usuarioEnEdicion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="bg-[#0B305B] text-white p-5 border-b-2 border-[#D2202E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Edit2 className="w-5 h-5 text-[#D2202E]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Editar Datos de Usuario</h3>
                  <p className="text-xs text-slate-300">
                    Actualiza la información institucional y académica en la base de datos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioEnEdicion(null)}
                className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActualizarUsuario} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={usuarioEnEdicion.nombre}
                  required
                  placeholder="Ej. Ing. Carlos Mendoza"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Correo Institucional *</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={usuarioEnEdicion.email}
                    required
                    placeholder="usuario@unisinu.edu.co"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Cédula / Identificación</label>
                  <input
                    type="text"
                    name="cedula"
                    defaultValue={usuarioEnEdicion.cedula || ''}
                    placeholder="Ej. 1047891234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Programa Académico / Facultad</label>
                <input
                  type="text"
                  name="carrera"
                  defaultValue={usuarioEnEdicion.carrera || 'Facultad de Ingenierías'}
                  placeholder="Ej. Ingeniería de Sistemas, Ingeniería Industrial..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Rol asignado en el sistema:</span>
                <span className="font-extrabold text-[#0B305B] bg-white px-2 py-0.5 rounded border border-slate-200">
                  {usuarioEnEdicion.rol}
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUsuarioEnEdicion(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargandoAccion}
                  className="px-5 py-2 bg-[#0B305B] hover:bg-[#071F3B] text-white font-bold rounded-xl shadow-md shadow-[#0B305B]/20 transition flex items-center gap-2 cursor-pointer"
                >
                  {cargandoAccion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#D2202E]" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE USUARIO */}
      {/* ========================================================================= */}
      {usuarioAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="bg-[#D2202E] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Eliminar Usuario Permanentemente</h3>
                  <p className="text-xs text-white/80">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioAEliminar(null)}
                className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <p className="font-bold text-rose-900 text-xs">
                  ¿Confirmas que deseas eliminar a este usuario de la base de datos de Supabase?
                </p>
                <div className="bg-white p-3 rounded-xl border border-rose-100 text-slate-700 space-y-1">
                  <div>
                    <span className="font-bold text-slate-900">Nombre: </span>
                    {usuarioAEliminar.nombre}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Correo: </span>
                    <span className="font-mono text-[11px]">{usuarioAEliminar.email}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Cédula: </span>
                    <span className="font-mono">{usuarioAEliminar.cedula || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Rol actual: </span>
                    <span className="font-bold text-[#0B305B]">{usuarioAEliminar.rol}</span>
                  </div>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Se eliminarán también sus registros de inscripción asociados en eventos académicos.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUsuarioAEliminar(null)}
                  disabled={cargandoAccion}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEliminarUsuario}
                  disabled={cargandoAccion}
                  className="px-5 py-2 bg-[#D2202E] hover:bg-[#B01824] text-white font-bold rounded-xl shadow-md shadow-[#D2202E]/20 transition flex items-center gap-2 cursor-pointer"
                >
                  {cargandoAccion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Eliminar Definitivamente
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

