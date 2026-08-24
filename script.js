document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Cursor-tracked glow on premium cards — writes pointer position as CSS
  // custom properties so the radial highlight in style.css follows the mouse.
  document.querySelectorAll('.glow-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
    });
  });

  // Sidebar navigation
  const toggleBtn = document.getElementById('sidebarToggle');
  const closeBtn = document.getElementById('sidebarClose');
  const overlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebarMenu');

  if (toggleBtn && closeBtn && overlay && sidebar) {
    const open = () => {
      sidebar.classList.add('active');
      overlay.classList.add('active');
      toggleBtn.classList.add('active');
    };
    const close = () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      toggleBtn.classList.remove('active');
    };
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.contains('active') ? close() : open();
    });
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

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

  // Portfolio photo stacks — same rotating-queue mechanic as the testimonial
  // stack, one independent instance per chapter. Unlike the testimonial
  // stack, clicking the front photo opens it full size via glightbox
  // (bound separately below), so only the arrow button advances the stack.
  document.querySelectorAll('.pf-stack').forEach((pfStack) => {
    const wrap = pfStack.closest('.pf-stack-wrap');
    const nextBtn = wrap.querySelector('.pf-stack-next');
    const counter = wrap.querySelector('.pf-stack-counter');
    const photos = Array.from(pfStack.querySelectorAll('.pf-stack-photo'));
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

    if (nextBtn) nextBtn.addEventListener('click', advance);

    // Grid-preview popover — lets visitors jump straight to a specific
    // photo instead of clicking through the whole stack one by one.
    const gridToggle = wrap.querySelector('.pf-stack-grid-toggle');
    const preview = wrap.querySelector('.pf-stack-preview');
    if (gridToggle && preview) {
      preview.innerHTML = `
        <button type="button" class="pf-stack-preview-close" aria-label="Vorschau schließen">&times;</button>
        <p class="pf-stack-preview-label">Alle Bilder</p>
        <div class="pf-stack-preview-grid"></div>
      `;
      const grid = preview.querySelector('.pf-stack-preview-grid');
      photos.forEach((photo, idx) => {
        const thumb = document.createElement('img');
        thumb.src = photo.querySelector('img').src;
        thumb.loading = 'lazy';
        thumb.decoding = 'async';
        thumb.alt = photo.querySelector('img').alt;
        thumb.addEventListener('click', () => {
          closePreview();
          photos[idx].click();
        });
        grid.appendChild(thumb);
      });

      const openPreview = () => {
        preview.classList.add('active');
        gridToggle.classList.add('active');
        gridToggle.setAttribute('aria-expanded', 'true');
      };
      const closePreview = () => {
        preview.classList.remove('active');
        gridToggle.classList.remove('active');
        gridToggle.setAttribute('aria-expanded', 'false');
      };
      gridToggle.addEventListener('click', () => {
        preview.classList.contains('active') ? closePreview() : openPreview();
      });
      preview.querySelector('.pf-stack-preview-close').addEventListener('click', closePreview);
      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) closePreview();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePreview();
      });
    }
  });

  // GLightbox for portfolio galleries
  if (window.GLightbox) {
    GLightbox({ selector: '.glightbox', touchNavigation: true, loop: true });
  }
});
