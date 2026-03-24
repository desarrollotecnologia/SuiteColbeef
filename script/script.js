(function () {
  function $(id) {
    return document.getElementById(id);
  }

  var statusEl = $("statusText");
  var fillEl = $("loaderFill");
  var screenEl = document.querySelector(".screen");
  var nextUrl = screenEl ? screenEl.getAttribute("data-next-url") || "" : "";

  // --- Lógica de la Chuleta Animada ---
  var steakEl = document.querySelector(".steak");
  var steakFrames = [
    "img/pantallaCarga/chuleta.png",
    "img/pantallaCarga/chuleta mordida1.png",
    "img/pantallaCarga/chuleta mordida2.png"
  ];
  var currentFrame = 0;

  function animateSteak() {
    currentFrame = (currentFrame + 1) % steakFrames.length;
    if (steakEl) {
      steakEl.src = steakFrames[currentFrame];
    }
  }
  // Cambia el frame cada 500ms (ajusta el tiempo si lo quieres más rápido)
  setInterval(animateSteak, 500);

  // --- Lógica de Progreso ---
  var DURATION_MS = 3400;
  var START = null;

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

  function tick(ts) {
    if (!START) START = ts;
    var elapsed = ts - START;
    var t = elapsed / DURATION_MS;
    var p = easeOutCubic(Math.min(1, t)) * 100;
    setProgress(p);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      if (statusEl) statusEl.textContent = "Listo";
      setProgress(100);
      if (nextUrl) {
        window.location.href = nextUrl;
      }
    }
  }

  function init() {
    if (fillEl) fillEl.style.transform = "scaleX(0)";
    setProgress(0);
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();