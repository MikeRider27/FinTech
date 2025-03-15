from flask import request, jsonify
from models.usuario import Usuario
from database import db

class UsuarioController:
    @staticmethod
    def obtener_usuarios():
        usuarios = Usuario.query.all()
        return jsonify([usuario.to_json() for usuario in usuarios])

    @staticmethod
    def obtener_usuario(id):
        usuario = Usuario.query.get(id)
        return jsonify(usuario.to_json()) if usuario else ('', 404)

    @staticmethod
    def agregar_usuario():
        datos = request.json
        nuevo_usuario = Usuario(nombre=datos["nombre"], email=datos["email"])
        db.session.add(nuevo_usuario)
        db.session.commit()
        return jsonify({"mensaje": "Usuario agregado correctamente"}), 201

    @staticmethod
    def actualizar_usuario(id):
        usuario = Usuario.query.get(id)
        if usuario:
            datos = request.json
            usuario.nombre = datos["nombre"]
            usuario.email = datos["email"]
            db.session.commit()
            return jsonify({"mensaje": "Usuario actualizado correctamente"})
        return ('', 404)

    @staticmethod
    def eliminar_usuario(id):
        usuario = Usuario.query.get(id)
        if usuario:
            db.session.delete(usuario)
            db.session.commit()
            return jsonify({"mensaje": "Usuario eliminado correctamente"})
        return ('', 404)
