import { toast, type Id as ToastId } from "react-toastify";

type ConfirmOpts = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
};

export function confirmWithToast(message: string, opts: ConfirmOpts = {}): Promise<boolean> {
  const title = opts.title ?? "Confirmar acción";
  const confirmText = opts.confirmText ?? "Sí, continuar";
  const cancelText = opts.cancelText ?? "Cancelar";

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value: boolean, id?: ToastId) => {
      if (resolved) return;
      resolved = true;
      if (id != null) toast.dismiss(id);
      resolve(value);
    };

    const id = toast.info(
      <div>
        <strong>{title}</strong>
        <div style={{ marginTop: 8 }}>{message}</div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-sm" onClick={() => finish(false, id)}>
            {cancelText}
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => finish(true, id)}>
            {confirmText}
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        onClose: () => finish(false),
      },
    );
  });
}
