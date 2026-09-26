// Los montos llegan como string desde la API; solo se convierten para mostrarse
export function money(amount, currency) {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("es", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function dateTime(iso) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function accountNumber(n) {
  return n ? n.replace(/(\d{4})(?=\d)/g, "$1 ") : "—";
}

export const TYPE_LABEL = { DEPOSIT: "Depósito", WITHDRAWAL: "Retiro", TRANSFER: "Transferencia" };
export const STATUS_LABEL = { ACTIVE: "Activa", FROZEN: "Congelada", CLOSED: "Cerrada" };

// Monto válido: positivo con hasta 2 decimales
export const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;
