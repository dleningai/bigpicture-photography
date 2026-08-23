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

  // Animated stat counters
  const statStrip = document.querySelector('.stats-strip');
  if (statStrip) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll('.stat-val').forEach((counter) => {
            const target = parseFloat(counter.dataset.target);
            const prefix = counter.dataset.prefix || '';
            const suffix = counter.dataset.suffix || '';
            if (reduceMotion) {
              counter.textContent = `${prefix}${target}${suffix}`;
              return;
            }
            let start = null;
            const duration = 1400;
            function animate(ts) {
              if (!start) start = ts;
              const progress = Math.min((ts - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              counter.textContent = `${prefix}${Math.round(eased * target)}${suffix}`;
              if (progress < 1) requestAnimationFrame(animate);
              else counter.textContent = `${prefix}${target}${suffix}`;
            }
            requestAnimationFrame(animate);
          });
          statObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    statObserver.observe(statStrip);
  }

  // Testimonial slider
  const track = document.getElementById('testiTrack');
  if (track) {
    const prevBtn = document.getElementById('testiPrev');
    const nextBtn = document.getElementById('testiNext');
    const counter = document.getElementById('testiCounter');
    const testiSlides = track.querySelectorAll('.testi-slide');
    let index = 0;
    const update = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      counter.textContent = `${index + 1} / ${testiSlides.length}`;
    };
    prevBtn.addEventListener('click', () => {
      index = (index - 1 + testiSlides.length) % testiSlides.length;
      update();
    });
    nextBtn.addEventListener('click', () => {
      index = (index + 1) % testiSlides.length;
      update();
    });
    setInterval(() => {
      index = (index + 1) % testiSlides.length;
      update();
    }, 6000);
  }

  // GLightbox for portfolio galleries
  if (window.GLightbox) {
    GLightbox({ selector: '.glightbox', touchNavigation: true, loop: true });
  }
});
