import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  OrdenDeCompra,
  ConfiguracionEmpresa,
  Pantalla,
  Producto,
  RegistroVenta,
} from "../types";

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

/** ✅ Precio POR MES (no el total del contrato) */
function precioLineaOrden(v: RegistroVenta): number {
  const pg = round2(Number(v.precioGeneral) || 0);
  if (pg > 0) return pg;
  const imp = round2(Number(v.importeTotal) || 0);
  const meses = Math.max(1, Number(v.mesesRenta) || 1);
  if (imp > 0) return round2(imp / meses);
  const pt = round2(Number(v.precioTotal) || 0);
  if (pt > 0) return round2(pt / meses);
  return 0;
}

function pantallaMap(pantallas: Pantalla[]): Map<string, Pantalla> {
  return new Map(pantallas.map((p) => [p.id, p]));
}

function productoMap(productos: Producto[]): Map<string, Producto> {
  return new Map(productos.map((p) => [p.id, p]));
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
  const t = (config.bancoTitular ?? "").trim();
  const b = (config.bancoNombre ?? "").trim();
  const tar = (config.bancoTarjeta ?? "").trim();
  const cta = (config.bancoCuenta ?? "").trim();
  const cl = (config.bancoClabe ?? "").trim();
  if (t) lines.push(t);
  if (b) lines.push(`Banco: ${b}`);
  if (tar) lines.push(`Número de tarjeta: ${tar}`);
  if (cta) lines.push(`Número de cuenta: ${cta}`);
  if (cl) lines.push(`CLABE: ${cl}`);
  if (lines.length === 0) {
    lines.push("Datos bancarios pendientes.");
  }
  const lineH = 4;
  const titleH = 7;
  const h = titleH + lines.length * lineH + pad * 2 + 2;
  drawRoundedFrame(doc, x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COL_BLUE);
  doc.text("DATOS BANCARIOS", x + pad, y + pad + 3.5);
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
  const desc = 0;
  const subNeto = sub - desc;
  const iva = totales.ivaTotal;
  const total = totales.total;
  const pct = totales.ivaPercentaje;
  const rows: { label: string; value: string; bold?: boolean }[] = [
    { label: "Gran Total", value: fmtMoney(sub) },
    { label: "Descuento", value: `-${fmtMoney(desc)}` },
    { label: "Subtotal", value: fmtMoney(subNeto) },
    { label: `I.V.A. (${pct}%)`, value: fmtMoney(iva) },
  ];
  const titleH = 7;
  const totalBlockH = 9;
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
  doc.text(`TOTAL: ${fmtMoney(total)}`, x + w - pad, ry + 2, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  return h;
}

export async function exportarPDFOrden(
  orden: OrdenDeCompra,
  config: ConfiguracionEmpresa,
  _nombreUsuario: string,
  pantallas: Pantalla[] = [],
  productos: Producto[] = [], // ✅ nuevo parámetro
): Promise<void> {
  const pMap = pantallaMap(pantallas);
  const prMap = productoMap(productos); // ✅
  const registros = orden.registrosVenta ?? [];
  const fechaDoc = new Date().toLocaleDateString("es-MX");
  const mesFormatoRaw = new Date(
    orden.año ?? 0,
    orden.mes ?? 0,
  ).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const mesFormato =
    mesFormatoRaw.charAt(0).toUpperCase() + mesFormatoRaw.slice(1);

  const pantallasUnicas = new Set<string>();
  for (const v of registros) {
    for (const pid of v.pantallasIds ?? []) pantallasUnicas.add(String(pid));
  }
  const numPantallas = pantallasUnicas.size;
  const numProductos = registros.length;

  const pctIva = Number(orden.ivaPercentaje) || 16;

  // ✅ Subtotal basado en precio por mes
  const subtotalPdf = round2(
    registros.reduce((s, v) => s + precioLineaOrden(v), 0),
  );
  const ivaPdf = round2(subtotalPdf * (pctIva / 100));
  const totalPdf = round2(subtotalPdf + ivaPdf);

  let inicioMin = new Date();
  let finMax = new Date(0);
  for (const v of registros) {
    const fi = new Date(v.fechaInicio);
    const ff = new Date(v.fechaFin);
    if (fi < inicioMin) inicioMin = fi;
    if (ff > finMax) finMax = ff;
  }
  if (registros.length === 0) {
    inicioMin = new Date(orden.año ?? 0, orden.mes ?? 0, 1);
    finMax = inicioMin;
  }

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
  if (emailEmp) doc.text(emailEmp, margin, y);
  doc.text("Vigencia: 30 dias", pageW - margin, y, { align: "right" });
  y += 5;
  drawLine(doc, y, margin, pageW);
  y += 6;

  const gap = 4;
  const boxW = (pageW - 2 * margin - gap) / 2;

  const h1 = drawInfoBox(doc, margin, y, boxW, "INFORMACION DEL SERVICIO", [
    { label: "Inicio", value: inicioMin.toLocaleDateString("es-MX") },
    { label: "Periodo", value: mesFormato },
    { label: "Total de productos", value: String(numProductos) },
  ]);

  const pantallasBeneficio =
    numPantallas > 0
      ? numPantallas
      : registros.reduce((m, v) => Math.max(m, v.pantallasIds?.length ?? 0), 0);

  const h2 = drawInfoBox(doc, margin + boxW + gap, y, boxW, "BENEFICIOS", [
    { label: "Pantallas", value: String(pantallasBeneficio) },
    { label: "Descuento", value: fmtMoney(0) },
  ]);

  y += Math.max(h1, h2) + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COL_BLUE);
  doc.text("DETALLE DE PRODUCTOS Y SERVICIOS", margin, y);
  y += 4;

  type DescMeta = { title: string; details: string[] };
  const descByRow = new Map<number, DescMeta>();
  const tableBody: string[][] = [];
  let idx = 0;

  for (const venta of registros) {
    const pids = venta.pantallasIds ?? [];
    const prids = venta.productosIds ?? [];

    // ✅ Título: nombre de pantallas o productos
    let titulo = "SERVICIO";
    let detalleItems: string[] = [];

    if (pids.length > 0) {
      const nombres = pids.map((id) => pMap.get(id)?.nombre ?? id).join(", ");
      titulo = nombres.toUpperCase();
      detalleItems = [`Pantallas: ${pids.length}`];
    } else if (prids.length > 0) {
      const nombres = prids.map((id) => prMap.get(id)?.nombre ?? id).join(", ");
      titulo = nombres.toUpperCase();
      detalleItems = [`Productos: ${prids.length}`];
    }

    const fi = new Date(venta.fechaInicio).toLocaleDateString("es-MX");
    const ff = new Date(venta.fechaFin).toLocaleDateString("es-MX");
    detalleItems.push(`Periodo: ${fi} - ${ff}`);
    detalleItems.push(`Vendido a: ${venta.vendidoA || "—"}`);

    // ✅ Precio por mes
    const precio = precioLineaOrden(venta);

    descByRow.set(idx, {
      title: titulo,
      details: detalleItems,
    });

    // ✅ Paquete: "1 Mes" siempre
    tableBody.push([String(idx + 1), " ", "1 Mes", fmtMoney(precio)]);
    idx++;
  }

  if (tableBody.length === 0) {
    descByRow.set(0, {
      title: "SIN LINEAS DE DETALLE",
      details: ["Agrega ventas a la orden para ver el detalle aqui."],
    });
    tableBody.push(["1", " ", "—", fmtMoney(0)]);
  }

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
      2: { cellWidth: 28, halign: "center" },
      3: { cellWidth: 32, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const meta = descByRow.get(data.row.index);
        if (meta) {
          data.cell.text = [];
          const titleH = 4;
          const lineH = 3.4;
          data.cell.styles.minCellHeight =
            2 + titleH + meta.details.length * lineH + 2;
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;
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
    },
  });

  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  let afterTable = docWithTable.lastAutoTable?.finalY ?? y + 40;

  doc.setFillColor(...COL_GREY_BG);
  doc.rect(margin, afterTable, pageW - 2 * margin, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("SUBTOTAL:", pageW - margin - 38, afterTable + 4.8);
  doc.setTextColor(25, 25, 25);
  doc.text(fmtMoney(subtotalPdf), pageW - margin - 2, afterTable + 4.8, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0);

  y = afterTable + 7 + 8;

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
          types?: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<FileSystemFileHandle>;
      };
      const handle = await w.showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          { description: "PDF", accept: { "application/pdf": [".pdf"] } },
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
