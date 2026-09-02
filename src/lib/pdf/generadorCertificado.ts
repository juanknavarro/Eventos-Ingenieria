import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib'
import bwipjs from 'bwip-js'
import fs from 'fs'
import path from 'path'
import { hexToRgbColor } from '@/lib/config/plantillas'

export interface DatosCertificado {
  asistenciaId: string
  alumnoNombre: string
  alumnoCodigo: string
  alumnoCarrera: string
  eventoTitulo: string
  eventoUbicacion: string
  eventoFecha: Date | string
  organizadorNombre: string
  fechaRegistroAsistencia: Date | string
  colorPrimarioHex?: string | null
  colorSecundarioHex?: string | null
  logoUniversidadUrl?: string | null
  firmaDecanoUrl?: string | null
  nombreDecano?: string | null
  cargoFirmante?: string | null
}

/**
 * Carga de forma segura imágenes locales o remotas para pdf-lib
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

export async function generarPdfCertificado(datos: DatosCertificado): Promise<Uint8Array> {
  // A4 Horizontal (Landscape): 842 x 595 puntos tipográficos
  const width = 842
  const height = 595

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([width, height])

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier)

  // Colores dinámicos desde la configuración global
  const colorPrimario = hexToRgbColor(datos.colorPrimarioHex, rgb(0.043, 0.188, 0.357)) // #0B305B
  const colorSecundario = hexToRgbColor(datos.colorSecundarioHex, rgb(0.824, 0.125, 0.180)) // #D2202E

  // 1. Fondo elegante marfil
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.99, 0.99, 0.98),
  })

  // 2. Marcos ornamentales de seguridad institucional Unisinú
  // Marco exterior (Color Primario)
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: colorPrimario,
    borderWidth: 3,
  })

  // Marco interior (Color Secundario)
  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: colorSecundario,
    borderWidth: 1.5,
  })

  // Cargar logo institucional si está configurado
  const logoUni =
    (await cargarImagenSegura(pdfDoc, datos.logoUniversidadUrl)) ||
    (await cargarImagenSegura(pdfDoc, path.join(process.cwd(), 'public', 'imagen_2.png')))

  if (logoUni) {
    const imgAspect = logoUni.width / logoUni.height
    const logoH = 36
    const logoW = Math.min(Math.round(logoH * imgAspect), 170)
    page.drawImage(logoUni, {
      x: (width - logoW) / 2,
      y: height - 72,
      width: logoW,
      height: logoH,
    })
  }

  // 3. Encabezado Institucional Unisinú
  const textoUniversidadLimpio = 'UNIVERSIDAD DEL SINÚ'
  const textUniWidth = fontBold.widthOfTextAtSize(textoUniversidadLimpio, 13)
  page.drawText(textoUniversidadLimpio, {
    x: (width - textUniWidth) / 2,
    y: height - (logoUni ? 84 : 65),
    size: 13,
    font: fontBold,
    color: colorSecundario,
  })

  const textoFacultadLimpio = 'FACULTAD DE CIENCIAS E INGENIERÍAS'
  const textFacultadWidth = fontBold.widthOfTextAtSize(textoFacultadLimpio, 11)
  page.drawText(textoFacultadLimpio, {
    x: (width - textFacultadWidth) / 2,
    y: height - (logoUni ? 98 : 80),
    size: 11,
    font: fontBold,
    color: colorPrimario,
  })

  // Línea divisoria decorativa
  const lineaY = height - (logoUni ? 108 : 92)
  page.drawLine({
    start: { x: (width - 240) / 2, y: lineaY },
    end: { x: (width + 240) / 2, y: lineaY },
    thickness: 1.5,
    color: colorSecundario,
  })

  // 4. Título Principal del Certificado
  const tituloCertificado = 'CERTIFICADO DE ASISTENCIA'
  const tituloWidth = fontBold.widthOfTextAtSize(tituloCertificado, 25)
  page.drawText(tituloCertificado, {
    x: (width - tituloWidth) / 2,
    y: height - 150,
    size: 25,
    font: fontBold,
    color: colorPrimario,
  })

  // 5. Cuerpo del Certificado
  const textoOtorga = 'La Decanatura y el Comité Académico de la Facultad de Ciencias e Ingenierías'
  const otorgaWidth = fontRegular.widthOfTextAtSize(textoOtorga, 12)
  page.drawText(textoOtorga, {
    x: (width - otorgaWidth) / 2,
    y: height - 182,
    size: 12,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  })

  const textoCertifica = 'CERTIFICA LA ASISTENCIA DE'
  const certificaWidth = fontBold.widthOfTextAtSize(textoCertifica, 14.5)
  page.drawText(textoCertifica, {
    x: (width - certificaWidth) / 2,
    y: height - 210,
    size: 14.5,
    font: fontBold,
    color: colorSecundario,
  })

  // Nombre del Alumno
  const nombreAlumno = datos.alumnoNombre.toUpperCase()
  const nombreWidth = fontBold.widthOfTextAtSize(nombreAlumno, 23)
  page.drawText(nombreAlumno, {
    x: (width - nombreWidth) / 2,
    y: height - 248,
    size: 23,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.2),
  })

  // Línea bajo el nombre
  page.drawLine({
    start: { x: (width - Math.max(nombreWidth + 40, 300)) / 2, y: height - 256 },
    end: { x: (width + Math.max(nombreWidth + 40, 300)) / 2, y: height - 256 },
    thickness: 1.5,
    color: colorPrimario,
  })

  // Documento y Carrera
  const textoDocumento = `Identificado(a) con documento/código: ${datos.alumnoCodigo || 'N/A'} - Programa: ${datos.alumnoCarrera || 'Ingeniería'}`
  const docWidth = fontRegular.widthOfTextAtSize(textoDocumento, 10.5)
  page.drawText(textoDocumento, {
    x: (width - docWidth) / 2,
    y: height - 274,
    size: 10.5,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.5),
  })

  // Texto del Evento
  const parrafo1 = `Por su participación y asistencia presencial al evento académico:`
  const p1Width = fontRegular.widthOfTextAtSize(parrafo1, 11.5)
  page.drawText(parrafo1, {
    x: (width - p1Width) / 2,
    y: height - 308,
    size: 11.5,
    font: fontRegular,
    color: rgb(0.25, 0.3, 0.4),
  })

  const eventoTitulo = `"${datos.eventoTitulo}"`
  const eventoWidth = fontBold.widthOfTextAtSize(eventoTitulo, 15.5)
  page.drawText(eventoTitulo, {
    x: (width - eventoWidth) / 2,
    y: height - 335,
    size: 15.5,
    font: fontBold,
    color: colorPrimario,
  })

  const parrafo2 = `Desarrollado en ${datos.eventoUbicacion || 'Campus Universitario'} con validez académica institucional.`
  const p2Width = fontOblique.widthOfTextAtSize(parrafo2, 10)
  page.drawText(parrafo2, {
    x: (width - p2Width) / 2,
    y: height - 358,
    size: 10,
    font: fontOblique,
    color: rgb(0.4, 0.45, 0.55),
  })

  // 6. Firmas Institucionales Dinámicas
  const yFirmas = 110
  const yLineas = 145

  // Cargar firma escaneada del decano si fue configurada
  const firmaDecanoImg = await cargarImagenSegura(pdfDoc, datos.firmaDecanoUrl)
  if (firmaDecanoImg) {
    const firmaW = 90
    const firmaH = 40
    page.drawImage(firmaDecanoImg, {
      x: 175,
      y: yLineas + 2,
      width: firmaW,
      height: firmaH,
    })
  }

  // Firma 1: Decano de Ingenierías (Dinámico)
  page.drawLine({
    start: { x: 120, y: yLineas },
    end: { x: 320, y: yLineas },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  })

  const decanoNombreTexto = datos.nombreDecano || 'Ing. Roberto Gómez'
  const decanoNombreWidth = fontBold.widthOfTextAtSize(decanoNombreTexto, 11)
  page.drawText(decanoNombreTexto, {
    x: 220 - decanoNombreWidth / 2,
    y: yFirmas + 20,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  })

  const cargoTexto = datos.cargoFirmante || 'Decano de Ingenierías'
  const cargoWidth = fontRegular.widthOfTextAtSize(cargoTexto, 9)
  page.drawText(cargoTexto, {
    x: 220 - cargoWidth / 2,
    y: yFirmas + 8,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.55),
  })

  // Firma 2: Coordinador / Docente Organizador
  page.drawLine({
    start: { x: width - 320, y: yLineas },
    end: { x: width - 120, y: yLineas },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  })

  const nombreOrg = datos.organizadorNombre || 'Dr. Carlos Mendoza'
  const orgWidth = fontBold.widthOfTextAtSize(nombreOrg, 11)
  page.drawText(nombreOrg, {
    x: width - 220 - orgWidth / 2,
    y: yFirmas + 20,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  })

  const cargoOrg = 'Comité Organizador Docente'
  const cargoOrgW = fontRegular.widthOfTextAtSize(cargoOrg, 9)
  page.drawText(cargoOrg, {
    x: width - 220 - cargoOrgW / 2,
    y: yFirmas + 8,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.55),
  })

  // 7. QR de Verificación y Serial de Autenticidad
  try {
    const qrPng = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: `https://facultad.edu.co/certificados/verificar?id=${datos.asistenciaId}`,
      scale: 2,
      width: 15,
      height: 15,
    })

    const qrImage = await pdfDoc.embedPng(qrPng)
    page.drawImage(qrImage, {
      x: (width - 46) / 2,
      y: 75,
      width: 46,
      height: 46,
    })
  } catch (err) {
    console.error('Error al generar QR de certificado:', err)
  }

  // Folio y Pie de Página
  const serialTexto = `SERIAL: UNISINU-CERT-${datos.asistenciaId.toUpperCase()} • EXPEDIDO: ${new Date().toLocaleDateString('es-CO')}`
  const serialWidth = fontMono.widthOfTextAtSize(serialTexto, 7)
  page.drawText(serialTexto, {
    x: (width - serialWidth) / 2,
    y: 42,
    size: 7,
    font: fontMono,
    color: rgb(0.5, 0.55, 0.65),
  })

  return await pdfDoc.save()
}
