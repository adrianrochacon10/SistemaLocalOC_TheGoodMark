  export const colorPorEstado = (estado: string) => {
    switch (estado) {
      case "Aceptado":
        return { border: "#22c55e", badge: "#22c55e" }; // verde
      case "Rechazado":
        return { border: "#ef4444", badge: "#ef4444" }; // rojo
      case "Prospecto":
        return { border: "#eab308", badge: "#eab308" }; // amarillo
      default:
        return { border: "#1461a1", badge: "#1461a1" };
    }
}