import ConsultaCertificadosCliente from '@/components/certificados/ConsultaCertificadosCliente'
import Link from 'next/link'
import { ArrowLeft, Award, GraduationCap, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Descarga de Certificados Oficiales | Facultad de Ingenierías',
  description: 'Portal de consulta y descarga de certificados de asistencia y escarapelas en formato PDF.',
}

export default function CertificadosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/40 flex flex-col">
      {/* Header del Portal de Certificados Unisinú */}
      <header className="border-b-2 border-[#D2202E]/30 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#0B305B] bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Portal
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#0B305B] text-white rounded-xl shadow-sm border-t-2 border-[#D2202E]">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#D2202E] uppercase">
                    Universidad del Sinú
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-extrabold text-[#0B305B] leading-tight">
                  Portal de Consulta y Descarga de Certificados Oficiales
                </h1>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0F4F9] text-[#0B305B] border border-[#C2D3E7]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D2202E]" />
              Emisión Digital en PDF
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <ConsultaCertificadosCliente />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          Facultad de Ingenierías &bull; Sistema de Certificación Digital
        </p>
        <p className="mt-1 text-slate-400">
          Documentos generados en el servidor conforme a las normativas de acreditación académica.
        </p>
      </footer>
    </div>
  )
}

