import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const links = [
  { to: "/", label: "Resumen", end: true },
  { to: "/accounts", label: "Cuentas" },
  { to: "/operations", label: "Operaciones" },
  { to: "/transactions", label: "Movimientos" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">F</span> FinTech
        </div>
        <button className="menu-toggle" onClick={() => setOpen((o) => !o)} aria-label="Menú">
          ☰
        </button>
        <nav className={open ? "nav open" : "nav"} onClick={() => setOpen(false)}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <span className="user-name">{user.full_name}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
