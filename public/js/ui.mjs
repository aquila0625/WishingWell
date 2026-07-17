let lastFocusedElement = null;

export function debounce(callback, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

export function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  lastFocusedElement = document.activeElement;
  document.body.classList.add('dialog-open');
  dialog.showModal();
  dialog.querySelector('input, select, textarea, button')?.focus();
}

export function closeDialog(dialog) {
  if (!dialog?.open) return;
  dialog.close();
  document.body.classList.remove('dialog-open');
  lastFocusedElement?.focus?.();
}

export function setBusy(button, busy, label = '处理中') {
  if (!button) return;
  if (busy) button.dataset.originalLabel = button.innerHTML;
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  button.innerHTML = busy
    ? `<span class="spinner" aria-hidden="true"></span>${label}`
    : button.dataset.originalLabel || button.innerHTML;
}

export function showToast(message, { tone = 'info', duration = 2800 } = {}) {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-atomic', 'true');
    document.body.append(root);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  const icons = {
    success: 'check-circle-2',
    error: 'circle-alert',
    info: 'info'
  };
  toast.innerHTML = `<span class="toast-icon"><i data-lucide="${icons[tone] || icons.info}" aria-hidden="true"></i></span><span class="toast-message"></span>`;
  toast.querySelector('.toast-message').textContent = message;
  root.append(toast);
  refreshIcons();
  setTimeout(() => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

export function refreshIcons() {
  window.lucide?.createIcons({ attrs: { width: 18, height: 18, 'stroke-width': 1.8 } });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
