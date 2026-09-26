const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "fintech_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

function errorMessage(body, status) {
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  // Errores de validación de FastAPI: [{loc, msg}, ...]
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg.replace(/^Value error, /, "")).join(". ");
  }
  return `Error ${status}`;
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = tokenStore.get();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, errorMessage(data, res.status));
  }
  return data;
}

export function newIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const qs = (params) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return s ? `?${s}` : "";
};

export const api = {
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  me: () => request("/auth/me"),

  currencies: () => request("/accounts/currencies"),
  accounts: () => request("/accounts"),
  account: (id) => request(`/accounts/${id}`),
  createAccount: (data) => request("/accounts", { method: "POST", body: data }),
  updateAccount: (id, data) => request(`/accounts/${id}`, { method: "PATCH", body: data }),
  statement: (id, params = {}) => request(`/accounts/${id}/statement${qs(params)}`),

  transactions: (params = {}) => request(`/transactions${qs(params)}`),
  deposit: (data, key) =>
    request("/transactions/deposit", { method: "POST", body: data, headers: { "Idempotency-Key": key } }),
  withdraw: (data, key) =>
    request("/transactions/withdraw", { method: "POST", body: data, headers: { "Idempotency-Key": key } }),
  transfer: (data, key) =>
    request("/transactions/transfer", { method: "POST", body: data, headers: { "Idempotency-Key": key } }),

  dashboard: () => request("/dashboard/summary"),
};
