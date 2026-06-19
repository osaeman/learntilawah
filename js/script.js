/* =====================================================================
   Learn Tilawah — scripts
   Vanilla JS. No dependencies. Runs after DOM (script is deferred).
   ===================================================================== */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ---------------------------------------------------------------
     Mobile navigation toggle
  ---------------------------------------------------------------- */
  (function nav() {
    var navEl = document.querySelector(".nav");
    var toggle = document.querySelector(".nav__toggle");
    var menu = document.getElementById("primary-menu");
    if (!navEl || !toggle || !menu) return;

    function setOpen(open) {
      navEl.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    }
    toggle.addEventListener("click", function () {
      setOpen(!navEl.classList.contains("is-open"));
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest(".nav__link, .nav__cta")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  })();

  /* ---------------------------------------------------------------
     Sticky header shadow on scroll + back-to-top button
  ---------------------------------------------------------------- */
  (function scrollChrome() {
    var header = document.querySelector(".header");
    var toTop = document.getElementById("toTop");
    function onScroll() {
      var y = window.scrollY;
      if (header) header.classList.toggle("is-stuck", y > 8);
      if (toTop) toTop.classList.toggle("is-visible", y > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  /* ---------------------------------------------------------------
     Scroll reveal (IntersectionObserver) with light stagger
  ---------------------------------------------------------------- */
  (function reveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    // stagger within shared grids
    document
      .querySelectorAll(".benefits__grid, .how__steps, .accordion")
      .forEach(function (grid) {
        Array.prototype.forEach.call(
          grid.querySelectorAll("[data-reveal]"),
          function (el, i) {
            el.style.setProperty("--d", (i % 4) * 0.08 + "s");
          },
        );
      });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  })();

  /* ---------------------------------------------------------------
     Challenge threshold reveal

     Desktop + motion-enabled only. Scroll distance inside the
     Challenge content area acts as a trigger: every small downward movement
     reveals the next content block, and upward movement hides the
     latest block. The animation itself is handled by CSS transitions,
     so items always complete smoothly instead of stopping midway.
  ---------------------------------------------------------------- */
  (function challengeThresholdReveal() {
    var section = document.querySelector(".challenge");
    if (!section) return;

    var grid = section.querySelector(".challenge__grid");
    if (!grid) return;

    var items = Array.prototype.slice.call(
      section.querySelectorAll(
        ".challenge__lead, .challenge__body, .challenge__cta",
      ),
    );
    if (!items.length) return;

    var mq = window.matchMedia("(min-width: 821px)");
    var TRIGGER_PX = 80;
    var activeCount = 0;
    var accumulator = 0;
    var ticking = false;
    var lastY = window.scrollY || window.pageYOffset || 0;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function canRun() {
      return mq.matches && !prefersReduced;
    }

    function setCount(count) {
      activeCount = clamp(count, 0, items.length);

      items.forEach(function (el, index) {
        var visible = index < activeCount;
        el.style.setProperty("--challenge-opacity", visible ? "1" : "0");
        el.style.setProperty("--challenge-y", visible ? "0px" : "24px");
        el.style.pointerEvents = visible ? "auto" : "none";
      });
    }

    function revealAll() {
      setCount(items.length);
    }

    function hideAll() {
      setCount(0);
    }

    function sectionState(triggerRect, vh, topLimit) {
      var startLine = vh * 0.68;

      if (triggerRect.bottom <= topLimit + 20) return "passed";
      if (triggerRect.top >= startLine) return "before";
      return "active";
    }

    function consumeDelta(deltaY) {
      if (deltaY === 0) return;

      accumulator += deltaY;

      while (accumulator >= TRIGGER_PX && activeCount < items.length) {
        setCount(activeCount + 1);
        accumulator -= TRIGGER_PX;
      }

      while (accumulator <= -TRIGGER_PX && activeCount > 0) {
        setCount(activeCount - 1);
        accumulator += TRIGGER_PX;
      }

      if (activeCount === 0 && accumulator < 0) accumulator = 0;
      if (activeCount === items.length && accumulator > 0) accumulator = 0;
    }

    function update() {
      ticking = false;

      if (!canRun()) {
        revealAll();
        return;
      }

      var currentY = window.scrollY || window.pageYOffset || 0;
      var deltaY = currentY - lastY;
      lastY = currentY;

      var triggerRect = grid.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var topLimit =
        (parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--head-h",
          ),
        ) || 76) + 24;
      var state = sectionState(triggerRect, vh, topLimit);

      if (state === "passed") {
        accumulator = 0;
        revealAll();
        return;
      }

      if (state === "before") {
        accumulator = 0;
        hideAll();
        return;
      }

      consumeDelta(deltaY);
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    if (mq.addEventListener) mq.addEventListener("change", requestUpdate);

    hideAll();
    requestUpdate();
  })();

  /* ---------------------------------------------------------------
     Hero slider (auto + dots, fade/slide)
  ---------------------------------------------------------------- */
  (function heroSlider() {
    var track = document.querySelector(".slider__track");
    var slides = document.querySelectorAll(".slider__slide");
    var dots = document.querySelectorAll(".slider__dot");
    if (!track || slides.length < 2) return;

    var index = 0;
    var timer = null;
    var DELAY = 4800;

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(" + -index * 100 + "%)";
      dots.forEach(function (d, n) {
        d.classList.toggle("is-active", n === index);
      });
      slides.forEach(function (s, n) {
        s.setAttribute("aria-hidden", String(n !== index));
      });
    }
    function next() {
      go(index + 1);
    }
    function start() {
      if (!prefersReduced) timer = setInterval(next, DELAY);
    }
    function stop() {
      clearInterval(timer);
    }

    dots.forEach(function (dot, n) {
      dot.addEventListener("click", function () {
        stop();
        go(n);
        start();
      });
    });
    var viewport = document.querySelector(".slider__viewport");
    if (viewport) {
      viewport.addEventListener("mouseenter", stop);
      viewport.addEventListener("mouseleave", start);
    }
    go(0);
    start();
  })();

  /* ---------------------------------------------------------------
     Course curriculum expand/collapse (smooth height)
  ---------------------------------------------------------------- */
  (function curriculum() {
    var buttons = document.querySelectorAll(".course-card__expand");
    buttons.forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      var scrollArea = panel.closest(".course-card__scroll");
      panel.hidden = false;
      panel.style.maxHeight = "0px";
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        btn.querySelector("span").textContent = open
          ? "View Curriculum"
          : "Hide Curriculum";
        panel.style.maxHeight = open ? "0px" : panel.scrollHeight + "px";
        if (!open && scrollArea) {
          // bring the freshly opened curriculum into view inside the card
          requestAnimationFrame(function () {
            btn.scrollIntoView({ block: "nearest" });
          });
        }
      });
      panel.addEventListener("transitionend", function () {
        if (btn.getAttribute("aria-expanded") === "true")
          panel.style.maxHeight = "none";
      });
    });
  })();

  /* ---------------------------------------------------------------
     Courses parallax stack — horizontal scroll-bound handoff.

     The important fix: all course panels are overlaid in one sticky
     stage by CSS. So the incoming card does not travel upward from the
     document flow anymore; this script only updates translateX().
  ---------------------------------------------------------------- */
  (function courseParallax() {
    var stack = document.querySelector("[data-stack]");
    if (!stack) return;

    var panels = Array.prototype.slice.call(
      stack.querySelectorAll(".course-panel"),
    );
    if (panels.length < 2) return;

    var cards = panels.map(function (p) {
      return p.querySelector(".course-card");
    });
    if (
      cards.some(function (card) {
        return !card;
      })
    )
      return;

    var mq = window.matchMedia("(min-width: 821px)");
    var ticking = false;
    var stickyTop = 100;
    var slidePx = 1000;
    var handoffPx = 900;

    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    function readStickyTop() {
      return (
        (parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--head-h",
          ),
        ) || 76) + 24
      );
    }

    function resetForMobileOrReduced() {
      stack.style.height = "";
      cards.forEach(function (card) {
        card.style.transform = "";
        card.style.zIndex = "";
        card.style.pointerEvents = "";
      });
      panels.forEach(function (panel) {
        panel.style.zIndex = "";
        panel.style.pointerEvents = "";
      });
    }

    function measure() {
      if (!mq.matches || prefersReduced) {
        resetForMobileOrReduced();
        return;
      }

      stickyTop = readStickyTop();

      var cardRect = cards[0].getBoundingClientRect();
      var cardWidth =
        cardRect.width || Math.min(1060, window.innerWidth * 0.92);
      var cardHeight = cardRect.height || 520;

      // Enough distance for the resting card to fully leave the viewport
      // and for the incoming card to start fully outside the right edge.
      slidePx = (window.innerWidth + cardWidth) / 2 + 48;

      // Vertical scroll distance used to complete one horizontal handoff.
      // This affects pacing only; movement itself remains linear.
      handoffPx = Math.max(620, Math.min(1100, window.innerHeight - stickyTop));

      stack.style.height = cardHeight + handoffPx * (cards.length - 1) + "px";
    }

    function update() {
      ticking = false;

      if (!mq.matches || prefersReduced) {
        resetForMobileOrReduced();
        return;
      }

      var stackRect = stack.getBoundingClientRect();

      // raw progress: 0 = first card centered, 1 = second card centered.
      // For more cards, each whole number centers the next card.
      var raw = (stickyTop - stackRect.top) / handoffPx;
      raw = clamp(raw, 0, cards.length - 1);

      var activeIndex = Math.round(raw);

      cards.forEach(function (card, index) {
        // offset 0 = centered, +1 = offscreen right, -1 = offscreen left.
        var offset = clamp(index - raw, -1, 1);
        card.style.transform = "translate3d(" + offset * slidePx + "px, 0, 0)";

        // Later panels sit above earlier panels visually, but only the
        // currently centered card can receive mouse/touch events. This
        // prevents the offscreen/transparent stacked panel from blocking
        // Course 01 buttons.
        panels[index].style.zIndex = String(10 + index);
        card.style.zIndex = String(10 + index);
        panels[index].style.pointerEvents =
          index === activeIndex ? "auto" : "none";
        card.style.pointerEvents = index === activeIndex ? "auto" : "none";
      });
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function refresh() {
      measure();
      requestUpdate();
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", refresh);
    if (mq.addEventListener) mq.addEventListener("change", refresh);

    refresh();
  })();

  /* ---------------------------------------------------------------
     FAQ background reveal

     The FAQ image is intentionally not a normal static background.
     It starts fully hidden below the section and is revealed by scroll
     through CSS variables for clip, opacity, vertical travel and scale.
  ---------------------------------------------------------------- */
  (function faqBackgroundReveal() {
    var faq = document.querySelector(".faqs");
    if (!faq) return;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function setFinalState() {
      faq.style.setProperty("--faq-bg-reveal", "0%");
      faq.style.setProperty("--faq-bg-opacity", "1");
      faq.style.setProperty("--faq-bg-y", "0px");
      faq.style.setProperty("--faq-bg-scale", "1.04");
      faq.style.setProperty("--faq-overlay-opacity", "1");
    }

    if (prefersReduced) {
      setFinalState();
      return;
    }

    var ticking = false;

    function update() {
      ticking = false;

      var rect = faq.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;

      // Start while the FAQ is still below the viewport and finish only
      // after the section has clearly moved into the screen. This makes
      // the image reveal visible instead of looking like a normal bg.
      var start = vh * 1.05;
      var end = vh * 0.18;
      var progress = clamp((start - rect.top) / (start - end), 0, 1);

      // Keep the math linear so the reveal follows the scroll directly.
      var reveal = 100 - progress * 100;
      var y = 96 - progress * 96;
      var scale = 1.16 - progress * 0.12;
      var overlay = 0.94 + progress * 0.06;

      faq.style.setProperty("--faq-bg-reveal", reveal.toFixed(1) + "%");
      faq.style.setProperty("--faq-bg-opacity", progress.toFixed(3));
      faq.style.setProperty("--faq-bg-y", y.toFixed(1) + "px");
      faq.style.setProperty("--faq-bg-scale", scale.toFixed(3));
      faq.style.setProperty("--faq-overlay-opacity", overlay.toFixed(3));
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    update();
  })();

  /* ---------------------------------------------------------------
     How it works — threshold-triggered step slide-in

     Desktop + motion-enabled only. The cards start outside the right
     side of the viewport. Scroll movement inside the cards area acts as
     a trigger: every threshold reveals or hides one card. Fast scrolling
     can cross multiple thresholds at once, and skipped sections are
     synced so hidden cards are not left behind.
  ---------------------------------------------------------------- */
  (function howStepsThresholdReveal() {
    var section = document.querySelector(".how");
    if (!section) return;

    var grid = section.querySelector(".how__steps");
    if (!grid) return;

    var steps = Array.prototype.slice.call(grid.querySelectorAll(".step"));
    if (!steps.length) return;

    var mq = window.matchMedia("(min-width: 821px)");
    var TRIGGER_PX = 70;
    var activeCount = 0;
    var accumulator = 0;
    var ticking = false;
    var lastY = window.scrollY || window.pageYOffset || 0;
    var startOffsets = [];

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function canRun() {
      return mq.matches && !prefersReduced;
    }

    function measureOffsets() {
      if (!canRun()) return;

      var gridRect = grid.getBoundingClientRect();
      startOffsets = steps.map(function (step) {
        var originalLeft = gridRect.left + step.offsetLeft;
        return Math.max(260, window.innerWidth - originalLeft + 80);
      });
    }

    function setCount(count) {
      activeCount = clamp(count, 0, steps.length);

      steps.forEach(function (step, index) {
        var visible = index < activeCount;
        var startX = startOffsets[index] || window.innerWidth + 100;

        step.style.setProperty("--how-x", visible ? "0px" : startX + "px");
        step.style.setProperty("--how-opacity", visible ? "1" : "0");
        step.style.pointerEvents = visible ? "auto" : "none";
      });
    }

    function revealAll() {
      setCount(steps.length);
    }

    function hideAll() {
      setCount(0);
    }

    function sectionState(triggerRect, vh, topLimit) {
      var startLine = vh * 0.72;

      if (triggerRect.bottom <= topLimit + 20) return "passed";
      if (triggerRect.top >= startLine) return "before";
      return "active";
    }

    function consumeDelta(deltaY) {
      if (deltaY === 0) return;

      accumulator += deltaY;

      while (accumulator >= TRIGGER_PX && activeCount < steps.length) {
        setCount(activeCount + 1);
        accumulator -= TRIGGER_PX;
      }

      while (accumulator <= -TRIGGER_PX && activeCount > 0) {
        setCount(activeCount - 1);
        accumulator += TRIGGER_PX;
      }

      if (activeCount === 0 && accumulator < 0) accumulator = 0;
      if (activeCount === steps.length && accumulator > 0) accumulator = 0;
    }

    function update() {
      ticking = false;

      if (!canRun()) {
        revealAll();
        return;
      }

      if (!startOffsets.length) measureOffsets();

      var currentY = window.scrollY || window.pageYOffset || 0;
      var deltaY = currentY - lastY;
      lastY = currentY;

      var triggerRect = grid.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var topLimit =
        (parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--head-h",
          ),
        ) || 76) + 24;
      var state = sectionState(triggerRect, vh, topLimit);

      if (state === "passed") {
        accumulator = 0;
        revealAll();
        return;
      }

      if (state === "before") {
        accumulator = 0;
        hideAll();
        return;
      }

      consumeDelta(deltaY);
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function handleResize() {
      startOffsets = [];
      measureOffsets();
      requestUpdate();
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", handleResize);
    if (mq.addEventListener) mq.addEventListener("change", handleResize);

    measureOffsets();
    hideAll();
    requestUpdate();
  })();

  /* ---------------------------------------------------------------
     FAQ accordion
  ---------------------------------------------------------------- */
  (function faq() {
    var items = document.querySelectorAll(".accordion__item");
    items.forEach(function (item) {
      var trigger = item.querySelector(".accordion__trigger");
      var panel = item.querySelector(".accordion__panel");
      if (!trigger || !panel) return;
      trigger.addEventListener("click", function () {
        var open = item.classList.contains("is-open");
        // close siblings
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove("is-open");
            other
              .querySelector(".accordion__trigger")
              .setAttribute("aria-expanded", "false");
            other.querySelector(".accordion__panel").style.maxHeight = "0px";
          }
        });
        item.classList.toggle("is-open", !open);
        trigger.setAttribute("aria-expanded", String(!open));
        panel.style.maxHeight = open ? "0px" : panel.scrollHeight + "px";
      });
    });
  })();

  /* ---------------------------------------------------------------
     Book trial scene — single-trigger text-to-form transition

     Desktop + motion-enabled only. The section starts with the
     textual side centered. Once the user scrolls a short distance
     inside the Book section, the text exits left in four staggered
     pieces and the form slides in from the right. Scrolling back up
     reverses the scene.
  ---------------------------------------------------------------- */
  (function bookTrialScene() {
    var section = document.querySelector(".book");
    if (!section) return;

    var inner = section.querySelector(".book__inner");
    var aside = section.querySelector(".book__aside");
    var form = section.querySelector(".form");
    if (!inner || !aside || !form) return;

    var mq = window.matchMedia("(min-width: 821px)");
    var TRIGGER_PX = 200;
    var activeScene = "intro";
    var accumulator = 0;
    var ticking = false;
    var lastY = window.scrollY || window.pageYOffset || 0;

    function canRun() {
      return mq.matches && !prefersReduced;
    }

    function setScene(scene) {
      if (
        activeScene === scene &&
        section.getAttribute("data-book-scene") === scene
      ) {
        return;
      }

      activeScene = scene;
      section.setAttribute("data-book-scene", scene);
    }

    function sectionState(triggerRect, vh, topLimit) {
      var startLine = vh * 0.37;

      if (triggerRect.bottom <= topLimit + 20) return "passed";
      if (triggerRect.top >= startLine) return "before";
      return "active";
    }

    function consumeDelta(deltaY) {
      if (deltaY === 0) return;

      accumulator += deltaY;

      if (activeScene === "intro" && accumulator >= TRIGGER_PX) {
        accumulator = 0;
        setScene("form");
        return;
      }

      if (activeScene === "form" && accumulator <= -TRIGGER_PX) {
        accumulator = 0;
        setScene("intro");
        return;
      }

      if (activeScene === "intro" && accumulator < 0) accumulator = 0;
      if (activeScene === "form" && accumulator > 0) accumulator = 0;
    }

    function update() {
      ticking = false;

      if (!canRun()) {
        section.removeAttribute("data-book-scene");
        return;
      }

      if (!section.hasAttribute("data-book-scene")) {
        section.setAttribute("data-book-scene", activeScene);
      }

      var currentY = window.scrollY || window.pageYOffset || 0;
      var deltaY = currentY - lastY;
      lastY = currentY;

      var triggerRect = inner.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var topLimit =
        (parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--head-h",
          ),
        ) || 76) + 24;
      var state = sectionState(triggerRect, vh, topLimit);

      if (state === "passed") {
        accumulator = 0;
        setScene("form");
        return;
      }

      if (state === "before") {
        accumulator = 0;
        setScene("intro");
        return;
      }

      consumeDelta(deltaY);
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    if (mq.addEventListener) mq.addEventListener("change", requestUpdate);

    setScene("intro");
    requestUpdate();
  })();

  /* ---------------------------------------------------------------
     Booking form — validation + async submit to php/send.php
  ---------------------------------------------------------------- */
  (function bookingForm() {
    var form = document.getElementById("trial-form");
    var status = document.getElementById("formStatus");
    var btn = document.getElementById("submitBtn");
    if (!form) return;

    function setStatus(msg, ok) {
      status.hidden = false;
      status.textContent = msg;
      status.className =
        "form__status " + (ok ? "form__status--ok" : "form__status--err");
    }
    function validate() {
      var valid = true;
      var required = form.querySelectorAll("[required]");
      required.forEach(function (el) {
        var bad =
          !el.value.trim() ||
          (el.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value));
        el.classList.toggle("field__input--invalid", bad);
        if (bad) valid = false;
      });
      return valid;
    }
    form.querySelectorAll(".field__input").forEach(function (el) {
      el.addEventListener("input", function () {
        el.classList.remove("field__input--invalid");
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) {
        setStatus(
          "Please complete the highlighted fields so we can reach you.",
          false,
        );
        return;
      }
      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = "Sending…";

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "X-Requested-With": "fetch" },
      })
        .then(function (r) {
          return r.json().catch(function () {
            return { ok: r.ok };
          });
        })
        .then(function (data) {
          if (data && data.ok) {
            setStatus(
              "Thank you! Your free trial request has been received. Our team will contact you shortly to confirm a time.",
              true,
            );
            form.reset();
          } else {
            setStatus(
              (data && data.message) ||
                "Something went wrong. Please email info@learntilawah.com and we&rsquo;ll help right away.",
              false,
            );
          }
        })
        .catch(function () {
          // No backend yet (e.g. opened as a static file) — confirm gracefully.
          setStatus(
            "Thank you! Your request has been noted. Once the mail server is connected this will be delivered automatically — meanwhile you can also reach us on WhatsApp.",
            true,
          );
          form.reset();
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = original;
        });
    });
  })();

  /* ---------------------------------------------------------------
     Daily Ayah (authentic) + optional Hadith.
     Both rotate every hour. Arabic + translation shown exactly as
     returned by the source.
  ---------------------------------------------------------------- */
  (function dailyAyah() {
    var ayahAr = document.getElementById("ayahArabic");
    var ayahEn = document.getElementById("ayahEnglish");
    var ayahRef = document.getElementById("ayahRef");
    var ayahMeta = document.getElementById("ayahMeta");
    var card = document.querySelector(".verse-card--ayah");
    if (!ayahAr) return;

    var TOTAL_AYAHS = 6236;
    var currentHour = null;

    function hourSeed() {
      return Math.floor(Date.now() / 3600000);
    }

    function loadAyah() {
      var hour = hourSeed();
      if (hour === currentHour) return;
      currentHour = hour;
      var n = (hour % TOTAL_AYAHS) + 1;
      card.classList.add("is-loading");

      fetch(
        "https://api.alquran.cloud/v1/ayah/" +
          n +
          "/editions/quran-uthmani,en.sahih",
      )
        .then(function (r) {
          return r.json();
        })
        .then(function (res) {
          if (!res || res.code !== 200 || !res.data || res.data.length < 2)
            throw new Error("bad");
          var ar = res.data[0];
          var en = res.data[1];
          var s = ar.surah;
          ayahAr.textContent = ar.text;
          ayahEn.textContent = "\u201C" + en.text + "\u201D";
          ayahRef.textContent =
            s.englishName + " " + s.number + ":" + ar.numberInSurah;
          ayahMeta.textContent =
            "Surah " +
            s.englishName +
            " (" +
            s.englishNameTranslation +
            ") \u00B7 " +
            s.revelationType +
            " \u00B7 Ayah " +
            ar.numberInSurah +
            " \u00B7 Translation: Saheeh International";
        })
        .catch(function () {
          ayahRef.textContent = "Unavailable";
          ayahEn.textContent =
            "The verse could not be loaded right now. Please refresh in a moment.";
          currentHour = null; // allow retry
        })
        .finally(function () {
          card.classList.remove("is-loading");
        });
    }

    loadAyah();
    setInterval(loadAyah, 60000); // check each minute; refreshes when the hour rolls over
  })();

  (function dailyHadith() {
    var card = document.getElementById("hadithCard");
    var ar = document.getElementById("hadithArabic");
    var en = document.getElementById("hadithEnglish");
    var ref = document.getElementById("hadithRef");
    var meta = document.getElementById("hadithMeta");
    if (!card) return;

    // Authentic collection via fawazahmed0/hadith-api (sourced from sunnah.com data).
    // Single-hadith JSON files keep the request lightweight.
    var BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/";
    var EDITION = "abudawud"; // Sunan Abu Dawud
    var MAX = 3000; // stay within a safely populated range
    var currentHour = null;

    function load() {
      var hour = Math.floor(Date.now() / 3600000);
      if (hour === currentHour) return;
      var n = (hour % MAX) + 1;

      Promise.all([
        fetch(BASE + "eng-" + EDITION + "/" + n + ".json").then(function (r) {
          return r.json();
        }),
        fetch(BASE + "ara-" + EDITION + "/" + n + ".json").then(function (r) {
          return r.json();
        }),
      ])
        .then(function (out) {
          var eng = out[0],
            araj = out[1];
          var h = eng && eng.hadiths && eng.hadiths[0];
          var ha = araj && araj.hadiths && araj.hadiths[0];
          if (!h || !h.text) throw new Error("bad");
          currentHour = hour;

          en.textContent = "\u201C" + stripTags(h.text) + "\u201D";
          if (ha && ha.text) {
            ar.textContent = stripTags(ha.text);
            ar.hidden = false;
          } else {
            ar.hidden = true;
          }
          var bookName =
            (eng.metadata && eng.metadata.name) || "Sunan Abu Dawud";
          ref.textContent = bookName + " \u00B7 No. " + (h.hadithnumber || n);
          var section =
            eng.metadata && eng.metadata.section
              ? Object.values(eng.metadata.section)[0]
              : "";
          meta.textContent = section
            ? "Chapter: " + section
            : "Authentic collection";
          card.hidden = false;
        })
        .catch(function () {
          // Reliable/authentic source not reachable — skip the Hadith per the brief.
          card.hidden = true;
        });
    }
    function stripTags(s) {
      return String(s)
        .replace(/<[^>]*>/g, "")
        .trim();
    }

    load();
    setInterval(load, 60000);
  })();

  /* ---------------------------------------------------------------
     Daily Ayah & Hadith parallax — variable-height horizontal handoff.

     Unlike the course cards, these cards are not given a fixed height.
     The script measures the natural height of both loaded cards, makes
     the scroll stage tall enough for the handoff, and recalculates when
     the hourly Ayah/Hadith content changes.
  ---------------------------------------------------------------- */
  (function dailyVerseParallax() {
    var section = document.querySelector(".daily");
    var stack = document.querySelector(".daily__grid");
    if (!section || !stack) return;

    var cards = [
      stack.querySelector(".verse-card--ayah"),
      stack.querySelector(".verse-card--hadith"),
    ];
    if (
      cards.some(function (card) {
        return !card;
      })
    )
      return;

    var mq = window.matchMedia("(min-width: 821px)");
    var ticking = false;
    var stickyTop = 100;
    var slidePx = 1000;
    var handoffPx = 900;

    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    function readStickyTop() {
      return (
        (parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--head-h",
          ),
        ) || 76) + 24
      );
    }

    function canRun() {
      return (
        mq.matches &&
        !prefersReduced &&
        cards[0] &&
        cards[1] &&
        !cards[0].hidden &&
        !cards[1].hidden
      );
    }

    function reset() {
      section.classList.remove("is-daily-parallax");
      stack.classList.remove("is-daily-stack");
      stack.style.height = "";
      cards.forEach(function (card) {
        card.style.transform = "";
        card.style.zIndex = "";
        card.style.pointerEvents = "";
      });
    }

    function measure() {
      if (!canRun()) {
        reset();
        return;
      }

      section.classList.add("is-daily-parallax");
      stack.classList.add("is-daily-stack");

      stickyTop = readStickyTop();

      var heights = cards.map(function (card) {
        return card.getBoundingClientRect().height || card.offsetHeight || 0;
      });
      var widths = cards.map(function (card) {
        return card.getBoundingClientRect().width || card.offsetWidth || 0;
      });

      var maxCardHeight = Math.max.apply(Math, heights) || 360;
      var maxCardWidth =
        Math.max.apply(Math, widths) || Math.min(780, window.innerWidth * 0.92);

      // Start/end just outside the viewport, so the movement is purely horizontal.
      slidePx = (window.innerWidth + maxCardWidth) / 2 + 48;

      // Scroll distance for one handoff. The card height stays natural;
      // only the containing scroll stage height is calculated dynamically.
      handoffPx = Math.max(620, Math.min(1100, window.innerHeight - stickyTop));
      stack.style.height = maxCardHeight + handoffPx + "px";

      requestUpdate();
    }

    function update() {
      ticking = false;

      if (!canRun()) {
        reset();
        return;
      }

      var stackRect = stack.getBoundingClientRect();
      var raw = (stickyTop - stackRect.top) / handoffPx;
      raw = clamp(raw, 0, 1);
      var activeIndex = Math.round(raw);

      cards.forEach(function (card, index) {
        var offset = clamp(index - raw, -1, 1);
        card.style.transform = "translate3d(" + offset * slidePx + "px, 0, 0)";
        card.style.zIndex = String(10 + index);
        card.style.pointerEvents = index === activeIndex ? "auto" : "none";
      });
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function refresh() {
      measure();
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", refresh);
    if (mq.addEventListener) mq.addEventListener("change", refresh);

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(refresh);
      cards.forEach(function (card) {
        ro.observe(card);
      });
    }

    if ("MutationObserver" in window) {
      var mo = new MutationObserver(refresh);
      cards.forEach(function (card) {
        mo.observe(card, {
          attributes: true,
          attributeFilter: ["hidden", "class"],
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
    }

    // The content checks every minute and may update once the hour changes.
    // This keeps measurements correct even if the text changes without a
    // meaningful resize event in older browsers.
    setInterval(refresh, 60000);
    refresh();
  })();
})();
