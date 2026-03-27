/**
 * Sirve la carpeta del proyecto y reenvía el chat a Gemini usando GEMINI_API_KEY del .env
 * (la clave no viaja al navegador).
 */
require("dotenv").config();

var path = require("path");
var express = require("express");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");

var app = express();
var PORT = process.env.PORT || 3000;
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
var GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
var ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
var ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "";
var ADMIN_JWT_EXPIRES = process.env.ADMIN_JWT_EXPIRES || "8h";
var ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || "workbeef_admin_token";
var IS_PROD = String(process.env.NODE_ENV || "").toLowerCase() === "production";

function normalizeModelName(rawModel) {
  var model = String(rawModel || "").trim().toLowerCase();
  if (!model) return "gemini-2.5-flash";
  model = model.replace(/\s+/g, "-");
  if (model === "2.5-flash" || model === "2.5flash") return "gemini-2.5-flash";
  if (model === "2.0-flash" || model === "2.0flash") return "gemini-2.0-flash";
  if (model === "1.5-flash" || model === "1.5flash") return "gemini-1.5-flash-latest";
  if (model.indexOf("gemini-") !== 0) model = "gemini-" + model;
  return model;
}

var COLBEEF_CHAT_SYSTEM =
  "Eres el asistente virtual del sistema Workbeef. Respondes de forma breve, amable y profesional. Ayudas a los usuarios a navegar por el sistema. Conoces módulos principales: 1) CONTROL OPERATIVO (incluye: ingreso de vehículos, plan de faena, pesaje, corrales, insensibilización, rendimientos, facturas, ranking de clientes). 2) GESTIÓN HUMANA (incluye: personal activo, perfiles por área, eventos como cumpleaños, solicitudes de permisos y vacaciones, datos de beneficios como EPS y pensiones, y panel de gráficos). 3) LOGÍSTICA (incluye: ingresar lenguas a inventario y generar documentación operativa). 4) CANALES (incluye: registro de hallazgos y tolerancia, historial de registros, animales procesados, dashboards diarios y mensuales con resumen gráfico, asignación de operación, asignación de puestos de trabajo que puede cambiar cada día, gestión de usuarios, seguimiento de tiempo de uso o usabilidad). 5) LOCKERBEEF (incluye: migración del control basado en hojas de cálculo a un aplicativo web integral para la gestión de recursos físicos, operando sobre una base de datos robusta y centralizada). Si te preguntan algo fuera de este sistema, indica amablemente que solo puedes ayudar con la plataforma Workbeef.";

var rootDir = path.join(__dirname);
var loginAttemptsByIp = new Map();
var MAX_ATTEMPTS = 5;
var ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

function getClientIp(req) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
}

function isRateLimited(req) {
  var ip = String(getClientIp(req));
  var now = Date.now();
  var state = loginAttemptsByIp.get(ip);
  if (!state || now - state.start > ATTEMPT_WINDOW_MS) {
    loginAttemptsByIp.set(ip, { start: now, count: 0 });
    return false;
  }
  return state.count >= MAX_ATTEMPTS;
}

function registerFailedAttempt(req) {
  var ip = String(getClientIp(req));
  var now = Date.now();
  var state = loginAttemptsByIp.get(ip);
  if (!state || now - state.start > ATTEMPT_WINDOW_MS) {
    loginAttemptsByIp.set(ip, { start: now, count: 1 });
    return;
  }
  state.count += 1;
}

function clearAttempts(req) {
  loginAttemptsByIp.delete(String(getClientIp(req)));
}

function issueAdminCookie(res) {
  var token = jwt.sign({ scope: "admin" }, ADMIN_JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRES });
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000
  });
}

function verifyAdminFromRequest(req) {
  var token = req.cookies && req.cookies[ADMIN_COOKIE_NAME];
  if (!token) return false;
  try {
    var payload = jwt.verify(token, ADMIN_JWT_SECRET);
    return !!(payload && payload.scope === "admin");
  } catch (e) {
    return false;
  }
}

