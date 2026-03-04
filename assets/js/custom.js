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
  var DOT_RADIUS_BASE = 1.2;
  var DOT_RADIUS_MAX = 3.5;
  var INFLUENCE_RADIUS = 180;
  var RIPPLE_STRENGTH = 10;
  var CONNECTION_RADIUS = 60;

  var dots = [];
  var cols = 0;
  var mouse = { x: -9999, y: -9999 };
  var smoothMouse = { x: -9999, y: -9999 };
  var rafId = null;

  function buildGrid() {
    dots = [];
    canvas.width = window.innerWidth;
    canvas.height = document.documentElement.scrollHeight;

    cols = Math.ceil(canvas.width / SPACING) + 1;
    var rows = Math.ceil(canvas.height / SPACING) + 1;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        dots.push({
          homeX: c * SPACING,
          homeY: r * SPACING,
          col: c,
          row: r,
        });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Smooth the mouse position for fluid movement
    if (!reducedMotion) {
      smoothMouse.x += (mouse.x - smoothMouse.x) * 0.15;
      smoothMouse.y += (mouse.y - smoothMouse.y) * 0.15;
    }

    var dark = isDarkMode();
    var baseDotColor = dark ? [255, 255, 255] : [0, 0, 0];
    var baseAlpha = dark ? 0.08 : 0.07;
    var accentColor = dark ? [100, 180, 255] : [21, 101, 192];
    var lineColor = dark ? [100, 180, 255] : [21, 101, 192];

    var scrollY = window.scrollY || window.pageYOffset;
    var mx = smoothMouse.x;
    var mwy = smoothMouse.y + scrollY;
    var viewTop = scrollY - SPACING;
    var viewBottom = scrollY + window.innerHeight + SPACING;

    // Collect visible affected dots for connection lines
    var affectedDots = [];

    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];

      // Skip dots not in viewport
      if (dot.homeY < viewTop || dot.homeY > viewBottom) continue;

      var drawX = dot.homeX;
      var drawY = dot.homeY;
      var dist = 9999;
      var t = 0; // Influence factor 0..1

      if (!reducedMotion && mx > -999) {
        var dx = dot.homeX - mx;
        var dy = dot.homeY - mwy;
        dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < INFLUENCE_RADIUS && dist > 0) {
          t = 1 - dist / INFLUENCE_RADIUS;
          // Push dots away from cursor
          var force = t * RIPPLE_STRENGTH;
          drawX = dot.homeX + (dx / dist) * force;
          drawY = dot.homeY + (dy / dist) * force;
        }
      }

      var screenY = drawY - scrollY;

      // Compute dot appearance based on proximity
      var radius = DOT_RADIUS_BASE + t * (DOT_RADIUS_MAX - DOT_RADIUS_BASE);
      var r = baseDotColor[0] + t * (accentColor[0] - baseDotColor[0]);
      var g = baseDotColor[1] + t * (accentColor[1] - baseDotColor[1]);
      var b = baseDotColor[2] + t * (accentColor[2] - baseDotColor[2]);
      var alpha = baseAlpha + t * (0.6 - baseAlpha);

      ctx.beginPath();
      ctx.arc(drawX, screenY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + "," + alpha.toFixed(3) + ")";
      ctx.fill();

      // Track affected dots for drawing connections
      if (t > 0.1) {
        affectedDots.push({
          x: drawX,
          y: screenY,
          t: t,
          col: dot.col,
          row: dot.row,
        });
      }
    }

    // Draw constellation lines between nearby affected dots
    if (!reducedMotion && affectedDots.length > 1) {
      for (var a = 0; a < affectedDots.length; a++) {
        for (var b2 = a + 1; b2 < affectedDots.length; b2++) {
          var da = affectedDots[a];
          var db = affectedDots[b2];

          // Only connect neighbours (within 1 grid step)
          var colDiff = Math.abs(da.col - db.col);
          var rowDiff = Math.abs(da.row - db.row);
          if (colDiff > 1 || rowDiff > 1) continue;

          var lineDist = Math.sqrt(
            (da.x - db.x) * (da.x - db.x) +
            (da.y - db.y) * (da.y - db.y)
          );
          if (lineDist > CONNECTION_RADIUS) continue;

          var lineT = Math.min(da.t, db.t);
          var lineAlpha = lineT * 0.3;

          ctx.beginPath();
          ctx.moveTo(da.x, da.y);
          ctx.lineTo(db.x, db.y);
          ctx.strokeStyle = "rgba(" + lineColor[0] + "," + lineColor[1] + "," + lineColor[2] + "," + lineAlpha.toFixed(3) + ")";
          ctx.lineWidth = lineT * 1.5;
          ctx.stroke();
        }
      }
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
    // Initialise smooth position on first move
    if (smoothMouse.x < -999) {
      smoothMouse.x = mouse.x;
      smoothMouse.y = mouse.y;
    }
  }

  function onMouseLeave() {
    mouse.x = -9999;
    mouse.y = -9999;
    smoothMouse.x = -9999;
    smoothMouse.y = -9999;
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
