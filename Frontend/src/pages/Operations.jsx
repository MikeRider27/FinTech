import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, newIdempotencyKey } from "../api.js";
import { Alert, Empty } from "../components/ui.jsx";
import { accountNumber, AMOUNT_PATTERN, money, TYPE_LABEL } from "../format.js";

const TABS = [
  { id: "transfer", label: "Transferir" },
  { id: "deposit", label: "Depositar" },
  { id: "withdraw", label: "Retirar" },
];

const emptyForm = (accountId = "") => ({ account_id: accountId, destination: "", amount: "", description: "" });

export default function Operations() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState("transfer");
  const [accounts, setAccounts] = useState(null);
  const [form, setForm] = useState(emptyForm(params.get("account") || ""));
  // Una clave por intento: si el usuario reenvía (doble clic, reintento de red) no se duplica la operación
  const [idemKey, setIdemKey] = useState(newIdempotencyKey);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.accounts().then((list) => {
      const active = list.filter((a) => a.status === "ACTIVE");
      setAccounts(active);
      setForm((f) => (active.some((a) => a.id === f.account_id) ? f : { ...f, account_id: active[0]?.id || "" }));
    });

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const selected = useMemo(() => accounts?.find((a) => a.id === form.account_id), [accounts, form.account_id]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const switchTab = (id) => {
    setTab(id);
    setError("");
    setResult(null);
    setIdemKey(newIdempotencyKey());
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    const amount = form.amount.trim().replace(",", ".");
    if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
      return setError("Ingresa un monto válido (máximo 2 decimales)");
    }
    if (tab !== "deposit" && Number(amount) > Number(selected.balance)) {
      return setError("Fondos insuficientes");
    }
    const description = form.description.trim() || undefined;
    setBusy(true);
    try {
      let tx;
      if (tab === "transfer") {
        tx = await api.transfer(
          {
            source_account_id: form.account_id,
            destination_account_number: form.destination.replace(/\s/g, ""),
            amount,
            description,
          },
          idemKey
        );
      } else {
        tx = await api[tab]({ account_id: form.account_id, amount, description }, idemKey);
      }
      setResult(tx);
      setForm(emptyForm(form.account_id));
      setIdemKey(newIdempotencyKey());
      await load();
    } catch (err) {
      setError(err.message);
      // Errores de validación de negocio (4xx) no se procesaron: nueva clave para el siguiente intento
      if (err.status && err.status < 500) setIdemKey(newIdempotencyKey());
    } finally {
      setBusy(false);
    }
  };

  if (accounts === null) return error ? <Alert>{error}</Alert> : <p className="muted">Cargando…</p>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Operaciones</h1>
          <p className="muted">Transfiere, deposita o retira fondos</p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Empty>
          Necesitas una cuenta activa. <Link to="/accounts">Abrir cuenta</Link>
        </Empty>
      ) : (
        <div className="card op-card">
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? "tab active" : "tab"} onClick={() => switchTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {result && (
            <Alert kind="success">
              {TYPE_LABEL[result.type]} por {money(result.amount, result.currency)} realizado. Referencia{" "}
              <span className="mono">{result.reference}</span>
            </Alert>
          )}
          <Alert>{error}</Alert>

          <form onSubmit={submit}>
            <label className="field">
              <span>{tab === "deposit" ? "Cuenta destino" : "Cuenta origen"}</span>
              <select value={form.account_id} onChange={set("account_id")}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.alias} · {accountNumber(a.number)} · {money(a.balance, a.currency)}
                  </option>
                ))}
              </select>
            </label>

            {tab === "transfer" && (
              <label className="field">
                <span>Número de cuenta destino</span>
                <input required inputMode="numeric" placeholder="10XX XXXX XXXX XXXX" value={form.destination}
                  onChange={set("destination")} />
                <small className="muted">Debe ser una cuenta en {selected?.currency}.</small>
              </label>
            )}

            <label className="field">
              <span>Monto ({selected?.currency})</span>
              <input required inputMode="decimal" placeholder="0.00" value={form.amount} onChange={set("amount")} />
            </label>

            <label className="field">
              <span>Concepto (opcional)</span>
              <input maxLength={255} value={form.description} onChange={set("description")} />
            </label>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Procesando…" : TABS.find((t) => t.id === tab).label}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
