import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Alert, Pager, TransactionTable } from "../components/ui.jsx";
import { accountNumber, TYPE_LABEL } from "../format.js";

const LIMIT = 20;

export default function Transactions() {
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({ account_id: "", type: "" });
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.accounts().then(setAccounts).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    api
      .transactions({ ...filters, limit: LIMIT, offset })
      .then(setPage)
      .catch((e) => setError(e.message));
  }, [filters, offset]);

  const setFilter = (k) => (e) => {
    setOffset(0);
    setFilters({ ...filters, [k]: e.target.value });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Movimientos</h1>
          <p className="muted">Historial de todas tus operaciones</p>
        </div>
      </div>
      <Alert>{error}</Alert>

      <section className="card">
        <div className="filters">
          <select value={filters.account_id} onChange={setFilter("account_id")}>
            <option value="">Todas las cuentas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.alias} · {accountNumber(a.number)}
              </option>
            ))}
          </select>
          <select value={filters.type} onChange={setFilter("type")}>
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {page && <span className="muted small">{page.total} movimientos</span>}
        </div>
        {!page ? (
          <p className="muted">Cargando…</p>
        ) : (
          <TransactionTable items={page.items} ownIds={new Set(accounts.map((a) => a.id))} />
        )}
        <Pager page={page} onChange={setOffset} />
      </section>
    </>
  );
}
