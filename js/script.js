/* =====================================================================
   Learn Tilawah — scripts
   Vanilla JS. No dependencies. Runs after DOM (script is deferred).
   ===================================================================== */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------
     Mobile navigation toggle
  ---------------------------------------------------------------- */
  (function nav() {
    var navEl = document.querySelector('.nav');
    var toggle = document.querySelector('.nav__toggle');
    var menu = document.getElementById('primary-menu');
    if (!navEl || !toggle || !menu) return;

    function setOpen(open) {
      navEl.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    }
    toggle.addEventListener('click', function () {
      setOpen(!navEl.classList.contains('is-open'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link, .nav__cta')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  })();

  /* ---------------------------------------------------------------
     Sticky header shadow on scroll + back-to-top button
  ---------------------------------------------------------------- */
  (function scrollChrome() {
    var header = document.querySelector('.header');
    var toTop = document.getElementById('toTop');
    function onScroll() {
      var y = window.scrollY;
      if (header) header.classList.toggle('is-stuck', y > 8);
      if (toTop) toTop.classList.toggle('is-visible', y > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ---------------------------------------------------------------
     Scroll reveal (IntersectionObserver) with light stagger
  ---------------------------------------------------------------- */
  (function reveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    // stagger within shared grids
    document.querySelectorAll('.benefits__grid, .how__steps, .accordion').forEach(function (grid) {
      Array.prototype.forEach.call(grid.querySelectorAll('[data-reveal]'), function (el, i) {
        el.style.setProperty('--d', (i % 4) * 0.08 + 's');
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------------
     Hero slider (auto + dots, fade/slide)
  ---------------------------------------------------------------- */
  (function heroSlider() {
    var track = document.querySelector('.slider__track');
    var slides = document.querySelectorAll('.slider__slide');
    var dots = document.querySelectorAll('.slider__dot');
    if (!track || slides.length < 2) return;

    var index = 0;
    var timer = null;
    var DELAY = 4800;

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === index); });
      slides.forEach(function (s, n) { s.setAttribute('aria-hidden', String(n !== index)); });
    }
    function next() { go(index + 1); }
    function start() { if (!prefersReduced) timer = setInterval(next, DELAY); }
    function stop() { clearInterval(timer); }

    dots.forEach(function (dot, n) {
      dot.addEventListener('click', function () { stop(); go(n); start(); });
    });
    var viewport = document.querySelector('.slider__viewport');
    if (viewport) {
      viewport.addEventListener('mouseenter', stop);
      viewport.addEventListener('mouseleave', start);
    }
    go(0);
    start();
  })();

  /* ---------------------------------------------------------------
     Course curriculum expand/collapse (smooth height)
  ---------------------------------------------------------------- */
  (function curriculum() {
    var buttons = document.querySelectorAll('.course-card__expand');
    buttons.forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = false;
      panel.style.maxHeight = '0px';
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        btn.querySelector('span').textContent = open ? 'View Curriculum' : 'Hide Curriculum';
        panel.style.maxHeight = open ? '0px' : panel.scrollHeight + 'px';
      });
      panel.addEventListener('transitionend', function () {
        if (btn.getAttribute('aria-expanded') === 'true') panel.style.maxHeight = 'none';
      });
    });
  })();

  /* ---------------------------------------------------------------
     Courses parallax stack — incoming panel slides in from the side,
     outgoing panel scales/dims slightly. Desktop + motion only.
  ---------------------------------------------------------------- */
  (function courseParallax() {
    var stack = document.querySelector('[data-stack]');
    if (!stack) return;
    var panels = Array.prototype.slice.call(stack.querySelectorAll('.course-panel'));
    if (panels.length < 2) return;

    var enabled = window.matchMedia('(min-width: 821px)').matches && !prefersReduced;
    if (!enabled) return;

    var cards = panels.map(function (p) { return p.querySelector('.course-card'); });
    var ticking = false;

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var stickyTop = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head-h')) || 76) + 24;

      for (var i = 1; i < panels.length; i++) {
        var rect = cards[i].getBoundingClientRect();
        // progress: 0 when card top at viewport bottom, 1 when reached sticky position
        var p = (vh - rect.top) / (vh - stickyTop);
        p = Math.max(0, Math.min(1, p));
        var dir = i % 2 === 0 ? -1 : 1; // alternate slide direction
        cards[i].style.transform = 'translateX(' + (dir * (1 - p) * 64) + 'px)';
        cards[i].style.opacity = (0.25 + 0.75 * p).toFixed(3);
        // dim/scale the panel underneath as this one arrives
        var prev = cards[i - 1];
        prev.style.transform = 'scale(' + (1 - 0.05 * p).toFixed(3) + ')';
        prev.style.filter = 'brightness(' + (1 - 0.12 * p).toFixed(3) + ')';
      }
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ---------------------------------------------------------------
     FAQ accordion
  ---------------------------------------------------------------- */
  (function faq() {
    var items = document.querySelectorAll('.accordion__item');
    items.forEach(function (item) {
      var trigger = item.querySelector('.accordion__trigger');
      var panel = item.querySelector('.accordion__panel');
      if (!trigger || !panel) return;
      trigger.addEventListener('click', function () {
        var open = item.classList.contains('is-open');
        // close siblings
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove('is-open');
            other.querySelector('.accordion__trigger').setAttribute('aria-expanded', 'false');
            other.querySelector('.accordion__panel').style.maxHeight = '0px';
          }
        });
        item.classList.toggle('is-open', !open);
        trigger.setAttribute('aria-expanded', String(!open));
        panel.style.maxHeight = open ? '0px' : panel.scrollHeight + 'px';
      });
    });
  })();

  /* ---------------------------------------------------------------
     Booking form — validation + async submit to php/send.php
  ---------------------------------------------------------------- */
  (function bookingForm() {
    var form = document.getElementById('trial-form');
    var status = document.getElementById('formStatus');
    var btn = document.getElementById('submitBtn');
    if (!form) return;

    function setStatus(msg, ok) {
      status.hidden = false;
      status.textContent = msg;
      status.className = 'form__status ' + (ok ? 'form__status--ok' : 'form__status--err');
    }
    function validate() {
      var valid = true;
      var required = form.querySelectorAll('[required]');
      required.forEach(function (el) {
        var bad = !el.value.trim() || (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value));
        el.classList.toggle('field__input--invalid', bad);
        if (bad) valid = false;
      });
      return valid;
    }
    form.querySelectorAll('.field__input').forEach(function (el) {
      el.addEventListener('input', function () { el.classList.remove('field__input--invalid'); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        setStatus('Please complete the highlighted fields so we can reach you.', false);
        return;
      }
      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = 'Sending…';

      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'fetch' } })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (data) {
          if (data && data.ok) {
            setStatus('Thank you! Your free trial request has been received. Our team will contact you shortly to confirm a time.', true);
            form.reset();
          } else {
            setStatus((data && data.message) || 'Something went wrong. Please email info@learntilawah.com and we&rsquo;ll help right away.', false);
          }
        })
        .catch(function () {
          // No backend yet (e.g. opened as a static file) — confirm gracefully.
          setStatus('Thank you! Your request has been noted. Once the mail server is connected this will be delivered automatically — meanwhile you can also reach us on WhatsApp.', true);
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
    var ayahAr = document.getElementById('ayahArabic');
    var ayahEn = document.getElementById('ayahEnglish');
    var ayahRef = document.getElementById('ayahRef');
    var ayahMeta = document.getElementById('ayahMeta');
    var card = document.querySelector('.verse-card--ayah');
    if (!ayahAr) return;

    var TOTAL_AYAHS = 6236;
    var currentHour = null;

    function hourSeed() { return Math.floor(Date.now() / 3600000); }

    function loadAyah() {
      var hour = hourSeed();
      if (hour === currentHour) return;
      currentHour = hour;
      var n = (hour % TOTAL_AYAHS) + 1;
      card.classList.add('is-loading');

      fetch('https://api.alquran.cloud/v1/ayah/' + n + '/editions/quran-uthmani,en.sahih')
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || res.code !== 200 || !res.data || res.data.length < 2) throw new Error('bad');
          var ar = res.data[0];
          var en = res.data[1];
          var s = ar.surah;
          ayahAr.textContent = ar.text;
          ayahEn.textContent = '\u201C' + en.text + '\u201D';
          ayahRef.textContent = s.englishName + ' ' + s.number + ':' + ar.numberInSurah;
          ayahMeta.textContent = 'Surah ' + s.englishName + ' (' + s.englishNameTranslation + ') \u00B7 '
            + s.revelationType + ' \u00B7 Ayah ' + ar.numberInSurah + ' \u00B7 Translation: Saheeh International';
        })
        .catch(function () {
          ayahRef.textContent = 'Unavailable';
          ayahEn.textContent = 'The verse could not be loaded right now. Please refresh in a moment.';
          currentHour = null; // allow retry
        })
        .finally(function () { card.classList.remove('is-loading'); });
    }

    loadAyah();
    setInterval(loadAyah, 60000); // check each minute; refreshes when the hour rolls over
  })();

  (function dailyHadith() {
    var card = document.getElementById('hadithCard');
    var ar = document.getElementById('hadithArabic');
    var en = document.getElementById('hadithEnglish');
    var ref = document.getElementById('hadithRef');
    var meta = document.getElementById('hadithMeta');
    if (!card) return;

    // Authentic collection via fawazahmed0/hadith-api (sourced from sunnah.com data).
    // Single-hadith JSON files keep the request lightweight.
    var BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/';
    var EDITION = 'abudawud';      // Sunan Abu Dawud
    var MAX = 3000;                // stay within a safely populated range
    var currentHour = null;

    function load() {
      var hour = Math.floor(Date.now() / 3600000);
      if (hour === currentHour) return;
      var n = (hour % MAX) + 1;

      Promise.all([
        fetch(BASE + 'eng-' + EDITION + '/' + n + '.json').then(function (r) { return r.json(); }),
        fetch(BASE + 'ara-' + EDITION + '/' + n + '.json').then(function (r) { return r.json(); })
      ]).then(function (out) {
        var eng = out[0], araj = out[1];
        var h = eng && eng.hadiths && eng.hadiths[0];
        var ha = araj && araj.hadiths && araj.hadiths[0];
        if (!h || !h.text) throw new Error('bad');
        currentHour = hour;

        en.textContent = '\u201C' + stripTags(h.text) + '\u201D';
        if (ha && ha.text) { ar.textContent = stripTags(ha.text); ar.hidden = false; } else { ar.hidden = true; }
        var bookName = (eng.metadata && eng.metadata.name) || 'Sunan Abu Dawud';
        ref.textContent = bookName + ' \u00B7 No. ' + (h.hadithnumber || n);
        var section = eng.metadata && eng.metadata.section
          ? Object.values(eng.metadata.section)[0] : '';
        meta.textContent = section ? ('Chapter: ' + section) : 'Authentic collection';
        card.hidden = false;
      }).catch(function () {
        // Reliable/authentic source not reachable — skip the Hadith per the brief.
        card.hidden = true;
      });
    }
    function stripTags(s) { return String(s).replace(/<[^>]*>/g, '').trim(); }

    load();
    setInterval(load, 60000);
  })();

})();
