import type ExcelJS from 'exceljs'

export interface OpcionesTablaExcel {
  filaEncabezado: number
  encabezados: string[]
  filas: (string | number | null | undefined)[][]
  columnasMoneda?: number[]
  columnasEntero?: number[]
  columnasEstado?: number[]
  inmovilizar?: boolean
  conAutoFiltro?: boolean
  filaTotales?: (string | number | null | undefined)[]
}

const ETIQUETAS_ENUM: Record<string, string> = {
  ESTUDIANTE_ACTIVO: 'Estudiante Activo',
  EGRESADO: 'Egresado',
  EXTERNO: 'Externo',
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CODIGO_BARRAS: 'Código de Barras',
  MANUAL: 'Manual',
  QR: 'QR',
  BIOMETRICO: 'Biométrico',
  GRATUITO: 'Gratuito',
}

/**
 * Traduce valores técnicos de enums de Prisma a etiquetas legibles para reportes ejecutivos.
 */
export function traducirEtiquetaExcel(
  valor?: string | null,
  fallback: string = 'N/A'
): string {
  if (!valor || !valor.trim()) return fallback
  const limpio = valor.trim()
  return ETIQUETAS_ENUM[limpio] ?? limpio
}

/**
 * Crea un libro ExcelJS mediante importación dinámica en el cliente para no inflar el bundle SSR.
 */
export async function crearWorkbookExcel(): Promise<ExcelJS.Workbook> {
  const ExcelJSLib = (await import('exceljs')).default
  const workbook = new ExcelJSLib.Workbook()
  workbook.creator = 'Universidad del Sinú — Facultad de Ciencias e Ingenierías'
  workbook.created = new Date()
  return workbook
}

/**
 * Aplica el banner institucional combinado de 3 filas en la cabecera de la hoja.
 */
export function aplicarBannerInstitucional(
  sheet: ExcelJS.Worksheet,
  tituloReporte: string,
  subtituloReporte: string,
  totalColumnas: number
): void {
  const cols = Math.max(1, totalColumnas)

  // Fila 1: Nombre Institucional
  const row1 = sheet.getRow(1)
  row1.getCell(1).value = 'UNIVERSIDAD DEL SINÚ — FACULTAD DE CIENCIAS E INGENIERÍAS'
  row1.height = 28
  sheet.mergeCells(1, 1, 1, cols)
  const cell1 = row1.getCell(1)
  cell1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  }
  cell1.font = {
    name: 'Calibri',
    size: 13,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  }
  cell1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }

  // Fila 2: Título del Reporte / Evento
  const row2 = sheet.getRow(2)
  row2.getCell(1).value = tituloReporte
  row2.height = 22
  sheet.mergeCells(2, 1, 2, cols)
  const cell2 = row2.getCell(1)
  cell2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }
  cell2.font = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  }
  cell2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }

  // Fila 3: Subtítulo con metadatos / filtros / fecha y borde inferior carmesí
  const row3 = sheet.getRow(3)
  row3.getCell(1).value = subtituloReporte
  row3.height = 20
  sheet.mergeCells(3, 1, 3, cols)
  for (let c = 1; c <= cols; c++) {
    const cCell = row3.getCell(c)
    cCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    }
    cCell.font = {
      name: 'Calibri',
      size: 9.5,
      color: { argb: 'FF334155' },
    }
    cCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    cCell.border = {
      bottom: { style: 'medium', color: { argb: 'FFB91C1C' } },
    }
  }
}

/**
 * Estiliza una tabla corporativa completa (encabezados, cebra, bordes, formatos numéricos/moneda,
 * resaltado de estados, autoFilter, inmovilización y ajuste automático de ancho de columnas).
 */
