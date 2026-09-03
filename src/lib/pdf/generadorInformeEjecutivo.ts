import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { hexToRgbColor } from '@/lib/config/plantillas'

export interface DatosInformeEjecutivo {
  tituloEvento: string
  rangoFechas: string
  ubicacion: string
  totalRecaudado: number
  totalInscritos: number
  totalAsistentes: number
  tasaAsistencia: number
  recaudoPorProfesor: {
    nombre: string
    inscritos: number
    totalRecaudado: number
  }[]
  inscritosPorCarrera: {
    carrera: string
    total: number
    porcentaje: number
  }[]
  nombreAdmin: string
  nombreDecano: string
  cargoFirmante: string
  colorPrimarioHex?: string
  colorSecundarioHex?: string
  logoUrl?: string | null
}

async function cargarImagenSegura(pdfDoc: PDFDocument, fuente: string | null | undefined) {
  if (!fuente) return null

  try {
    let bytes: Uint8Array | null = null

    if (fuente.startsWith('http://') || fuente.startsWith('https://')) {
      const resp = await fetch(fuente, { signal: AbortSignal.timeout(4000) })
      if (resp.ok) {
        const arrayBuffer = await resp.arrayBuffer()
        bytes = new Uint8Array(arrayBuffer)
      }
    } else {
      const rutaRelativa = fuente.startsWith('/') ? fuente.slice(1) : fuente
      const rutaAbsoluta = path.join(process.cwd(), 'public', rutaRelativa)
      if (fs.existsSync(rutaAbsoluta)) {
        bytes = new Uint8Array(fs.readFileSync(rutaAbsoluta))
      }
    }

    if (bytes) {
      try {
        return await pdfDoc.embedPng(bytes)
      } catch {
        return await pdfDoc.embedJpg(bytes)
      }
    }
  } catch (err) {
    console.warn(`[Informe PDF] No se pudo cargar imagen desde ${fuente}:`, err)
  }
  return null
}

