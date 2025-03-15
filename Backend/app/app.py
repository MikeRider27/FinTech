from flask import Flask
from flask_cors import CORS
from config import Config
from database import db
from routes.usuario_routes import usuario_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Inicializar DB
db.init_app(app)

# Registrar rutas
app.register_blueprint(usuario_bp)

# Crear tablas en la BD
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)
