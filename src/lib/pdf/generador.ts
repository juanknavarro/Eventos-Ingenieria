import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib'

export interface DatosGeneracionCertificado {
  alumnoNombre: string
  alumnoDocumento: string
  alumnoCarrera?: string | null
  eventoTitulo: string
  horasAcademicas?: number | null
  fechaEvento?: Date | string | null
  fondoUrl?: string | null
  firmaDecanoUrl?: string | null
  nombreDecano?: string | null
  cargoDecano?: string | null
  firmaDirectorUrl?: string | null
  nombreFirmante2?: string | null
  cargoFirmante2?: string | null
  asistenciaId?: string | null
}

/**
 * Carga e incrusta una imagen (PNG o JPG) de forma segura en el PDF
 * Compatible con ejecución en el navegador (Client Component) y en Node.js
 */
async function cargarEIncrustarImagen(
  pdfDoc: PDFDocument,
  url: string | null | undefined
): Promise<PDFImage | null> {
  if (!url || typeof url !== 'string' || !url.trim()) return null

  try {
    let bytes: Uint8Array | null = null

    // 1. Si estamos en el navegador o URL absoluta/relativa
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

    // Intentar PNG primero, luego JPG
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
 * Formatea una fecha a texto formal en español (ej. "22 de septiembre de 2026")
 */
function formatearFechaEspanol(fechaRaw?: Date | string | null): string {
  try {
    const fecha = fechaRaw ? new Date(fechaRaw) : new Date()
    if (isNaN(fecha.getTime())) throw new Error()
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ]
    const dia = fecha.getDate()
    const mes = meses[fecha.getMonth()]
    const anio = fecha.getFullYear()
    return `${dia} de ${mes} de ${anio}`
  } catch {
    return '22 de septiembre de 2026'
  }
}

/**
 * Genera el documento PDF de certificado en bytes utilizando pdf-lib
 * con estampado matemático de coordenadas y centrado vectorial horizontal.
 */
export async function generarCertificadoPdf(
  datos: DatosGeneracionCertificado
): Promise<Uint8Array> {
  // Dimensiones estándar A4 Horizontal (Landscape) en puntos tipográficos: 842 x 595
  const width = 842
  const height = 595

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([width, height])

  // Cargar fuentes tipográficas estándar integradas en PDF
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier)

  // Paleta institucional Unisinú
  const colorAzulMarino = rgb(0.043, 0.188, 0.357) // #0B305B
  const colorRojo = rgb(0.824, 0.125, 0.180) // #D2202E
  const colorOscuro = rgb(0.06, 0.09, 0.16) // #0F172A
  const colorGris = rgb(0.32, 0.38, 0.46) // #526176
  const colorBorde = rgb(0.78, 0.82, 0.88)

  // 1. Cargar imagen de plantilla de fondo si está provista
  const imagenFondo = await cargarEIncrustarImagen(pdfDoc, datos.fondoUrl)

  if (imagenFondo) {
    // Estampar imagen base en todo el lienzo (A4 Landscape)
    page.drawImage(imagenFondo, {
      x: 0,
      y: 0,
      width,
      height,
    })
  } else {
    // Lienzo y orlado ornamental institucional por defecto
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.99, 0.99, 0.98),
    })

    // Marco exterior (Azul Marino Unisinú)
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: colorAzulMarino,
      borderWidth: 3,
    })

    // Marco interior fino (Rojo Unisinú)
    page.drawRectangle({
      x: 26,
      y: 26,
      width: width - 52,
      height: height - 52,
      borderColor: colorRojo,
      borderWidth: 1.5,
    })

    // Encabezado institucional decorativo
    const txtUni = 'UNIVERSIDAD DEL SINÚ'
    const wUni = fontBold.widthOfTextAtSize(txtUni, 13)
    page.drawText(txtUni, {
      x: (width - wUni) / 2,
      y: height - 60,
      size: 13,
      font: fontBold,
      color: colorRojo,
    })

    const txtFac = 'FACULTAD DE CIENCIAS E INGENIERÍAS'
    const wFac = fontBold.widthOfTextAtSize(txtFac, 11)
    page.drawText(txtFac, {
      x: (width - wFac) / 2,
      y: height - 76,
      size: 11,
      font: fontBold,
      color: colorAzulMarino,
    })

    // Línea separadora dorada/roja
    page.drawLine({
      start: { x: (width - 240) / 2, y: height - 86 },
      end: { x: (width + 240) / 2, y: height - 86 },
      thickness: 1.5,
      color: colorRojo,
    })
  }

  // 2. Título de Certificación: "CERTIFICA QUE"
  const txtCertifica = 'CERTIFICA QUE'
  const sizeCertifica = 13
  const wCertifica = fontBold.widthOfTextAtSize(txtCertifica, sizeCertifica)
  page.drawText(txtCertifica, {
    x: (width - wCertifica) / 2,
    y: 360,
    size: sizeCertifica,
    font: fontBold,
    color: colorRojo,
  })

  // 3. Nombre del Alumno (Centrado horizontal matemático en X)
  const nombreLimpio = (datos.alumnoNombre || 'ESTUDIANTE UNISINÚ').toUpperCase().trim()
  const sizeNombre = nombreLimpio.length > 32 ? 20 : 24
  const wNombre = fontBold.widthOfTextAtSize(nombreLimpio, sizeNombre)
  page.drawText(nombreLimpio, {
    x: (width - wNombre) / 2,
    y: 320,
    size: sizeNombre,
    font: fontBold,
    color: colorAzulMarino,
  })

  // Línea sutil de realce bajo el nombre
  const anchoLineaNombre = Math.min(Math.max(wNombre + 50, 320), width - 120)
  page.drawLine({
    start: { x: (width - anchoLineaNombre) / 2, y: 312 },
    end: { x: (width + anchoLineaNombre) / 2, y: 312 },
    thickness: 1.5,
    color: colorAzulMarino,
  })

  // 4. Documento de Identidad y Carrera
  const carreraTexto = datos.alumnoCarrera ? ` • Programa: ${datos.alumnoCarrera}` : ''
  const txtDocumento = `Identificado(a) con documento / código: ${datos.alumnoDocumento || 'N/A'}${carreraTexto}`
  const sizeDoc = 10.5
  const wDoc = fontRegular.widthOfTextAtSize(txtDocumento, sizeDoc)
  page.drawText(txtDocumento, {
    x: (width - wDoc) / 2,
    y: 292,
    size: sizeDoc,
    font: fontRegular,
    color: colorGris,
  })

  // 5. Declaración de participación
  const txtParticipacion = 'Por su asistencia, cumplimiento y destacada participación académica en el evento:'
  const sizePart = 11.5
  const wPart = fontRegular.widthOfTextAtSize(txtParticipacion, sizePart)
  page.drawText(txtParticipacion, {
    x: (width - wPart) / 2,
    y: 258,
    size: sizePart,
    font: fontRegular,
    color: colorOscuro,
  })

  // 6. Nombre del Evento (Centrado horizontal)
  const eventoTexto = `"${(datos.eventoTitulo || 'Evento Académico').trim()}"`
  const sizeEvento = eventoTexto.length > 50 ? 15 : 17.5
  const wEvento = fontBold.widthOfTextAtSize(eventoTexto, sizeEvento)
  page.drawText(eventoTexto, {
    x: (width - wEvento) / 2,
    y: 228,
    size: sizeEvento,
    font: fontBold,
    color: colorAzulMarino,
  })

  // 7. Horas Académicas y Fecha de Emisión
  const horas = datos.horasAcademicas && datos.horasAcademicas > 0 ? datos.horasAcademicas : 4
  const fechaFormateada = formatearFechaEspanol(datos.fechaEvento)

  const txtHorasYFecha = `Con una intensidad académica debidamente certificada de ${horas} horas de formación continua.`
  const sizeHoras = 10.5
  const wHoras = fontRegular.widthOfTextAtSize(txtHorasYFecha, sizeHoras)
  page.drawText(txtHorasYFecha, {
    x: (width - wHoras) / 2,
    y: 198,
    size: sizeHoras,
    font: fontRegular,
    color: colorOscuro,
  })

  const txtLugarFecha = `Expedido en la ciudad de Montería, Colombia, a los ${fechaFormateada}.`
  const sizeLugar = 9.5
  const wLugar = fontOblique.widthOfTextAtSize(txtLugarFecha, sizeLugar)
  page.drawText(txtLugarFecha, {
    x: (width - wLugar) / 2,
    y: 178,
    size: sizeLugar,
    font: fontOblique,
    color: colorGris,
  })

  // 8. Firmas Institucionales (Decanatura y Dirección/Coordinación)
  const yLineasFirmas = 85
  const yTextoNombre = yLineasFirmas - 16
  const yTextoCargo = yLineasFirmas - 28

  // --- Firma 1: Decano (Izquierda) ---
  const centroFirma1 = 230
  const anchoLineaFirma = 190

  const firmaDecanoImg = await cargarEIncrustarImagen(pdfDoc, datos.firmaDecanoUrl)
  if (firmaDecanoImg) {
    const firmaW = 85
    const firmaH = 38
    page.drawImage(firmaDecanoImg, {
      x: centroFirma1 - firmaW / 2,
      y: yLineasFirmas + 2,
      width: firmaW,
      height: firmaH,
    })
  }

  page.drawLine({
    start: { x: centroFirma1 - anchoLineaFirma / 2, y: yLineasFirmas },
    end: { x: centroFirma1 + anchoLineaFirma / 2, y: yLineasFirmas },
    thickness: 1,
    color: colorBorde,
  })

  const nombreDecano = datos.nombreDecano || 'Ing. Roberto Gómez'
  const wNombreDecano = fontBold.widthOfTextAtSize(nombreDecano, 10)
  page.drawText(nombreDecano, {
    x: centroFirma1 - wNombreDecano / 2,
    y: yTextoNombre,
    size: 10,
    font: fontBold,
    color: colorOscuro,
  })

  const cargoDecano = datos.cargoDecano || 'Decano Facultad de Ciencias e Ingenierías'
  const wCargoDecano = fontRegular.widthOfTextAtSize(cargoDecano, 8.5)
  page.drawText(cargoDecano, {
    x: centroFirma1 - wCargoDecano / 2,
    y: yTextoCargo,
    size: 8.5,
    font: fontRegular,
    color: colorGris,
  })

  // --- Firma 2: Director de Programa o Coordinador Docente (Derecha) ---
  const centroFirma2 = width - 230

  const firmaDirectorImg = await cargarEIncrustarImagen(pdfDoc, datos.firmaDirectorUrl)
  if (firmaDirectorImg) {
    const firmaW = 85
    const firmaH = 38
    page.drawImage(firmaDirectorImg, {
      x: centroFirma2 - firmaW / 2,
      y: yLineasFirmas + 2,
      width: firmaW,
      height: firmaH,
    })
  }

  page.drawLine({
    start: { x: centroFirma2 - anchoLineaFirma / 2, y: yLineasFirmas },
    end: { x: centroFirma2 + anchoLineaFirma / 2, y: yLineasFirmas },
    thickness: 1,
    color: colorBorde,
  })

  const nombreFirmante2 = datos.nombreFirmante2 || 'Comité Académico Docente'
  const wNombreFirmante2 = fontBold.widthOfTextAtSize(nombreFirmante2, 10)
  page.drawText(nombreFirmante2, {
    x: centroFirma2 - wNombreFirmante2 / 2,
    y: yTextoNombre,
    size: 10,
    font: fontBold,
    color: colorOscuro,
  })

  const cargoFirmante2 = datos.cargoFirmante2 || 'Coordinación de Formación Continua'
  const wCargoFirmante2 = fontRegular.widthOfTextAtSize(cargoFirmante2, 8.5)
  page.drawText(cargoFirmante2, {
    x: centroFirma2 - wCargoFirmante2 / 2,
    y: yTextoCargo,
    size: 8.5,
    font: fontRegular,
    color: colorGris,
  })

  // 9. Serial y Validación de Seguridad en el pie de página
  const serialTexto = `ID de Verificación Oficial: ${datos.asistenciaId || 'UNISINU-CERT-2026'} | Validez Académica Facultad de Ingenierías`
  const wSerial = fontMono.widthOfTextAtSize(serialTexto, 7)
  page.drawText(serialTexto, {
    x: (width - wSerial) / 2,
    y: 25,
    size: 7,
    font: fontMono,
    color: rgb(0.55, 0.6, 0.68),
  })

  return await pdfDoc.save()
}

/**
 * Genera y descarga directamente en el cliente el certificado en formato PDF
 * sin recargar la página ni consumir procesamiento en el servidor.
 */
export async function descargarCertificadoPdf(
  datos: DatosGeneracionCertificado,
  nombreArchivo?: string
): Promise<void> {
  const pdfBytes = await generarCertificadoPdf(datos)
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download =
    nombreArchivo ||
    `Certificado_${(datos.alumnoNombre || 'Estudiante').replace(/\s+/g, '_')}_${(datos.eventoTitulo || 'Evento').replace(/\s+/g, '_')}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Liberar memoria del objeto URL
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