export async function generarPdfInformeEjecutivo(datos: DatosInformeEjecutivo): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  // Formato A4 Vertical Estándar (595.28 x 841.89 pt)
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const cPrimario = hexToRgbColor(datos.colorPrimarioHex, rgb(11 / 255, 48 / 255, 91 / 255))
  const cSecundario = hexToRgbColor(datos.colorSecundarioHex, rgb(210 / 255, 32 / 255, 46 / 255))

  // =========================================================================
  // 1. CABECERA INSTITUCIONAL SUPERIOR
  // =========================================================================
  const alturaHeader = 80
  page.drawRectangle({
    x: 0,
    y: height - alturaHeader,
    width,
    height: alturaHeader,
    color: cPrimario,
  })

  // Franja institucional roja
  page.drawRectangle({
    x: 0,
    y: height - alturaHeader - 4,
    width,
    height: 4,
    color: cSecundario,
  })

  // Cargar logo institucional oficial
  const logoImage = await cargarImagenSegura(pdfDoc, datos.logoUrl || '/imagen_2.png')
  if (logoImage) {
    const escala = Math.min(130 / logoImage.width, 48 / logoImage.height)
    const logoW = logoImage.width * escala
    const logoH = logoImage.height * escala
    page.drawImage(logoImage, {
      x: 35,
      y: height - alturaHeader + (alturaHeader - logoH) / 2,
      width: logoW,
      height: logoH,
    })
  }

  // Textos de cabecera
  page.drawText('UNIVERSIDAD DEL SINÚ', {
    x: 180,
    y: height - 32,
    size: 13,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  })
  page.drawText('FACULTAD DE CIENCIAS E INGENIERÍAS — SECCIONAL CARTAGENA', {
    x: 180,
    y: height - 46,
    size: 7.5,
    font: helvetica,
    color: rgb(0.85, 0.9, 0.95),
  })
  page.drawText('SISTEMA INTEGRADO DE AUDITORÍA Y GESTIÓN DE EVENTOS', {
    x: 180,
    y: height - 60,
    size: 7.5,
    font: helveticaBold,
    color: rgb(1, 0.8, 0.82),
  })

  // =========================================================================
  // 2. METADATOS DEL INFORME Y FECHA DE EMISIÓN
  // =========================================================================
  let curY = height - alturaHeader - 30

  page.drawText('INFORME EJECUTIVO DE GESTIÓN Y RECAUDO', {
    x: 35,
    y: curY,
    size: 14,
    font: helveticaBold,
    color: cPrimario,
  })

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  page.drawText(`Fecha de Emisión: ${fechaHoy}`, {
    x: width - 200,
    y: curY + 2,
    size: 8,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  })

  curY -= 20
  page.drawText(`Alcance: ${datos.tituloEvento}`, {
    x: 35,
    y: curY,
    size: 9.5,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.25),
  })

  curY -= 14
  page.drawText(`Ubicación / Auditorio: ${datos.ubicacion}   |   Periodo: ${datos.rangoFechas}`, {
    x: 35,
    y: curY,
    size: 8,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  })

  // Línea divisoria sutil
  curY -= 12
  page.drawLine({
    start: { x: 35, y: curY },
    end: { x: width - 35, y: curY },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  })

  // =========================================================================
  // 3. TARJETAS DE KPIS PRINCIPALES (4 COLUMNAS)
  // =========================================================================
  curY -= 18
  const kpiWidth = (width - 70 - 30) / 4
  const kpiHeight = 52

  const kpis = [
    {
      titulo: 'TOTAL RECAUDADO',
      valor: `$${datos.totalRecaudado.toLocaleString('es-CO')} COP`,
      colorValor: cSecundario,
    },
    {
      titulo: 'TOTAL INSCRITOS',
      valor: `${datos.totalInscritos} Alumnos`,
      colorValor: cPrimario,
    },
    {
      titulo: 'ASISTENTES REALES',
      valor: `${datos.totalAsistentes} Confirmados`,
      colorValor: rgb(0.05, 0.55, 0.35),
    },
    {
      titulo: 'EFECTIVIDAD ASISTENCIA',
      valor: `${datos.tasaAsistencia.toFixed(1)}%`,
      colorValor: rgb(0.2, 0.25, 0.3),
    },
  ]

  kpis.forEach((kpi, idx) => {
    const kpiX = 35 + idx * (kpiWidth + 10)

    // Caja de fondo
    page.drawRectangle({
      x: kpiX,
      y: curY - kpiHeight,
      width: kpiWidth,
      height: kpiHeight,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    })

    page.drawText(kpi.titulo, {
      x: kpiX + 10,
      y: curY - 16,
      size: 6.5,
      font: helveticaBold,
      color: rgb(0.4, 0.45, 0.5),
    })

    page.drawText(kpi.valor, {
      x: kpiX + 10,
      y: curY - 36,
      size: 10,
      font: helveticaBold,
      color: kpi.colorValor,
    })
  })

  curY -= kpiHeight + 25

  // =========================================================================
  // 4. TABLA 1: DESGLOSE FINANCIERO POR DOCENTE RECAUDADOR
  // =========================================================================
  page.drawText('1. DESGLOSE FINANCIERO POR DOCENTE RECAUDADOR', {
    x: 35,
    y: curY,
    size: 9.5,
    font: helveticaBold,
    color: cPrimario,
  })

  curY -= 14
  // Encabezado de tabla
  page.drawRectangle({
    x: 35,
    y: curY - 16,
    width: width - 70,
    height: 18,
    color: cPrimario,
  })

  page.drawText('DOCENTE / RESPONSABLE', { x: 45, y: curY - 11, size: 7, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('ALUMNOS GESTIONADOS', { x: 260, y: curY - 11, size: 7, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('TOTAL RECAUDADO (COP)', { x: 380, y: curY - 11, size: 7, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('% DEL TOTAL', { x: 495, y: curY - 11, size: 7, font: helveticaBold, color: rgb(1, 1, 1) })

  curY -= 18

  if (datos.recaudoPorProfesor.length === 0) {
    page.drawText('No se registraron recaudos por docentes para este evento.', {
      x: 45,
      y: curY - 12,
      size: 7.5,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })
    curY -= 18
  } else {
    datos.recaudoPorProfesor.forEach((item, index) => {
      const esPar = index % 2 === 0
      if (esPar) {
        page.drawRectangle({
          x: 35,
          y: curY - 14,
          width: width - 70,
          height: 16,
          color: rgb(0.97, 0.98, 1),
        })
      }

      const porcentaje = datos.totalRecaudado > 0 ? (item.totalRecaudado / datos.totalRecaudado) * 100 : 0

      page.drawText(item.nombre.length > 38 ? `${item.nombre.slice(0, 38)}...` : item.nombre, {
        x: 45,
        y: curY - 10,
        size: 7.5,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.25),
      })
      page.drawText(`${item.inscritos} alumnos`, {
        x: 260,
        y: curY - 10,
        size: 7.5,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      })
      page.drawText(`$${item.totalRecaudado.toLocaleString('es-CO')}`, {
        x: 380,
        y: curY - 10,
        size: 7.5,
        font: helveticaBold,
        color: rgb(0.05, 0.5, 0.3),
      })
      page.drawText(`${porcentaje.toFixed(1)}%`, {
        x: 495,
        y: curY - 10,
        size: 7.5,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      })

      curY -= 16
    })
  }

  curY -= 15

  // =========================================================================
  // 5. TABLA 2: DISTRIBUCIÓN POR PROGRAMA ACADÉMICO
  // =========================================================================
  page.drawText('2. DISTRIBUCIÓN DE PARTICIPACIÓN POR PROGRAMA ACADÉMICO', {
    x: 35,
    y: curY,
    size: 9.5,
    font: helveticaBold,
    color: cPrimario,
  })

  curY -= 14
  page.drawRectangle({
    x: 35,
    y: curY - 16,
    width: width - 70,
    height: 18,
    color: cPrimario,
  })

  page.drawText('PROGRAMA ACADÉMICO / CARRERA', { x: 45, y: curY - 11, size: 7, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('TOTAL INSCRITOS', { x: 340, y: curY - 11, size: 7, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('% DE PARTICIPACIÓN', { x: 460, y: curY - 11, size: 7, font: helveticaBold, color: rgb(1, 1, 1) })

  curY -= 18

  datos.inscritosPorCarrera.forEach((item, index) => {
    const esPar = index % 2 === 0
    if (esPar) {
      page.drawRectangle({
        x: 35,
        y: curY - 14,
        width: width - 70,
        height: 16,
        color: rgb(0.97, 0.98, 1),
      })
    }

    page.drawText(item.carrera, {
      x: 45,
      y: curY - 10,
      size: 7.5,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.25),
    })
    page.drawText(`${item.total} alumnos`, {
      x: 340,
      y: curY - 10,
      size: 7.5,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    })
    page.drawText(`${item.porcentaje.toFixed(1)}%`, {
      x: 460,
      y: curY - 10,
      size: 7.5,
      font: helveticaBold,
      color: cSecundario,
    })

    curY -= 16
  })

  // =========================================================================
  // 6. FIRMAS DE AUDITORÍA INSTITUCIONAL AL PIE
  // =========================================================================
  const yFirmas = 100

  // Línea firma izquierda: Decano
  page.drawLine({
    start: { x: 70, y: yFirmas },
    end: { x: 250, y: yFirmas },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  })
  page.drawText(datos.nombreDecano.toUpperCase(), {
    x: 80,
    y: yFirmas - 14,
    size: 8,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.2),
  })
  page.drawText(datos.cargoFirmante, {
    x: 80,
    y: yFirmas - 24,
    size: 7,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  })

  // Línea firma derecha: Administrador del Sistema
  page.drawLine({
    start: { x: width - 250, y: yFirmas },
    end: { x: width - 70, y: yFirmas },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  })
  page.drawText(datos.nombreAdmin.toUpperCase(), {
    x: width - 240,
    y: yFirmas - 14,
    size: 8,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.2),
  })
  page.drawText('Administrador del Sistema y Auditoría', {
    x: width - 240,
    y: yFirmas - 24,
    size: 7,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  })

  // Franja inferior de cierre
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 24,
    color: cPrimario,
  })

  page.drawText('Documento generado automáticamente por el Sistema de Eventos de la Facultad de Ciencias e Ingenierías - Unisinú', {
    x: 45,
    y: 8,
    size: 6.5,
    font: helvetica,
    color: rgb(1, 1, 1),
  })

  return await pdfDoc.save()
}
