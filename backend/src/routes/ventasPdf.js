import { Router } from "express";
import PDFDocument from "pdfkit";
import { supabase } from "../config/supabase.js";

const router = Router();

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: venta, error } = await supabase
      .from("ventas")
      .select(
        "*, colaborador:colaboradores(id, nombre, email, telefono, pantalla:pantallas(id, nombre), producto:productos(id, nombre, precio)), tipo_pago(id, nombre)"
      )
      .eq("id", id)
      .single();

    if (error || !venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    // Construir nombre de archivo: OC_<Pantalla>_<Mes>_<Año>.pdf
    const fecha = new Date(venta.fecha_inicio || new Date());
    const mesNombre = fecha.toLocaleDateString("es-MX", { month: "long" });
    const anio = fecha.getFullYear();
    const pantallaNombre = (venta.colaborador?.pantalla?.nombre || "Sin_Pantalla")
      .replace(/\s+/g, "_")
      .replace(/[^A-Za-z0-9_ÁÉÍÓÚáéíóúÑñ]/g, "");
    const fileName = `OC_${pantallaNombre}_${mesNombre}_${anio}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    const doc = new PDFDocument({ size: "LETTER", margin: 40 });
    doc.pipe(res);

    const AZUL = "#002878";
    const GRIS_CLARO = "#f3f4f6";
    const GRIS_TEXTO = "#4b5563";

    const precioTotal = Number(venta.precio_total || 0);
    const meses = Math.max(1, Number(venta.duracion_meses) || 1);
    const precioPorMes =
      venta.precio_por_mes != null
        ? Number(venta.precio_por_mes)
        : precioTotal / meses;
    const costos = Number(venta.costos ?? 0);
    const utilidadNeta =
      venta.utilidad_neta != null ? Number(venta.utilidad_neta) : precioTotal - costos;
    const nombreClienteDoc = venta.client_name || venta.colaborador?.nombre || "";

    const fechaInicioDate = new Date(
      venta.fecha_inicio || new Date().toISOString().slice(0, 10)
    );
    const fechaInicioTexto = fechaInicioDate.toLocaleDateString("es-MX");

    // ===== HEADER SUPERIOR: LOGO + COTIZACIÓN =====
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("THE GOOD MARK", 40, 40);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(GRIS_TEXTO)
      .text("administracion@thegoodmark.com.mx", 40, 60);

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("ORDEN DE COMPRA", 0, 40, { align: "right" });

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(GRIS_TEXTO)
      .text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 0, 65, {
        align: "right",
      });
    doc
      .text("Vigencia: 30 días", 0, 78, { align: "right" });
    if (nombreClienteDoc) {
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(GRIS_TEXTO)
        .text(`Cliente: ${nombreClienteDoc}`, 0, 91, { align: "right" });
    }

    // línea azul
    const lineaHeaderY = nombreClienteDoc ? 108 : 95;
    doc
      .moveTo(40, lineaHeaderY)
      .lineTo(doc.page.width - 40, lineaHeaderY)
      .strokeColor(AZUL)
      .lineWidth(2)
      .stroke();

    // ===== CAJAS SUPERIORES: INFORMACIÓN DEL SERVICIO / BENEFICIOS =====
    const boxTopY = nombreClienteDoc ? 118 : 110;
    const boxWidth = (doc.page.width - 40 * 2 - 10) / 2;

    // Información del servicio
    doc
      .rect(40, boxTopY, boxWidth, 70)
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .stroke();
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("INFORMACIÓN DEL SERVICIO", 48, boxTopY + 6);

    doc.fontSize(8).font("Helvetica").fillColor(GRIS_TEXTO);
    doc.text("Duración:", 48, boxTopY + 26);
    doc.text(
      `${venta.duracion_meses} Mes`,
      0,
      boxTopY + 26,
      { align: "right", width: boxWidth - 16 }
    );

    doc.text("Inicio:", 48, boxTopY + 40);
    doc.text(
      fechaInicioTexto,
      0,
      boxTopY + 40,
      { align: "right", width: boxWidth - 16 }
    );

    doc.text("Descuento:", 48, boxTopY + 54);
    doc
      .fillColor("#16a34a")
      .text("0%", 0, boxTopY + 54, {
        align: "right",
        width: boxWidth - 16,
      });

    // Beneficios
    doc
      .rect(40 + boxWidth + 10, boxTopY, boxWidth, 70)
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .stroke();
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("OTROS SERVICIOS", 40 + boxWidth + 18, boxTopY + 6);

    doc.fontSize(8).font("Helvetica").fillColor(GRIS_TEXTO);
    doc.text("Productos:", 40 + boxWidth + 18, boxTopY + 26);
    doc.text("1", 0, boxTopY + 26, {
      align: "right",
      width: boxWidth - 16,
    });

    // ===== TÍTULO TABLA =====
    let y = boxTopY + 90;
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("DETALLE DE PRODUCTOS Y SERVICIOS", 40, y);

    y += 14;

    const col1 = 30; // #
    const col2 = 260; // descripción
    const col3 = 120; // paquete
    const col4 = 80; // precio

    // Header tabla
    doc
      .rect(40, y, col1 + col2 + col3 + col4, 18)
      .fill(AZUL);
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("#", 44, y + 5, { width: col1 - 4 });
    doc.text("DESCRIPCIÓN", 40 + col1, y + 5, { width: col2 - 8 });
    doc.text("PAQUETE", 40 + col1 + col2, y + 5, {
      width: col3 - 8,
      align: "left",
    });
    doc.text("PRECIO", 40 + col1 + col2 + col3, y + 5, {
      width: col4 - 8,
      align: "right",
    });

    y += 18;
    doc.fillColor("#000000");

    // Fila principal (sin cantidad en BD; total del contrato)
    doc
      .fontSize(8)
      .font("Helvetica")
      .rect(40, y, col1 + col2 + col3 + col4, 18)
      .strokeColor(GRIS_CLARO)
      .stroke();

    doc.text("1", 44, y + 4, { width: col1 - 4 });
    doc
      .font("Helvetica-Bold")
      .text(venta.colaborador?.pantalla?.nombre || "Pantalla", 40 + col1, y + 4, {
        width: col2 - 8,
      });
    doc
      .font("Helvetica")
      .text("PUNTO DE PARTIDA", 40 + col1 + col2, y + 4, {
        width: col3 - 8,
      });
    doc.text(
      `$${precioTotal.toFixed(2)}`,
      40 + col1 + col2 + col3,
      y + 4,
      { width: col4 - 8, align: "right" }
    );

    y += 18;

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("TOTAL CONTRATO:", 40 + col1 + col2 + col3 - 20, y + 4, {
        width: col3,
        align: "right",
      });
    doc.text(
      `$${precioTotal.toFixed(2)}`,
      40 + col1 + col2 + col3,
      y + 4,
      { width: col4 - 8, align: "right" }
    );

    // ===== INFORMACIÓN DE PAGO Y RESUMEN FINANCIERO =====
    const bottomY = y + 40;

    // Info pago
    const boxPayWidth = (doc.page.width - 40 * 2 - 10) / 2;
    doc
      .rect(40, bottomY, boxPayWidth, 90)
      .strokeColor("#d1d5db")
      .stroke();
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("INFORMACIÓN DE PAGO", 48, bottomY + 6);

    doc.fontSize(8).font("Helvetica").fillColor(GRIS_TEXTO);
    let yp = bottomY + 26;
    doc.text("Andrés Karam Lugo", 48, yp);
    yp += 12;
    doc.text("RFC: KALA990722BI8", 48, yp);
    yp += 12;
    doc.text("Banco: Santander", 48, yp);
    yp += 12;
    doc.text("Número de tarjeta: 5579 0701 3776 4331", 48, yp);
    yp += 12;
    doc.text("Número de cuenta: 60625713916", 48, yp);
    yp += 12;
    doc.text("CLABE: 014190606257139163", 48, yp);

    // Resumen financiero
    const rightX = 40 + boxPayWidth + 10;
    doc
      .rect(rightX, bottomY, boxPayWidth, 90)
      .strokeColor("#d1d5db")
      .stroke();
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("RESUMEN FINANCIERO", rightX + 8, bottomY + 6);

    doc.fontSize(8).font("Helvetica").fillColor(GRIS_TEXTO);
    let yr = bottomY + 26;
    const lineW = boxPayWidth - 16;

    const drawRow = (label, value) => {
      doc.text(label, rightX + 8, yr, { width: lineW / 2 });
      doc.text(value, rightX + 8 + lineW / 2, yr, {
        width: lineW / 2,
        align: "right",
      });
      yr += 12;
    };

    drawRow("Precio total:", `$${precioTotal.toFixed(2)}`);
    drawRow("Precio por mes:", `$${precioPorMes.toFixed(2)}`);
    drawRow("Costos:", `$${costos.toFixed(2)}`);
    drawRow("Utilidad neta:", `$${utilidadNeta.toFixed(2)}`);

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text(`$${precioTotal.toFixed(2)}`, rightX + 8, yr + 4, {
        width: lineW,
        align: "right",
      });

    // ===== TÉRMINOS Y FOOTER =====
    const termsY = bottomY + 100;
    doc
      .rect(40, termsY, doc.page.width - 80, 70)
      .strokeColor("#d1d5db")
      .stroke();

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("TÉRMINOS Y CONDICIONES", 48, termsY + 6);

    doc.fontSize(7).font("Helvetica").fillColor(GRIS_TEXTO);
    doc.text("• Vigencia: 30 días naturales", 48, termsY + 24);
    doc.text("• Precios sujetos a disponibilidad", 48, termsY + 36);
    doc.text("• Inicio tras firma y pago inicial", 48, termsY + 48);
    doc.text("• Creativos 5 días hábiles antes", 260, termsY + 24);
    doc.text("• Soporte técnico incluido", 260, termsY + 36);
    doc.text("• Penalizaciones por cancelación", 260, termsY + 48);

    const footerY = termsY + 80;
    const colW = (doc.page.width - 80) / 3;

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("CONTACTO", 40, footerY);
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(GRIS_TEXTO)
      .text("Email: administracion@thegoodmark.com.mx", 40, footerY + 12);
    doc.text("Tel: +52 618 103 2038", 40, footerY + 24);

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("SITIO WEB", 40 + colW, footerY);
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(GRIS_TEXTO)
      .text("Web: www.thegoodmark.com", 40 + colW, footerY + 12);

    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(AZUL)
      .text("OFICINA", 40 + colW * 2, footerY);
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(GRIS_TEXTO)
      .text("Blvd. Domingo Arrieta 904", 40 + colW * 2, footerY + 12);
    doc.text("CP 34150, Durango, DGO", 40 + colW * 2, footerY + 24);

    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(
        `The Good Mark © ${new Date().getFullYear()} • Cotización sujeta a firma de contrato`,
        40,
        footerY + 46,
        { width: doc.page.width - 80, align: "center" }
      );

    doc.end();
  } catch (err) {
    next(err);
  }
});

export default router;

