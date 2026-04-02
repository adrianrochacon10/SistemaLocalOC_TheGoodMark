import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Colaborador,
  OrdenDeCompra,
  ConfiguracionEmpresa,
  Pantalla,
  RegistroVenta,
} from "../types";
import { nombrePantallaDesdeVentaYCatalogo } from "./ordenCompraLineas";
import {
  detallePantallaId,
  detallePrecioMensual,
  esLineaPrecioProductoEnDetalle,
} from "./ordenApiMapper";
import {
  importeLineaRespectoOrden,
  importeVentaEnMesOrden,
  costoLineaOrdenConsideracionPrecioFijo,
  colaboradorUsaCostoComoBaseOrden,
  importeLineaOrdenTrasPorcentajeSocio,
} from "./ordenUtils";

const COL_BLUE: [number, number, number] = [23, 58, 95];
const COL_GREY: [number, number, number] = [110, 110, 110];
const COL_GREY_BG: [number, number, number] = [245, 245, 247];

function safeFileName(base: string): string {
  return base.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 120);
}

function fmtMoney(n: number): string {
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function round2(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

/** Pantallas por registro de venta (misma lógica que el detalle del PDF). */
function contarPantallasVentaResumenPdf(v: RegistroVenta): number {
  const detalle = Array.isArray(v.pantallasDetalle)
    ? v.pantallasDetalle.filter((p: any) => {
        const pid = String(p?.pantallaId ?? p?.pantalla_id ?? "");
        return (
          pid &&
          pid !== "__producto_total__" &&
          !esLineaPrecioProductoEnDetalle(pid)
        );
      })
    : [];
  if (detalle.length > 0) return detalle.length;
  return (v.pantallasIds ?? []).map(String).filter(Boolean).length;
}

function contarProductosVentaResumenPdf(v: RegistroVenta): number {
  if (v.productoIncluidoEnOrden === false) return 0;
  const detalle = Array.isArray(v.pantallasDetalle)
    ? v.pantallasDetalle.filter((p: any) =>
        esLineaPrecioProductoEnDetalle(
          String(p?.pantallaId ?? p?.pantalla_id ?? ""),
        ),
      )
    : [];
  if (detalle.length > 0) return detalle.length;
  if (Array.isArray(v.productoIds) && v.productoIds.length > 0) {
    return v.productoIds.length;
  }
  if (v.productoId) return 1;
  const nombre = String(v.productoNombre ?? "").trim();
  if (!nombre) return 0;
  return nombre
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
}

/** Suma de pantallas y productos en las ventas de las órdenes indicadas (una OC = solo sus registros). */
function totalesPantallasProductosEnOrdenes(ordenes: OrdenDeCompra[]): {
  pantallas: number;
  productos: number;
} {
  let pantallas = 0;
  let productos = 0;
  for (const o of ordenes) {
    for (const v of o.registrosVenta ?? []) {
      pantallas += contarPantallasVentaResumenPdf(v);
      productos += contarProductosVentaResumenPdf(v);
    }
  }
  return { pantallas, productos };
}

/** Altura mínima de celda de descripción: debe coincidir con splitTextToSize en didDrawCell. */
function computeDescCellMinHeight(
  doc: jsPDF,
  meta: { title: string; details: string[] },
  colDescW: number,
): number {
  const pad = 2.5;
  const maxW = colDescW - pad * 2;
  const fontBefore = doc.getFont();
  const sizeBefore = doc.getFontSize();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const titleLines = doc.splitTextToSize(meta.title, maxW);
  let h = 5 + titleLines.length * 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const line of meta.details) {
    const wrapped = doc.splitTextToSize(line, maxW);
    h += wrapped.length * 3.4;
  }

  doc.setFont(fontBefore.fontName, fontBefore.fontStyle);
  doc.setFontSize(sizeBefore);
  return h + 6;
}

function paqueteDesdeVenta(v: RegistroVenta): string {
  const valor = Math.max(1, Math.floor(Number(v.mesesRenta) || 1));
  const fi = new Date(v.fechaInicio);
  const ff = new Date(v.fechaFin);
  if (!Number.isNaN(fi.getTime()) && !Number.isNaN(ff.getTime()) && ff >= fi) {
    const msDia = 24 * 60 * 60 * 1000;
    const dias = Math.round((ff.getTime() - fi.getTime()) / msDia);
    const meses =
      (ff.getFullYear() - fi.getFullYear()) * 12 +
      (ff.getMonth() - fi.getMonth());
    // Registro por dias: en captura se guarda `mesesRenta` como duracion y fechaFin = inicio + dias.
    if (dias === valor && meses === 0) {
      return valor === 1 ? "1 Dia" : `${valor} Dias`;
    }
  }
  return valor === 1 ? "1 Mes" : `${valor} Meses`;
}

/** Monto de línea para PDF: prioriza importe total ya guardado en la orden (detalle). */
function precioLineaOrden(v: RegistroVenta): number {
  const imp = round2(Number(v.importeTotal) || 0);
  const pt = round2(Number(v.precioTotal) || 0);
  if (imp > 0) return imp;
  if (pt > 0) return pt;

  const meses = Math.max(1, Number(v.mesesRenta) || 1);
  const baseMensual = Number(v.precioBaseMensualOrden);
  const productoMensual = round2(Number(v.productoPrecioMensual) || 0);
  const incluirProducto = v.productoIncluidoEnOrden === true;
  const precioGeneralMensual = round2(Number(v.precioGeneral) || 0);

  if (Number.isFinite(baseMensual) && baseMensual >= 0) {
    const mensual = round2(
      baseMensual + (incluirProducto ? productoMensual : 0),
    );
    return round2(mensual * meses);
  }

  if (precioGeneralMensual > 0) {
    const mensual = round2(
      precioGeneralMensual + (incluirProducto ? productoMensual : 0),
    );
    return round2(mensual * meses);
  }

  return 0;
}

function pantallaMap(pantallas: Pantalla[]): Map<string, Pantalla> {
  return new Map(pantallas.map((p) => [String(p.id), p]));
}

function drawLine(
  doc: jsPDF,
  y: number,
  margin: number,
  pageW: number,
  color: [number, number, number] = COL_BLUE,
) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
}

