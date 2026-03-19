// Reutilizable en ventas, órdenes, clientes, pantallas...
interface PaginacionProps {
  paginaActual: number;
  totalPaginas: number;
  onAnterior: () => void;
  onSiguiente: () => void;
}

export const Paginacion: React.FC<PaginacionProps> = ({
  paginaActual, totalPaginas, onAnterior, onSiguiente,
}) => (
  <div className="paginacion-ventas">
    <button disabled={paginaActual === 1} onClick={onAnterior}>◀</button>
    <span>Página {paginaActual} de {totalPaginas}</span>
    <button disabled={paginaActual === totalPaginas} onClick={onSiguiente}>▶</button>
  </div>
);