export function estilizarTablaCorporativa(
  sheet: ExcelJS.Worksheet,
  opciones: OpcionesTablaExcel
): number {
  const {
    filaEncabezado,
    encabezados,
    filas,
    columnasMoneda = [],
    columnasEntero = [],
    columnasEstado = [],
    inmovilizar = true,
    conAutoFiltro = true,
    filaTotales,
  } = opciones

  const setMoneda = new Set(columnasMoneda)
  const setEntero = new Set(columnasEntero)
  const setEstado = new Set(columnasEstado)
  const totalCols = encabezados.length

  const bordeFino: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }

  // Longitudes máximas por columna para autoajuste
  const maxLongitudes = encabezados.map((h, i) => {
    const prevWidth = sheet.getColumn(i + 1).width
    const prevLen = typeof prevWidth === 'number' ? Math.max(0, prevWidth - 4) : 0
    return Math.max(prevLen, h.length)
  })

  // 1. Fila de encabezados
  const headerRow = sheet.getRow(filaEncabezado)
  headerRow.height = 28
  encabezados.forEach((texto, idx) => {
    const colIdx = idx + 1
    const cell = headerRow.getCell(colIdx)
    cell.value = texto
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    }
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    }
    cell.alignment = {
      horizontal: setMoneda.has(colIdx) || setEntero.has(colIdx) ? 'right' : 'left',
      vertical: 'middle',
      wrapText: true,
    }
    cell.border = bordeFino
  })

  // 2. Filas de datos
  filas.forEach((filaDatos, rowIdx) => {
    const numeroFila = filaEncabezado + 1 + rowIdx
    const row = sheet.getRow(numeroFila)
    row.height = 20
    const esImpar = rowIdx % 2 === 1
    const bgHex = esImpar ? 'FFF8FAFC' : 'FFFFFFFF'

    for (let idx = 0; idx < totalCols; idx++) {
      const colIdx = idx + 1
      const valor = filaDatos[idx] ?? ''
      const cell = row.getCell(colIdx)
      cell.value = valor

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgHex },
      }
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF1E293B' },
      }
      cell.border = bordeFino
      cell.alignment = {
        horizontal: setMoneda.has(colIdx) || setEntero.has(colIdx) ? 'right' : 'left',
        vertical: 'middle',
        wrapText: true,
      }

      if (setMoneda.has(colIdx) && typeof valor === 'number') {
        cell.numFmt = '$ #,##0'
      } else if (setEntero.has(colIdx) && typeof valor === 'number') {
        cell.numFmt = '#,##0'
      }

      if (setEstado.has(colIdx)) {
        const textoEstado = String(valor).trim()
        const estadoUpper = textoEstado.toUpperCase()
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

        if (
          estadoUpper === 'PAGADO' ||
          estadoUpper === 'EXENTO' ||
          estadoUpper === 'APTO' ||
          estadoUpper.includes('COMPLETA')
        ) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' },
          }
          cell.font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            color: { argb: 'FF166534' },
          }
        } else if (estadoUpper === 'PENDIENTE' || estadoUpper.includes('PARCIAL')) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' },
          }
          cell.font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            color: { argb: 'FF92400E' },
          }
        } else if (estadoUpper === 'RECHAZADO') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' },
          }
          cell.font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            color: { argb: 'FF991B1B' },
          }
        }
      }

      const strLen = String(valor).length
      if (strLen > maxLongitudes[idx]) {
        maxLongitudes[idx] = strLen
      }
    }
  })

  let ultimaFila = filaEncabezado + filas.length

  // 3. Fila de totales opcional
  if (filaTotales && filaTotales.length > 0) {
    ultimaFila += 1
    const totalRow = sheet.getRow(ultimaFila)
    totalRow.height = 22
    for (let idx = 0; idx < totalCols; idx++) {
      const colIdx = idx + 1
      const valor = filaTotales[idx] ?? ''
      const cell = totalRow.getCell(colIdx)
      cell.value = valor
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      }
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FF0F172A' },
      }
      cell.border = {
        ...bordeFino,
        top: { style: 'medium', color: { argb: 'FF64748B' } },
      }
      cell.alignment = {
        horizontal: setMoneda.has(colIdx) || setEntero.has(colIdx) ? 'right' : 'left',
        vertical: 'middle',
      }
      if (setMoneda.has(colIdx) && typeof valor === 'number') {
        cell.numFmt = '$ #,##0'
      } else if (setEntero.has(colIdx) && typeof valor === 'number') {
        cell.numFmt = '#,##0'
      }
      const strLen = String(valor).length
      if (strLen > maxLongitudes[idx]) {
        maxLongitudes[idx] = strLen
      }
    }
  }

  // 4. Ajuste automático de anchos (mínimo 12, máximo 42, margen +4)
  for (let idx = 0; idx < totalCols; idx++) {
    const anchoCalculado = Math.min(42, Math.max(12, maxLongitudes[idx] + 4))
    sheet.getColumn(idx + 1).width = anchoCalculado
  }

  // 5. AutoFilter y paneles inmovilizados
  if (conAutoFiltro) {
    const filaFinFiltro = filaTotales ? ultimaFila - 1 : ultimaFila
    sheet.autoFilter = {
      from: { row: filaEncabezado, column: 1 },
      to: { row: Math.max(filaEncabezado, filaFinFiltro), column: totalCols },
    }
  }

  if (inmovilizar) {
    sheet.views = [{ state: 'frozen', ySplit: filaEncabezado }]
  }

  return ultimaFila
}

/**
 * Genera el buffer del libro ExcelJS y dispara la descarga limpia en el navegador.
 */
export async function descargarWorkbookExcel(
  workbook: ExcelJS.Workbook,
  nombreArchivo: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
