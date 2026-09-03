'use client'

import React, { useState } from 'react'
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Loader2,
  Users,
  Calendar,
  BookOpen,
  Power,
} from 'lucide-react'
import {
  crearPrograma,
  actualizarPrograma,
  alternarEstadoPrograma,
  eliminarPrograma,
} from '@/actions/programas'

export interface ProgramaItem {
  id: string
  nombre: string
  estado_activo: boolean
  createdAt: string
  _count: {
    usuarios: number
    eventos: number
    asignaturas: number
  }
}

interface Props {
  programasIniciales: ProgramaItem[]
}

export default function GestionProgramasCliente({ programasIniciales }: Props) {
  const [programas, setProgramas] = useState<ProgramaItem[]>(programasIniciales)
  const [busqueda, setBusqueda] = useState('')

  // Modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [programaAEditar, setProgramaAEditar] = useState<ProgramaItem | null>(null)
  const [programaAEliminar, setProgramaAEliminar] = useState<ProgramaItem | null>(null)

  // Estados de carga y retroalimentación
  const [cargando, setCargando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  // Filtrar programas
  const programasFiltrados = programas.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase().trim())
  )

  const limpiarAlertas = () => {
    setMensajeExito(null)
    setMensajeError(null)
  }

  // Manejar creación
  const handleCrear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCargando(true)
    limpiarAlertas()

    const formData = new FormData(e.currentTarget)
    const res = await crearPrograma(formData)

    if (res.success) {
      setMensajeExito(res.message || 'Programa creado exitosamente.')
      setModalCrearAbierto(false)
      window.location.reload()
    } else {
      setMensajeError(res.error || 'Error al registrar el programa.')
    }
    setCargando(false)
  }

  // Manejar edición
  const handleEditar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!programaAEditar) return

    setCargando(true)
    limpiarAlertas()

    const formData = new FormData(e.currentTarget)
    const nuevoNombre = formData.get('nombre') as string
    const nuevoEstado = formData.get('estado_activo') === 'on'

    const res = await actualizarPrograma(programaAEditar.id, nuevoNombre, nuevoEstado)

    if (res.success) {
      setMensajeExito(res.message || 'Programa actualizado.')
      setProgramas((prev) =>
        prev.map((p) =>
          p.id === programaAEditar.id
            ? { ...p, nombre: nuevoNombre.trim(), estado_activo: nuevoEstado }
            : p
        )
      )
      setProgramaAEditar(null)
    } else {
      setMensajeError(res.error || 'Error al actualizar programa.')
    }
    setCargando(false)
  }

  // Manejar toggle de estado
  const handleToggleEstado = async (p: ProgramaItem) => {
    setCargando(true)
    limpiarAlertas()

    const nuevoEstado = !p.estado_activo
    const res = await alternarEstadoPrograma(p.id, nuevoEstado)

    if (res.success) {
      setMensajeExito(res.message || 'Estado actualizado.')
      setProgramas((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, estado_activo: nuevoEstado } : item
        )
      )
    } else {
      setMensajeError(res.error || 'Error al cambiar estado.')
    }
    setCargando(false)
  }

  // Manejar eliminación
  const handleEliminar = async () => {
    if (!programaAEliminar) return

    setCargando(true)
    limpiarAlertas()

    const res = await eliminarPrograma(programaAEliminar.id)

    if (res.success) {
      setMensajeExito(res.message || 'Programa eliminado.')
      setProgramas((prev) => prev.filter((p) => p.id !== programaAEliminar.id))
      setProgramaAEliminar(null)
    } else {
      setMensajeError(res.error || 'Error al eliminar programa.')
    }
    setCargando(false)
  }

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensajeError}</span>
          </div>
          <button
            onClick={() => setMensajeError(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controles de Búsqueda y Creación */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar programa académico..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs outline-none transition"
          />
        </div>

        <button
          onClick={() => {
            limpiarAlertas()
            setModalCrearAbierto(true)
          }}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#D2202E] hover:bg-[#B01824] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agregar Nuevo Programa
        </button>
      </div>

      {/* Tabla de Programas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Programa Académico</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Usuarios / Personal</th>
                <th className="py-3.5 px-4 text-center">Eventos</th>
                <th className="py-3.5 px-4 text-center">Asignaturas</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {programasFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-bold text-sm text-slate-600">No se encontraron programas</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Intenta con otro término de búsqueda o agrega un nuevo programa.
                    </p>
                  </td>
                </tr>
              ) : (
                programasFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B305B] flex items-center justify-center font-bold border border-blue-100 shrink-0">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{p.nombre}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Registrado el {new Date(p.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleEstado(p)}
                        disabled={cargando}
                        title={p.estado_activo ? 'Deshabilitar programa' : 'Habilitar programa'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer ${
                          p.estado_activo
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {p.estado_activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {p._count.usuarios}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 font-bold rounded-lg text-xs border border-purple-100">
                        <Calendar className="w-3.5 h-3.5 text-purple-500" />
                        {p._count.eventos}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg text-xs border border-amber-100">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                        {p._count.asignaturas}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            limpiarAlertas()
                            setProgramaAEditar(p)
                          }}
                          className="p-2 text-[#0B305B] hover:bg-blue-50 rounded-xl transition cursor-pointer"
                          title="Editar Programa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            limpiarAlertas()
                            setProgramaAEliminar(p)
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Eliminar Programa"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* MODAL CREAR PROGRAMA */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0B305B]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Registrar Nuevo Programa</h3>
              </div>
              <button
                onClick={() => setModalCrearAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrear} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nombre del Programa *</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Ingeniería Biomédica"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="estado_activo"
                  id="crear_estado_activo"
                  defaultChecked
                  className="w-4 h-4 text-[#0B305B] rounded cursor-pointer accent-[#0B305B]"
                />
                <label htmlFor="crear_estado_activo" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Programa Activo en Convocatorias
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2 bg-[#0B305B] hover:bg-[#071F3B] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar Programa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PROGRAMA */}
      {programaAEditar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0B305B]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Editar Programa Académico</h3>
              </div>
              <button
                onClick={() => setProgramaAEditar(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditar} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nombre del Programa *</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  defaultValue={programaAEditar.nombre}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="estado_activo"
                  id="editar_estado_activo"
                  defaultChecked={programaAEditar.estado_activo}
                  className="w-4 h-4 text-[#0B305B] rounded cursor-pointer accent-[#0B305B]"
                />
                <label htmlFor="editar_estado_activo" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Programa Habilitado para Selección
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgramaAEditar(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2 bg-[#0B305B] hover:bg-[#071F3B] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR PROGRAMA */}
      {programaAEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#D2202E] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">¿Eliminar Programa?</h3>
              <p className="text-xs text-slate-500">
                Estás a punto de eliminar el programa <span className="font-bold text-slate-800">"{programaAEliminar.nombre}"</span>.
              </p>
              {(programaAEliminar._count.usuarios > 0 || programaAEliminar._count.eventos > 0) && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl mt-2 font-medium border border-amber-200">
                  Este programa tiene {programaAEliminar._count.usuarios} usuario(s) y {programaAEliminar._count.eventos} evento(s) vinculados. No podrá ser eliminado mientras tenga dependencias activas.
                </p>
              )}
            </div>

            <div className="pt-3 flex items-center justify-center gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProgramaAEliminar(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={cargando || programaAEliminar._count.usuarios > 0 || programaAEliminar._count.eventos > 0}
                onClick={handleEliminar}
                className="px-5 py-2 bg-[#D2202E] hover:bg-[#B01824] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
