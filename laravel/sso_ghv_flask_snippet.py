# -*- coding: utf-8 -*-
"""
Copia el bloque de abajo dentro de app_ghv/app.py (junto a /login).

Dependencia: pip install PyJWT

Variables en .env de app_ghv (los mismos valores que en Suite/laravel/.env):
  SSO_GH_SECRET=mismo_secreto_que_laravel
  SSO_GH_AUDIENCE=app_ghv

En Laravel (.env) debes poner GH_SSO_ADMIN_USER_ID = id_user del usuario con rol ADMIN
(consulta: SELECT id_user, email, rol FROM usuario WHERE rol = 'ADMIN' LIMIT 1;)
"""

# --- COPIAR DESDE AQUÍ ---
# from flask import request  # si no está importado
# import jwt
# import os

# @app.route("/auth/sso")
# def auth_sso():
#     secret = (os.environ.get("SSO_GH_SECRET") or "").strip()
#     audience = (os.environ.get("SSO_GH_AUDIENCE") or "app_ghv").strip()
#     if not secret:
#         flash("SSO no configurado.", "error")
#         return redirect(url_for("login"))
#     token = (request.args.get("token") or "").strip()
#     if not token:
#         return redirect(url_for("login"))
#     try:
#         payload = jwt.decode(
#             token,
#             secret,
#             algorithms=["HS256"],
#             audience=audience,
#             options={"require": ["exp", "sub"]},
#         )
#     except Exception:
#         flash("Enlace inválido o expirado.", "error")
#         return redirect(url_for("login"))
#     uid = (payload.get("sub") or "").strip()
#     user = query(
#         "SELECT * FROM usuario WHERE id_user = %s AND estado = 1",
#         (uid,),
#         one=True,
#     )
#     if not user or (user.get("rol") or "").strip() != "ADMIN":
#         flash("Solo administrador puede usar este acceso.", "error")
#         return redirect(url_for("login"))
#     session.clear()
#     session["user_id"] = user["id_user"]
#     session.permanent = True
#     return redirect(url_for("home"))
# --- COPIAR HASTA AQUÍ ---
