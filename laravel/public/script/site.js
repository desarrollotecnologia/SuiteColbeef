(function () {
  /* v2: ignora caché v1 para no mostrar datos viejos (nombre/cargo) tras cambios de perfil por defecto */
  var SETTINGS_KEY = "suite_settings_v2";

  /** Historial del chat; el prompt del sistema va en el servidor (server.js + .env). */
  var geminiChatHistory = [];
  var hasAdminSession = false;
  var pendingAdminAccessResolver = null;

  /** Modelo por defecto (alineado con data/suite-settings-default.json) */
  var DEFAULT_SETTINGS = {
    version: 1,
    cuenta: {
      empleadoId: "",
      nombreCompleto: "Workbeef",
      cargo: "ninguno",
      departamento: "santander",
      fotoUrl: null,
      iniciales: "W",
      autenticacionDosPasosActiva: false
    },
    preferencias: {
      paginaInicioPorDefecto: "inventario",
      tema: "claro",
      idioma: "es-CO",
      zonaHoraria: "America/Bogota"
    },
    notificaciones: {
      alertasInventario: true,
      actualizacionesLogistica: true,
      avisosSistema: true,
      canalCorreo: true,
      canalApp: true
    },
    privacidad: {
      historialPaginas: "guardar_30_dias"
    }
  };

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== "object") return base;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(patch).forEach(function (k) {
      var pv = patch[k];
      if (pv && typeof pv === "object" && !Array.isArray(pv) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
        out[k] = deepMerge(base[k], pv);
      } else {
        out[k] = pv;
      }
    });
    return out;
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return deepMerge({}, DEFAULT_SETTINGS);
      var parsed = JSON.parse(raw);
      return deepMerge(DEFAULT_SETTINGS, parsed);
    } catch (e) {
      return deepMerge({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettingsModel(model) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(model));
  }

  function applyTheme(tema) {
    document.body.setAttribute("data-suite-theme", tema === "oscuro" ? "oscuro" : "claro");
  }

  function applySettingsToUI(model) {
    var c = model.cuenta || {};
    var nombre = document.getElementById("settingsNombreCompleto");
    var cargo = document.getElementById("settingsCargo");
    var dep = document.getElementById("settingsDepartamento");
    var avatar = document.getElementById("settingsProfileAvatar");
    if (nombre) nombre.textContent = c.nombreCompleto || "";
    if (cargo) cargo.textContent = c.cargo || "";
    if (dep) dep.textContent = c.departamento || "";
    if (avatar) {
      var ini = (c.iniciales || "").trim();
      if (!ini) {
        var nom = (c.nombreCompleto || "").trim();
        if (nom.length >= 2) ini = nom.slice(0, 2).toUpperCase();
        else if (nom.length === 1) ini = nom.toUpperCase();
        else ini = "C";
      }
      avatar.textContent = ini;
    }

    var p = model.preferencias || {};
    var elPag = document.getElementById("prefPaginaInicio");
    var elTema = document.getElementById("prefTema");
    var elIdi = document.getElementById("prefIdioma");
    var elZ = document.getElementById("prefZona");
    if (elPag) elPag.value = p.paginaInicioPorDefecto || "inventario";
    if (elTema) elTema.value = p.tema === "oscuro" ? "oscuro" : "claro";
    if (elIdi) elIdi.value = p.idioma || "es-CO";
    if (elZ) elZ.value = p.zonaHoraria || "America/Bogota";
    applyTheme(p.tema);

    var n = model.notificaciones || {};
    function setSw(id, on) {
      var el = document.getElementById(id);
      if (!el) return;
      el.checked = !!on;
      el.setAttribute("aria-checked", on ? "true" : "false");
    }
    setSw("notifInventario", n.alertasInventario);
    setSw("notifLogistica", n.actualizacionesLogistica);
    setSw("notifSistema", n.avisosSistema);
    var ce = document.getElementById("canalEmail");
    var ca = document.getElementById("canalApp");
    if (ce) ce.checked = !!n.canalCorreo;
    if (ca) ca.checked = !!n.canalApp;

    var priv = model.privacidad || {};
    var elH = document.getElementById("privHistorial");
    if (elH) elH.value = priv.historialPaginas || "guardar_30_dias";
  }

  function collectSettingsFromUI() {
    var base = loadSettings();
    var c = base.cuenta || {};
    var p = base.preferencias || {};
    var n = base.notificaciones || {};
    var priv = base.privacidad || {};

    var elTema = document.getElementById("prefTema");
    var elPag = document.getElementById("prefPaginaInicio");
    var elIdi = document.getElementById("prefIdioma");
    var elZ = document.getElementById("prefZona");
    p.tema = elTema && elTema.value === "oscuro" ? "oscuro" : "claro";
    p.paginaInicioPorDefecto = elPag ? elPag.value : p.paginaInicioPorDefecto;
    p.idioma = elIdi ? elIdi.value : p.idioma;
    p.zonaHoraria = elZ ? elZ.value : p.zonaHoraria;

    function getSw(id) {
      var el = document.getElementById(id);
      return el ? !!el.checked : false;
    }
    n.alertasInventario = getSw("notifInventario");
    n.actualizacionesLogistica = getSw("notifLogistica");
    n.avisosSistema = getSw("notifSistema");
    var ce = document.getElementById("canalEmail");
    var ca = document.getElementById("canalApp");
    n.canalCorreo = ce ? !!ce.checked : n.canalCorreo;
    n.canalApp = ca ? !!ca.checked : n.canalApp;

    var elH = document.getElementById("privHistorial");
    priv.historialPaginas = elH ? elH.value : priv.historialPaginas;

    return {
      version: base.version || DEFAULT_SETTINGS.version,
      cuenta: c,
      preferencias: p,
      notificaciones: n,
      privacidad: priv
    };
  }

  function setActiveMenuByAppId(appId) {
    var links = Array.prototype.slice.call(document.querySelectorAll(".menuItem"));
    links.forEach(function (x) {
      x.classList.toggle("active", x.getAttribute("data-app-id") === appId);
    });
  }

  function showView(which) {
    var home = document.getElementById("viewHome");
    var settings = document.getElementById("viewSettings");
    var backBtn = document.getElementById("backFromSettingsBtn");
    if (which === "settings") {
      if (home) {
        home.classList.remove("mainView--active");
        home.hidden = true;
      }
      if (settings) {
        settings.hidden = false;
        settings.classList.add("mainView--active");
      }
      if (backBtn) backBtn.hidden = false;
    } else {
      if (settings) {
        settings.hidden = true;
        settings.classList.remove("mainView--active");
      }
      if (home) {
        home.hidden = false;
        home.classList.add("mainView--active");
      }
      if (backBtn) backBtn.hidden = true;
    }
  }

  function openSettingsView() {
    applySettingsToUI(loadSettings());
    activateSettingsTab("cuenta");
    showView("settings");
  }

  function closeSettingsView() {
    showView("home");
  }

  function setAdminAccessError(msg) {
    var err = document.getElementById("adminAccessError");
    if (!err) return;
    var hasMsg = !!(msg && String(msg).trim());
    err.hidden = !hasMsg;
    err.textContent = hasMsg ? String(msg) : "";
  }

  function openAdminAccessModal() {
    closeSearchModal();
    closeFeedbackModal();
    var modal = document.getElementById("adminAccessModal");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setAdminAccessError("");
    var pwd = document.getElementById("adminAccessPassword");
    if (pwd) {
      pwd.value = "";
      pwd.focus();
    }
  }

  function closeAdminAccessModal() {
    var modal = document.getElementById("adminAccessModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setAdminAccessError("");
  }

  function resolvePendingAdminAccess(ok) {
    if (!pendingAdminAccessResolver) return;
    pendingAdminAccessResolver(!!ok);
    pendingAdminAccessResolver = null;
  }

  function checkAdminSession() {
    return fetch("/api/admin/session", {
      method: "GET",
      credentials: "include"
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) return false;
          return !!(data && data.authenticated);
        });
      })
      .catch(function () {
        return false;
      });
  }

  function requestAdminAccess() {
    if (hasAdminSession) return Promise.resolve(true);
    return checkAdminSession().then(function (isValid) {
      if (isValid) {
        hasAdminSession = true;
        return true;
      }
      if (pendingAdminAccessResolver) return Promise.resolve(false);
      openAdminAccessModal();
      return new Promise(function (resolve) {
        pendingAdminAccessResolver = resolve;
      });
    });
  }

  function activateSettingsTab(tabId) {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".settingsTab"));
    var panels = Array.prototype.slice.call(document.querySelectorAll(".settingsPanel"));
    tabs.forEach(function (btn) {
      var id = btn.getAttribute("data-tab");
      var active = id === tabId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach(function (panel) {
      var pid = panel.id.replace("panel-", "");
      var active = pid === tabId;
      panel.classList.toggle("is-visible", active);
      panel.hidden = !active;
    });
  }

  function initSettingsTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".settingsTab"));
    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tab");
        if (id) activateSettingsTab(id);
      });
    });
  }

  function initToggleAria() {
    var ids = ["notifInventario", "notifLogistica", "notifSistema"];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        el.setAttribute("aria-checked", el.checked ? "true" : "false");
      });
    });
  }

  function initSettingsOpen() {
    var btn = document.getElementById("settingsOpenBtn");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      requestAdminAccess().then(function (ok) {
        if (ok) openSettingsView();
      });
    });
  }

  function initAdminAccessModal() {
    var modal = document.getElementById("adminAccessModal");
    var form = document.getElementById("adminAccessForm");
    var backdrop = document.getElementById("adminAccessBackdrop");
    var closeBtn = document.getElementById("adminAccessClose");
    var cancelBtn = document.getElementById("adminAccessCancel");
    var submitBtn = document.getElementById("adminAccessSubmit");
    var pwd = document.getElementById("adminAccessPassword");
    if (!modal || !form) return;

    function cancelFlow() {
      closeAdminAccessModal();
      resolvePendingAdminAccess(false);
    }

    if (backdrop) backdrop.addEventListener("click", cancelFlow);
    if (closeBtn) closeBtn.addEventListener("click", cancelFlow);
    if (cancelBtn) cancelBtn.addEventListener("click", cancelFlow);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var password = ((pwd && pwd.value) || "").trim();
      if (!password) {
        setAdminAccessError("Ingresa la contraseña maestra.");
        return;
      }
      setAdminAccessError("");
      if (submitBtn) submitBtn.disabled = true;
      if (pwd) pwd.disabled = true;

      fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: password })
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          });
        })
        .then(function (out) {
          var res = out.res;
          var data = out.data;
          if (!res.ok) {
            setAdminAccessError((data && data.error) || "No se pudo validar el acceso.");
            return;
          }
          hasAdminSession = true;
          closeAdminAccessModal();
          resolvePendingAdminAccess(true);
        })
        .catch(function () {
          setAdminAccessError("Error de conexión con el servidor.");
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
          if (pwd) {
            pwd.disabled = false;
            pwd.focus();
          }
        });
    });
  }

  function initBackFromSettings() {
    var b = document.getElementById("backFromSettingsBtn");
    if (!b) return;
    b.addEventListener("click", function () {
      closeSettingsView();
    });
  }

  function persistSettingsFromUI() {
    var model = collectSettingsFromUI();
    saveSettingsModel(model);
    applyTheme(model.preferencias && model.preferencias.tema);
  }

  /** Sin botón Guardar: preferencias, notificaciones y privacidad se guardan al cambiar. */
  function initSettingsAutoSave() {
    var selects = ["prefPaginaInicio", "prefTema", "prefIdioma", "prefZona", "privHistorial"];
    selects.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        persistSettingsFromUI();
      });
    });
    ["notifInventario", "notifLogistica", "notifSistema", "canalEmail", "canalApp"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        persistSettingsFromUI();
      });
    });
  }

  var FEEDBACK_EMAIL = "desarrollo.tecnologia@colbeef.com";
  var DETALLES_POR_TEMA = {
    "Error o fallo": ["Pantalla en blanco", "Mensaje de error visible", "No carga un módulo", "Comportamiento inesperado", "Otro"],
    "Rendimiento o lentitud": ["Carga lenta en general", "Solo un módulo lento", "Timeout o cierre de sesión", "Otro"],
    "Sugerencia de mejora": ["Interfaz", "Nuevo reporte o dato", "Flujo de trabajo", "Otro"],
    "Acceso o sesión": ["No puedo iniciar sesión", "Sesión se cierra sola", "Permisos o roles", "Otro"],
    "Otro": ["Describir en el cuadro de abajo"]
  };

  function fillFeedbackDetalleOptions(tema) {
    var sel = document.getElementById("feedbackDetalle");
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar detalles del tema</option>';
    var arr = DETALLES_POR_TEMA[tema];
    if (!arr || !tema) {
      sel.disabled = true;
      return;
    }
    arr.forEach(function (opt) {
      var o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
    sel.disabled = false;
  }

  function openSearchModal() {
    closeFeedbackModal();
    var modal = document.getElementById("searchModal");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var inp = document.getElementById("searchModalInput");
    if (inp) {
      inp.value = "";
      inp.focus();
    }
    filterSearchResults();
  }

  function normalizeSearchText(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function filterSearchResults() {
    var list = document.getElementById("searchModalRecentList");
    var input = document.getElementById("searchModalInput");
    var live = document.getElementById("searchModalLive");
    var emptyEl = document.getElementById("searchModalEmpty");
    if (!list || !input) return;
    var q = normalizeSearchText(input.value.trim());
    var items = list.querySelectorAll(".searchModal-item");
    var visible = 0;
    items.forEach(function (li) {
      var a = li.querySelector("a.searchModal-link");
      if (!a) return;
      var label = normalizeSearchText(a.textContent);
      var extra = normalizeSearchText(a.getAttribute("data-search") || "");
      var match = !q || label.indexOf(q) !== -1 || extra.indexOf(q) !== -1;
      li.classList.toggle("is-search-hidden", !match);
      if (match) visible++;
    });
    if (emptyEl) {
      emptyEl.hidden = visible > 0 || !q;
    }
    if (live) {
      if (!q) {
        live.textContent = "";
      } else {
        live.textContent = visible === 1 ? "1 resultado" : visible + " resultados";
      }
    }
  }

  function getFirstVisibleSearchLink() {
    var list = document.getElementById("searchModalRecentList");
    if (!list) return null;
    var first = list.querySelector(".searchModal-item:not(.is-search-hidden) a.searchModal-link");
    return first;
  }

  function closeSearchModal() {
    var modal = document.getElementById("searchModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openFeedbackModal() {
    closeSearchModal();
    var modal = document.getElementById("feedbackModal");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var form = document.getElementById("feedbackForm");
    if (form) form.reset();
    fillFeedbackDetalleOptions("");
    var firstField = document.getElementById("feedbackTema");
    if (firstField) firstField.focus();
  }

  function closeFeedbackModal() {
    var modal = document.getElementById("feedbackModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function initSearchModal() {
    var openBtn = document.getElementById("searchOpenBtn");
    var backdrop = document.getElementById("searchModalBackdrop");
    var closeBtn = document.getElementById("searchModalClose");

    if (openBtn) {
      openBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openSearchModal();
      });
    }
    if (backdrop) backdrop.addEventListener("click", closeSearchModal);
    if (closeBtn) closeBtn.addEventListener("click", closeSearchModal);

    var searchInput = document.getElementById("searchModalInput");
    if (searchInput) {
      searchInput.addEventListener("input", filterSearchResults);
      searchInput.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        var link = getFirstVisibleSearchLink();
        if (link) {
          e.preventDefault();
          link.click();
        }
      });
    }

    var links = Array.prototype.slice.call(document.querySelectorAll(".searchModal-link"));
    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href") || "";
        e.preventDefault();
        closeSearchModal();
        closeSettingsView();
        var li = a.closest(".searchModal-item");
        var appId = li && li.getAttribute("data-app");
        if (appId) setActiveMenuByAppId(appId);
        if (/^https?:\/\//i.test(href)) {
          window.location.href = href;
        }
      });
    });
  }

  function openColbeefChatPanel() {
    var panel = document.getElementById("colbeefChatPanel");
    var fab = document.getElementById("colbeefChatToggle");
    if (!panel) return;
    panel.hidden = false;
    if (fab) fab.setAttribute("aria-expanded", "true");
    var inp = document.getElementById("colbeefChatInput");
    if (inp) setTimeout(function () { inp.focus(); }, 0);
  }

  function closeColbeefChatPanel() {
    var panel = document.getElementById("colbeefChatPanel");
    var fab = document.getElementById("colbeefChatToggle");
    if (!panel) return;
    panel.hidden = true;
    if (fab) fab.setAttribute("aria-expanded", "false");
  }

  function colbeefChatScrollToBottom() {
    var el = document.getElementById("colbeefChatMessages");
    if (el) el.scrollTop = el.scrollHeight;
  }

  var COLBEEF_CHAT_BOT_AVATAR = "./img/site/Graident Ai Robot.png";

  function colbeefChatAppendBotAvatar(container) {
    var img = document.createElement("img");
    img.className = "colbeefChat-msgAvatar";
    img.src = COLBEEF_CHAT_BOT_AVATAR;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.decoding = "async";
    container.appendChild(img);
  }

  function appendColbeefChatMsg(role, text) {
    var wrap = document.getElementById("colbeefChatMessages");
    if (!wrap) return;
    var div = document.createElement("div");
    div.className = "colbeefChat-msg colbeefChat-msg--" + (role === "user" ? "user" : "bot");
    if (role === "user") {
      div.textContent = text;
    } else {
      colbeefChatAppendBotAvatar(div);
      var body = document.createElement("div");
      body.className = "colbeefChat-msgBody";
      body.textContent = text;
      div.appendChild(body);
    }
    wrap.appendChild(div);
    colbeefChatScrollToBottom();
  }

  function colbeefChatSetThinking(on) {
    var wrap = document.getElementById("colbeefChatMessages");
    if (!wrap) return;
    var old = document.getElementById("colbeefChatThinking");
    if (old) old.remove();
    if (!on) return;
    var div = document.createElement("div");
    div.id = "colbeefChatThinking";
    div.className = "colbeefChat-msg colbeefChat-msg--bot colbeefChat-msg--thinking";
    colbeefChatAppendBotAvatar(div);
    var body = document.createElement("div");
    body.className = "colbeefChat-msgBody";
    body.textContent = "Pensando...";
    div.appendChild(body);
    wrap.appendChild(div);
    colbeefChatScrollToBottom();
  }

  function sendColbeefChatMessage() {
    var inp = document.getElementById("colbeefChatInput");
    var sendBtn = document.getElementById("colbeefChatSend");
    if (!inp) return;
    var text = (inp.value || "").trim();
    if (!text) return;
    inp.value = "";
    appendColbeefChatMsg("user", text);
    geminiChatHistory.push({ role: "user", parts: [{ text: text }] });
    colbeefChatSetThinking(true);
    if (sendBtn) sendBtn.disabled = true;
    inp.disabled = true;

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: geminiChatHistory })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (out) {
        var res = out.res;
        var data = out.data;
        if (!res.ok) {
          var errMsg =
            (typeof (data && data.error) === "string" && data.error) ||
            (data && data.error && data.error.message) ||
            (res.status + " " + res.statusText);
          appendColbeefChatMsg("bot", "No pude obtener respuesta: " + errMsg);
          geminiChatHistory.pop();
          return;
        }
        var botText =
          (data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text) ||
          "";
        if (!botText) {
          appendColbeefChatMsg("bot", "Respuesta vacía (revisa bloqueos de seguridad o el modelo).");
          geminiChatHistory.pop();
          return;
        }
        geminiChatHistory.push({ role: "model", parts: [{ text: botText }] });
        colbeefChatSetThinking(false);
        appendColbeefChatMsg("bot", botText);
      })
      .catch(function (err) {
        geminiChatHistory.pop();
        colbeefChatSetThinking(false);
        appendColbeefChatMsg(
          "bot",
          "Error de conexión con el servidor. ¿Estás en http://localhost (npm start)? Detalle: " +
            (err && err.message ? err.message : String(err))
        );
      })
      .finally(function () {
        colbeefChatSetThinking(false);
        if (sendBtn) sendBtn.disabled = false;
        inp.disabled = false;
        inp.focus();
      });
  }

  function initColbeefChat() {
    var fab = document.getElementById("colbeefChatToggle");
    var panel = document.getElementById("colbeefChatPanel");
    var closeBtn = document.getElementById("colbeefChatClose");
    var sendBtn = document.getElementById("colbeefChatSend");
    var inp = document.getElementById("colbeefChatInput");
    if (!fab || !panel) return;

    fab.addEventListener("click", function (e) {
      e.preventDefault();
      if (panel.hidden) openColbeefChatPanel();
      else closeColbeefChatPanel();
    });
    if (closeBtn) closeBtn.addEventListener("click", closeColbeefChatPanel);
    if (sendBtn) {
      sendBtn.addEventListener("click", function (e) {
        e.preventDefault();
        sendColbeefChatMessage();
      });
    }
    if (inp) {
      inp.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        sendColbeefChatMessage();
      });
    }
  }

  function initBugReportModal() {
    var openBtn = document.getElementById("bugReportOpenBtn");
    var modal = document.getElementById("feedbackModal");
    var backdrop = document.getElementById("feedbackModalBackdrop");
    var closeBtn = document.getElementById("feedbackModalClose");
    var cancelBtn = document.getElementById("feedbackCancelBtn");
    var form = document.getElementById("feedbackForm");
    var temaEl = document.getElementById("feedbackTema");

    if (openBtn) {
      openBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openFeedbackModal();
      });
    }

    if (temaEl) {
      temaEl.addEventListener("change", function () {
        fillFeedbackDetalleOptions(temaEl.value);
      });
    }

    if (backdrop) backdrop.addEventListener("click", closeFeedbackModal);
    if (closeBtn) closeBtn.addEventListener("click", closeFeedbackModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeFeedbackModal);

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var tema = (document.getElementById("feedbackTema") || {}).value || "";
        var detalle = (document.getElementById("feedbackDetalle") || {}).value || "";
        var mensaje = ((document.getElementById("feedbackMensaje") || {}).value || "").trim();

        if (!tema) {
          window.alert("Selecciona un tema.");
          return;
        }
        if (!detalle) {
          window.alert("Selecciona el detalle del tema.");
          return;
        }
        if (mensaje.length < 10) {
          window.alert("Describe el problema con al menos unas pocas líneas (mínimo 10 caracteres).");
          return;
        }

        var subject = "[Workbeef] " + tema + " — " + detalle;
        var body =
          "Tema: " + tema + "\n" +
          "Detalle: " + detalle + "\n\n" +
          "Descripción:\n" + mensaje + "\n\n" +
          "---\nEnviado desde Workbeef (reporte de bug / comentario)";

        var url =
          "mailto:" + FEEDBACK_EMAIL +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);

        closeFeedbackModal();
        window.location.href = url;
      });
    }
  }

  function initMenuTracking() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".menuItem"));
    links.forEach(function (a) {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        links.forEach(function (x) { x.classList.remove("active"); });
        a.classList.add("active");

        closeSettingsView();

        var appId = a.getAttribute("data-app-id") || "";
        var targetUrl = a.getAttribute("data-target-url") || "";
        if (targetUrl && targetUrl !== "#") {
          window.location.href = targetUrl;
          return;
        }
        if (appId) {
          var tile = document.querySelector('.moduleTile[data-app-id="' + appId + '"]');
          var href = tile && tile.getAttribute("href");
          if (href && /^https?:\/\//i.test(href)) {
            window.location.href = href;
          }
        }
      });
    });
  }

  function initDashboardMosaic() {
    var tiles = Array.prototype.slice.call(document.querySelectorAll(".moduleTile"));
    tiles.forEach(function (tile) {
      tile.addEventListener("click", function () {
        var id = tile.getAttribute("data-app-id");
        if (id) setActiveMenuByAppId(id);
      });
    });
  }

  function initSidebarHover() {
    var layout = document.getElementById("suiteLayout");
    var sidebar = document.getElementById("sidebar");
    var zone = document.getElementById("sidebarHoverZone");
    if (!layout || !sidebar || !zone) return;

    if (window.matchMedia("(max-width: 900px)").matches) {
      layout.classList.add("sidebar-open");
      return;
    }

    var closeTimer = null;

    function openSidebar() {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      layout.classList.add("sidebar-open");
    }

    function closeSidebarSoon() {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        layout.classList.remove("sidebar-open");
      }, 140);
    }

    zone.addEventListener("mouseenter", openSidebar);
    sidebar.addEventListener("mouseenter", openSidebar);
    sidebar.addEventListener("mouseleave", closeSidebarSoon);

    document.addEventListener("mouseleave", function () {
      layout.classList.remove("sidebar-open");
    });
    window.addEventListener("blur", function () {
      layout.classList.remove("sidebar-open");
    });
  }

  function init() {
    applySettingsToUI(loadSettings());
    initSidebarHover();
    initMenuTracking();
    initDashboardMosaic();
    initAdminAccessModal();
    initSettingsOpen();
    initBackFromSettings();
    initSettingsTabs();
    initToggleAria();
    initSettingsAutoSave();
    initSearchModal();
    initColbeefChat();
    initBugReportModal();

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var am = document.getElementById("adminAccessModal");
      if (am && !am.hidden) {
        closeAdminAccessModal();
        resolvePendingAdminAccess(false);
        return;
      }
      var chatPanel = document.getElementById("colbeefChatPanel");
      if (chatPanel && !chatPanel.hidden) {
        closeColbeefChatPanel();
        return;
      }
      var sm = document.getElementById("searchModal");
      var fm = document.getElementById("feedbackModal");
      if (sm && !sm.hidden) {
        closeSearchModal();
      } else if (fm && !fm.hidden) {
        closeFeedbackModal();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
