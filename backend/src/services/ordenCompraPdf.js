import PDFDocument from "pdfkit";
import { obtenerConVentas } from "./ordenesService.js";

const AZUL = "#002878";
const GRIS_TEXTO = "#4b5563";

/**
 * Express handler: GET /api/ordenes/:id/pdf
 */
export async function streamOrdenCompraPdf(req, res, next) {
  try {
    const { id } = req.params;
    const data = await obtenerConVentas(id);
    if (!data) {
      return res.status(404).json({ error: "Orden de compra no encontrada" });
    }

    const { mes, anio, subtotal, iva, total, colaborador, ventas = [] } = data;
    const mesNombre = new Date(anio, mes - 1, 1).toLocaleDateString("es-MX", {
      month: "long",
    });
    const pantallaNombre = (colaborador?.pantalla?.nombre || "Sin_Pantalla")
      .replace(/\s+/g, "_")
      .replace(/[^A-Za-z0-9_ÁÉÍÓÚáéíóúÑñ]/g, "");
    const fileName = `OC_${pantallaNombre}_${mesNombre}_${anio}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ size: "LETTER", margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).font("Helvetica-Bold").fillColor(AZUL).text("THE GOOD MARK", 40, 40);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(GRIS_TEXTO)
      .text("administracion@thegoodmark.com.mx", 40, 60);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("ORDEN DE COMPRA", 0, 42, { align: "right" });

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(GRIS_TEXTO)
      .text(`Periodo: ${mesNombre} ${anio}`, 0, 64, { align: "right" });
    doc.text(`Folio: ${id.slice(0, 8)}…`, 0, 76, { align: "right" });

    const nomColab = colaborador?.nombre || "—";
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(GRIS_TEXTO)
      .text(`Colaborador: ${nomColab}`, 0, 90, { align: "right" });

    const lineY = 108;
    doc.moveTo(40, lineY).lineTo(doc.page.width - 40, lineY).strokeColor(AZUL).lineWidth(2).stroke();

    let y = lineY + 20;
    doc.fontSize(10).font("Helvetica-Bold").fillColor(AZUL).text("Detalle de ventas del periodo", 40, y);
    y += 22;

    const colDesc = 320;
    const colFecha = 90;
    const colPrecio = 80;
    const rowH = 16;

    doc.rect(40, y, colDesc + colFecha + colPrecio, 18).fill(AZUL);
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#fff");
    doc.text("Descripción / pantalla", 44, y + 5, { width: colDesc - 8 });
    doc.text("Inicio", 40 + colDesc, y + 5, { width: colFecha - 8 });
    doc.text("Importe", 40 + colDesc + colFecha, y + 5, {
      width: colPrecio - 8,
      align: "right",
    });
    y += 18;
    doc.fillColor("#000000");

    for (const v of ventas) {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 40;
      }
      const desc =
        v.colaborador?.pantalla?.nombre ||
        v.client_name ||
        v.colaborador?.nombre ||
        "Venta";
      const fi = v.fecha_inicio
        ? new Date(v.fecha_inicio).toLocaleDateString("es-MX")
        : "—";
      const pt = Number(v.precio_total || 0);

      doc
        .fontSize(8)
        .font("Helvetica")
        .rect(40, y, colDesc + colFecha + colPrecio, rowH)
        .strokeColor("#e5e7eb")
        .stroke();
      doc.text(desc, 44, y + 4, { width: colDesc - 8 });
      doc.text(fi, 40 + colDesc, y + 4, { width: colFecha - 8 });
      doc.text(`$${pt.toFixed(2)}`, 40 + colDesc + colFecha, y + 4, {
        width: colPrecio - 8,
        align: "right",
      });
      y += rowH;
    }

    y += 16;
    const boxW = 220;
    const boxX = doc.page.width - 40 - boxW;
    doc.fontSize(9).font("Helvetica").fillColor(GRIS_TEXTO);
    doc.text("Subtotal:", boxX, y, { width: boxW / 2 });
    doc.text(`$${Number(subtotal).toFixed(2)}`, boxX + boxW / 2, y, {
      width: boxW / 2,
      align: "right",
    });
    y += 14;
    doc.text("IVA (16%):", boxX, y, { width: boxW / 2 });
    doc.text(`$${Number(iva).toFixed(2)}`, boxX + boxW / 2, y, {
      width: boxW / 2,
      align: "right",
    });
    y += 18;
    doc.fontSize(12).font("Helvetica-Bold").fillColor(AZUL);
    doc.text("Total:", boxX, y, { width: boxW / 2 });
    doc.text(`$${Number(total).toFixed(2)}`, boxX + boxW / 2, y, {
      width: boxW / 2,
      align: "right",
    });

    y += 36;
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(
        `The Good Mark © ${new Date().getFullYear()} • Documento generado desde orden_de_compra`,
        40,
        y,
        { width: doc.page.width - 80, align: "center" }
      );

    doc.end();
  } catch (err) {
    next(err);
  }
}
