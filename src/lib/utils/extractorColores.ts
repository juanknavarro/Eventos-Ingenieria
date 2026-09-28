/**
 * Utilidad de extracción de paleta de colores dominante usando HTML5 Canvas en memoria.
 * Diseñado para ejecutarse 100% en el cliente (Browser) sin dependencias externas.
 */

interface ColorBucket {
  r: number
  g: number
  b: number
  count: number
}

/**
 * Convierte valores numéricos RGB a cadena hexadecimal (#RRGGBB)
 */
function rgbAHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Calcula la distancia euclidiana entre dos colores RGB
 */
function distanciaRgb(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  )
}

/**
 * Analiza un archivo de imagen o URL en el cliente y extrae de 5 a 6 colores dominantes
 */
export async function extraerPaleta(
  fuente: File | string | null | undefined,
  maxColores: number = 6
): Promise<string[]> {
  if (!fuente) return []
  if (typeof window === 'undefined') return []

  let objectUrlCreado: string | null = null
  let src = ''

  if (fuente instanceof File) {
    objectUrlCreado = URL.createObjectURL(fuente)
    src = objectUrlCreado
  } else if (typeof fuente === 'string' && fuente.trim().length > 0) {
    src = fuente.trim()
  } else {
    return []
  }

  try {
    const img = new Image()
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous'
    }

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para análisis'))
      img.src = src
    })

    // Escalar la imagen a 100x100px para muestreo ultrarrápido (< 10ms)
    const canvas = document.createElement('canvas')
    const size = 100
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    ctx.drawImage(img, 0, 0, size, size)
    const imgData = ctx.getImageData(0, 0, size, size)
    const data = imgData.data

    // Agrupación y cuantización de píxeles
    const cubetas: { [clave: string]: ColorBucket } = {}
    const pasoCuantizacion = 24 // Resolución de cuantización por canal

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      // Filtrar píxeles transparentes
      if (a < 128) continue

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Brillo percibido
      const brillo = (r * 299 + g * 587 + b * 114) / 1000

      // Filtrar blancos puros y fondos extremos (> 242)
      if (brillo > 242 && r > 235 && g > 235 && b > 235) continue

      // Filtrar negros absolutos o sombras extremas (< 18)
      if (brillo < 18) continue

      const qr = Math.round(r / pasoCuantizacion) * pasoCuantizacion
      const qg = Math.round(g / pasoCuantizacion) * pasoCuantizacion
      const qb = Math.round(b / pasoCuantizacion) * pasoCuantizacion

      const clave = `${qr},${qg},${qb}`
      if (!cubetas[clave]) {
        cubetas[clave] = { r: qr, g: qg, b: qb, count: 1 }
      } else {
        cubetas[clave].count++
      }
    }

    // Ordenar cubetas por frecuencia de aparición
    const listaOrdenada = Object.values(cubetas).sort((a, b) => b.count - a.count)

    // Seleccionar colores dominantes garantizando contraste perceptual entre ellos
    const coloresSeleccionados: { r: number; g: number; b: number }[] = []
    const distanciaMinima = 38 // Umbral mínimo de diferenciación

    for (const item of listaOrdenada) {
      const muyCercano = coloresSeleccionados.some(
        (sel) => distanciaRgb(sel, item) < distanciaMinima
      )
      if (!muyCercano) {
        coloresSeleccionados.push({ r: item.r, g: item.g, b: item.b })
      }
      if (coloresSeleccionados.length >= maxColores) break
    }

    // Convertir a formato HEX
    const paletaHex = coloresSeleccionados.map((c) => rgbAHex(c.r, c.g, c.b))

    return paletaHex
  } catch (err) {
    console.warn('[ExtractorColores] No fue posible analizar la imagen:', err)
    return []
  } finally {
    if (objectUrlCreado) {
      URL.revokeObjectURL(objectUrlCreado)
    }
  }
}
