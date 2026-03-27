(function () {
  function $(id) {
    return document.getElementById(id);
  }

  var statusEl = $("statusText");
  var fillEl = $("loaderFill");
  var screenEl = document.querySelector(".screen");
  var nextUrl = screenEl ? screenEl.getAttribute("data-next-url") || "" : "";

  var startTime = Date.now();
  /** Mínimo en pantalla para ver letras + sensación de carga (ms). */
  var MIN_MS = 900;
  /** Máximo antes de forzar salida (ms). */
  var MAX_MS = 2400;
  /** Duración visual de la barra (ms). */
  var PROGRESS_MS = 850;

  var navigated = false;
  var progressRaf = null;

  function go() {
    if (navigated) return;
    navigated = true;
    if (progressRaf) {
      cancelAnimationFrame(progressRaf);
      progressRaf = null;
    }
    if (fillEl) fillEl.style.transform = "scaleX(1)";
    if (statusEl) statusEl.textContent = "Listo";
    if (nextUrl) {
      window.location.href = nextUrl;
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function setProgress(p) {
    var clamped = Math.max(0, Math.min(100, p));
    if (fillEl) {
      fillEl.style.transform = "scaleX(" + (clamped / 100).toFixed(3) + ")";
    }
    if (statusEl) {
      statusEl.textContent = "Cargando... " + Math.round(clamped) + "%";
    }
  }

  function tickProgress(ts) {
    if (navigated) return;
    if (!tickProgress._start) tickProgress._start = ts;
    var t = Math.min(1, (ts - tickProgress._start) / PROGRESS_MS);
    setProgress(easeOutCubic(t) * 100);
    if (t < 1) {
      progressRaf = requestAnimationFrame(tickProgress);
    } else {
      setProgress(100);
    }
  }

  function scheduleNavigation() {
    var elapsed = Date.now() - startTime;
    var wait = Math.max(0, MIN_MS - elapsed);
    setTimeout(go, wait);
  }

  window.addEventListener(
    "load",
    function () {
      scheduleNavigation();
    },
    { once: true }
  );

  setTimeout(go, MAX_MS);

  function init() {
    tickProgress._start = null;
    if (fillEl) fillEl.style.transform = "scaleX(0)";
    setProgress(0);
    progressRaf = requestAnimationFrame(tickProgress);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
