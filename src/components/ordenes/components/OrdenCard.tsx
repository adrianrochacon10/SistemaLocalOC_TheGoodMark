import React, { useState, useMemo } from "react";
import {
  OrdenDeCompra,
  Colaborador,
  Pantalla,
  ConfiguracionEmpresa,
  Usuario,
  RegistroVenta,
} from "../../../types";
import { exportarPDFOrden } from "../../../utils/pdfGenerator";
import { nombrePantallaDesdeVentaYCatalogo } from "../../../utils/ordenCompraLineas";
import {
  detallePantallaId,
  detallePrecioMensual,
  esLineaPrecioProductoEnDetalle,
} from "../../../utils/ordenApiMapper";
import {
  importeLineaRespectoOrden,
  costoVentaProporcionalImporte,
  colaboradorUsaCostoComoBaseOrden,
  importeLineaOrdenTrasPorcentajeSocio,
} from "../../../utils/ordenUtils";

interface Props {
  orden: OrdenDeCompra;
  clientes: Colaborador[];
  pantallas: Pantalla[];
  config: ConfiguracionEmpresa;
  usuarioActual: Usuario;
  expandido: boolean;
  onToggle: () => void;
  onEliminarOrden: (ordenId: string) => Promise<void>;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function nombresProductoDesdeVenta(venta: RegistroVenta): string[] {
  const txt = String(venta.productoNombre ?? "").trim();
  if (!txt) return [];
  return txt
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const OrdenCard: React.FC<Props> = ({
  orden,
  clientes,
  pantallas,
  config,
  usuarioActual,
  expandido,
  onToggle,
  onEliminarOrden,
}) => {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handlePDF = () => {
    void (async () => {
      setPdfBusy(true);
      try {
        await exportarPDFOrden(
          orden,
          config,
          usuarioActual.nombre,
          pantallas,
          clientes,
        );
      } catch (e) {
        alert(
          e instanceof Error
            ? e.message
            : "No se pudo generar el PDF. Prueba de nuevo.",
        );
      } finally {
        setPdfBusy(false);
      }
    })();
  };

  const colabOrden = useMemo(
    () =>
      orden.colaboradorId
        ? clientes.find((c) => String(c.id) === String(orden.colaboradorId))
        : undefined,
    [clientes, orden.colaboradorId],
  );

  const nombreColaborador = colabOrden?.nombre;

  const totalesOrdenVista = useMemo(() => {
    const regs = orden.registrosVenta ?? [];
    const n = regs.length;
    if (!colabOrden || n === 0) {
      return {
        sub: Number(orden.subtotal ?? 0),
        iva: Number(orden.ivaTotal ?? 0),
        total: Number(orden.total ?? 0),
      };
    }
    const usarCosto = colaboradorUsaCostoComoBaseOrden(colabOrden.tipoComision);
    const sub =
      Math.round(
        regs.reduce((s, v) => {
          const pv = importeLineaRespectoOrden(v, orden, n);
          const linea = usarCosto
            ? costoVentaProporcionalImporte(v, pv)
            : importeLineaOrdenTrasPorcentajeSocio(
                pv,
                v,
                colabOrden.tipoComision,
              );
          return s + linea;
        }, 0) * 100,
      ) / 100;
    const pct = Number(orden.ivaPercentaje ?? 16) || 16;
    const iva = Math.round(sub * (pct / 100) * 100) / 100;
    return {
      sub,
      iva,
      total: Math.round((sub + iva) * 100) / 100,
    };
  }, [colabOrden, orden]);

  const esAdmin = usuarioActual.rol === "admin";

  const handleEliminar = () => {
    if (!esAdmin || deleteBusy) return;
    const ok = window.confirm(
      "¿Eliminar esta orden? También se desasociará de sus ventas.",
    );
    if (!ok) return;
    void (async () => {
      setDeleteBusy(true);
      try {
        await onEliminarOrden(orden.id);
      } catch (e) {
        alert(
          e instanceof Error
            ? e.message
            : "No se pudo eliminar la orden. Intenta de nuevo.",
        );
      } finally {
        setDeleteBusy(false);
      }
    })();
  };

  return (
    <div className={`orden-card ${expandido ? "expandido" : ""}`}>
      {/* Header */}
      <div className="orden-header cursor-pointer" onClick={onToggle}>
        <h4>{orden.numeroOrden}</h4>
        <span className={`estado-badge ${orden.estado}`}>
          {orden.estado.charAt(0).toUpperCase() + orden.estado.slice(1)}
        </span>
      </div>

      {/* Resumen */}
      <div className="orden-info">
        {nombreColaborador ? (
          <p>
            <strong>Colaborador:</strong> {nombreColaborador}
          </p>
        ) : null}
        <p>
          <strong>Mes:</strong> {MESES[orden.mes ?? 0]} {orden.año ?? ""}
        </p>
        <p>
          <strong>Registros:</strong> {(orden.registrosVenta ?? []).length}
        </p>
        <p className="total-linea">
          <strong>TOTAL:</strong> ${totalesOrdenVista.total.toFixed(2)}
        </p>
      </div>

      {/* Detalles expandidos */}
      {expandido && (
        <div className="orden-detalles">
          <h5>Detalles de la Orden</h5>
          <div className="detalles-list">
            {(orden.registrosVenta ?? []).map((venta) => {
              const numReg = (orden.registrosVenta ?? []).length;
              const socio = clientes.find(
                (c) =>
                  c.id === (venta.colaboradorId || orden.colaboradorId),
              );
              const pantallasDetalle = (
                Array.isArray(venta.pantallasDetalle) ? venta.pantallasDetalle : []
              ).filter((p) => {
                const pid = detallePantallaId(p);
                return (
                  pid !== "__producto_total__" &&
                  !esLineaPrecioProductoEnDetalle(pid)
                );
              });
              const productoTxt =
                venta.productoIncluidoEnOrden === false
                  ? "No incluido"
                  : venta.productoNombre?.trim() || "Sin producto";
              const precioProducto = Number(venta.productoPrecioMensual ?? 0) || 0;
              const pantallasUnitarias =
                pantallasDetalle.length > 0
                  ? pantallasDetalle.map((p) => {
                      const pid = detallePantallaId(p);
                      const nombre = nombrePantallaDesdeVentaYCatalogo(
                        pid,
                        pantallas,
                        venta.pantallasDetalle,
                      );
                      return {
                        nombre,
                        precio: detallePrecioMensual(p),
                      };
                    })
                  : (venta.pantallasIds ?? []).map((pid) => {
                      const nombre = nombrePantallaDesdeVentaYCatalogo(
                        String(pid),
                        pantallas,
                        venta.pantallasDetalle,
                      );
                      const precioCat =
                        Number(
                          pantallas.find((p) => String(p.id) === String(pid))?.precio ?? 0,
                        ) || 0;
                      return { nombre, precio: precioCat };
                    });
              const productosDetalle = (Array.isArray(venta.pantallasDetalle)
                ? venta.pantallasDetalle
                : []
              ).filter((p) => esLineaPrecioProductoEnDetalle(detallePantallaId(p)));
              const nombresProducto = nombresProductoDesdeVenta(venta);
              const precioUnitFallback =
                nombresProducto.length > 0
                  ? (Number(precioProducto) || 0) / nombresProducto.length
                  : Number(precioProducto) || 0;
              const productosUnitarios =
                productosDetalle.length > 0
                  ? productosDetalle.map((p) => ({
                      nombre: String((p as any)?.nombre ?? "").trim() || "Producto",
                      precio: detallePrecioMensual(p),
                    }))
                  : nombresProducto.length > 0
                    ? nombresProducto.map((nombre) => ({
                        nombre,
                        precio: precioUnitFallback,
                      }))
                    : [];
              const gastosMonto = Number(venta.gastosAdicionales ?? 0) || 0;
              const gastosIncluidos =
                venta.gastosIncluidosEnOrden === true ||
                (venta.gastosIncluidosEnOrden !== false && gastosMonto > 0);
              const importeVenta = importeLineaRespectoOrden(venta, orden, numReg);
              const usarCosto = colaboradorUsaCostoComoBaseOrden(
                colabOrden?.tipoComision,
              );
              const importeEnOrden = usarCosto
                ? costoVentaProporcionalImporte(venta, importeVenta)
                : importeLineaOrdenTrasPorcentajeSocio(
                    importeVenta,
                    venta,
                    colabOrden?.tipoComision,
                  );
              const muestraPrecioVentaRefPorPct =
                !usarCosto &&
                colabOrden?.tipoComision === "porcentaje" &&
                Math.abs(importeEnOrden - importeVenta) > 0.005;
              return (
                <div key={venta.id} className="detalle-item">
                  <p>
                    <strong>
                      {socio?.nombre ?? "Colaborador"}
                    </strong>
                  </p>
                  {pantallasUnitarias.length > 0 ? (
                    <div>
                      <p>Pantallas:</p>
                      {pantallasUnitarias.map((p, i) => (
                        <p key={`pant-${venta.id}-${i}`}>- {p.nombre}</p>
                      ))}
                    </div>
                  ) : null}
                  <p>Producto: {productoTxt}</p>
                  {venta.productoIncluidoEnOrden !== false && productosUnitarios.length > 0 ? (
                    <div>
                      {productosUnitarios.map((p, i) => (
                        <p key={`prod-${venta.id}-${i}`}>- {p.nombre}</p>
                      ))}
                    </div>
                  ) : venta.productoIncluidoEnOrden !== false && precioProducto > 0 ? (
                    <p>Producto(s) incluido(s) (sin desglose de precios)</p>
                  ) : null}
                  {gastosMonto > 0 && gastosIncluidos ? (
                    <p>
                      Gastos adicionales:{" "}
                      <strong>${gastosMonto.toFixed(2)}</strong> (incluidos en la orden)
                    </p>
                  ) : venta.gastosIncluidosEnOrden === false ? (
                    <p>Gastos adicionales: no incluidos en esta orden</p>
                  ) : null}
                  <p>Vendido a: {venta.vendidoA}</p>
                  <p>
                    Período:{" "}
                    {new Date(venta.fechaInicio).toLocaleDateString("es-MX")} →{" "}
                    {new Date(venta.fechaFin).toLocaleDateString("es-MX")}
                  </p>
                  {usarCosto ? (
                    <>
                      <p>
                        <strong>Importe orden:</strong> $
                        {importeEnOrden.toFixed(2)}
                      </p>
                      <p>
                        Precio de venta del mes: $
                        {importeVenta.toFixed(2)}
                      </p>
                    </>
                  ) : muestraPrecioVentaRefPorPct ? (
                    <>
                      <p>
                        <strong>Importe orden:</strong> $
                        {importeEnOrden.toFixed(2)}
                      </p>
                      <p>
                        Precio de venta del mes: $
                        {importeVenta.toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p>Importe: ${importeEnOrden.toFixed(2)}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="detalles-calculos">
            <p>
              <strong>Subtotal:</strong> $
              {totalesOrdenVista.sub.toFixed(2)}
            </p>
            <p>
              <strong>
                IVA ({orden.ivaPercentaje ?? 0}%):
              </strong>{" "}
              ${totalesOrdenVista.iva.toFixed(2)}
            </p>
            <p className="total-linea">
              <strong>TOTAL:</strong> $
              {totalesOrdenVista.total.toFixed(2)}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pdfBusy}
            onClick={handlePDF}
          >
            {pdfBusy ? "Generando PDF…" : "📥 Descargar PDF"}
          </button>
          {esAdmin ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={deleteBusy}
              onClick={handleEliminar}
            >
              {deleteBusy ? "Eliminando…" : "🗑️ Eliminar orden"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
