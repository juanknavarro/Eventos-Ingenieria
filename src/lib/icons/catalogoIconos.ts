import type { LucideIcon } from 'lucide-react'
import {
  // Academia y Educación
  GraduationCap,
  BookOpen,
  Award,
  BookCheck,
  Library,
  Bookmark,
  FileText,
  Scroll,
  Lightbulb,
  Medal,
  Trophy,
  School,
  BookMarked,
  // Tecnología e Ingeniería
  Cpu,
  Code,
  Terminal,
  Database,
  Network,
  Server,
  Binary,
  Laptop,
  QrCode,
  ScanBarcode,
  ShieldCheck,
  Layers,
  Boxes,
  Wrench,
  HardDrive,
  Wifi,
  // Eventos, Logística y Presencialidad
  Calendar,
  CalendarCheck,
  CalendarClock,
  Users,
  UserCheck,
  MapPin,
  Ticket,
  Presentation,
  Mic,
  Megaphone,
  Sparkles,
  Clock,
  Flag,
  // Negocios, Éxito y General
  CheckCircle2,
  Briefcase,
  Building2,
  TrendingUp,
  Target,
  Rocket,
  Star,
  Globe,
} from 'lucide-react'

export interface IconoCatalogo {
  id: string
  nombre: string
  categoria: 'Academia' | 'Tecnología' | 'Eventos' | 'General'
  componente: LucideIcon
}

