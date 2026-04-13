/**
 * Registro único de plugins Chart.js para Gastos administrativos.
 * Archivo aparte para que Vite/HMR no deje `CategoryScale` u otros en undefined al recargar.
 */
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
);
