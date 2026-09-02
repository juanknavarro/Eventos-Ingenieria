import prisma from '@/lib/prisma'
import { rgb } from 'pdf-lib'

export interface ConfiguracionPlantillasData {
  id: string
  logo_url: string
  firma_decano_url: string | null
  nombre_decano: string
  cargo_firmante: string
  color_primario: string
  color_secundario: string
  updatedAt?: Date
}

export const CONFIG_PLANTILLAS_DEFAULT: ConfiguracionPlantillasData = {
  id: 'global_config',
  logo_url: '/imagen_2.png',
  firma_decano_url: null,
  nombre_decano: 'Ing. Roberto Gómez',
  cargo_firmante: 'Decano Facultad de Ciencias e Ingenierías',
  color_primario: '#0B305B',
  color_secundario: '#D2202E',
}

/**
 * Obtiene la configuración global de plantillas de la base de datos o inicializa la fila por defecto
 */
export async function obtenerConfiguracionPlantillas(): Promise<ConfiguracionPlantillasData> {
  try {
    let config = await prisma.configuracionPlantillas.findUnique({
      where: { id: 'global_config' },
    })

    if (!config) {
      config = await prisma.configuracionPlantillas.create({
        data: {
          id: 'global_config',
          logo_url: CONFIG_PLANTILLAS_DEFAULT.logo_url,
          firma_decano_url: CONFIG_PLANTILLAS_DEFAULT.firma_decano_url,
          nombre_decano: CONFIG_PLANTILLAS_DEFAULT.nombre_decano,
          cargo_firmante: CONFIG_PLANTILLAS_DEFAULT.cargo_firmante,
          color_primario: CONFIG_PLANTILLAS_DEFAULT.color_primario,
          color_secundario: CONFIG_PLANTILLAS_DEFAULT.color_secundario,
        },
      })
    }

    return config
  } catch (err) {
    console.error('Error obteniendo configuracion_plantillas de BD, usando fallback:', err)
    return CONFIG_PLANTILLAS_DEFAULT
  }
}

/**
 * Convierte un color hexadecimal '#RRGGBB' al objeto RGB normalizado (0 a 1) para pdf-lib
 */
export function hexToRgbColor(hex: string | null | undefined, fallbackRgb = rgb(0.043, 0.188, 0.357)) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length < 7) {
    return fallbackRgb
  }

  try {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.substring(0, 2), 16) / 255
    const g = parseInt(clean.substring(2, 4), 16) / 255
    const b = parseInt(clean.substring(4, 6), 16) / 255

    if (isNaN(r) || isNaN(g) || isNaN(b)) return fallbackRgb
    return rgb(r, g, b)
  } catch {
    return fallbackRgb
  }
}

