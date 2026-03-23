import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { OrdenDeCompra, ConfiguracionEmpresa } from "../types";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const buildCotizacionHTML = (
  orden: OrdenDeCompra,
  config: ConfiguracionEmpresa,
  _nombreUsuario: string,
): string => {
  const mesFormato = new Date(orden.año ?? 0, orden.mes ?? 0).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  const fechaFormato = new Date(orden.fecha).toLocaleDateString("es-MX");
  const registros = orden.registrosVenta ?? [];
  const subtotal = Number(orden.subtotal ?? 0);
  const ivaPct = Number(orden.ivaPercentaje ?? config.ivaPercentaje ?? 0);
  const ivaTotal = Number(orden.ivaTotal ?? 0);
  const total = Number(orden.total ?? 0);
  const granTotal = subtotal + ivaTotal;
  const descuento = Math.max(0, granTotal - total);
  const vigenciaDias = 30;
  const duracionMeses =
    registros.length > 0
      ? Math.max(...registros.map((r) => Number(r.mesesRenta || 1)))
      : 1;

  return `
    <div class="container">
      <style>
        * { box-sizing: border-box; }
        .container {
          width: 960px;
          margin: 0 auto;
          background: #f7f9fc;
          border: 1px solid #dbe5f2;
          border-radius: 14px;
          padding: 28px 30px 22px;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: linear-gradient(120deg, #ffffff 0%, #f0f5ff 100%);
          border: 1px solid #d9e4ff;
          border-left: 6px solid #0d3488;
          border-radius: 12px;
          padding: 16px 18px;
          box-shadow: 0 2px 8px rgba(13, 52, 136, 0.06);
        }
        .brand h1 {
          color: #0d3488;
          font-size: 34px;
          margin: 0;
          font-weight: 900;
          letter-spacing: 0.3px;
        }
        .brand .email {
          margin-top: 7px;
          color: #475569;
          font-size: 13px;
        }
        .quote {
          text-align: right;
          background: #ffffff;
          border: 1px solid #dbe5f2;
          border-radius: 10px;
          padding: 8px 12px;
          min-width: 230px;
        }
        .quote h2 {
          color: #0d3488;
          margin: 0 0 2px;
          font-size: 34px;
          line-height: 1;
          letter-spacing: 1px;
        }
        .quote p { margin: 4px 0 0; color: #64748b; font-size: 12px; }
        .row {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .card {
          border: 1px solid #dbe5f2;
          border-radius: 12px;
          padding: 12px 14px;
          background: #ffffff;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.04);
        }
        .card h3 {
          margin: 0 0 10px;
          color: #0d3488;
          border-bottom: 1px solid #d9e4ff;
          font-size: 14px;
          letter-spacing: 0.4px;
          padding-bottom: 7px;
        }
        .kv { display: flex; justify-content: space-between; margin: 6px 0; font-size: 14px; }
        .kv span:first-child { color: #334155; }
        .kv .val { font-weight: 800; color: #0f172a; }
        .green { color: #1a8f36; }
        .section-title {
          margin: 18px 0 8px;
          color: #0d3488;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.35px;
          text-transform: uppercase;
          border-bottom: 2px solid #0d3488;
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
        thead tr { background: #0d3488; color: #fff; }
        th { text-align: left; padding: 9px 8px; font-size: 12px; letter-spacing: 0.2px; }
        td { padding: 9px 8px; border-bottom: 1px solid #e5eaf4; vertical-align: top; font-size: 13px; }
        tbody tr:nth-child(even) td { background: #fafcff; }
        .muted { font-size: 11px; color: #475569; margin-top: 2px; }
        .right { text-align: right; }
        .subtotal td {
          background: #f0f5ff !important;
          font-weight: 800;
          border-bottom: none;
        }
        .footer-row {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
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
          font-size: 28px;
          font-weight: 900;
          color: #0d3488;
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
          color: #0d3488;
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
          margin-top: 14px;
          border-top: 2px solid #0d3488;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #475569;
        }
        .foot .title { color: #0d3488; font-weight: 800; margin-bottom: 2px; font-size: 11px; }
        .legal { margin-top: 10px; text-align: center; font-size: 10px; color: #94a3b8; }
      </style>

      <div class="top">
        <div class="brand">
          <h1>${esc(config.nombreEmpresa || "THE GOOD MARK").toUpperCase()}</h1>
          <div class="email">${esc(config.email || "administracion@thegoodmark.com.mx")}</div>
        </div>
        <div class="quote">
          <h2>ORDEN DE VENTA</h2>
          <p>Folio: ${esc(orden.numeroOrden)}</p>
          <p>Fecha: ${esc(fechaFormato)}</p>
          <p>Periodo: ${esc(mesFormato)}</p>
        </div>
      </div>

      <div class="row">
        <div class="card">
          <h3>INFORMACION DEL SERVICIO</h3>
          <div class="kv"><span>Duracion:</span><span class="val">${duracionMeses} Mes${duracionMeses === 1 ? "" : "es"}</span></div>
          <div class="kv"><span>Inicio:</span><span class="val">${esc(fechaFormato)}</span></div>
          <div class="kv"><span>Periodo:</span><span class="val">${esc(mesFormato)}</span></div>
          <div class="kv"><span>Descuento:</span><span class="val green">${descuento > 0 ? Math.round((descuento / (granTotal || 1)) * 100) : 0}%</span></div>
        </div>
        <div class="card">
          <h3>PRODUCTOS</h3>
          <div class="kv"><span>Productos:</span><span class="val">${registros.length}</span></div>
          <div class="kv"><span>Pantallas:</span><span class="val">${registros.reduce((acc, r) => acc + (r.pantallasIds?.length || 0), 0)}</span></div>
          <div class="kv"><span>Documento:</span><span class="val">Orden de venta</span></div>
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
                <div><strong>${esc((venta.vendidoA || "SERVICIO").toUpperCase())}</strong></div>
                <div class="muted">Periodo: ${esc(new Date(venta.fechaInicio).toLocaleDateString("es-MX"))} - ${esc(new Date(venta.fechaFin).toLocaleDateString("es-MX"))}</div>
                <div class="muted">Pantallas: ${venta.pantallasIds?.length || 0}</div>
              </td>
              <td>${Number(venta.mesesRenta || 1)} Mes${Number(venta.mesesRenta || 1) === 1 ? "" : "es"}</td>
              <td class="right"><strong>$${money(Number(venta.importeTotal ?? venta.precioGeneral ?? 0))}</strong></td>
            </tr>`,
            )
            .join("")}
          <tr class="subtotal">
            <td colspan="3" class="right">SUBTOTAL:</td>
            <td class="right">$${money(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-row">
        <div class="card">
          <h3>INFORMACION DE PAGO</h3>
          <div style="font-weight:700; margin:6px 0 4px;">${esc(config.nombreEmpresa || "The Good Mark")}</div>
          ${config.rfc ? `<div>RFC: ${esc(config.rfc)}</div>` : ""}
          ${config.telefono ? `<div>Tel: ${esc(config.telefono)}</div>` : ""}
          ${config.email ? `<div>Email: ${esc(config.email)}</div>` : ""}
          ${config.direccion ? `<div>Direccion: ${esc(config.direccion)}</div>` : ""}
        </div>
        <div class="card fin">
          <h3>RESUMEN FINANCIERO</h3>
          <div class="line"><span>Gran Total:</span><strong>$${money(granTotal)}</strong></div>
          <div class="line"><span>Descuento:</span><strong style="color:#1a8f36;">-$${money(descuento)}</strong></div>
          <div class="line"><span>Subtotal:</span><strong>$${money(subtotal)}</strong></div>
          <div class="line"><span>I.V.A. (${ivaPct}%):</span><strong>$${money(ivaTotal)}</strong></div>
          <div class="line total"><span>TOTAL:</span><span>$${money(total)}</span></div>
        </div>
      </div>

      <div class="terms">
        <h4>TERMINOS Y CONDICIONES</h4>
        <ul>
          <li>Vigencia: ${vigenciaDias} dias naturales</li>
          <li>Precios sujetos a disponibilidad</li>
          <li>Inicio tras firma y pago inicial</li>
          <li>Creativos 5 dias habiles antes</li>
          <li>Soporte tecnico incluido</li>
          <li>Penalizaciones por cancelacion</li>
        </ul>
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
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
