import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { OrdenDeCompra, ConfiguracionEmpresa } from "../types";

const NAVY = "#002878";
const BG_GRAY = "#f9fafb";
const MUTED_TEXT = "#666666";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const num = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const buildCotizacionHTML = (
  orden: OrdenDeCompra,
  config: ConfiguracionEmpresa,
  _nombreUsuario: string,
): string => {
  const fechaBase = orden.fecha ? new Date(orden.fecha) : new Date();
  const fechaValida = Number.isNaN(fechaBase.getTime()) ? new Date() : fechaBase;
  const mesFormato = new Date(orden.año ?? 0, orden.mes ?? 0).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  const fechaFormato = fechaValida.toLocaleDateString("es-MX");
  const registros = orden.registrosVenta ?? [];
  const baseTotal = registros.reduce((acc, venta) => {
    const v = venta as any;
    return acc + num(v.precioTotal, v.precio_total, v.importeTotal, v.precioGeneral, v.total);
  }, 0);
  const descuentoTotal = registros.reduce(
    (acc, venta) => acc + num((venta as any).descuentoMonto, (venta as any).descuento, (venta as any).descuento_total),
    0,
  );
  const subtotal = num((orden as any).subtotal, (orden as any).subTotal, baseTotal);
  const subtotalConDescuento = Math.max(subtotal - descuentoTotal, 0);
  const ivaPct = 16;
  const ivaTotal = num((orden as any).ivaTotal, (orden as any).iva, subtotalConDescuento * 0.16);
  const total = num((orden as any).totalFinal, (orden as any).total, subtotalConDescuento + ivaTotal);
  const granTotal = num((orden as any).granTotal, (orden as any).totalBruto, subtotal);
  const vigenciaDias = 30;
  const duracionMeses =
    registros.length > 0
      ? Math.max(...registros.map((r) => Number(r.mesesRenta || 1)))
      : 1;
  const fechaInicioPrincipal = registros[0]?.fechaInicio
    ? new Date(registros[0].fechaInicio).toLocaleDateString("es-MX")
    : fechaFormato;
  const totalProductos = registros.reduce(
    (acc, venta) => acc + Number((venta as any).cantidad ?? 1),
    0,
  );

  return `
    <div class="container">
      <style>
        * { box-sizing: border-box; }
        .container {
          width: 960px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #dbe5f2;
          border-radius: 14px;
          padding: 28px 30px 22px;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
          min-height: 1240px;
          display: flex;
          flex-direction: column;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0 16px;
          border-bottom: 2px solid ${NAVY};
        }
        .brand h1 {
          color: ${NAVY};
          font-size: 24px;
          margin: 0;
          font-weight: 900;
          letter-spacing: 0.3px;
        }
        .brand .email {
          margin-top: 7px;
          color: ${MUTED_TEXT};
          font-size: 12px;
        }
        .quote {
          text-align: right;
        }
        .quote p { margin: 4px 0 0; color: ${MUTED_TEXT}; font-size: 12px; }
        .row {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .card {
          border: 1.5px solid ${NAVY};
          border-radius: 8px;
          padding: 12px 14px;
          background: ${BG_GRAY};
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.04);
        }
        .card h3 {
          margin: 0 0 10px;
          color: ${NAVY};
          border-bottom: 1px solid #d9e4ff;
          font-size: 14px;
          letter-spacing: 0.4px;
          padding-bottom: 7px;
        }
        .kv { display: flex; justify-content: space-between; margin: 6px 0; font-size: 14px; }
        .kv span:first-child { color: ${MUTED_TEXT}; }
        .kv .val { font-weight: 800; color: #0f172a; }
        .green { color: #1a8f36; }
        .section-title {
          margin: 22px 0 10px;
          color: ${NAVY};
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.35px;
          text-transform: uppercase;
          border-bottom: 2px solid ${NAVY};
          padding-bottom: 6px;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12px;
          overflow: hidden;
          border: 1px solid #dbe5f2;
          border-radius: 10px;
          background: #fff;
        }
        thead tr { background: ${NAVY}; color: #fff; }
        th { text-align: left; padding: 10px; font-size: 12px; letter-spacing: 0.2px; }
        td { padding: 11px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 13px; }
        th:nth-child(1), td:nth-child(1) { width: 44px; text-align: center; }
        th:nth-child(2), td:nth-child(2) { width: 58%; }
        th:nth-child(3), td:nth-child(3) { width: 18%; }
        th:nth-child(4), td:nth-child(4) { width: 18%; }
        tbody tr:nth-child(even) td { background: #f9fafb; }
        .muted { font-size: 11px; color: ${MUTED_TEXT}; margin-top: 3px; line-height: 1.35; }
        .right { text-align: right; }
        .subtotal td {
          background: #f3f4f6 !important;
          font-weight: 800;
          border-bottom: none;
        }
        .footer-row {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .fin .line {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px dashed #d1d5db;
          font-size: 13px;
        }
        .fin .line.total {
          border-bottom: none;
          margin-top: 6px;
          padding-top: 8px;
          font-size: 24px;
          font-weight: 900;
          color: ${NAVY};
          justify-content: flex-end;
          gap: 16px;
        }
        .terms {
          margin-top: 14px;
          border: 1px solid #dbe5f2;
          border-radius: 12px;
          padding: 10px 12px;
          background: #fff;
        }
        .terms h4 {
          margin: 0 0 6px;
          color: #002878;
          border-bottom: 1px solid #d9e4ff;
          font-size: 13px;
          letter-spacing: 0.3px;
          padding-bottom: 5px;
        }
        .terms ul {
          margin: 0;
          padding-left: 16px;
          columns: 2;
          color: #334155;
          font-size: 12px;
          line-height: 1.35;
        }
        .foot {
          margin-top: auto;
          border-top: 2px solid ${NAVY};
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: ${MUTED_TEXT};
        }
        .foot > div { width: 33%; }
        .foot .title { color: ${NAVY}; font-weight: 800; margin-bottom: 2px; font-size: 11px; }
        .legal { margin-top: 10px; text-align: center; font-size: 10px; color: #94a3b8; }
      </style>

      <div class="top">
        <div class="brand">
          <h1>${esc(config.nombreEmpresa || "THE GOOD MARK").toUpperCase()}</h1>
          <div class="email">${esc(config.email || "administracion@thegoodmark.com.mx")}</div>
        </div>
        <div class="quote">
          <p>Fecha: ${esc(fechaFormato)}</p>
          <p>Vigencia: ${vigenciaDias} dias</p>
        </div>
      </div>

      <div class="row">
        <div class="card">
          <h3>INFORMACION DEL SERVICIO</h3>
          <div class="kv"><span>Duracion:</span><span class="val">${duracionMeses} Mes${duracionMeses === 1 ? "" : "es"}</span></div>
          <div class="kv"><span>Inicio:</span><span class="val">${esc(fechaInicioPrincipal)}</span></div>
          <div class="kv"><span>Periodo:</span><span class="val">${esc(mesFormato)}</span></div>
          <div class="kv"><span>Descuento:</span><span class="val">${money(descuentoTotal)}</span></div>
        </div>
        <div class="card">
          <h3>BENEFICIOS</h3>
          <div class="kv"><span>Total de productos:</span><span class="val">${totalProductos}</span></div>
          <div class="kv"><span>Pantallas:</span><span class="val">${registros.reduce((acc, r) => acc + (r.pantallasIds?.length || 0), 0)}</span></div>
          <div class="kv"><span>Periodo:</span><span class="val">${esc(mesFormato)}</span></div>
        </div>
      </div>

      <div class="section-title">DETALLE DE PRODUCTOS Y SERVICIOS</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>DESCRIPCION</th>
            <th>PAQUETE</th>
            <th class="right">PRECIO</th>
          </tr>
        </thead>
        <tbody>
          ${registros
            .map(
              (venta, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>
                <div><strong>${esc(
                  (
                    (venta as any).pantalla?.nombre ||
                    (venta as any).pantallaNombre ||
                    ((venta as any).pantallasIds?.length ? "PANTALLA NO ESPECIFICADA" : "SIN PANTALLAS ASIGNADAS")
                  ).toUpperCase(),
                )}</strong></div>
                <div class="muted">${
                  (venta as any).pantallasIds?.length
                    ? `${esc((venta as any).pantalla?.ubicacion || (venta as any).pantallaUbicacion || "Ubicacion no especificada")} · ${esc((venta as any).resolucion || "Resolucion no especificada")} · Duracion ${Number(venta.mesesRenta || 1)} Mes${Number(venta.mesesRenta || 1) === 1 ? "" : "es"}`
                    : "No hay pantallas asignadas para esta venta"
                }</div>
                <div class="muted">Periodo: ${esc(new Date(venta.fechaInicio).toLocaleDateString("es-MX"))} - ${esc(new Date(venta.fechaFin).toLocaleDateString("es-MX"))}</div>
                <div class="muted">Pantallas: ${venta.pantallasIds?.length || 0}</div>
              </td>
              <td>${Number(venta.mesesRenta || 1)} Mes${Number(venta.mesesRenta || 1) === 1 ? "" : "es"}</td>
              <td class="right"><strong>${money(num((venta as any).precioTotal, (venta as any).precio_total, (venta as any).importeTotal, (venta as any).precioGeneral, (venta as any).total))}</strong></td>
            </tr>`,
            )
            .join("")}
          <tr class="subtotal">
            <td colspan="3" class="right">SUBTOTAL:</td>
            <td class="right">${money(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-row">
        <div class="card">
          <h3>DATOS BANCARIOS</h3>
          <div style="font-weight:700; margin:6px 0 4px;">Andrés Karam Lugo</div>
          <div style="color:${MUTED_TEXT};">Banco: Santander</div>
          <div style="color:${MUTED_TEXT};">Numero de tarjeta: 5579 0701 3776 4331</div>
          <div style="color:${MUTED_TEXT};">Numero de cuenta: 60625713916</div>
          <div style="color:${MUTED_TEXT};">CLABE: 014190606257139163</div>
        </div>
        <div class="card fin">
          <h3>RESUMEN FINANCIERO</h3>
          <div class="line"><span>Gran Total:</span><strong>${money(granTotal)}</strong></div>
          <div class="line"><span>Descuento:</span><strong>-${money(descuentoTotal)}</strong></div>
          <div class="line"><span>Subtotal:</span><strong>${money(subtotalConDescuento)}</strong></div>
          <div class="line"><span>I.V.A. (${ivaPct}%):</span><strong>${money(ivaTotal)}</strong></div>
          <div class="line total"><span>TOTAL:</span><span>${money(total)}</span></div>
        </div>
      </div>

      <div class="foot">
        <div>
          <div class="title">CONTACTO</div>
          <div>Email: ${esc(config.email || "-")}</div>
          <div>Tel: ${esc(config.telefono || "-")}</div>
        </div>
        <div>
          <div class="title">SITIO WEB</div>
          <div>Web: www.thegoodmark.com</div>
        </div>
        <div>
          <div class="title">OFICINA</div>
          <div>${esc(config.direccion || "Durango, DGO")}</div>
        </div>
      </div>

      <div class="legal">
        ${esc(config.nombreEmpresa || "The Good Mark")} © ${new Date().getFullYear()} • Orden de venta sujeta a firma de contrato
      </div>
    </div>
  `;
};

/**
 * Genera y descarga un PDF real a partir del diseño HTML.
 */
export const generarPDFOrden = async (
  orden: OrdenDeCompra,
  config: ConfiguracionEmpresa,
  nombreUsuario: string,
): Promise<void> => {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-10000px";
  root.style.top = "0";
  root.style.width = "960px";
  root.style.background = "#ffffff";
  root.innerHTML = buildCotizacionHTML(orden, config, nombreUsuario);
  document.body.appendChild(root);

  try {
    const source = root.firstElementChild as HTMLElement | null;
    if (!source) throw new Error("No se pudo renderizar el contenido de la orden de venta");

    const canvas = await html2canvas(source, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const contentWidth = pageWidth - margin * 2;

    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let y = margin;
    pdf.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= (pageHeight - margin * 2);

    while (heightLeft > 0) {
      pdf.addPage();
      y = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= (pageHeight - margin * 2);
    }

    pdf.save(`OrdenVenta-${orden.numeroOrden}.pdf`);
  } finally {
    document.body.removeChild(root);
  }
};