function drawRoundedFrame(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  doc.setDrawColor(...COL_BLUE);
  doc.setLineWidth(0.25);
  doc.setFillColor(255, 255, 255);
  const r = doc as jsPDF & { roundedRect?: (...a: number[]) => void };
  if (typeof r.roundedRect === "function") {
    r.roundedRect(x, y, w, h, 2, 2, "FD");
  } else {
    doc.rect(x, y, w, h, "FD");
  }
}

function drawInfoBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  rows: { label: string; value: string }[],
) {
  const pad = 3;
  const lineH = 4.2;
  const titleH = 6;
  const h = titleH + rows.length * lineH + pad * 2 + 1;
  drawRoundedFrame(doc, x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COL_BLUE);
  doc.text(title.toUpperCase(), x + pad, y + pad + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let ry = y + pad + titleH + 2;
  for (const row of rows) {
    doc.setTextColor(...COL_GREY);
    doc.text(row.label, x + pad, ry);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    const vw = doc.getTextWidth(row.value);
    doc.text(row.value, x + w - pad - vw, ry);
    doc.setFont("helvetica", "normal");
    ry += lineH;
  }
  doc.setTextColor(0, 0, 0);
  return h;
}

function drawBankBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  config: ConfiguracionEmpresa,
) {
  const pad = 3;
  const lines: string[] = [];
  const nombre = (config.nombreEmpresa ?? "").trim();
  const rfc = (config.rfc ?? "").trim();
  const email = (config.email ?? "").trim();
  const tel = (config.telefono ?? "").trim();
  const dir = (config.direccion ?? "").trim();
  const web = (config.sitioWeb ?? "").trim();
  if (nombre) lines.push(nombre);
  if (rfc) lines.push(`RFC: ${rfc}`);
  if (email) lines.push(`Email: ${email}`);
  if (tel) lines.push(`Teléfono: ${tel}`);
  if (dir) lines.push(`Dirección: ${dir}`);
  if (web) lines.push(`Sitio web: ${web}`);
  if (lines.length === 0) {
    lines.push(
      "Datos de empresa pendientes.",
      "Configúralos en la sección de Configuración para que aparezcan en el PDF.",
    );
  }
  const lineH = 4;
  const titleH = 7;
  const h = titleH + lines.length * lineH + pad * 2 + 2;
  drawRoundedFrame(doc, x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COL_BLUE);
  doc.text("DATOS DE LA EMPRESA", x + pad, y + pad + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(25, 25, 25);
  let ry = y + pad + titleH + 1;
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, w - pad * 2);
    doc.text(wrapped, x + pad, ry);
    ry += wrapped.length * lineH;
  }
  doc.setTextColor(0, 0, 0);
  return h;
}

