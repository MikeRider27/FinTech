import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Alert, Empty, StatusBadge } from "../components/ui.jsx";
import { accountNumber, money, STATUS_LABEL } from "../format.js";

export default function Accounts() {
  const [accounts, setAccounts] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState({ alias: "", currency: "" });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.accounts().then(setAccounts).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api.currencies().then((list) => {
      setCurrencies(list);
      setForm((f) => ({ ...f, currency: list[0] }));
    });
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createAccount(form);
      setForm({ alias: "", currency: currencies[0] });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cuentas</h1>
          <p className="muted">Administra tus cuentas en distintas monedas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "Abrir cuenta"}
        </button>
      </div>
      <Alert>{error}</Alert>

      {showForm && (
        <form className="card form-inline" onSubmit={create}>
          <label className="field">
            <span>Alias</span>
            <input required maxLength={80} placeholder="Ej. Ahorros" value={form.alias}
              onChange={(e) => setForm({ ...form, alias: e.target.value })} />
          </label>
          <label className="field">
            <span>Moneda</span>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Creando…" : "Crear"}
          </button>
        </form>
      )}

      {accounts === null ? (
        <p className="muted">Cargando…</p>
      ) : accounts.length === 0 ? (
        <Empty>No tienes cuentas todavía.</Empty>
      ) : (
        <div className="grid accounts">
          {accounts.map((a) => (
            <Link key={a.id} to={`/accounts/${a.id}`} className={`card account-card ${a.status.toLowerCase()}`}>
              <div className="account-top">
                <span className="account-alias">{a.alias}</span>
                <StatusBadge status={a.status} label={STATUS_LABEL[a.status]} />
              </div>
              <div className="account-balance">{money(a.balance, a.currency)}</div>
              <div className="mono muted small">{accountNumber(a.number)}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
