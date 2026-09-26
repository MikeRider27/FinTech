import { accountNumber, dateTime, money, TYPE_LABEL } from "../format.js";

export function Alert({ kind = "error", children }) {
  if (!children) return null;
  return <div className={`alert alert-${kind}`}>{children}</div>;
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function StatusBadge({ status, label }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{label ?? status}</span>;
}

export function Pager({ page, onChange }) {
  if (!page || page.total <= page.limit) return null;
  const current = Math.floor(page.offset / page.limit) + 1;
  const pages = Math.ceil(page.total / page.limit);
  return (
    <div className="pager">
      <button className="btn btn-ghost btn-sm" disabled={current === 1} onClick={() => onChange(page.offset - page.limit)}>
        ← Anterior
      </button>
      <span>
        Página {current} de {pages}
      </span>
      <button className="btn btn-ghost btn-sm" disabled={current === pages} onClick={() => onChange(page.offset + page.limit)}>
        Siguiente →
      </button>
    </div>
  );
}

// Signo del movimiento desde el punto de vista del usuario
function sign(tx, ownIds) {
  if (tx.type === "DEPOSIT") return 1;
  if (tx.type === "WITHDRAWAL") return -1;
  const fromMine = ownIds.has(tx.source_account_id);
  const toMine = ownIds.has(tx.destination_account_id);
  if (fromMine && toMine) return 0;
  return fromMine ? -1 : 1;
}

export function TransactionTable({ items, ownIds = new Set() }) {
  if (!items.length) return <Empty>No hay movimientos todavía.</Empty>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Detalle</th>
            <th>Referencia</th>
            <th className="num">Monto</th>
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => {
            const s = sign(tx, ownIds);
            return (
              <tr key={tx.id}>
                <td className="nowrap">{dateTime(tx.created_at)}</td>
                <td>
                  <StatusBadge status={tx.type} label={TYPE_LABEL[tx.type]} />
                </td>
                <td>
                  <div>{tx.description}</div>
                  <div className="muted small">
                    {tx.source_account_number && <>De {accountNumber(tx.source_account_number)} </>}
                    {tx.destination_account_number && <>→ {accountNumber(tx.destination_account_number)}</>}
                  </div>
                </td>
                <td className="mono small">{tx.reference}</td>
                <td className={`num nowrap ${s > 0 ? "pos" : s < 0 ? "neg" : ""}`}>
                  {s > 0 ? "+" : s < 0 ? "−" : ""}
                  {money(tx.amount, tx.currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
