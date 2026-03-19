import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Venta } from "../types/ventas";

interface PDFVentaDocumentProps {
  venta: Venta;
}

const BRAND = {
  navy: "#002878",
  lightGray: "#f3f4f6",
  border: "#d1d5db",
  textGray: "#4b5563",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", backgroundColor: "#ffffff" },
  
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30, alignItems: "center" },
  logoText: { fontSize: 24, fontFamily: "Helvetica-Bold", color: BRAND.navy, letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  cotizacionTitle: { fontSize: 28, fontFamily: "Helvetica-Bold", color: BRAND.navy },
  headerSubText: { fontSize: 9, color: BRAND.textGray, marginTop: 2 },

  // Secciones de información (cuadros superiores)
  infoContainer: { flexDirection: "row", gap: 15, marginBottom: 20 },
  infoBox: { 
    flex: 1, 
    border: `1.5px solid ${BRAND.navy}`, 
    borderRadius: 8, 
    padding: 10 
  },
  infoBoxTitle: { 
    fontSize: 9, 
    fontFamily: "Helvetica-Bold", 
    color: BRAND.navy, 
    borderBottom: `1px solid ${BRAND.navy}`,
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: "uppercase"
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  infoLabel: { color: BRAND.textGray },
  infoValue: { fontFamily: "Helvetica-Bold" },

  // Tabla de productos
  tableTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND.navy,
    padding: 6,
    borderRadius: 2,
  },
  tableHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  tableRow: { flexDirection: "row", padding: 8, borderBottom: `1px solid ${BRAND.lightGray}` },
  subTotalRow: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    padding: 8, 
    backgroundColor: BRAND.lightGray,
    marginTop: 2
  },

  // Sección Inferior (Pago y Resumen)
  bottomSection: { flexDirection: "row", gap: 15, marginTop: 20 },
  paymentBox: { 
    flex: 1.2, 
    border: `1.5px solid ${BRAND.navy}`, 
    borderRadius: 10, 
    padding: 12 
  },
  summaryBox: { 
    flex: 1, 
    border: `1.5px solid ${BRAND.navy}`, 
    borderRadius: 10, 
    padding: 12 
  },
  totalBig: { 
    fontSize: 24, 
    fontFamily: "Helvetica-Bold", 
    color: BRAND.navy, 
    textAlign: "right", 
    marginTop: 10 
  },

  // Términos y Condiciones
  termsBox: {
    marginTop: 20,
    padding: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  termItem: { fontSize: 7, color: BRAND.textGray, marginBottom: 2 },

  // Footer
  footer: { 
    marginTop: "auto", 
    flexDirection: "row", 
    justifyContent: "space-between",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 15
  },
  footerCol: { width: "30%" },
  footerLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 3 },
  footerText: { fontSize: 7, color: BRAND.textGray },
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(value);

export const PDFVentaDocument: React.FC<PDFVentaDocumentProps> = ({ venta }) => {
  const today = new Date().toLocaleDateString("es-MX");
  const subtotal = venta.precio_total || 0;
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logoText}>THE GOOD MARK</Text>
            <Text style={styles.headerSubText}>administracion@thegoodmark.com.mx</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.cotizacionTitle}>COTIZACIÓN</Text>
            <Text style={styles.headerSubText}>Fecha: {today}</Text>
            <Text style={styles.headerSubText}>Vigencia: 30 días</Text>
          </View>
        </View>

        {/* Info Boxes */}
        <View style={styles.infoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Información del Servicio</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duración:</Text>
              <Text style={styles.infoValue}>{venta.duracion_meses} Mes</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inicio:</Text>
              <Text style={styles.infoValue}>{new Date(venta.fecha_inicio).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Beneficios</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Productos:</Text>
              <Text style={styles.infoValue}>1</Text>
            </View>
          </View>
        </View>

        {/* Tabla */}
        <Text style={styles.tableTitle}>DETALLE DE PRODUCTOS Y SERVICIOS</Text>
        <View style={styles.tableHeader}>
          <Text style={{ width: "5%", color: "#fff", fontSize: 8 }}>#</Text>
          <Text style={{ width: "55%", color: "#fff", fontSize: 8 }}>DESCRIPCIÓN</Text>
          <Text style={{ width: "25%", color: "#fff", fontSize: 8 }}>PAQUETE</Text>
          <Text style={{ width: "15%", color: "#fff", fontSize: 8, textAlign: "right" }}>PRECIO</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={{ width: "5%", fontFamily: "Helvetica-Bold" }}>1</Text>
          <View style={{ width: "55%" }}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: BRAND.navy }}>
              {venta.pantalla?.nombre || "PUNTO DE VENTA"}
            </Text>
            <Text style={{ fontSize: 7, color: "#999", marginTop: 2 }}>
              {venta.producto?.nombre || "Servicio publicitario"}
            </Text>
          </View>
          <Text style={{ width: "25%", fontSize: 8 }}>ESTÁNDAR</Text>
          <Text style={{ width: "15%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>{formatCurrency(subtotal)}</Text>
        </View>

        <View style={styles.subTotalRow}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginRight: 20 }}>SUBTOTAL:</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", color: BRAND.navy }}>{formatCurrency(subtotal)}</Text>
        </View>

        {/* Sección de Pago y Resumen */}
        <View style={styles.bottomSection}>
          <View style={styles.paymentBox}>
            <Text style={styles.infoBoxTitle}>Información de Pago</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 5 }}>Andrés Karam Lugo</Text>
            <Text style={styles.infoRow}><Text style={styles.infoLabel}>RFC:</Text> KALA990722BI8</Text>
            <Text style={styles.infoRow}><Text style={styles.infoLabel}>Banco:</Text> Santander</Text>
            <Text style={styles.infoRow}><Text style={styles.infoLabel}>CLABE:</Text> 014190606257139163</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.infoBoxTitle}>Resumen Financiero</Text>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Gran Total:</Text><Text>{formatCurrency(subtotal)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>I.V.A. (16%):</Text><Text>{formatCurrency(iva)}</Text></View>
            <Text style={styles.totalBig}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Términos */}
        <View style={styles.termsBox}>
          <View>
            <Text style={styles.infoBoxTitle}>Términos y Condiciones</Text>
            <Text style={styles.termItem}>• Vigencia: 30 días naturales</Text>
            <Text style={styles.termItem}>• Precios sujetos a disponibilidad</Text>
          </View>
          <View style={{ marginTop: 15 }}>
            <Text style={styles.termItem}>• Soporte técnico incluido</Text>
            <Text style={styles.termItem}>• Penalizaciones por cancelación</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>CONTACTO</Text>
            <Text style={styles.footerText}>Email: administracion@thegoodmark.com.mx</Text>
            <Text style={styles.footerText}>Tel: +52 618 103 2038</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>SITIO WEB</Text>
            <Text style={styles.footerText}>www.thegoodmark.com</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>OFICINA</Text>
            <Text style={styles.footerText}>Blvd. Domingo Arrieta 904, Durango, DGO</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};