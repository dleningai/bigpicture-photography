document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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

  // Hero slideshow — the first slide's image is inlined in the HTML for a fast
  // first paint; the rest load lazily after the page settles so they don't
  // compete with it for bandwidth.
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    const loadSlideBg = (slide) => {
      const bg = slide.dataset.bg;
      if (bg) {
        slide.style.backgroundImage = `url('${bg}')`;
        delete slide.dataset.bg;
      }
    };
    window.addEventListener('load', () => {
      setTimeout(() => slides.forEach(loadSlideBg), 1000);
    });

    let slideIndex = 0;
    setInterval(() => {
      slides[slideIndex].classList.remove('active');
      slideIndex = (slideIndex + 1) % slides.length;
      loadSlideBg(slides[slideIndex]);
      slides[slideIndex].classList.add('active');
    }, 5000);
  }

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
});
