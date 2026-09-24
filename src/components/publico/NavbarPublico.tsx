'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Award,
  ShieldCheck,
  HandCoins,
  ScanBarcode,
  LogIn,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Clock,
  X,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import type { AuthSessionUser } from '@/lib/auth/session'

export interface ContactoInfo {
  correo?: string | null
  telefono?: string | null
  ubicacion?: string | null
  horario?: string | null
}

interface NavbarPublicoProps {
  sesion: AuthSessionUser | null
  contacto?: ContactoInfo | null
}

export default function NavbarPublico({ sesion, contacto }: NavbarPublicoProps) {
  const [modalContactoAbierto, setModalContactoAbierto] = useState(false)
  const [correoCopiado, setCorreoCopiado] = useState(false)

  const correoContacto = contacto?.correo?.trim() || 'ingenierias@unisinu.edu.co'
  const telefonoContacto = contacto?.telefono?.trim() || '(+57) 604 784 0340 • Ext. 140 / 142'
  const ubicacionContacto =
    contacto?.ubicacion?.trim() || 'Campus Santillana, Bloque 3 • Montería, Córdoba'
  const horarioContacto =
    contacto?.horario?.trim() || 'Lunes a Viernes: 8:00 AM – 12:00 M / 2:00 PM – 6:00 PM'

  const copiarCorreo = async () => {
    try {
      await navigator.clipboard.writeText(correoContacto)
      setCorreoCopiado(true)
      setTimeout(() => setCorreoCopiado(false), 2500)
    } catch {
      // Fallback
    }
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* HEADER PRINCIPAL PÚBLICO (3 BLOQUES: MARCA - NAVEGACIÓN - ACCIONES)       */}
      {/* ========================================================================= */}
      <header className="bg-white border-b-2 border-[#D2202E]/20 sticky top-0 z-40 shadow-xs bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* --------------------------------------------------------------------- */}
          {/* BLOQUE 1 (IZQUIERDA): LOGO E IDENTIDAD INSTITUCIONAL                  */}
          {/* --------------------------------------------------------------------- */}
          <Link
            href="/"
            className="flex items-center gap-3.5 group transition-transform active:scale-[0.99] shrink-0"
          >
            <div className="p-2.5 bg-[#0B305B] text-white rounded-2xl shadow-md border-t-2 border-[#D2202E] group-hover:bg-[#071F3B] transition-colors">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-[#D2202E] tracking-wider uppercase">
                  Universidad del Sinú
                </span>
                <span className="h-3 w-px bg-slate-300"></span>
                <span className="text-[11px] font-bold text-slate-500">Sede Montería</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-[#0B305B] tracking-tight leading-tight">
                Facultad de Ciencias e Ingenierías &bull; Portal de Eventos
              </h1>
            </div>
          </Link>

          {/* --------------------------------------------------------------------- */}
          {/* BLOQUE 2 (CENTRO): ENLACES DE NAVEGACIÓN PÚBLICA (EVENTOS Y CONTACTO) */}
          {/* --------------------------------------------------------------------- */}
          <nav aria-label="Navegación principal" className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/#eventos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0B305B] hover:bg-slate-100 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#0B305B]" />
              Eventos
            </Link>

            <button
              type="button"
              onClick={() => setModalContactoAbierto(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#D2202E] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#D2202E]" />
              Contacto
            </button>
          </nav>

          {/* --------------------------------------------------------------------- */}
          {/* BLOQUE 3 (DERECHA): CERTIFICADOS Y ACCESOS DE PERSONAL / LOGIN        */}
          {/* --------------------------------------------------------------------- */}
          <div className="flex flex-row items-center justify-end gap-3 shrink-0 whitespace-nowrap">
            {/* Botón Destacado: Consultar Certificados */}
            <Link
              href="/certificados"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-[#0B305B] bg-white hover:bg-slate-50 border-2 border-[#0B305B]/25 hover:border-[#0B305B] rounded-xl transition-all shadow-xs hover:shadow-sm shrink-0 whitespace-nowrap"
            >
              <Award className="w-4 h-4 text-[#D2202E]" />
              Consultar Certificados
            </Link>

            {/* Accesos rápidos según rol de personal institucional autenticado */}
            {(sesion?.rol === 'ADMIN' || sesion?.rol === 'SUPER_ADMIN') && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition shrink-0 whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                Panel Maestro
              </Link>
            )}

            {sesion?.rol === 'PROFESOR' && (
              <Link
                href="/profesor"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl shadow-xs transition shrink-0 whitespace-nowrap"
              >
                <HandCoins className="w-4 h-4" />
                Validar Pagos
              </Link>
            )}

            {sesion?.rol === 'STAFF' && (
              <Link
                href="/staff/asistencia"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl shadow-xs transition shrink-0 whitespace-nowrap"
              >
                <ScanBarcode className="w-4 h-4" />
                Control de Acceso
              </Link>
            )}

            {/* Estado de Sesión / Botón Login */}
            {sesion ? (
              <div className="flex items-center gap-2 bg-slate-100 pl-3 pr-1.5 py-1 rounded-xl border border-slate-200 text-xs shrink-0 whitespace-nowrap">
                <div className="text-left hidden sm:block">
                  <span className="font-bold text-[#0B305B] block truncate max-w-[120px]">
                    {sesion.nombre.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-extrabold text-[#D2202E] uppercase">
                    {sesion.rol}
                  </span>
                </div>
                <BotonCerrarSesion />
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl transition shadow-xs shrink-0 whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                Acceso Personal
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MODAL LIGERO DE CONTACTO Y ATENCIÓN INSTITUCIONAL                         */}
      {/* ========================================================================= */}
      {modalContactoAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-contacto"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setModalContactoAbierto(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 relative animate-in zoom-in-95 duration-200 border-t-4 border-[#D2202E]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setModalContactoAbierto(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Encabezado */}
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-[#0B305B] text-white rounded-2xl shadow-md border-t-2 border-[#D2202E]">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#D2202E] uppercase tracking-wider block">
                  Universidad del Sinú
                </span>
                <h3 id="titulo-modal-contacto" className="text-lg font-extrabold text-[#0B305B] leading-tight">
                  Contacto &bull; Facultad de Ciencias e Ingenierías
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Canales de atención a estudiantes, docentes y participantes de eventos.
                </p>
              </div>
            </div>

            {/* Canales de Comunicación */}
            <div className="space-y-3 text-xs">
              {/* Correo Electrónico */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-indigo-50 text-[#0B305B] rounded-xl shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Correo Electrónico
                    </span>
                    <a
                      href={`mailto:${correoContacto}`}
                      className="font-bold text-[#0B305B] hover:underline truncate block"
                    >
                      {correoContacto}
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copiarCorreo}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] transition shrink-0 cursor-pointer shadow-2xs"
                >
                  {correoCopiado ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Teléfono Conmutador */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Conmutador Institucional
                  </span>
                  <p className="font-bold text-slate-900">
                    {telefonoContacto}
                  </p>
                </div>
              </div>

              {/* Ubicación Física */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <div className="p-2 bg-rose-50 text-[#D2202E] rounded-xl shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Ubicación Decanatura
                  </span>
                  <p className="font-bold text-slate-900">
                    {ubicacionContacto}
                  </p>
                </div>
              </div>

              {/* Horario de Atención */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Horario de Atención
                  </span>
                  <p className="font-bold text-slate-900">
                    {horarioContacto}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Atención presencial y virtual
              </span>
              <button
                type="button"
                onClick={() => setModalContactoAbierto(false)}
                className="px-4 py-2 bg-[#0B305B] hover:bg-[#071F3B] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

