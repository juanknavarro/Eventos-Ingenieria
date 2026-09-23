import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib'
import bwipjs from 'bwip-js'

export interface DatosEscarapela {
  alumnoNombre: string
  alumnoCedula: string
  alumnoCodigo?: string | null
  alumnoCarrera?: string | null
  alumnoSemestre?: string | null
  rolAsistente?: string | null // ej. "ESTUDIANTE", "PONENTE", "PARTICIPANTE", "STAFF"
  eventoTitulo: string
  fondoUrl?: string | null // escarapela_plantilla_url o plantilla base
  eventoLogoUniversidadUrl?: string | null
  eventoImagenCentralUrl?: string | null
  eventoSponsorsUrl?: string | null
  colorPrimarioHex?: string | null
  colorSecundarioHex?: string | null
  qrPayload?: string | null // Información codificada en el QR
  inscripcionId?: string | null
}

/**
 * Carga e incrusta una imagen (PNG o JPG) de forma segura en el PDF
 * Compatible al 100% con ejecución en el navegador (Client Component) y en Node.js
 */
async function cargarEIncrustarImagen(
  pdfDoc: PDFDocument,
  url: string | null | undefined
): Promise<PDFImage | null> {
  if (!url || typeof url !== 'string' || !url.trim()) return null

  try {
    let bytes: Uint8Array | null = null

    if (typeof window !== 'undefined' || url.startsWith('http') || url.startsWith('/')) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const resp = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (resp.ok) {
        const arrayBuffer = await resp.arrayBuffer()
        bytes = new Uint8Array(arrayBuffer)
      }
    }

    if (!bytes || bytes.length === 0) return null

    try {
      return await pdfDoc.embedPng(bytes)
    } catch {
      try {
        return await pdfDoc.embedJpg(bytes)
      } catch {
        return null
      }
    }
  } catch (err) {
    console.warn(`No se pudo cargar la imagen desde ${url}:`, err)
    return null
  }
}

/**
 * Genera los bytes PNG de un código QR en alta resolución utilizando la API de Canvas
 * en el navegador, o el buffer de bwipjs en el servidor (sin dependencias de fs/path).
 */
async function generarQrBytes(texto: string): Promise<Uint8Array | null> {
  if (!texto || !texto.trim()) return null

  // 1. Entorno Navegador (Client Component): Uso nativo de HTMLCanvasElement
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas')
      ;(bwipjs as any).toCanvas(canvas, {
        bcid: 'qrcode',
        text: texto,
        scale: 4,
        padding: 1,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    } catch (err) {
      console.warn('Error al generar QR en Canvas (navegador):', err)
      return null
    }
  }

  // 2. Entorno Servidor (API Route / Node.js)
  try {
    const buf = await (bwipjs as any).toBuffer({
      bcid: 'qrcode',
      text: texto,
      scale: 4,
      padding: 1,
    })
    return new Uint8Array(buf)
  } catch (err) {
    console.warn('Error al generar QR en buffer (servidor):', err)
    return null
  }
}

/**
 * Genera el documento PDF de la escarapela estilo carnet vertical (255 x 368 pt)
 * utilizando pdf-lib con estampado matemático de coordenadas y centrado vectorial.
 */
