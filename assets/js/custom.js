(function () {
  "use strict";

  var canvas = document.getElementById("dot-grid-bg");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Respect prefers-reduced-motion
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reducedMotion = motionQuery.matches;

  motionQuery.addEventListener("change", function (e) {
    reducedMotion = e.matches;
  });

  // Detect color scheme
  function isDarkMode() {
    return document.body.classList.contains("colorscheme-dark") ||
      (document.body.classList.contains("colorscheme-auto") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  // Configuration
  var SPACING = 32;
  var DOT_RADIUS = 1.2;
  var RIPPLE_RADIUS = 120;
  var RIPPLE_STRENGTH = 8;

  var dots = [];
  var mouse = { x: -9999, y: -9999 };
  var rafId = null;

  function buildGrid() {
    dots = [];
    canvas.width = window.innerWidth;
    canvas.height = document.documentElement.scrollHeight;

    var cols = Math.ceil(canvas.width / SPACING) + 1;
    var rows = Math.ceil(canvas.height / SPACING) + 1;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        dots.push({
          homeX: c * SPACING,
          homeY: r * SPACING,
          x: c * SPACING,
          y: r * SPACING,
        });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var dark = isDarkMode();
    var dotColor = dark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)";

    var scrollY = window.scrollY || window.pageYOffset;
    var mouseWorldY = mouse.y + scrollY;

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      var drawX = dot.homeX;
      var drawY = dot.homeY;

      if (!reducedMotion) {
        var dx = dot.homeX - mouse.x;
        var dy = dot.homeY - mouseWorldY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < RIPPLE_RADIUS && dist > 0) {
          var force = (1 - dist / RIPPLE_RADIUS) * RIPPLE_STRENGTH;
          drawX = dot.homeX + (dx / dist) * force;
          drawY = dot.homeY + (dy / dist) * force;
        }
      }

      // Only draw dots visible in viewport
      var screenY = drawY - scrollY;
      if (screenY < -SPACING || screenY > window.innerHeight + SPACING) continue;

      ctx.beginPath();
      ctx.arc(drawX, drawY - scrollY, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }

    if (!reducedMotion) {
      rafId = requestAnimationFrame(draw);
    }
  }

  function onResize() {
    buildGrid();
    if (reducedMotion) {
      draw();
    }
  }

  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onMouseLeave() {
    mouse.x = -9999;
    mouse.y = -9999;
  }

  // Debounced resize
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 200);
  });

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseleave", onMouseLeave);

  // Watch for color scheme toggle
  var observer = new MutationObserver(function () {
    if (reducedMotion) draw();
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // Rebuild grid when page content changes height
  var lastHeight = 0;
  function checkHeight() {
    var h = document.documentElement.scrollHeight;
    if (h !== lastHeight) {
      lastHeight = h;
      buildGrid();
      if (reducedMotion) draw();
    }
  }
  setInterval(checkHeight, 2000);

  // Init
  buildGrid();

  if (reducedMotion) {
    draw();
  } else {
    rafId = requestAnimationFrame(draw);
  }
})();
