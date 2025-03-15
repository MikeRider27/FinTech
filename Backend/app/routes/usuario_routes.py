from flask import Blueprint
from controllers.usuario_controller import UsuarioController

usuario_bp = Blueprint('usuario_bp', __name__)

usuario_bp.route('/usuarios', methods=['GET'])(UsuarioController.obtener_usuarios)
usuario_bp.route('/usuarios/<int:id>', methods=['GET'])(UsuarioController.obtener_usuario)
usuario_bp.route('/usuarios', methods=['POST'])(UsuarioController.agregar_usuario)
usuario_bp.route('/usuarios/<int:id>', methods=['PUT'])(UsuarioController.actualizar_usuario)
usuario_bp.route('/usuarios/<int:id>', methods=['DELETE'])(UsuarioController.eliminar_usuario)
