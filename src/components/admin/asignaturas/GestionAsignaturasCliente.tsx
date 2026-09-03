'use client'

import React, { useState } from 'react'
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  GraduationCap,
  Filter,
} from 'lucide-react'
import {
  crearAsignatura,
  actualizarAsignatura,
  alternarEstadoAsignatura,
  eliminarAsignatura,
} from '@/actions/asignaturas'

export interface AsignaturaItem {
  id: string
  nombre: string
  programa_academico: string
  activa: boolean
  createdAt: Date | string
}

interface Props {
  asignaturasIniciales: AsignaturaItem[]
}

export const PROGRAMAS_DISPONIBLES = [
  'Ingeniería de Sistemas',
  'Ingeniería Industrial',
  'Ingeniería Civil',
  'Ingeniería Eléctrica',
  'Ingeniería Mecánica',
  'Ciencias Básicas de Ingeniería',
]

export default function GestionAsignaturasCliente({ asignaturasIniciales }: Props) {
  const [asignaturas, setAsignaturas] = useState<AsignaturaItem[]>(asignaturasIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroPrograma, setFiltroPrograma] = useState('todos')

  // Modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [asignaturaAEditar, setAsignaturaAEditar] = useState<AsignaturaItem | null>(null)
  const [asignaturaAEliminar, setAsignaturaAEliminar] = useState<AsignaturaItem | null>(null)

  // Estados de carga y mensajes
  const [cargando, setCargando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  const mostrarMensaje = (exito: boolean, texto: string) => {
    if (exito) {
      setMensajeExito(texto)
      setMensajeError(null)
      setTimeout(() => setMensajeExito(null), 4000)
    } else {
      setMensajeError(texto)
      setMensajeExito(null)
      setTimeout(() => setMensajeError(null), 5000)
    }
  }

  // Filtrado reactivo
  const asignaturasFiltradas = asignaturas.filter((asig) => {
    const coincideBusqueda =
      asig.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      asig.programa_academico.toLowerCase().includes(busqueda.toLowerCase())
    const coincidePrograma =
      filtroPrograma === 'todos' || asig.programa_academico === filtroPrograma
    return coincideBusqueda && coincidePrograma
  })

  // 1. Crear Asignatura
  const handleCrear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCargando(true)
    const formData = new FormData(e.currentTarget)
    const res = await crearAsignatura(formData)
    setCargando(false)

    if (res.success && res.asignatura) {
      setAsignaturas([res.asignatura as AsignaturaItem, ...asignaturas])
      setModalCrearAbierto(false)
      mostrarMensaje(true, res.message || 'Asignatura registrada.')
    } else {
      mostrarMensaje(false, res.error || 'Error al crear la asignatura.')
    }
  }

  // 2. Editar Asignatura
  const handleActualizar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!asignaturaAEditar) return

    setCargando(true)
    const formData = new FormData(e.currentTarget)
    const nombre = (formData.get('nombre') as string)?.trim()
    const programa = (formData.get('programa_academico') as string)?.trim()

    const res = await actualizarAsignatura(asignaturaAEditar.id, nombre, programa)
    setCargando(false)

    if (res.success && res.asignatura) {
      setAsignaturas(
        asignaturas.map((a) =>
          a.id === asignaturaAEditar.id
            ? { ...a, nombre: res.asignatura.nombre, programa_academico: res.asignatura.programa_academico }
            : a
        )
      )
      setAsignaturaAEditar(null)
      mostrarMensaje(true, res.message || 'Asignatura actualizada.')
    } else {
      mostrarMensaje(false, res.error || 'Error al actualizar.')
    }
  }

  // 3. Alternar Estado (Interruptor / Toggle)
  const handleToggleEstado = async (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual

    // Actualización optimista en la interfaz
    setAsignaturas(
      asignaturas.map((a) => (a.id === id ? { ...a, activa: nuevoEstado } : a))
    )

    const res = await alternarEstadoAsignatura(id, nuevoEstado)
    if (!res.success) {
      // Revertir en caso de error
      setAsignaturas(
        asignaturas.map((a) => (a.id === id ? { ...a, activa: estadoActual } : a))
      )
      mostrarMensaje(false, res.error || 'Error al cambiar estado.')
    } else {
      mostrarMensaje(true, res.message || 'Estado actualizado.')
    }
  }

  // 4. Eliminar Asignatura
  const handleEliminar = async () => {
    if (!asignaturaAEliminar) return

    setCargando(true)
    const res = await eliminarAsignatura(asignaturaAEliminar.id)
    setCargando(false)

    if (res.success) {
      setAsignaturas(asignaturas.filter((a) => a.id !== asignaturaAEliminar.id))
      setAsignaturaAEliminar(null)
      mostrarMensaje(true, res.message || 'Asignatura eliminada.')
    } else {
      mostrarMensaje(false, res.error || 'Error al eliminar la asignatura.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Alertas de Notificación */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Barra Superior: Filtros y Botón '+ Agregar Asignatura' */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          {/* Campo de Búsqueda */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar materia..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs outline-none transition"
            />
          </div>

          {/* Filtro por Programa */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-[#D2202E] shrink-0" />
            <select
              value={filtroPrograma}
              onChange={(e) => setFiltroPrograma(e.target.value)}
              className="w-full sm:w-60 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer transition"
            >
              <option value="todos">Todos los Programas Académicos</option>
              {PROGRAMAS_DISPONIBLES.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón Principal '+ Agregar Asignatura' */}
        <button
          type="button"
          onClick={() => setModalCrearAbierto(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#0B305B] hover:bg-[#082240] text-white text-xs font-extrabold rounded-xl shadow-md shadow-[#0B305B]/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#D2202E]" />
          + Agregar Asignatura
        </button>
      </div>

      {/* Tabla Limpia de Asignaturas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#D2202E]" />
              Catálogo de Materias para Bonificaciones
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de disponibilidad de asignaturas que los alumnos pueden postular para bonificación
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
            {asignaturasFiltradas.length} Materias
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B305B] text-white border-b-2 border-[#D2202E]">
              <tr>
                <th className="py-3.5 px-4 font-bold">Nombre de la Asignatura</th>
                <th className="py-3.5 px-4 font-bold">Programa Académico</th>
                <th className="py-3.5 px-4 font-bold text-center">Estado (Interruptor)</th>
                <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {asignaturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    No se encontraron asignaturas que coincidan con la búsqueda o filtro.
                  </td>
                </tr>
              ) : (
                asignaturasFiltradas.map((asig) => (
                  <tr key={asig.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-100 text-[#0B305B] rounded-lg">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900">{asig.nombre}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#0B305B] border border-blue-100">
                        <GraduationCap className="w-3 h-3 text-[#D2202E]" />
                        {asig.programa_academico}
                      </span>
                    </td>

                    {/* Interruptor (Toggle Switch) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={asig.activa}
                          onClick={() => handleToggleEstado(asig.id, asig.activa)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            asig.activa ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              asig.activa ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-[11px] font-bold ${
                            asig.activa ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {asig.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </td>

                    {/* Acciones: Editar y Eliminar */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAsignaturaAEditar(asig)}
                          title="Editar Asignatura"
                          className="p-1.5 bg-slate-100 hover:bg-[#0B305B] text-slate-600 hover:text-white rounded-lg transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setAsignaturaAEliminar(asig)}
                          title="Eliminar Asignatura"
                          className="p-1.5 bg-rose-50 hover:bg-[#D2202E] text-rose-600 hover:text-white rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR NUEVA ASIGNATURA */}
      {/* ========================================================================= */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#0B305B] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#D2202E]" />
                Registrar Nueva Asignatura
              </h3>
              <button
                type="button"
                onClick={() => setModalCrearAbierto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrear} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  Nombre de la Asignatura <span className="text-[#D2202E]">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Inteligencia Artificial y Machine Learning"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  Programa Académico <span className="text-[#D2202E]">*</span>
                </label>
                <select
                  name="programa_academico"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs font-bold text-slate-800 cursor-pointer"
                >
                  {PROGRAMAS_DISPONIBLES.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#0B305B] hover:bg-[#082240] rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {cargando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Asignatura'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR ASIGNATURA */}
      {/* ========================================================================= */}
      {asignaturaAEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#0B305B] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#0B305B]" />
                Editar Asignatura
              </h3>
              <button
                type="button"
                onClick={() => setAsignaturaAEditar(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActualizar} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Nombre de la Asignatura</label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={asignaturaAEditar.nombre}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Programa Académico</label>
                <select
                  name="programa_academico"
                  defaultValue={asignaturaAEditar.programa_academico}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs font-bold text-slate-800 cursor-pointer"
                >
                  {PROGRAMAS_DISPONIBLES.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAsignaturaAEditar(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#0B305B] hover:bg-[#082240] rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {cargando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Actualizando...
                    </>
                  ) : (
                    'Actualizar Asignatura'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRMAR ELIMINACIÓN */}
      {/* ========================================================================= */}
      {asignaturaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 bg-rose-100 text-[#D2202E] rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">¿Eliminar Asignatura?</h3>
              <p className="text-xs text-slate-500">
                Estás a punto de eliminar{' '}
                <strong className="text-slate-800">"{asignaturaAEliminar.nombre}"</strong> ({asignaturaAEliminar.programa_academico}). Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setAsignaturaAEliminar(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={cargando}
                className="px-5 py-2 text-xs font-extrabold text-white bg-[#D2202E] hover:bg-[#B01824] rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Eliminando...
                  </>
                ) : (
                  'Eliminar Definitivamente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

