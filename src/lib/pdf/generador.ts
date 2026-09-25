import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib'

export interface DatosGeneracionCertificado {
  alumnoNombre: string
  alumnoDocumento: string
  alumnoCarrera?: string | null
  eventoTitulo: string
  horasAcademicas?: number | null
  intensidadHoraria?: string | null
  mensajeParticipacion?: string | null
  fechaEvento?: Date | string | null
  fondoUrl?: string | null
  firmaDecanoUrl?: string | null
  nombreDecano?: string | null
  cargoDecano?: string | null
  nombreFirmante1?: string | null
  cargoFirmante1?: string | null
  firmaOrganizadorUrl?: string | null
  firmaDirectorUrl?: string | null
  nombreFirmante2?: string | null
  cargoFirmante2?: string | null
  asistenciaId?: string | null
  // Nuevos estilos visuales y tipografía
  fuenteCertificado?: string | null
  colorNombreAlumno?: string | null
  colorTextoPrincipal?: string | null
  tamanoNombreAlumno?: number | null
  tamanoParticipacion?: number | null
  colorFirmantes?: string | null
}

/**
 * Convierte un código hexadecimal (#RRGGBB o RRGGBB) a formato rgb() normalizado (0.0 a 1.0) de pdf-lib
 */
export function parsearHexARgb(hex?: string | null, fallback = rgb(0.043, 0.188, 0.357)) {
  if (!hex || typeof hex !== 'string') return fallback
  const clean = hex.trim().replace(/^#/, '')
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return fallback
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  return rgb(r, g, b)
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

  // Cargar fuentes tipográficas con regla de mapeo seguro:
  // Si elige 'Times' o 'Playfair', StandardFonts.TimesRoman. De lo contrario, StandardFonts.Helvetica
  const fuenteSolicitada = (datos.fuenteCertificado || '').toLowerCase()
  const esSerif = fuenteSolicitada.includes('times') || fuenteSolicitada.includes('playfair')

  const fontBold = await pdfDoc.embedFont(esSerif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(esSerif ? StandardFonts.TimesRoman : StandardFonts.Helvetica)
  const fontOblique = await pdfDoc.embedFont(esSerif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique)
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier)

  // Paleta institucional Unisinú (Valores base de respaldo)
  const colorAzulMarino = rgb(0.043, 0.188, 0.357) // #0B305B
  const colorRojo = rgb(0.824, 0.125, 0.180) // #D2202E
  const colorOscuro = rgb(0.06, 0.09, 0.16) // #0F172A
  const colorGris = rgb(0.32, 0.38, 0.46) // #526176
  const colorBorde = rgb(0.78, 0.82, 0.88)

  // Colores dinámicos configurados por evento con fallback seguro
  const colorNombreAlumnoRgb = parsearHexARgb(datos.colorNombreAlumno, colorAzulMarino)
  const colorTextoPrincipalRgb = parsearHexARgb(datos.colorTextoPrincipal, colorOscuro)
  const colorFirmantesRgb = parsearHexARgb(datos.colorFirmantes, colorOscuro)

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

  // 3. Nombre del Alumno (Centrado horizontal matemático en X con tamaño y color dinámicos)
  const nombreLimpio = (datos.alumnoNombre || 'ESTUDIANTE UNISINÚ').toUpperCase().trim()
  const tamanoBaseAlumno = Number(datos.tamanoNombreAlumno) > 0 ? Number(datos.tamanoNombreAlumno) : 24
  let sizeNombre = nombreLimpio.length > 32 ? Math.min(tamanoBaseAlumno - 4, 20) : tamanoBaseAlumno
  let wNombre = fontBold.widthOfTextAtSize(nombreLimpio, sizeNombre)
  if (wNombre > width - 100) {
    sizeNombre = Math.max(16, (sizeNombre * (width - 100)) / wNombre)
    wNombre = fontBold.widthOfTextAtSize(nombreLimpio, sizeNombre)
  }
  page.drawText(nombreLimpio, {
    x: (width - wNombre) / 2,
    y: 320,
    size: sizeNombre,
    font: fontBold,
    color: colorNombreAlumnoRgb,
  })

  // Línea sutil de realce bajo el nombre con color dinámico
  const anchoLineaNombre = Math.min(Math.max(wNombre + 50, 320), width - 120)
  page.drawLine({
    start: { x: (width - anchoLineaNombre) / 2, y: 312 },
    end: { x: (width + anchoLineaNombre) / 2, y: 312 },
    thickness: 1.5,
    color: colorNombreAlumnoRgb,
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

  // 5. Declaración de participación dinámico con tamaño y color configurables
  const txtParticipacion = (datos.mensajeParticipacion && datos.mensajeParticipacion.trim())
    ? datos.mensajeParticipacion.trim()
    : 'Por su asistencia, cumplimiento y destacada participación académica en el evento:'
  let sizePart = Number(datos.tamanoParticipacion) > 0 ? Number(datos.tamanoParticipacion) : 11.5
  let wPart = fontRegular.widthOfTextAtSize(txtParticipacion, sizePart)
  if (wPart > width - 120) {
    sizePart = Math.max(9, (sizePart * (width - 120)) / wPart)
    wPart = fontRegular.widthOfTextAtSize(txtParticipacion, sizePart)
  }
  page.drawText(txtParticipacion, {
    x: (width - wPart) / 2,
    y: 258,
    size: sizePart,
    font: fontRegular,
    color: colorTextoPrincipalRgb,
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
    color: colorNombreAlumnoRgb,
  })

  // 7. Horas Académicas / Intensidad Horaria y Fecha de Emisión dinámicas con fallback
  const horas = datos.horasAcademicas && datos.horasAcademicas > 0 ? datos.horasAcademicas : 4
  const fechaFormateada = formatearFechaEspanol(datos.fechaEvento)

  const txtHorasYFecha = (datos.intensidadHoraria && datos.intensidadHoraria.trim())
    ? (datos.intensidadHoraria.trim().toLowerCase().startsWith('con ')
        ? datos.intensidadHoraria.trim()
        : `Con una intensidad académica debidamente certificada de ${datos.intensidadHoraria.trim()}.`)
    : `Con una intensidad académica debidamente certificada de ${horas} horas de formación continua.`

  let sizeHoras = 10.5
  let wHoras = fontRegular.widthOfTextAtSize(txtHorasYFecha, sizeHoras)
  if (wHoras > width - 120) {
    sizeHoras = Math.max(8.5, (sizeHoras * (width - 120)) / wHoras)
    wHoras = fontRegular.widthOfTextAtSize(txtHorasYFecha, sizeHoras)
  }
  page.drawText(txtHorasYFecha, {
    x: (width - wHoras) / 2,
    y: 198,
    size: sizeHoras,
    font: fontRegular,
    color: colorTextoPrincipalRgb,
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

  // 8. Firmas Institucionales Calibradas (Firma 1 Izquierda y Firma 2 Derecha)
  const yLineasFirmas = 88
  const anchoLineaFirma = 190

  // Coordenadas X de los centros de las dos columnas simétricas
  const centroFirma1 = 230          // Columna Izquierda (Firma 1 / Decanatura o Docente Líder)
  const centroFirma2 = width - 230  // Columna Derecha (Firma 2 / Dirección de Programa o Comité)

  // Datos normalizados Firma 1 (Izquierda) con soporte de configuración por evento y fallback global
  const nombreFirma1 = (datos.nombreFirmante1 || datos.nombreDecano || 'Ing. Roberto Gómez').trim()
  const cargoFirma1 = (datos.cargoFirmante1 || datos.cargoDecano || 'Decano Facultad de Ciencias e Ingenierías').trim()
  const urlFirma1 = datos.firmaOrganizadorUrl || datos.firmaDecanoUrl

  // Datos normalizados Firma 2 (Derecha) con soporte de configuración por evento y fallback institucional
  const nombreFirma2 = (datos.nombreFirmante2 || 'Comité Académico Docente').trim()
  const cargoFirma2 = (datos.cargoFirmante2 || 'Coordinación de Formación Continua').trim()
  const urlFirma2 = datos.firmaDirectorUrl

  // Función utilitaria para estampar cada columna de firma con riguroso centrado matemático
  const estamparFirmaColumna = async (
    centroX: number,
    nombre: string,
    cargo: string,
    firmaUrl?: string | null
  ) => {
    // A. Firma escaneada / digital (centrada horizontalmente respecto al centro de su columna)
    const firmaImg = await cargarEIncrustarImagen(pdfDoc, firmaUrl)
    if (firmaImg) {
      const maxW = 105
      const maxH = 42
      const dims = firmaImg.scale(1)
      const ratio = Math.min(maxW / dims.width, maxH / dims.height, 1)
      const fW = dims.width * ratio
      const fH = dims.height * ratio

      page.drawImage(firmaImg, {
        x: centroX - fW / 2,
        y: yLineasFirmas + 4,
        width: fW,
        height: fH,
      })
    }

    // B. Línea horizontal de firma centrada en su columna
    page.drawLine({
      start: { x: centroX - anchoLineaFirma / 2, y: yLineasFirmas },
      end: { x: centroX + anchoLineaFirma / 2, y: yLineasFirmas },
      thickness: 1,
      color: colorBorde,
    })

    // C. Nombre del firmante centrado en su columna
    let sizeNombre = 10
    let wNombre = fontBold.widthOfTextAtSize(nombre, sizeNombre)
    if (wNombre > anchoLineaFirma + 10) {
      sizeNombre = 8.5
      wNombre = fontBold.widthOfTextAtSize(nombre, sizeNombre)
    }
    page.drawText(nombre, {
      x: centroX - wNombre / 2,
      y: yLineasFirmas - 15,
      size: sizeNombre,
      font: fontBold,
      color: colorFirmantesRgb,
    })

    // D. Cargo del firmante centrado en su columna
    let sizeCargo = 8.5
    let wCargo = fontRegular.widthOfTextAtSize(cargo, sizeCargo)
    if (wCargo > anchoLineaFirma + 20) {
      sizeCargo = 7.5
      wCargo = fontRegular.widthOfTextAtSize(cargo, sizeCargo)
    }
    page.drawText(cargo, {
      x: centroX - wCargo / 2,
      y: yLineasFirmas - 27,
      size: sizeCargo,
      font: fontRegular,
      color: colorFirmantesRgb,
    })
  }

  // Estampar Firma 1 (Izquierda) y Firma 2 (Derecha) perfectamente calibradas en X y en Y
  await estamparFirmaColumna(centroFirma1, nombreFirma1, cargoFirma1, urlFirma1)
  await estamparFirmaColumna(centroFirma2, nombreFirma2, cargoFirma2, urlFirma2)

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
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
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

