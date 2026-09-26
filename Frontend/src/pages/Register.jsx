import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { Alert } from "../components/ui.jsx";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Las contraseñas no coinciden");
    setError("");
    setBusy(true);
    try {
      await register({ full_name: form.full_name, email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand brand-lg">
          <span className="brand-mark">F</span> FinTech
        </div>
        <h1>Crear cuenta</h1>
        <Alert>{error}</Alert>
        <label className="field">
          <span>Nombre completo</span>
          <input required minLength={2} autoComplete="name" value={form.full_name} onChange={set("full_name")} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
          <small className="muted">Mínimo 8 caracteres, con letras y números.</small>
        </label>
        <label className="field">
          <span>Confirmar contraseña</span>
          <input type="password" required autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creando…" : "Crear cuenta"}
        </button>
        <p className="muted center">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