function requireAdminJwt(req, res, next) {
  if (!verifyAdminFromRequest(req)) {
    var acceptsHtml = (req.headers.accept || "").indexOf("text/html") !== -1;
    if (acceptsHtml) {
      res.redirect("/site.html");
      return;
    }
    res.status(401).json({ ok: false, error: "No autorizado" });
    return;
  }
  next();
}

if (!ADMIN_PASSWORD_HASH) {
  console.warn("[ADMIN] Falta ADMIN_PASSWORD_HASH en .env; el acceso privado quedará deshabilitado.");
}
if (!ADMIN_JWT_SECRET || ADMIN_JWT_SECRET.length < 24) {
  console.warn("[ADMIN] Falta ADMIN_JWT_SECRET robusto en .env (mínimo recomendado: 24 caracteres).");
}

app.post("/api/admin/login", function (req, res) {
  if (!ADMIN_PASSWORD_HASH || !ADMIN_JWT_SECRET) {
    res.status(503).json({ ok: false, error: "Auth admin no configurada en servidor." });
    return;
  }
  if (isRateLimited(req)) {
    res.status(429).json({ ok: false, error: "Demasiados intentos. Espera unos minutos." });
    return;
  }

  var password = req.body && req.body.password;
  if (typeof password !== "string" || password.length < 6) {
    registerFailedAttempt(req);
    res.status(400).json({ ok: false, error: "Contraseña inválida." });
    return;
  }

  bcrypt
    .compare(password, ADMIN_PASSWORD_HASH)
    .then(function (ok) {
      if (!ok) {
        registerFailedAttempt(req);
        res.status(401).json({ ok: false, error: "Contraseña incorrecta." });
        return;
      }
      clearAttempts(req);
      issueAdminCookie(res);
      res.json({ ok: true });
    })
    .catch(function () {
      res.status(500).json({ ok: false, error: "No se pudo validar la contraseña." });
    });
});

app.get("/api/admin/session", function (req, res) {
  if (!ADMIN_JWT_SECRET) {
    res.status(503).json({ ok: false, error: "Auth admin no configurada en servidor." });
    return;
  }
  res.json({ ok: true, authenticated: verifyAdminFromRequest(req) });
});

app.post("/api/admin/logout", function (req, res) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/"
  });
  res.json({ ok: true });
});

app.get("/api/admin/ping", requireAdminJwt, function (req, res) {
  res.json({ ok: true, status: "authenticated" });
});

app.post("/api/chat", function (req, res) {
  if (!GEMINI_API_KEY) {
    res.status(503).json({
      error: "GEMINI_API_KEY no está definida. Crea un archivo .env con GEMINI_API_KEY=tu_clave y reinicia el servidor (npm start)."
    });
    return;
  }

  var contents = req.body && req.body.contents;
  if (!Array.isArray(contents)) {
    res.status(400).json({ error: "Se esperaba un array contents." });
    return;
  }

  var modelName = normalizeModelName(GEMINI_MODEL);
  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(modelName) +
    ":generateContent?key=" +
    encodeURIComponent(GEMINI_API_KEY);

  var body = {
    systemInstruction: {
      parts: [{ text: COLBEEF_CHAT_SYSTEM }]
    },
    contents: contents
  };

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
    .then(function (r) {
      return r.json().then(function (data) {
        res.status(r.status).json(data);
      });
    })
    .catch(function (err) {
      res.status(500).json({
        error: err && err.message ? err.message : String(err)
      });
    });
});

app.use("/admin", requireAdminJwt, express.static(path.join(rootDir, "admin")));
app.use(express.static(rootDir));

app.listen(PORT, function () {
  console.log("Workbeef → http://localhost:" + PORT + "/site.html");
  console.log("La API Key de Gemini se lee solo desde .env (no expuesta al navegador).");
  console.log("Modelo Gemini activo → " + normalizeModelName(GEMINI_MODEL));
  console.log("Auth admin activa → " + (ADMIN_PASSWORD_HASH && ADMIN_JWT_SECRET ? "SI" : "NO"));
});
