document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Portfolio photo fan — swipe left/right cycles which photo occupies
  // which slot (main + 4 fanned cards), keeping the fanned layout exactly
  // as-is instead of switching to a different mobile layout. The category
  // tag/fade stay put since they belong to the main slot, not a photo.
  document.querySelectorAll('.pf-fan-wrap').forEach((wrap) => {
    const stack = wrap.querySelector('.about-photo-stack');
    const mainSlot = wrap.querySelector('.pf-fan-main');
    const sideSlots = Array.from(wrap.querySelectorAll('.about-side-photo'));
    const hint = wrap.querySelector('.pf-swipe-hint');
    if (!stack || !mainSlot || !sideSlots.length) return;

    const slots = [mainSlot, ...sideSlots];
    const links = slots.map((slot) => slot.querySelector('a'));
    const photos = links.map((a) => ({ href: a.href, src: a.querySelector('img').src, alt: a.querySelector('img').alt }));
    let offset = 0;

    const render = () => {
      links.forEach((a, i) => {
        const photo = photos[(i + offset) % photos.length];
        const img = a.querySelector('img');
        a.href = photo.href;
        img.src = photo.src;
        img.alt = photo.alt;
      });
    };

    let startX = null;
    stack.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    stack.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        offset = (offset + (dx < 0 ? 1 : -1) + photos.length) % photos.length;
        render();
        if (hint) hint.classList.add('is-hidden');
      }
      startX = null;
    }, { passive: true });
  });

  // Boot-up intro — one-time-per-session HUD startup sequence on the
  // homepage. The inline script in index.html already hides it instantly
  // for returning visitors this session; this only runs the typewriter for
  // a genuinely first view.
  const bootIntro = document.getElementById('bootIntro');
  if (bootIntro && !bootIntro.classList.contains('boot-intro-hidden')) {
    const linesEl = document.getElementById('bootIntroLines');
    const lines = [
      'BIG PICTURE PHOTOGRAPHY',
      'FOTOGRAF & VIDEOGRAF · DETMOLD, OWL',
      'BEREIT, DEINEN MOMENT EINZUFANGEN.',
    ];
    document.body.style.overflow = 'hidden';

    const finishIntro = () => {
      if (bootIntro.classList.contains('boot-intro-hidden')) return;
      bootIntro.classList.add('boot-intro-hidden');
      document.body.style.overflow = '';
      sessionStorage.setItem('bpIntroSeen', '1');
      document.removeEventListener('click', finishIntro);
      document.removeEventListener('keydown', finishIntro);
    };
    document.addEventListener('click', finishIntro);
    document.addEventListener('keydown', finishIntro);

    let lineIndex = 0;
    let charIndex = 0;
    const typeSpeed = 22;

    const typeNextChar = () => {
      if (bootIntro.classList.contains('boot-intro-hidden')) return;
      if (lineIndex >= lines.length) {
        bootIntro.classList.add('boot-intro-ready');
        setTimeout(finishIntro, 700);
        return;
      }
      let lineEl = linesEl.children[lineIndex];
      if (!lineEl) {
        lineEl = document.createElement('div');
        linesEl.appendChild(lineEl);
      }
      const currentLine = lines[lineIndex];
      charIndex += 1;
      lineEl.textContent = currentLine.slice(0, charIndex);
      if (charIndex >= currentLine.length) {
        lineIndex += 1;
        charIndex = 0;
        setTimeout(typeNextChar, 260);
      } else {
        setTimeout(typeNextChar, typeSpeed);
      }
    };
    setTimeout(typeNextChar, 350);
  }

  // Cursor-tracked glow on premium cards — writes pointer position as CSS
  // custom properties so the radial highlight in style.css follows the mouse.
  document.querySelectorAll('.glow-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
    });
  });


  // Blur-up image load — mark each image loaded (already-cached images fire
  // "complete" instantly, so check that first instead of waiting on load).
  // Kept as a named function (not inline) so images created later, like the
  // stack grid preview thumbnails, can reuse it instead of staying invisible.
  const markImgLoaded = (img) => {
    if (img.complete) {
      img.classList.add('img-loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('img-loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('img-loaded'), { once: true });
    }
  };
  document.querySelectorAll('img').forEach(markImgLoaded);

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  // About-Foto Reveal — kurzer Kamera-Blitz, dann öffnet sich die Blende
  // zur Bildmitte, sobald das Foto in den Viewport scrollt.
  const scanPhoto = document.querySelector('.about-photo-bleed');
  if (scanPhoto) {
    const scanObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            scanPhoto.classList.add('is-scanned');
            scanObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 }
    );
    scanObserver.observe(scanPhoto);
  }

  // Scroll-spy — highlights the in-page nav link (chapter nav / TOC) whose
  // section is currently in view.
  document.querySelectorAll('.pf-chapternav, .legal-toc').forEach((nav) => {
    const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const sections = links
      .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);
    if (!sections.length) return;

    const setActive = (id) => {
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
      sections.forEach((sec) => sec.classList.toggle('active', sec.id === id));
    };
    setActive(sections[0].id);

    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((sec) => spyObserver.observe(sec));
  });

  // Animated stat counters — staggered reveal with a HUD-style digit
  // scramble before each counter locks onto its real value.
  const statStrip = document.querySelector('.stats-strip');
  if (statStrip) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const counters = Array.from(entry.target.querySelectorAll('.stat-val'));

          if (reduceMotion) {
            counters.forEach((counter) => {
              const target = parseFloat(counter.dataset.target);
              const prefix = counter.dataset.prefix || '';
              const suffix = counter.dataset.suffix || '';
              counter.textContent = `${prefix}${target}${suffix}`;
              counter.closest('.stat').classList.add('is-visible');
            });
            return;
          }

          entry.target.classList.add('is-scanning');
          setTimeout(() => entry.target.classList.remove('is-scanning'), 1200);

          counters.forEach((counter, i) => {
            const target = parseFloat(counter.dataset.target);
            const prefix = counter.dataset.prefix || '';
            const suffix = counter.dataset.suffix || '';
            const digits = String(Math.round(target)).length;
            const statEl = counter.closest('.stat');

            setTimeout(() => {
              statEl.classList.add('is-visible');
              counter.classList.add('is-counting');

              const scrambleDuration = 380;
              const scrambleStart = performance.now();
              function scramble(ts) {
                const elapsed = ts - scrambleStart;
                if (elapsed < scrambleDuration) {
                  const rnd = Math.floor(Math.random() * Math.pow(10, digits));
                  counter.textContent = `${prefix}${rnd}${suffix}`;
                  requestAnimationFrame(scramble);
                } else {
                  countUp();
                }
              }

              function countUp() {
                let start = null;
                const duration = 900;
                function animate(ts) {
                  if (!start) start = ts;
                  const progress = Math.min((ts - start) / duration, 1);
                  const eased = 1 - Math.pow(1 - progress, 3);
                  counter.textContent = `${prefix}${Math.round(eased * target)}${suffix}`;
                  if (progress < 1) {
                    requestAnimationFrame(animate);
                  } else {
                    counter.textContent = `${prefix}${target}${suffix}`;
                    counter.classList.remove('is-counting');
                    counter.classList.add('is-landed');
                    setTimeout(() => counter.classList.remove('is-landed'), 550);
                  }
                }
                requestAnimationFrame(animate);
              }

              requestAnimationFrame(scramble);
            }, i * 150);
          });

          statObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    statObserver.observe(statStrip);
  }

  // Testimonial photo stack — click the card or the arrow to flip the
  // front photo away, revealing the next one behind it. Works for any
  // number of testimonials since it's a rotating queue, not a fixed grid.
  const stack = document.getElementById('testiStack');
  if (stack) {
    const nextBtn = document.getElementById('testiStackNext');
    const counter = document.getElementById('testiStackCounter');
    const photos = Array.from(stack.querySelectorAll('.testi-photo'));
    const total = photos.length;
    let order = photos.map((_, i) => i);
    let animating = false;
    const pad = (n) => String(n).padStart(2, '0');

    const layout = () => {
      order.forEach((photoIdx, pos) => {
        const el = photos[photoIdx];
        el.classList.remove('stack-pos-0', 'stack-pos-1', 'stack-pos-2', 'stack-pos-3', 'stack-pos-4');
        el.classList.add(`stack-pos-${Math.min(pos, 4)}`);
      });
      if (counter) counter.textContent = `${pad(order[0] + 1)} / ${pad(total)}`;
    };
    layout();

    const advance = () => {
      if (animating || total < 2) return;
      animating = true;
      const frontEl = photos[order[0]];
      frontEl.classList.add('stack-leaving');
      setTimeout(() => {
        frontEl.classList.remove('stack-leaving', 'stack-pos-0');
        order.push(order.shift());
        layout();
        animating = false;
      }, 500);
    };

    photos.forEach((el) => el.addEventListener('click', advance));
    if (nextBtn) nextBtn.addEventListener('click', advance);
  }

  // GLightbox for portfolio galleries
  if (window.GLightbox) {
    GLightbox({ selector: '.glightbox', touchNavigation: true, loop: true });
  }

  // Preis-Rechner — 2-step price estimator in the Leistungen section.
  const calcEl = document.getElementById('priceCalc');
  if (calcEl) {
    const CALC_DATA = {
      event: { label: 'Eventfotografie', scopes: [
        { key: 'klein', label: 'Bis 3 Std.', note: 'z.B. Feier im kleinen Rahmen', price: '349 – 549 €' },
        { key: 'mittel', label: 'Halbtags', note: 'z.B. Firmenfeier, Konzert', price: '549 – 899 €' },
        { key: 'gross', label: 'Ganztags', note: 'z.B. mehrtägiges Event', price: 'ab 899 €' },
      ]},
      business: { label: 'Business & Branding', scopes: [
        { key: 'klein', label: 'Einzelportrait', note: '1 Person, 1 Std.', price: '199 – 349 €' },
        { key: 'mittel', label: 'Team-Shooting', note: 'bis 10 Personen', price: '449 – 799 €' },
        { key: 'gross', label: 'Markenauftritt', note: 'Content-Paket', price: 'ab 899 €' },
      ]},
      sport: { label: 'Sportfotografie', scopes: [
        { key: 'klein', label: 'Einzeltermin', note: 'ein Wettkampf/Training', price: '299 – 449 €' },
        { key: 'mittel', label: 'Saisonpaket', note: 'mehrere Termine', price: '799 – 1.299 €' },
        { key: 'gross', label: 'Vereinsbetreuung', note: 'laufende Begleitung', price: 'auf Anfrage' },
      ]},
      video: { label: 'Videografie & Content', scopes: [
        { key: 'klein', label: 'Reel-Paket', note: '3–5 kurze Clips', price: '349 – 599 €' },
        { key: 'mittel', label: 'Imagefilm', note: '1–2 Min., geschnitten', price: '899 – 1.499 €' },
        { key: 'gross', label: 'Produktion', note: 'mehrtägig, mehrere Formate', price: 'ab 1.899 €' },
      ]},
    };

    const categoryEl = document.getElementById('calcCategory');
    const scopeStepEl = document.getElementById('calcScopeStep');
    const scopeEl = document.getElementById('calcScope');
    const resultEl = document.getElementById('calcResult');
    const priceEl = document.getElementById('calcPrice');
    const noteEl = document.getElementById('calcNote');
    const waBtn = document.getElementById('calcWaBtn');
    let selectedCat = null;

    categoryEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-opt');
      if (!btn) return;
      selectedCat = btn.dataset.cat;
      [...categoryEl.children].forEach((b) => b.classList.toggle('active', b === btn));
      resultEl.classList.remove('visible');

      scopeEl.innerHTML = '';
      CALC_DATA[selectedCat].scopes.forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'calc-opt';
        b.dataset.scope = s.key;
        b.innerHTML = `${s.label}<small>${s.note}</small>`;
        scopeEl.appendChild(b);
      });
      scopeStepEl.style.display = '';
      scopeStepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    scopeEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-opt');
      if (!btn) return;
      const selectedScope = btn.dataset.scope;
      [...scopeEl.children].forEach((b) => b.classList.toggle('active', b === btn));

      const cat = CALC_DATA[selectedCat];
      const scope = cat.scopes.find((s) => s.key === selectedScope);
      priceEl.textContent = scope.price;
      noteEl.textContent = `${cat.label} — ${scope.label}. Unverbindlicher Richtwert, das genaue Angebot hängt von deinen Details ab.`;
      const msg = encodeURIComponent(`Hallo, ich interessiere mich für ${cat.label} (${scope.label}) und hätte gern ein Angebot.`);
      waBtn.href = `https://wa.me/4916096290806?text=${msg}`;
      resultEl.classList.add('visible');
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Sticky-Kontakt-Leiste — appears after scrolling past the hero, dismissible.
  const stickyCta = document.getElementById('stickyCta');
  if (stickyCta) {
    const stickyCtaClose = document.getElementById('stickyCtaClose');
    let dismissed = false;
    window.addEventListener('scroll', () => {
      if (dismissed) return;
      const show = window.scrollY > window.innerHeight * 0.7;
      stickyCta.classList.toggle('visible', show);
    }, { passive: true });
    stickyCtaClose.addEventListener('click', () => {
      dismissed = true;
      stickyCta.classList.remove('visible');
    });
  }

  // Vorher/Nachher-Slider — Pointer-Events auf dem ganzen Rahmen steuern den
  // Clip-Path direkt (zuverlässiger als das native Range-Dragging allein,
  // besonders auf iOS). Das Range-Input bleibt für Tastatur/Screenreader.
  document.querySelectorAll('.ba-frame').forEach((frame) => {
    const range = frame.querySelector('.ba-range');
    if (!range) return;

    const setFromClientX = (clientX) => {
      const rect = frame.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      frame.style.setProperty('--pos', `${pct}%`);
      range.value = pct;
    };

    let dragging = false;
    frame.addEventListener('pointerdown', (e) => {
      dragging = true;
      frame.setPointerCapture(e.pointerId);
      setFromClientX(e.clientX);
    });
    frame.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setFromClientX(e.clientX);
    });
    const stopDrag = () => { dragging = false; };
    frame.addEventListener('pointerup', stopDrag);
    frame.addEventListener('pointercancel', stopDrag);

    range.addEventListener('input', () => {
      frame.style.setProperty('--pos', `${range.value}%`);
    });
  });

  const baTabs = document.querySelectorAll('.ba-tab');
  if (baTabs.length) {
    const baFrames = document.querySelectorAll('.ba-frame');
    baTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        baTabs.forEach((t) => t.classList.toggle('active', t === tab));
        baFrames.forEach((f) => {
          f.hidden = f.dataset.baPair !== tab.dataset.baTab;
        });
      });
    });
  }
});