export async function generarPdfEscarapela(datos: DatosEscarapela): Promise<Uint8Array> {
  // Dimensiones estándar carnet vertical (90 x 130 mm): 255 x 368 puntos
  const width = 255
  const height = 368

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([width, height])

  // Cargar fuentes estándar integradas en PDF
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold)

  // Paleta institucional Universidad del Sinú
  const colorAzulMarino = rgb(0.043, 0.188, 0.357) // #0B305B
  const colorRojo = rgb(0.824, 0.125, 0.180)       // #D2202E
  const colorOscuro = rgb(0.06, 0.09, 0.16)         // #0F172A
  const colorGris = rgb(0.35, 0.40, 0.48)           // #5A667A
  const colorBorde = rgb(0.82, 0.86, 0.92)

  // 1. Cargar plantilla de fondo si fue provista
  const imagenFondo = await cargarEIncrustarImagen(pdfDoc, datos.fondoUrl)

  if (imagenFondo) {
    // Estampar la plantilla vertical en todo el lienzo (255 x 368 pt)
    page.drawImage(imagenFondo, {
      x: 0,
      y: 0,
      width,
      height,
    })
  } else {
    // Diseño vectorial institucional completo en caso de no tener plantilla subida
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.98, 0.98, 0.99),
    })

    // Cabecera superior institucional (Azul Marino)
    const headerH = 58
    page.drawRectangle({
      x: 0,
      y: height - headerH,
      width,
      height: headerH,
      color: colorAzulMarino,
    })

    // Texto superior de la cabecera
    const txtUni = 'UNIVERSIDAD DEL SINÚ'
    const wUni = fontBold.widthOfTextAtSize(txtUni, 9.5)
    page.drawText(txtUni, {
      x: (width - wUni) / 2,
      y: height - 24,
      size: 9.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    })

    const txtFac = 'FACULTAD DE CIENCIAS E INGENIERÍAS'
    const wFac = fontBold.widthOfTextAtSize(txtFac, 6.5)
    page.drawText(txtFac, {
      x: (width - wFac) / 2,
      y: height - 37,
      size: 6.5,
      font: fontBold,
      color: rgb(0.96, 0.75, 0.77),
    })

    const txtCred = 'ACREDITACIÓN OFICIAL'
    const wCred = fontRegular.widthOfTextAtSize(txtCred, 5.5)
    page.drawText(txtCred, {
      x: (width - wCred) / 2,
      y: height - 49,
      size: 5.5,
      font: fontRegular,
      color: rgb(0.76, 0.84, 0.95),
    })

    // Franja de acento con el nombre del evento (Rojo Unisinú)
    const franjaH = 26
    const franjaY = height - headerH - franjaH
    page.drawRectangle({
      x: 0,
      y: franjaY,
      width,
      height: franjaH,
      color: colorRojo,
    })

    const evTitulo = (datos.eventoTitulo || 'Evento Académico').toUpperCase()
    const evTituloCorto = evTitulo.length > 36 ? evTitulo.substring(0, 33) + '...' : evTitulo
    const wEv = fontBold.widthOfTextAtSize(evTituloCorto, 7.5)
    page.drawText(evTituloCorto, {
      x: (width - wEv) / 2,
      y: franjaY + 9,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    })

    // Marco perimetral institucional
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      borderColor: colorAzulMarino,
      borderWidth: 1.5,
    })
  }

  // =========================================================================
  // 2. BADGE DE ROL / TIPO DE ASISTENTE (Centrado horizontal)
  // =========================================================================
  const rolTexto = (datos.rolAsistente || 'ESTUDIANTE / ASISTENTE').toUpperCase().trim()
  const sizeRol = 7
  const wRolTexto = fontBold.widthOfTextAtSize(rolTexto, sizeRol)
  const pillW = Math.max(wRolTexto + 16, 85)
  const pillH = 15
  const pillX = (width - pillW) / 2
  const pillY = imagenFondo ? 222 : 248

  page.drawRectangle({
    x: pillX,
    y: pillY,
    width: pillW,
    height: pillH,
    color: colorRojo,
  })

  page.drawText(rolTexto, {
    x: (width - wRolTexto) / 2,
    y: pillY + 4,
    size: sizeRol,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  // =========================================================================
  // 3. NOMBRE DEL ASISTENTE (Centrado matemático horizontal)
  // =========================================================================
  const nombreMayus = (datos.alumnoNombre || 'ESTUDIANTE UNISINÚ').toUpperCase().trim()
  let tamanoNombre = 12.5
  if (nombreMayus.length > 22) tamanoNombre = 10.5
  if (nombreMayus.length > 30) tamanoNombre = 9

  const wNombre = fontBold.widthOfTextAtSize(nombreMayus, tamanoNombre)
  const yNombre = pillY - 24

  page.drawText(nombreMayus, {
    x: (width - wNombre) / 2,
    y: yNombre,
    size: tamanoNombre,
    font: fontBold,
    color: colorAzulMarino,
  })

  // Línea sutil bajo el nombre
  const lineaW = Math.min(Math.max(wNombre + 30, 140), width - 36)
  page.drawLine({
    start: { x: (width - lineaW) / 2, y: yNombre - 4 },
    end: { x: (width + lineaW) / 2, y: yNombre - 4 },
    thickness: 0.8,
    color: colorBorde,
  })

  // =========================================================================
  // 4. DOCUMENTO DE IDENTIDAD Y CARRERA
  // =========================================================================
  const cedulaMostrar = datos.alumnoCedula || datos.alumnoCodigo || 'N/A'
  const txtCedula = `C.C. ${cedulaMostrar}`
  const sizeCedula = 8.5
  const wCedula = fontBold.widthOfTextAtSize(txtCedula, sizeCedula)
  const yCedula = yNombre - 17

  page.drawText(txtCedula, {
    x: (width - wCedula) / 2,
    y: yCedula,
    size: sizeCedula,
    font: fontBold,
    color: colorOscuro,
  })

  const carreraTexto = (datos.alumnoCarrera || 'Facultad de Ingenierías').trim()
  const sizeCarrera = 7
  const wCarrera = fontRegular.widthOfTextAtSize(carreraTexto, sizeCarrera)
  const yCarrera = yCedula - 13

  page.drawText(carreraTexto, {
    x: (width - wCarrera) / 2,
    y: yCarrera,
    size: sizeCarrera,
    font: fontRegular,
    color: colorGris,
  })

  // =========================================================================
  // 5. CÓDIGO QR EN EL TERCIO INFERIOR (Centrado horizontal)
  // =========================================================================
  const qrContenido =
    datos.qrPayload ||
    datos.alumnoCodigo ||
    datos.alumnoCedula ||
    datos.inscripcionId ||
    'UNISINU-PASS'

  const qrBytes = await generarQrBytes(qrContenido)
  const qrSize = 78
  const qrY = 56
  const qrX = (width - qrSize) / 2

  // Recuadro blanco de respaldo para asegurar escaneo 100% nítido sobre cualquier fondo
  const boxPadding = 5
  page.drawRectangle({
    x: qrX - boxPadding,
    y: qrY - boxPadding,
    width: qrSize + boxPadding * 2,
    height: qrSize + boxPadding * 2,
    color: rgb(1, 1, 1),
    borderColor: colorBorde,
    borderWidth: 1,
  })

  if (qrBytes) {
    try {
      const qrImg = await pdfDoc.embedPng(qrBytes)
      page.drawImage(qrImg, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      })
    } catch (err) {
      console.warn('No se pudo estampar el QR generado:', err)
    }
  }

  // Serial / Cédula al pie del QR
  const serialTexto = `* ${cedulaMostrar} *`
  const wSerial = fontMono.widthOfTextAtSize(serialTexto, 7)
  page.drawText(serialTexto, {
    x: (width - wSerial) / 2,
    y: qrY - 14,
    size: 7,
    font: fontMono,
    color: colorOscuro,
  })

  // Pie de página de verificación
  const pieTexto = 'CONTROL DE ACCESO Y ASISTENCIA • UNISINÚ'
  const wPie = fontRegular.widthOfTextAtSize(pieTexto, 5.5)
  page.drawText(pieTexto, {
    x: (width - wPie) / 2,
    y: 22,
    size: 5.5,
    font: fontRegular,
    color: colorGris,
  })

  return await pdfDoc.save()
}

/**
 * Genera y descarga directamente en el navegador del cliente la escarapela oficial en PDF
 * sin recargar la página ni consumir procesamiento en el servidor.
 */
export async function descargarEscarapelaPdf(
  datos: DatosEscarapela,
  nombreArchivo?: string
): Promise<void> {
  const pdfBytes = await generarPdfEscarapela(datos)
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download =
    nombreArchivo ||
    `Escarapela_${(datos.alumnoNombre || 'Asistente').replace(/\s+/g, '_')}_${(datos.eventoTitulo || 'Evento').replace(/\s+/g, '_')}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Liberar memoria del objeto URL
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
