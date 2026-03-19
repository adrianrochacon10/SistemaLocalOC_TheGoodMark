import { OrdenDeCompra, ConfiguracionEmpresa } from "../types";

/**
 * Genera un PDF de la orden de compra en HTML imprimible
 * Crea un diseño personalizado profesional
 */
export const generarPDFOrden = (
  orden: OrdenDeCompra,
  config: ConfiguracionEmpresa,
  nombreUsuario: string
): void => {
  const mesFormato = new Date(orden.año ?? 0, orden.mes ?? 0).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const fechaFormato = new Date(orden.fecha).toLocaleDateString("es-MX");

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Orden de Compra - ${orden.numeroOrden}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          background: white;
          padding: 20px;
        }
        
        .container {
          max-width: 850px;
          margin: 0 auto;
          background: white;
          padding: 40px;
        }
        
        .header {
          background: linear-gradient(135deg, #1461a1 0%, #0e4a7a 100%);
          color: white;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 30px;
          box-shadow: 0 2px 10px rgba(20, 97, 161, 0.2);
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .header h1 {
          font-size: 36px;
          margin-bottom: 5px;
          font-weight: 700;
        }
        
        .header p {
          font-size: 13px;
          opacity: 0.95;
          margin: 3px 0;
        }
        
        .numero-orden {
          text-align: right;
        }
        
        .numero-orden .label {
          font-size: 11px;
          opacity: 0.9;
        }
        
        .numero-orden .valor {
          font-size: 24px;
          font-weight: 700;
          margin-top: 5px;
        }
        
        .company-section {
          margin-bottom: 30px;
        }
        
        .company-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }
        
        .info-block h3 {
          color: #1461a1;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
        
        .info-block p {
          font-size: 13px;
          line-height: 1.6;
          color: #555;
        }
        
        .info-block strong {
          color: #333;
          display: block;
          font-size: 14px;
          margin-bottom: 5px;
        }
        
        .table-section {
          margin: 30px 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        thead {
          background: #0e4a7a;
          color: white;
        }
        
        th {
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        td {
          padding: 12px;
          font-size: 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        tbody tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        tbody tr:hover {
          background: #f0f5f9;
        }
        
        .text-right {
          text-align: right;
        }
        
        .text-center {
          text-align: center;
        }
        
        .totales-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 30px;
          gap: 40px;
        }
        
        .totales-column {
          min-width: 250px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
        }
        
        .total-row.subtotal .label {
          font-weight: 600;
          color: #333;
        }
        
        .total-row.iva .label {
          font-weight: 600;
          color: #333;
        }
        
        .total-row.total {
          background: #1461a1;
          color: white;
          padding: 15px;
          border-radius: 6px;
          border-bottom: none;
          font-weight: 700;
          font-size: 16px;
          margin-top: 10px;
        }
        
        .total-row .label {
          flex: 1;
        }
        
        .total-row .valor {
          text-align: right;
          min-width: 80px;
          font-weight: 600;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #666;
        }
        
        .footer-item {
          text-align: center;
          flex: 1;
        }
        
        @media print {
          body {
            padding: 0;
          }
          .container {
            padding: 0;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            <div>
              <h1>ORDEN DE COMPRA</h1>
              <p>en línea</p>
            </div>
            <div class="numero-orden">
              <div class="label">Número de Orden</div>
              <div class="valor">${orden.numeroOrden}</div>
            </div>
          </div>
        </div>
        
        <div class="company-section">
          <div class="company-info">
            <div class="info-block">
              <h3>Empresa</h3>
              <strong>${config.nombreEmpresa}</strong>
              ${config.rfc ? `<p><strong>RFC:</strong> ${config.rfc}</p>` : ""}
              ${config.direccion ? `<p>${config.direccion}</p>` : ""}
              ${config.telefono ? `<p>${config.telefono}</p>` : ""}
              ${config.email ? `<p>${config.email}</p>` : ""}
            </div>
            <div class="info-block">
              <h3>Información de la Orden</h3>
              <p><strong>Fecha de Emisión:</strong> ${fechaFormato}</p>
              <p><strong>Período:</strong> ${mesFormato}</p>
              <p><strong>Exportado por:</strong> ${nombreUsuario}</p>
            </div>
          </div>
        </div>
        
        <div class="table-section">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Vendido a</th>
                <th class="text-center">Pantallas</th>
                <th class="text-center">Período</th>
                <th class="text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${(orden.registrosVenta ?? []).map(venta => `
                <tr>
                  <td>${venta.clienteId.substring(0, 20)}</td>
                  <td>${venta.vendidoA.substring(0, 25)}</td>
                  <td class="text-center">${venta.pantallasIds.length}</td>
                  <td class="text-center">${new Date(venta.fechaInicio).toLocaleDateString("es-MX")} - ${new Date(venta.fechaFin).toLocaleDateString("es-MX")}</td>
                  <td class="text-right"><strong>$${venta.precioGeneral.toFixed(2)}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        
        <div class="totales-section">
          <div class="totales-column">
            <div class="total-row subtotal">
              <span class="label">Subtotal</span>
              <span class="valor">$${(orden.subtotal ?? 0).toFixed(2)}</span>
            </div>
            <div class="total-row iva">
              <span class="label">I.V.A. (${orden.ivaPercentaje ?? 0}%)</span>
              <span class="valor">$${(orden.ivaTotal ?? 0).toFixed(2)}</span>
            </div>
            <div class="total-row total">
              <span class="label">TOTAL</span>
              <span class="valor">$${(orden.total ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-item">
            <p>Documento generado automáticamente</p>
          </div>
          <div class="footer-item">
            <p>${new Date().toLocaleDateString("es-MX")}</p>
          </div>
        </div>
      </div>
      
      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

  // Crear un blob y descargar
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `OrdendeCompra-${orden.numeroOrden}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
