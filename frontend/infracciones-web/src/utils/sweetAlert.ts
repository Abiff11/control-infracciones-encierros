import Swal from 'sweetalert2';

export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmButtonText: string;
  cancelButtonText: string;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: options.confirmButtonText,
    cancelButtonText: options.cancelButtonText,
    heightAuto: false,
  });

  return Boolean(result.isConfirmed);
}

export async function showSuccessAlert(title: string, text?: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'Entendido',
    heightAuto: false,
  });
}

export async function showErrorAlert(title: string, text?: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'Entendido',
    heightAuto: false,
  });
}

export async function showWarningAlert(title: string, text?: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonText: 'Entendido',
    heightAuto: false,
  });
}
