import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib'
import bwipjs from 'bwip-js'
import fs from 'fs'
import path from 'path'
import { hexToRgbColor } from '@/lib/config/plantillas'

export interface DatosEscarapela {
  alumnoNombre: string
  alumnoCedula: string
  alumnoCodigo: string
  alumnoCarrera: string
  alumnoSemestre?: string | null
  eventoTitulo: string
  eventoLogoFondoUrl?: string | null
  eventoLogoUniversidadUrl?: string | null
  eventoImagenCentralUrl?: string | null
  eventoSponsorsUrl?: string | null
  estadoPago: string
  colorPrimarioHex?: string | null
  colorSecundarioHex?: string | null
}

/**
 * Carga estática y directa del logo institucional oficial de la Universidad del Sinú desde public/
 */
async function cargarLogoInstitucionalEstatico(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  const rutasEstaticas = [
    path.join(process.cwd(), 'public', 'imagen_2.png'),
    path.join(process.cwd(), 'public', 'logo_unisinu.png'),
    path.join(process.cwd(), 'public', 'images', 'imagen_2.png'),
  ]

  for (const ruta of rutasEstaticas) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ ruta)) {
        const buffer = fs.readFileSync(/*turbopackIgnore: true*/ ruta)
        const bytes = new Uint8Array(buffer)
        try {
          return await pdfDoc.embedPng(bytes)
        } catch {
          return await pdfDoc.embedJpg(bytes)
        }
      }
    } catch {
      // Intentar siguiente
    }
  }

  return null
}

/**
 * Helper para cargar imágenes secundarias (remotas o locales)
 */
