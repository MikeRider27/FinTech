import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Alert, Empty, TransactionTable } from "../components/ui.jsx";
import { money } from "../format.js";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.dashboard(), api.accounts()])
      .then(([summary, accs]) => {
        setData(summary);
        setAccounts(accs);
      })
      .catch((e) => setError(e.message));
  }, []);

  const firstName = user.full_name.split(" ")[0];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hola, {firstName}</h1>
          <p className="muted">Resumen de tus finanzas</p>
        </div>
        <Link to="/operations" className="btn btn-primary">
          Nueva operación
        </Link>
      </div>
      <Alert>{error}</Alert>
      {!data ? (
        !error && <p className="muted">Cargando…</p>
      ) : data.accounts === 0 ? (
        <Empty>
          Aún no tienes cuentas. <Link to="/accounts">Abre tu primera cuenta</Link> para comenzar.
        </Empty>
      ) : (
        <>
          <div className="grid stats">
            {data.by_currency.map((c) => (
              <div key={c.currency} className="card stat">
                <div className="stat-label">Saldo total · {c.currency}</div>
                <div className="stat-value">{money(c.balance, c.currency)}</div>
                <div className="stat-flows">
                  <span className="pos">↑ {money(c.inflow_30d, c.currency)}</span>
                  <span className="neg">↓ {money(c.outflow_30d, c.currency)}</span>
                  <span className="muted small">últimos 30 días</span>
                </div>
              </div>
            ))}
            <div className="card stat">
              <div className="stat-label">Cuentas abiertas</div>
              <div className="stat-value">{data.accounts}</div>
              <Link to="/accounts" className="small">Ver cuentas →</Link>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Últimos movimientos</h2>
              <Link to="/transactions" className="small">Ver todos →</Link>
            </div>
            <TransactionTable items={data.recent_transactions} ownIds={new Set(accounts.map((a) => a.id))} />
          </section>
        </>
      )}
    </>
  );
}
