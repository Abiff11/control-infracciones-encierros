type AlertIcon = 'success' | 'error' | 'warning' | 'info' | 'question';

type SweetAlertResult = {
  isConfirmed?: boolean;
};

type SweetAlertApi = {
  fire: (options: {
    title: string;
    text?: string;
    icon?: AlertIcon;
    confirmButtonText?: string;
    cancelButtonText?: string;
    showCancelButton?: boolean;
    reverseButtons?: boolean;
  }) => Promise<SweetAlertResult>;
};

declare global {
  interface Window {
    Swal?: SweetAlertApi;
  }
}

function getNativeMessage(title: string, text?: string): string {
  return text ? `${title}\n\n${text}` : title;
}

export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}): Promise<boolean> {
  if (window.Swal) {
    const result = await window.Swal.fire({
      title: options.title,
      text: options.text,
      icon: 'question',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: options.confirmButtonText ?? 'Confirmar',
      cancelButtonText: options.cancelButtonText ?? 'Cancelar',
    });

    return Boolean(result.isConfirmed);
  }

  return window.confirm(getNativeMessage(options.title, options.text));
}

export async function showSuccessAlert(title: string, text?: string): Promise<void> {
  if (window.Swal) {
    await window.Swal.fire({
      title,
      text,
      icon: 'success',
      confirmButtonText: 'Aceptar',
    });
    return;
  }

  window.alert(getNativeMessage(title, text));
}

export async function showErrorAlert(title: string, text?: string): Promise<void> {
  if (window.Swal) {
    await window.Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'Aceptar',
    });
    return;
  }

  window.alert(getNativeMessage(title, text));
}

export async function showWarningAlert(title: string, text?: string): Promise<void> {
  if (window.Swal) {
    await window.Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'Aceptar',
    });
    return;
  }

  window.alert(getNativeMessage(title, text));
}