async function cargarImagenSegura(
  pdfDoc: PDFDocument,
  fuente: string | null | undefined
): Promise<PDFImage | null> {
  if (!fuente || typeof fuente !== 'string') return null

  try {
    let bytes: Uint8Array | null = null

    // 1. Probar como archivo estático dentro de public/
    const nombreLimpio = path.basename(fuente)
    const rutaPublic = path.join(process.cwd(), 'public', nombreLimpio)

    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ rutaPublic)) {
        const buffer = fs.readFileSync(/*turbopackIgnore: true*/ rutaPublic)
        bytes = new Uint8Array(buffer)
      }
    } catch {
      // Continuar
    }

    // 2. Probar como URL remota (http / https)
    if (!bytes && fuente.startsWith('http')) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)
      const response = await fetch(fuente, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (response.ok) {
        const buffer = await response.arrayBuffer()
        bytes = new Uint8Array(buffer)
      }
    }

    if (!bytes) return null

    try {
      return await pdfDoc.embedPng(bytes)
    } catch {
      try {
        return await pdfDoc.embedJpg(bytes)
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}

/**
 * Genera el PDF de la escarapela estilo carnet físico oficial tamaño 90 x 130 mm
 */
export async function generarPdfEscarapela(datos: DatosEscarapela): Promise<Uint8Array> {
  // Dimensiones exactas requeridas: 90 mm x 130 mm (255.12 x 368.50 pt)
  const MM_TO_PT = 72 / 25.4
  const width = Math.round(90 * MM_TO_PT * 100) / 100   // 255.12 pt
  const height = Math.round(130 * MM_TO_PT * 100) / 100 // 368.50 pt

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([width, height])

  // Cargar tipografías estándar
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold)

  // 1. Fondo general del carnet
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.96, 0.97, 0.99),
  })

  // Colores institucionales dinámicos desde la configuración de plantillas
  const colorPrimario = hexToRgbColor(datos.colorPrimarioHex, rgb(0.043, 0.188, 0.357))
  const colorSecundario = hexToRgbColor(datos.colorSecundarioHex, rgb(0.824, 0.125, 0.180))

  // =========================================================================
  // 1. FONDO SUPERIOR CON COLOR PRIMARIO Y LOGO INSTITUCIONAL
  // =========================================================================
  const headerHeight = 64
  const headerY = height - headerHeight

  page.drawRectangle({
    x: 0,
    y: headerY,
    width,
    height: headerHeight,
    color: colorPrimario,
  })

  // Cargar dinámicamente el logo institucional (o fallback estático)
  let logoUni = await cargarImagenSegura(pdfDoc, datos.eventoLogoUniversidadUrl)
  if (!logoUni) {
    logoUni = await cargarLogoInstitucionalEstatico(pdfDoc)
  }

  if (logoUni) {
    // El logo oficial de Unisinú tiene relación de aspecto ~4.68:1
    const imgAspect = logoUni.width / logoUni.height
    const logoH = 30
    const logoW = Math.min(Math.round(logoH * imgAspect), 148)

    // Renderizar logo oficial en la cabecera superior izquierda
    page.drawImage(logoUni, {
      x: 12,
      y: headerY + 22,
      width: logoW,
      height: logoH,
    })

    // Subtítulo oficial debajo del logo
    page.drawText('FACULTAD DE CIENCIAS E INGENIERÍAS', {
      x: 12,
      y: headerY + 9,
      size: 6.2,
      font: fontBold,
      color: rgb(0.96, 0.75, 0.77), // Tono suave institucional
    })

    // Badge ACREDITACIÓN OFICIAL en esquina derecha
    const txtBadge = 'ACREDITACIÓN 2026'
    const txtBadgeW = fontBold.widthOfTextAtSize(txtBadge, 5.5)
    page.drawRectangle({
      x: width - txtBadgeW - 20,
      y: headerY + 28,
      width: txtBadgeW + 12,
      height: 14,
      color: colorSecundario,
    })
    page.drawText(txtBadge, {
      x: width - txtBadgeW - 14,
      y: headerY + 32,
      size: 5.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
  } else {
    // Si no está el archivo, renderizar texto institucional nítido (NUNCA un cuadro rojo vacío)
    page.drawText('UNIVERSIDAD DEL SINÚ', {
      x: 14,
      y: headerY + 38,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    })

    page.drawText('FACULTAD DE CIENCIAS E INGENIERÍAS', {
      x: 14,
      y: headerY + 24,
      size: 7,
      font: fontBold,
      color: rgb(0.96, 0.75, 0.77),
    })

    page.drawText('ACREDITACIÓN OFICIAL DE EVENTO', {
      x: 14,
      y: headerY + 11,
      size: 5.5,
      font: fontRegular,
      color: rgb(0.76, 0.84, 0.95),
    })
  }

  // =========================================================================
  // 2. FRANJA CON EL NOMBRE DEL EVENTO (COLOR SECUNDARIO)
  // =========================================================================
  const franjaRojaH = 34
  const franjaRojaY = headerY - franjaRojaH

  page.drawRectangle({
    x: 0,
    y: franjaRojaY,
    width,
    height: franjaRojaH,
    color: colorSecundario,
  })

  // Nombre del Evento dentro de la franja roja
  const eventoNombre = datos.eventoTitulo.toUpperCase()
  const eventoNombreCorto =
    eventoNombre.length > 55 ? eventoNombre.substring(0, 52) + '...' : eventoNombre

  if (eventoNombreCorto.length > 30) {
    const mitad = eventoNombreCorto.lastIndexOf(' ', 28)
    const linea1 = eventoNombreCorto.substring(0, mitad !== -1 ? mitad : 28)
    const linea2 = eventoNombreCorto.substring(mitad !== -1 ? mitad + 1 : 28)

    const w1 = fontBold.widthOfTextAtSize(linea1, 8)
    const w2 = fontBold.widthOfTextAtSize(linea2, 8)

    page.drawText(linea1, {
      x: (width - w1) / 2,
      y: franjaRojaY + 19,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
    page.drawText(linea2, {
      x: (width - w2) / 2,
      y: franjaRojaY + 8,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
  } else {
    const w = fontBold.widthOfTextAtSize(eventoNombreCorto, 8.5)
    page.drawText(eventoNombreCorto, {
      x: (width - w) / 2,
      y: franjaRojaY + 13,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
  }

  // =========================================================================
  // 3. IMAGEN CENTRAL ALUSIVA AL EVENTO (Reemplaza la bonificación)
  // =========================================================================
  const centralImgH = 68
  const centralImgY = franjaRojaY - centralImgH - 6
  const centralImgW = width - 20
  const centralImgX = 10

  const imagenCentral =
    (await cargarImagenSegura(pdfDoc, datos.eventoImagenCentralUrl)) ||
    (await cargarImagenSegura(pdfDoc, datos.eventoLogoFondoUrl))

  if (imagenCentral) {
    page.drawImage(imagenCentral, {
      x: centralImgX,
      y: centralImgY,
      width: centralImgW,
      height: centralImgH,
    })

    // Marco protector sutil
    page.drawRectangle({
      x: centralImgX,
      y: centralImgY,
      width: centralImgW,
      height: centralImgH,
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    })
  } else {
    // Cuadro temático de evento en caso de no tener imagen
    page.drawRectangle({
      x: centralImgX,
      y: centralImgY,
      width: centralImgW,
      height: centralImgH,
      color: rgb(0.92, 0.95, 0.98),
      borderColor: rgb(0.76, 0.84, 0.94),
      borderWidth: 1,
    })

    const txtArea = 'FACULTAD DE INGENIERÍAS'
    const txtAreaW = fontBold.widthOfTextAtSize(txtArea, 7.5)
    page.drawText(txtArea, {
      x: (width - txtAreaW) / 2,
      y: centralImgY + 38,
      size: 7.5,
      font: fontBold,
      color: rgb(0.043, 0.188, 0.357),
    })

    const txtDesc = 'Innovación Tecnológica e Investigación'
    const txtDescW = fontRegular.widthOfTextAtSize(txtDesc, 6.5)
    page.drawText(txtDesc, {
      x: (width - txtDescW) / 2,
      y: centralImgY + 24,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    })
  }

  // =========================================================================
  // 4. RECUADRO BLANCO PARA DATOS DEL ALUMNO (CARNET CARD)
  // Nombre, Cédula, Semestre y Código de Barras (Sin bonificación)
  // =========================================================================
  const cardW = width - 18
  const cardX = 9
  const cardY = 54
  const cardH = centralImgY - cardY - 6

  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.82, 0.86, 0.92),
    borderWidth: 1,
  })

  // Tag "ESTUDIANTE / PARTICIPANTE"
  const tagRol = 'ESTUDIANTE / PARTICIPANTE'
  const tagRolW = fontBold.widthOfTextAtSize(tagRol, 6.5)
  page.drawText(tagRol, {
    x: (width - tagRolW) / 2,
    y: cardY + cardH - 14,
    size: 6.5,
    font: fontBold,
    color: colorPrimario,
  })

  // Nombre Completo del Alumno (Grande y Destacado)
  const nombreMayus = datos.alumnoNombre.toUpperCase()
  let tamanoNombre = 11.5
  if (nombreMayus.length > 25) tamanoNombre = 10
  if (nombreMayus.length > 32) tamanoNombre = 8.5

  const nombreW = fontBold.widthOfTextAtSize(nombreMayus, tamanoNombre)
  page.drawText(nombreMayus, {
    x: (width - nombreW) / 2,
    y: cardY + cardH - 28,
    size: tamanoNombre,
    font: fontBold,
    color: colorPrimario,
  })

  // Cédula del Alumno en Color Secundario
  const cedulaMostrar = datos.alumnoCedula || datos.alumnoCodigo || '1000000000'
  const cedulaTexto = `CÉDULA: ${cedulaMostrar}`
  const cedulaW = fontBold.widthOfTextAtSize(cedulaTexto, 8.5)
  page.drawText(cedulaTexto, {
    x: (width - cedulaW) / 2,
    y: cardY + cardH - 41,
    size: 8.5,
    font: fontBold,
    color: colorSecundario,
  })

  // Carrera y Semestre
  const semestreTexto = datos.alumnoSemestre ? datos.alumnoSemestre : 'Semestre en Curso'
  const carreraTexto = datos.alumnoCarrera || 'Ingeniería'
  const infoAcademica = `${carreraTexto} • ${semestreTexto}`
  const infoAcademicaW = fontRegular.widthOfTextAtSize(infoAcademica, 7)
  page.drawText(infoAcademica, {
    x: (width - infoAcademicaW) / 2,
    y: cardY + cardH - 53,
    size: 7,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.55),
  })

  // Línea divisoria dentro de la tarjeta
  page.drawLine({
    start: { x: cardX + 16, y: cardY + cardH - 60 },
    end: { x: cardX + cardW - 16, y: cardY + cardH - 60 },
    thickness: 0.6,
    color: rgb(0.88, 0.9, 0.94),
  })

  // Código de Barras (Code-128) con número de cédula para escaneo físico en puerta
  const valorBarcode = datos.alumnoCodigo || datos.alumnoCedula || '00000000'
  const barcodeY = cardY + 12

  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: valorBarcode,
      scale: 3,
      height: 10,
      includetext: false,
      textxalign: 'center',
    })

    const barcodeImg = await pdfDoc.embedPng(pngBuffer)
    const barcodeW = 140
    const barcodeH = 26

    page.drawImage(barcodeImg, {
      x: (width - barcodeW) / 2,
      y: barcodeY + 8,
      width: barcodeW,
      height: barcodeH,
    })

    const textoPie = `* ${valorBarcode} *`
    const textoPieW = fontMono.widthOfTextAtSize(textoPie, 6.5)
    page.drawText(textoPie, {
      x: (width - textoPieW) / 2,
      y: barcodeY,
      size: 6.5,
      font: fontMono,
      color: rgb(0.3, 0.35, 0.45),
    })
  } catch (err) {
    console.error('Error al generar código de barras en escarapela:', err)
  }

  // =========================================================================
  // 5. FRANJA DE PATROCINADORES ABAJO (SPONSORS STRIP)
  // =========================================================================
  const sponsorsH = 48
  const sponsorsY = 0

  page.drawRectangle({
    x: 0,
    y: sponsorsY,
    width,
    height: sponsorsH,
    color: rgb(0.95, 0.96, 0.98),
  })

  // Línea divisoria superior de patrocinadores con acento rojo Unisinú
  page.drawLine({
    start: { x: 0, y: sponsorsH },
    end: { x: width, y: sponsorsH },
    thickness: 1.5,
    color: rgb(0.824, 0.125, 0.180), // #D2202E
  })

  // Título de la sección de patrocinadores
  const txtSponsors = 'PATROCINADORES OFICIALES'
  const txtSponsorsW = fontBold.widthOfTextAtSize(txtSponsors, 5.5)
  page.drawText(txtSponsors, {
    x: (width - txtSponsorsW) / 2,
    y: sponsorsH - 8,
    size: 5.5,
    font: fontBold,
    color: rgb(0.4, 0.45, 0.55),
  })

  // Cargar imagen de patrocinadores si está presente
  const sponsorsImg = await cargarImagenSegura(pdfDoc, datos.eventoSponsorsUrl)

  if (sponsorsImg) {
    page.drawImage(sponsorsImg, {
      x: 10,
      y: 4,
      width: width - 20,
      height: sponsorsH - 15,
    })
  } else {
    // Logos oficiales por defecto
    const marcas = ['IEEE UNISINÚ', 'AWS ACADEMY', 'MICROSOFT LEARN', 'I+D+i']
    const espacio = width / marcas.length
    marcas.forEach((marca, i) => {
      const bX = i * espacio + 5
      page.drawRectangle({
        x: bX,
        y: 6,
        width: espacio - 10,
        height: 26,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 0.5,
      })

      const mW = fontBold.widthOfTextAtSize(marca, 4.8)
      page.drawText(marca, {
        x: bX + (espacio - 10 - mW) / 2,
        y: 17,
        size: 4.8,
        font: fontBold,
        color: rgb(0.043, 0.188, 0.357), // #0B305B
      })
    })
  }

  // Marco perimetral del carnet
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    borderColor: rgb(0.043, 0.188, 0.357),
    borderWidth: 1.5,
  })

  return await pdfDoc.save()
}
