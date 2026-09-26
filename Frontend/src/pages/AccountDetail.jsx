import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Alert, Empty, Pager, StatusBadge } from "../components/ui.jsx";
import { accountNumber, dateTime, money, STATUS_LABEL, TYPE_LABEL } from "../format.js";

export default function AccountDetail() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [page, setPage] = useState(null);
  const [offset, setOffset] = useState(0);
  const [alias, setAlias] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadAccount = useCallback(
    () =>
      api.account(id).then((a) => {
        setAccount(a);
        setAlias(a.alias);
      }),
    [id]
  );

  useEffect(() => {
    loadAccount().catch((e) => setError(e.message));
  }, [loadAccount]);

  useEffect(() => {
    api.statement(id, { limit: 15, offset }).then(setPage).catch((e) => setError(e.message));
  }, [id, offset]);

  const update = async (data) => {
    setError("");
    try {
      const a = await api.updateAccount(id, data);
      setAccount(a);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(account.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* el portapapeles no está disponible en contextos no seguros */
    }
  };

  if (!account) return error ? <Alert>{error}</Alert> : <p className="muted">Cargando…</p>;

  const closed = account.status === "CLOSED";

  return (
    <>
      <Link to="/accounts" className="small">← Cuentas</Link>
      <div className="page-head">
        <div>
          {editing ? (
            <form className="inline-edit" onSubmit={(e) => { e.preventDefault(); update({ alias }); }}>
              <input value={alias} maxLength={80} required onChange={(e) => setAlias(e.target.value)} autoFocus />
              <button className="btn btn-primary btn-sm">Guardar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
            </form>
          ) : (
            <h1>
              {account.alias}{" "}
              {!closed && (
                <button className="link-btn small" onClick={() => setEditing(true)}>editar</button>
              )}
            </h1>
          )}
          <p className="muted mono">
            {accountNumber(account.number)}{" "}
            <button className="link-btn small" onClick={copyNumber}>{copied ? "¡copiado!" : "copiar"}</button>
          </p>
        </div>
        <StatusBadge status={account.status} label={STATUS_LABEL[account.status]} />
      </div>
      <Alert>{error}</Alert>

      <div className="grid stats">
        <div className="card stat">
          <div className="stat-label">Saldo disponible</div>
          <div className="stat-value">{money(account.balance, account.currency)}</div>
          <div className="muted small">Moneda {account.currency} · abierta el {dateTime(account.created_at)}</div>
        </div>
        {!closed && (
          <div className="card stat actions">
            <div className="stat-label">Acciones</div>
            <div className="btn-row">
              {account.status === "ACTIVE" && (
                <Link to={`/operations?account=${account.id}`} className="btn btn-primary btn-sm">Operar</Link>
              )}
              {account.status === "ACTIVE" ? (
                <button className="btn btn-ghost btn-sm" onClick={() => update({ status: "FROZEN" })}>Congelar</button>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => update({ status: "ACTIVE" })}>Reactivar</button>
              )}
              <button
                className="btn btn-danger btn-sm"
                onClick={() => window.confirm("¿Cerrar la cuenta? Esta acción no se puede deshacer.") && update({ status: "CLOSED" })}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Estado de cuenta</h2>
        </div>
        {!page ? (
          <p className="muted">Cargando…</p>
        ) : page.items.length === 0 ? (
          <Empty>Sin movimientos.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Referencia</th>
                  <th className="num">Cargo</th>
                  <th className="num">Abono</th>
                  <th className="num">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((e) => (
                  <tr key={e.id}>
                    <td className="nowrap">{dateTime(e.created_at)}</td>
                    <td>
                      <div>{e.description}</div>
                      <div className="muted small">{TYPE_LABEL[e.type]}</div>
                    </td>
                    <td className="mono small">{e.reference}</td>
                    <td className="num neg nowrap">{e.direction === "DEBIT" ? money(e.amount, account.currency) : ""}</td>
                    <td className="num pos nowrap">{e.direction === "CREDIT" ? money(e.amount, account.currency) : ""}</td>
                    <td className="num nowrap">{money(e.balance_after, account.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} onChange={setOffset} />
      </section>
    </>
  );
}
