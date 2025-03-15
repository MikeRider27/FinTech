import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Button, Form, Container, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const API_URL = "http://192.168.11.220:5500/usuarios";

function App() {
  const [usuarios, setUsuarios] = useState([]);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const obtenerUsuarios = async () => {
    const res = await axios.get(API_URL);
    setUsuarios(res.data);
  };

  const agregarUsuario = async () => {
    await axios.post(API_URL, { nombre, email });
    setNombre("");
    setEmail("");
    obtenerUsuarios();
  };

  const actualizarUsuario = async () => {
    await axios.put(`${API_URL}/${editId}`, { nombre, email });
    setEditId(null);
    setNombre("");
    setEmail("");
    obtenerUsuarios();
  };

  const eliminarUsuario = async (id) => {
    await axios.delete(`${API_URL}/${id}`);
    obtenerUsuarios();
  };

  const editarUsuario = (usuario) => {
    setEditId(usuario.id);
    setNombre(usuario.nombre);
    setEmail(usuario.email);
  };

  return (
    <Container className="mt-5">
      {/* Título */}
      <h1 className="text-center mb-4" style={{ color: "#333", fontWeight: "bold" }}>
        CRUD con React y Flask (MVC)
      </h1>

      {/* Formulario */}
      <Card className="shadow-sm p-4 mb-5 bg-white rounded">
        <Card.Body>
          <h3 className="mb-4" style={{ color: "#555" }}>
            {editId ? "Editar Usuario" : "Agregar Usuario"}
          </h3>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese el nombre"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingrese el email"
              />
            </Form.Group>
            <Button
              variant={editId ? "warning" : "primary"}
              onClick={editId ? actualizarUsuario : agregarUsuario}
              className="w-100"
            >
              {editId ? "Actualizar" : "Agregar"}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Tabla de Usuarios */}
      <Card className="shadow-sm p-4 bg-white rounded">
        <Card.Body>
          <h3 className="mb-4" style={{ color: "#555" }}>
            Lista de Usuarios
          </h3>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.id}</td>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.email}</td>
                  <td>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => editarUsuario(usuario)}
                      className="me-2"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => eliminarUsuario(usuario.id)}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default App;