function drawResumenFinanciero(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  totales: {
    subtotal: number;
    ivaTotal: number;
    total: number;
    ivaPercentaje: number;
  },
) {
  const pad = 3;
  const lineH = 4.5;
  const sub = totales.subtotal;
  const iva = totales.ivaTotal;
  const total = totales.total;
  const pct = totales.ivaPercentaje;
  const rows: { label: string; value: string; bold?: boolean }[] = [
    { label: "Subtotal", value: fmtMoney(sub) },
    { label: `I.V.A. (${pct}%)`, value: fmtMoney(iva) },
  ];
  const titleH = 7;
  const totalBlockH = 11;
  const h = titleH + rows.length * lineH + totalBlockH + pad * 2;
  drawRoundedFrame(doc, x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COL_BLUE);
  doc.text("RESUMEN FINANCIERO", x + pad, y + pad + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let ry = y + pad + titleH + 1;
  for (const row of rows) {
    doc.setTextColor(...COL_GREY);
    doc.text(row.label, x + pad, ry);
    doc.setTextColor(25, 25, 25);
    if (row.bold) doc.setFont("helvetica", "bold");
    const vw = doc.getTextWidth(row.value);
    doc.text(row.value, x + w - pad - vw, ry);
    doc.setFont("helvetica", "normal");
    ry += lineH;
  }
  ry += 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COL_BLUE);
  const totTxt = `TOTAL: ${fmtMoney(total)}`;
  doc.text(totTxt, x + w - pad, ry + 2, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  return h;
}

/**
 * PDF estilo «The Good Mark»: cabecera, cajas informativas, tabla de detalle,
 * datos bancarios, resumen e pie. Guardar como / descarga según navegador.
 */
export async function exportarPDFOrden(
  orden: OrdenDeCompra,
  config: ConfiguracionEmpresa,
  _nombreUsuario: string,
  pantallas: Pantalla[] = [],
  colaboradores: Colaborador[] = [],
): Promise<void> {
  const pMap = pantallaMap(pantallas);
  const registros = orden.registrosVenta ?? [];
  const colab = colaboradores.find(
    (c) => String(c.id) === String(orden.colaboradorId),
  );
  const diaCortePdf = Number(config.diaCorteOrdenes ?? 20) || 20;
  const fechaDoc = new Date().toLocaleDateString("es-MX");
  const mesFormatoRaw = new Date(
    orden.año ?? 0,
    orden.mes ?? 0,
  ).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const mesFormato =
    mesFormatoRaw.charAt(0).toUpperCase() + mesFormatoRaw.slice(1);
  /** Mismo alcance que las filas de la tabla: solo ventas de esta orden. */
  const { pantallas: totPantallasResumen, productos: totProductosResumen } =
    totalesPantallasProductosEnOrdenes([orden]);

  let inicioMin = new Date();
  let finMax = new Date(0);
  const iniciosUnicos = new Set<string>();
  for (const v of registros) {
    const fi = new Date(v.fechaInicio);
    const ff = new Date(v.fechaFin);
    if (fi < inicioMin) inicioMin = fi;
    if (ff > finMax) finMax = ff;
    if (!Number.isNaN(fi.getTime())) {
      iniciosUnicos.add(fi.toLocaleDateString("es-MX"));
    }
  }
  if (registros.length === 0) {
    inicioMin = new Date(orden.año ?? 0, orden.mes ?? 0, 1);
    finMax = inicioMin;
    iniciosUnicos.add(inicioMin.toLocaleDateString("es-MX"));
  }
  const mostrarInicioUnico = iniciosUnicos.size <= 1;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 12;

  const nombreEmp = (config.nombreEmpresa || "Empresa").toUpperCase();
  const emailEmp = (config.email ?? "").trim();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COL_BLUE);
  doc.text(nombreEmp, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COL_GREY);
  doc.text(`Fecha: ${fechaDoc}`, pageW - margin, y, { align: "right" });
  y += 6;
  if (emailEmp) {
    doc.text(emailEmp, margin, y);
  }
  doc.text("Vigencia: 30 dias", pageW - margin, y, { align: "right" });
  y += 5;
  drawLine(doc, y, margin, pageW);
  y += 6;

  const gap = 4;
  const boxW = (pageW - 2 * margin - gap) / 2;

  const infoRows: { label: string; value: string }[] = [];
  if (mostrarInicioUnico) {
    infoRows.push({
      label: "Inicio",
      value: inicioMin.toLocaleDateString("es-MX"),
    });
  }
  infoRows.push({ label: "Periodo", value: mesFormato });
  const h1 = drawInfoBox(
    doc,
    margin,
    y,
    boxW,
    "INFORMACION DEL SERVICIO",
    infoRows,
  );

  const h2 = drawInfoBox(doc, margin + boxW + gap, y, boxW, "PRODUCTOS", [
    { label: "Pantallas", value: String(totPantallasResumen) },
    { label: "Producto", value: String(totProductosResumen) },
  ]);

  y += Math.max(h1, h2) + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COL_BLUE);
  doc.text("Detalle de productos y servicios", margin, y);
  y += 4;

  type DescMeta = { title: string; details: string[] };
  const descByRow = new Map<number, DescMeta>();
  /** Texto auxiliar bajo columna PRECIO (índice fila body 0-based). */
  const precioSublineaByRow = new Map<number, string>();

  let sumLineasPdf = 0;
  const numRegPdf = registros.length;

  const tableBody: string[][] = [];
  let idx = 0;
  for (const venta of registros) {
    idx += 1;
    const ids = venta.pantallasIds ?? [];
    const pantallasDetalleRaw = Array.isArray(venta.pantallasDetalle)
      ? venta.pantallasDetalle
      : [];
    const pantallasDetalle = pantallasDetalleRaw.filter((p: any) => {
      const pid = String(p?.pantallaId ?? p?.pantalla_id ?? "");
      return (
        pid &&
        pid !== "__producto_total__" &&
        !esLineaPrecioProductoEnDetalle(pid)
      );
    });
    const nombresDesdeVenta = ids.map((id) =>
      nombrePantallaDesdeVentaYCatalogo(
        String(id),
        pantallas,
        venta.pantallasDetalle,
      ),
    );
    const pantallasConPrecioBase =
      pantallasDetalle.length > 0
        ? pantallasDetalle.map((p: any) => {
            const pid = String(p.pantallaId ?? p.pantalla_id ?? "");
            const nombre =
              String(p.nombre ?? "").trim() ||
              nombrePantallaDesdeVentaYCatalogo(pid, pantallas, venta.pantallasDetalle);
            const precio =
              Number(p.precioMensual ?? p.precio_mensual ?? 0) || 0;
            return { nombre, precio };
          })
        : (venta.pantallasIds ?? []).map((pid) => {
            const key = String(pid);
            const nombre = nombrePantallaDesdeVentaYCatalogo(
              key,
              pantallas,
              venta.pantallasDetalle,
            );
            const precioCat = Number(pMap.get(key)?.precio ?? 0) || 0;
            return { nombre, precio: precioCat };
          });
    const titulo =
      String(colab?.nombre ?? orden.colaboradorNombre ?? "").trim() ||
      "Colaborador";
    const paqueteOriginal = paqueteDesdeVenta(venta);
    const paqueteEsPorDias = paqueteOriginal.toLowerCase().includes("dia");
    const paqueteTxt = paqueteEsPorDias ? paqueteOriginal : "1 Mes";
    const fi = new Date(venta.fechaInicio).toLocaleDateString("es-MX");
    const ff = new Date(venta.fechaFin).toLocaleDateString("es-MX");
    const pantallasSoloEtiquetas = pantallasConPrecioBase.length
      ? pantallasConPrecioBase.map((p) =>
          paqueteEsPorDias
            ? `- ${p.nombre} (tarifa fija por días)`
            : `- ${p.nombre}`,
        )
      : ["- Sin pantallas"];
    const prod = (venta.productoNombre ?? "").trim();
    const productosDetalleRaw = Array.isArray(venta.pantallasDetalle)
      ? venta.pantallasDetalle.filter((p: any) =>
          esLineaPrecioProductoEnDetalle(detallePantallaId(p)),
        )
      : [];
    const productosDesdeDetalle = productosDetalleRaw.map((p: any) => ({
      nombre: String(p?.nombre ?? "").trim() || "Producto",
      precio: detallePrecioMensual(p),
    }));
    const productosNombres = prod
      ? prod
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : [];
    const productosDetalle =
      productosDesdeDetalle.length > 0
        ? productosDesdeDetalle
        : productosNombres.length > 0
          ? productosNombres.map((nombre) => ({ nombre }))
          : Array.isArray(venta.productoIds) && venta.productoIds.length > 0
            ? venta.productoIds.map((_, i) => ({ nombre: `Producto ${i + 1}` }))
            : [];
    const precioProd = round2(Number(venta.productoPrecioMensual) || 0);
    const prodIncluido =
      venta.productoIncluidoEnOrden === true ||
      (venta.productoIncluidoEnOrden !== false &&
        (precioProd > 0 || productosDetalle.length > 0));
    const precioVentaLinea = (() => {
      let pv = round2(importeLineaRespectoOrden(venta, orden, numRegPdf));
      if (!(pv > 0)) {
        const contrato =
          Number(venta.precioTotalContrato ?? venta.precioTotal ?? venta.importeTotal) ||
          0;
        if (contrato > 0) {
          pv = round2(
            importeVentaEnMesOrden(
              venta,
              orden.mes ?? 0,
              orden.año ?? new Date().getFullYear(),
              contrato,
            ),
          );
        } else {
          pv = round2(precioLineaOrden(venta));
        }
      }
      return pv;
    })();
    const usarCostoPdf = colaboradorUsaCostoComoBaseOrden(
      colab?.tipoComision,
      colab?.tipoPagoNombre,
    );
    const precioColumna = usarCostoPdf
      ? round2(
          costoLineaOrdenConsideracionPrecioFijo(
            venta,
            orden.mes ?? 0,
            orden.año ?? new Date().getFullYear(),
            precioVentaLinea,
            diaCortePdf,
          ),
        )
      : round2(
          importeLineaOrdenTrasPorcentajeSocio(
            precioVentaLinea,
            venta,
            colab?.tipoComision,
          ),
        );
    const lineaPrecioSub = null;
    if (lineaPrecioSub) {
      precioSublineaByRow.set(idx - 1, lineaPrecioSub);
    }
    const porcentajeColaboradorFila = Math.max(
      0,
      Number(venta.porcentajeSocio ?? colab?.porcentajeSocio ?? 0) || 0,
    );
    const precioVentaTotal = round2(
      Number(venta.precioTotalContrato ?? 0) > 0
        ? Number(venta.precioTotalContrato)
        : Number(venta.precioTotal ?? venta.importeTotal ?? 0) || 0,
    );
    const productosSoloNombres =
      prodIncluido && productosDetalle.length > 0
        ? [
            `Producto(s) (${productosDetalle.length}):`,
            ...productosDetalle.map((p) => `- ${p.nombre}`),
          ]
        : [];
    const esColabPorcentajePdf =
      String(colab?.tipoComision ?? "").toLowerCase() === "porcentaje";
    const lineasTrasPantallasProd: string[] = [];
    if (esColabPorcentajePdf) {
      lineasTrasPantallasProd.push(
        `Porcentaje de colaborador: ${porcentajeColaboradorFila.toFixed(2)}%`,
      );
      if (
        porcentajeColaboradorFila > 0 &&
        venta.aplicarPorcentajeSocioEnOrden !== false &&
        precioVentaLinea > 0
      ) {
        const montoDescontado = round2(precioVentaLinea - precioColumna);
        if (montoDescontado > 0.005) {
          lineasTrasPantallasProd.push(
            `Monto descontado (${porcentajeColaboradorFila.toFixed(2)}%): ${fmtMoney(montoDescontado)}`,
          );
        }
      }
    }
    if (!usarCostoPdf) {
      if (precioVentaTotal > 0) {
        lineasTrasPantallasProd.push(
          `Precio de la venta total: ${fmtMoney(precioVentaTotal)}`,
        );
      }
      if (precioVentaLinea > 0) {
        lineasTrasPantallasProd.push(
          `Precio de venta: ${fmtMoney(precioVentaLinea)}`,
        );
      }
    } else if (precioColumna > 0) {
      lineasTrasPantallasProd.push(
        `Costo de venta: ${fmtMoney(precioColumna)}`,
      );
    }
    descByRow.set(idx - 1, {
      title: titulo,
      details: [
        `Vendido a: ${String(venta.vendidoA ?? "").trim() || "—"}`,
        `Pantallas (${ids.length}):`,
        ...pantallasSoloEtiquetas,
        ...productosSoloNombres,
        ...lineasTrasPantallasProd,
        `Periodo: ${fi} - ${ff}`,
      ],
    });
    sumLineasPdf = round2(sumLineasPdf + precioColumna);
    tableBody.push([
      String(idx),
      " ",
      paqueteTxt,
      fmtMoney(precioColumna),
    ]);
  }

  if (tableBody.length === 0) {
    descByRow.set(0, {
      title: "SIN LINEAS DE DETALLE",
      details: ["Agrega ventas a la orden para ver el detalle aqui."],
    });
    tableBody.push(["1", " ", "—", fmtMoney(0)]);
  }

  const pctIva = Number(orden.ivaPercentaje) || 16;
  const subtotalPdf = round2(sumLineasPdf);
  const ivaPdf = round2(subtotalPdf * (pctIva / 100));
  const totalPdf = round2(subtotalPdf + ivaPdf);

  const colDescW = pageW - 2 * margin - 10 - 28 - 32;

  autoTable(doc, {
    startY: y,
    head: [["#", "DESCRIPCION", "PAQUETE", "PRECIO"]],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [40, 40, 40],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COL_BLUE,
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: colDescW },
      2: { cellWidth: 28, halign: "center", valign: "top" },
      3: { cellWidth: 32, halign: "right", fontStyle: "bold", valign: "top" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const meta = descByRow.get(data.row.index);
        if (meta) {
          data.cell.text = [];
          data.cell.styles.minCellHeight = computeDescCellMinHeight(
            data.doc,
            meta,
            colDescW,
          );
        }
      }
      if (
        data.section === "body" &&
        (data.column.index === 2 || data.column.index === 3) &&
        precioSublineaByRow.has(data.row.index)
      ) {
        const prev = Number(data.cell.styles.minCellHeight) || 0;
        // Espacio para 2 líneas bajo el importe / paquete sin solapar el texto principal.
        data.cell.styles.minCellHeight = Math.max(prev, 26);
      }
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const meta = descByRow.get(data.row.index);
        if (!meta) return;
        const pad = 2.5;
        const x = data.cell.x + pad;
        let py = data.cell.y + 5;
        data.doc.setFont("helvetica", "bold");
        data.doc.setFontSize(8);
        data.doc.setTextColor(0, 0, 0);
        const titleLines = data.doc.splitTextToSize(
          meta.title,
          colDescW - pad * 2,
        );
        data.doc.text(titleLines, x, py);
        py += titleLines.length * 4;
        data.doc.setFont("helvetica", "normal");
        data.doc.setFontSize(7);
        data.doc.setTextColor(...COL_GREY);
        for (const line of meta.details) {
          const wrapped = data.doc.splitTextToSize(line, colDescW - pad * 2);
          data.doc.text(wrapped, x, py);
          py += wrapped.length * 3.4;
        }
        data.doc.setTextColor(0, 0, 0);
        return;
      }
      // Solo columna PRECIO: autoTable recorta por celda; si dibujamos en PAQUETE, el texto
      // que invade PRECIO queda cortado. Aquí cabe el texto completo alineado a la derecha.
      if (data.section !== "body" || data.column.index !== 3) return;
      const subPrecio = precioSublineaByRow.get(data.row.index);
      if (!subPrecio) return;
      const docRef = data.doc;
      const padX = 2;
      const innerW = Math.max(8, data.cell.width - padX * 2);
      docRef.setFont("helvetica", "normal");
      docRef.setFontSize(7);
      docRef.setTextColor(55, 55, 55);
      const m = subPrecio.match(/^(Precio:\s*)(.+)$/i);
      const lines: string[] = m
        ? [m[1]!.trim(), m[2]!.trim()]
        : docRef.splitTextToSize(subPrecio, innerW);
      const lineGap = 3.3;
      let ly = data.cell.y + data.cell.height - 2;
      for (let i = lines.length - 1; i >= 0; i--) {
        docRef.text(lines[i]!, data.cell.x + data.cell.width - padX, ly, {
          align: "right",
        });
        ly -= lineGap;
      }
      docRef.setTextColor(0, 0, 0);
    },
  });

  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  let afterTable = docWithTable.lastAutoTable?.finalY ?? y + 40;

  doc.setFillColor(...COL_GREY_BG);
  const totalBarH = 7;
  doc.rect(margin, afterTable, pageW - 2 * margin, totalBarH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("SUBTOTAL:", pageW - margin - 38, afterTable + 4.8);
  doc.setTextColor(25, 25, 25);
  doc.text(fmtMoney(subtotalPdf), pageW - margin - 2, afterTable + 4.8, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0);

  y = afterTable + totalBarH + 8;

  if (y + 55 > 270) {
    doc.addPage();
    y = 16;
  }

  const hb = drawBankBox(doc, margin, y, boxW, config);
  const hr = drawResumenFinanciero(doc, margin + boxW + gap, y, boxW, {
    subtotal: subtotalPdf,
    ivaTotal: ivaPdf,
    total: totalPdf,
    ivaPercentaje: pctIva,
  });
  y += Math.max(hb, hr) + 10;

  drawLine(doc, y, margin, pageW);
  y += 6;

  doc.setFontSize(7);
  doc.setTextColor(...COL_GREY);
  const colW = (pageW - 2 * margin) / 3;
  const contacto =
    [config.email, config.telefono].filter(Boolean).join(" · ") || "—";
  const web = (config.sitioWeb ?? "").trim() || "—";
  const oficina = (config.direccion ?? "").trim() || "—";

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL_BLUE);
  doc.text("CONTACTO", margin, y);
  doc.text("SITIO WEB", margin + colW, y);
  doc.text("OFICINA", margin + 2 * colW, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COL_GREY);
  const cLines = doc.splitTextToSize(contacto, colW - 2);
  const wLines = doc.splitTextToSize(web, colW - 2);
  const oLines = doc.splitTextToSize(oficina, colW - 2);
  doc.text(cLines, margin, y);
  doc.text(wLines, margin + colW, y);
  doc.text(oLines, margin + 2 * colW, y);
  y += Math.max(cLines.length, wLines.length, oLines.length) * 3.2 + 6;

  const year = new Date().getFullYear();
  const brand = config.nombreEmpresa || "The Good Mark";
  doc.setFontSize(7);
  doc.setTextColor(...COL_GREY);
  doc.text(
    `${brand} © ${year} · Orden de venta sujeta a firma de contrato`,
    pageW / 2,
    y,
    { align: "center" },
  );

  const defaultName = safeFileName(`OrdenCompra-${orden.numeroOrden}.pdf`);
  const blob = doc.output("blob");

  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const w = window as Window & {
        showSaveFilePicker: (opts: {
          suggestedName?: string;
          types?: {
            description: string;
            accept: Record<string, string[]>;
          }[];
        }) => Promise<FileSystemFileHandle>;
      };
      const handle = await w.showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          {
            description: "PDF",
            accept: { "application/pdf": [".pdf"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