export const LISTA_ICONOS_CATALOGO: IconoCatalogo[] = [
  // Academia (13)
  { id: 'GraduationCap', nombre: 'Birrete Académico', categoria: 'Academia', componente: GraduationCap },
  { id: 'BookOpen', nombre: 'Libro Abierto', categoria: 'Academia', componente: BookOpen },
  { id: 'Award', nombre: 'Insignia de Premio', categoria: 'Academia', componente: Award },
  { id: 'BookCheck', nombre: 'Libro Verificado', categoria: 'Academia', componente: BookCheck },
  { id: 'Library', nombre: 'Biblioteca', categoria: 'Academia', componente: Library },
  { id: 'Bookmark', nombre: 'Marcador de Página', categoria: 'Academia', componente: Bookmark },
  { id: 'FileText', nombre: 'Documento / Certificado', categoria: 'Academia', componente: FileText },
  { id: 'Scroll', nombre: 'Diploma / Pergamino', categoria: 'Academia', componente: Scroll },
  { id: 'Lightbulb', nombre: 'Innovación / Idea', categoria: 'Academia', componente: Lightbulb },
  { id: 'Medal', nombre: 'Medalla al Mérito', categoria: 'Academia', componente: Medal },
  { id: 'Trophy', nombre: 'Trofeo de Excelencia', categoria: 'Academia', componente: Trophy },
  { id: 'School', nombre: 'Campus / Escuela', categoria: 'Academia', componente: School },
  { id: 'BookMarked', nombre: 'Libro Guardado', categoria: 'Academia', componente: BookMarked },

  // Tecnología (16)
  { id: 'Cpu', nombre: 'Procesador / Hardware', categoria: 'Tecnología', componente: Cpu },
  { id: 'Code', nombre: 'Código / Desarrollo', categoria: 'Tecnología', componente: Code },
  { id: 'Terminal', nombre: 'Consola / Terminal', categoria: 'Tecnología', componente: Terminal },
  { id: 'Database', nombre: 'Base de Datos', categoria: 'Tecnología', componente: Database },
  { id: 'Network', nombre: 'Redes y Conectividad', categoria: 'Tecnología', componente: Network },
  { id: 'Server', nombre: 'Servidor / Cloud', categoria: 'Tecnología', componente: Server },
  { id: 'Binary', nombre: 'Datos Binarios', categoria: 'Tecnología', componente: Binary },
  { id: 'Laptop', nombre: 'Computador Portátil', categoria: 'Tecnología', componente: Laptop },
  { id: 'QrCode', nombre: 'Código QR', categoria: 'Tecnología', componente: QrCode },
  { id: 'ScanBarcode', nombre: 'Lector de Código / Carnet', categoria: 'Tecnología', componente: ScanBarcode },
  { id: 'ShieldCheck', nombre: 'Seguridad / Verificado', categoria: 'Tecnología', componente: ShieldCheck },
  { id: 'Layers', nombre: 'Capas de Software', categoria: 'Tecnología', componente: Layers },
  { id: 'Boxes', nombre: 'Módulos / Contenedores', categoria: 'Tecnología', componente: Boxes },
  { id: 'Wrench', nombre: 'Ingeniería / Taller', categoria: 'Tecnología', componente: Wrench },
  { id: 'HardDrive', nombre: 'Almacenamiento', categoria: 'Tecnología', componente: HardDrive },
  { id: 'Wifi', nombre: 'Conexión Inalámbrica', categoria: 'Tecnología', componente: Wifi },

  // Eventos (13)
  { id: 'Calendar', nombre: 'Calendario de Eventos', categoria: 'Eventos', componente: Calendar },
  { id: 'CalendarCheck', nombre: 'Asistencia Confirmada', categoria: 'Eventos', componente: CalendarCheck },
  { id: 'CalendarClock', nombre: 'Horario del Evento', categoria: 'Eventos', componente: CalendarClock },
  { id: 'Users', nombre: 'Participantes / Aforo', categoria: 'Eventos', componente: Users },
  { id: 'UserCheck', nombre: 'Inscripción Confirmada', categoria: 'Eventos', componente: UserCheck },
  { id: 'MapPin', nombre: 'Ubicación / Auditorio', categoria: 'Eventos', componente: MapPin },
  { id: 'Ticket', nombre: 'Boleto / Entrada', categoria: 'Eventos', componente: Ticket },
  { id: 'Presentation', nombre: 'Ponencia / Conferencia', categoria: 'Eventos', componente: Presentation },
  { id: 'Mic', nombre: 'Orador / Micrófono', categoria: 'Eventos', componente: Mic },
  { id: 'Megaphone', nombre: 'Difusión / Convocatoria', categoria: 'Eventos', componente: Megaphone },
  { id: 'Sparkles', nombre: 'Evento Destacado', categoria: 'Eventos', componente: Sparkles },
  { id: 'Clock', nombre: 'Tiempo / Horario', categoria: 'Eventos', componente: Clock },
  { id: 'Flag', nombre: 'Hito del Evento', categoria: 'Eventos', componente: Flag },

  // General y Negocios (8)
  { id: 'CheckCircle2', nombre: 'Verificado Circular', categoria: 'General', componente: CheckCircle2 },
  { id: 'Briefcase', nombre: 'Profesional / Negocios', categoria: 'General', componente: Briefcase },
  { id: 'Building2', nombre: 'Edificio Institucional', categoria: 'General', componente: Building2 },
  { id: 'TrendingUp', nombre: 'Crecimiento / Tendencias', categoria: 'General', componente: TrendingUp },
  { id: 'Target', nombre: 'Objetivos / Metas', categoria: 'General', componente: Target },
  { id: 'Rocket', nombre: 'Lanzamiento / Proyección', categoria: 'General', componente: Rocket },
  { id: 'Star', nombre: 'Favorito / Destacado', categoria: 'General', componente: Star },
  { id: 'Globe', nombre: 'Alcance Global / Internacional', categoria: 'General', componente: Globe },
]

export const DICCIONARIO_ICONOS: Record<string, IconoCatalogo> = LISTA_ICONOS_CATALOGO.reduce(
  (acc, item) => {
    acc[item.id] = item
    return acc
  },
  {} as Record<string, IconoCatalogo>
)

/**
 * Resuelve un componente Lucide de manera segura a partir del id textual almacenado en base de datos.
 * Si el id no existe o es inválido, devuelve el fallback indicado sin romper la aplicación.
 */
export function resolverIconoLucide(
  idIcono?: string | null,
  iconoPorDefecto: LucideIcon = CheckCircle2
): LucideIcon {
  if (!idIcono) return iconoPorDefecto
  const item = DICCIONARIO_ICONOS[idIcono]
  return item ? item.componente : iconoPorDefecto
}
