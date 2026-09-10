document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Smooth scroll (Lenis) + scroll-driven hero parallax (GSAP). Both are
  // pure enhancements on top of content that is already visible via CSS,
  // so any failure here (blocked CDN, ad-blocker, version mismatch) must
  // never be allowed to stop the rest of this script from running — wrap
  // it in its own try/catch instead of letting an exception skip
  // everything below it (boot intro, reveals, nav, etc.).
  try {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasScrollFx = window.gsap && window.ScrollTrigger && !reduceMotion;
    if (hasScrollFx) gsap.registerPlugin(ScrollTrigger);

    let lenis = null;
    if (window.Lenis && !reduceMotion) {
      // Native CSS smooth-scroll fights Lenis's own smoothing (both try to
      // animate the same scroll position independently), causing visible
      // stutter — disable it wherever Lenis is driving the page.
      document.documentElement.style.scrollBehavior = 'auto';
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
      if (hasScrollFx) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.lagSmoothing(0);
      }
      // With native scroll-behavior disabled above, in-page anchor links
      // (nav's Kontakt link, the scroll-progress dots, AGB's TOC) would
      // otherwise jump instantly — route them through Lenis instead.
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link || link.getAttribute('href') === '#') return;
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target);
      });
    }

    // Hero logo curtain — fades/scales out as the visitor scrolls past the
    // hero, scrubbed directly to scroll position so scrolling back up to
    // the top brings it right back (not a one-time, timer-based intro).
    const heroLogoIntro = document.getElementById('heroLogoIntro');
    if (heroLogoIntro && hasScrollFx) {
      heroLogoIntro.classList.add('js-active');
      const heroLogoImg = heroLogoIntro.querySelector('img');
      // Fix the starting point explicitly — otherwise GSAP captures
      // whatever filter/scale the element happens to have at setup time
      // (e.g. still the sitewide blur-up loader's blur) as the tween's
      // "from" value, leaving the logo permanently soft-focused at rest.
      gsap.set(heroLogoImg, { scale: 1, filter: 'blur(0px)' });
      // Two phases in one pin: (1) logo zooms/blurs out revealing the
      // photo, (2) only once that's done does the hero text slide down
      // into view — instead of the text sitting there the whole time.
      // The .js-hero-sequence class hands opacity/transform control on the
      // hero text over to GSAP, switching off the CSS-only reveal so the
      // two don't fight over the same properties.
      document.querySelector('.hero-photo').classList.add('js-hero-sequence');
      const heroIntroName = document.getElementById('heroIntroName');
      if (heroIntroName) heroIntroName.classList.add('js-active');
      const heroIntroNameEls = gsap.utils.toArray('.hero-intro-name > *');
      gsap.set(heroIntroNameEls, { opacity: 0, x: '60vw' });
      const heroTextEls = gsap.utils.toArray('.hero-box > *, .hero-stats');
      gsap.set(heroTextEls, { opacity: 0, x: '-60vw' });
      const heroCta = document.querySelector('.hero-cta');
      if (heroCta) gsap.set(heroCta, { scale: 0.82 });
      const heroLogoTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-photo',
          start: 'top top',
          end: () => `+=${window.innerHeight * 3.2}`,
          scrub: true,
          pin: true,
          anticipatePin: 1,
        },
      });
      heroLogoTl
        .to(heroLogoImg, { scale: 5.5, filter: 'blur(24px)', ease: 'none' }, 0)
        .to(heroLogoIntro, { autoAlpha: 0, ease: 'none' }, 0.15)
        // Phase 2: name + short description, a personal beat before the
        // main copy takes over.
        .to(heroIntroNameEls, { opacity: 1, x: 0, ease: 'power2.out', stagger: 0.08 }, 0.35)
        .to(heroIntroNameEls, { opacity: 0, x: '60vw', ease: 'power1.in', stagger: 0.05 }, 0.85)
        // Phase 3: the main hero copy slides in from the left this time.
        .to(heroTextEls, { opacity: 1, x: 0, ease: 'power2.out', stagger: 0.06 }, 1.05)
        // Phase 4: once the text has landed, further scrolling slides it
        // out to the left (behind the portrait) instead of it just
        // sitting there until the pin releases.
        .to(heroTextEls, { opacity: 0, x: '-60vw', ease: 'power1.in', stagger: 0.04 }, 1.65);
      // The CTA row gets its own little punch-in on top of the shared
      // slide, so it reads as the thing to act on rather than just more
      // copy scrolling by.
      if (heroCta) heroLogoTl.to(heroCta, { scale: 1, ease: 'back.out(2.4)' }, 1.3);
    }

    // Pinned services sequence — the section holds scroll in place while
    // crossfading through each service, only releasing once all four have
    // been shown.
    const servicesPin = document.getElementById('servicesPin');
    if (servicesPin && hasScrollFx) {
      const steps = Array.from(servicesPin.querySelectorAll('.services-pin-step'));
      if (steps.length > 1) {
        servicesPin.classList.add('js-pinned');
        steps.forEach((step, i) => {
          gsap.set(step, { opacity: i === 0 ? 1 : 0, scale: i === 0 ? 1 : 0.72 });
          step.classList.toggle('is-active', i === 0);
        });
        const stepsUnits = steps.length - 1;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: servicesPin,
            start: 'top top',
            end: () => `+=${window.innerHeight * stepsUnits}`,
            pin: true,
            scrub: 0.4,
            anticipatePin: 1,
            onUpdate: (self) => {
              const active = Math.min(steps.length - 1, Math.round(self.progress * stepsUnits));
              steps.forEach((step, i) => step.classList.toggle('is-active', i === active));
            },
          },
        });
        steps.forEach((step, i) => {
          if (i === 0) return;
          const prev = steps[i - 1];
          tl.to(prev, { opacity: 0, scale: 1.28, duration: 0.5, ease: 'power1.in' }, `step${i}`)
            .to(step, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, `step${i}`);
        });
      }
    }

    // Leistungen → Einsatzgebiet cross-fade — no pin involved, just two
    // opacity/position tweens scrubbed to the same scroll range. Every
    // scroll position maps to one well-defined visual state, so there's
    // no pin-release hand-off to time correctly (unlike the fade-curtain
    // bridges this replaces). Opacity only on #leistungen, never a
    // transform: it's the pinned servicesPin's ancestor, and any
    // transform on it (even scale(1)) makes it a new containing block,
    // which breaks position:fixed pinning for the whole page.
    const leistungenSection = document.getElementById('leistungen');
    const reachSection = document.getElementById('reach');
    if (leistungenSection && reachSection && hasScrollFx) {
      gsap.set(reachSection, { autoAlpha: 0, y: '6vh' });
      gsap.timeline({
        scrollTrigger: {
          trigger: reachSection,
          start: 'top bottom',
          end: 'top 40%',
          scrub: true,
        },
      })
        .to(leistungenSection, { opacity: 0.3, ease: 'none' }, 0)
        .to(reachSection, { autoAlpha: 1, y: 0, ease: 'none' }, 0);
    }

    // Reach statement — words light up one by one as the section scrolls
    // through view, scrubbed to scroll position (not pinned, unlike the
    // services sequence, for some rhythm variety between sections).
    const reachText = document.getElementById('reachText');
    if (reachText && hasScrollFx) {
      const words = Array.from(reachText.querySelectorAll('.reach-word'));
      if (words.length) {
        reachText.classList.add('js-scrubbed');
        ScrollTrigger.create({
          trigger: reachText,
          start: 'top 75%',
          end: 'bottom 55%',
          scrub: 0.3,
          onUpdate: (self) => {
            const lit = Math.round(self.progress * words.length);
            words.forEach((word, i) => word.classList.toggle('is-lit', i < lit));
          },
        });
      }
    }

    // Scroll progress rail — a fill bar + one dot per major section, so
    // visitors always see where they are on the page. Hidden entirely
    // unless ScrollTrigger can drive it.
    const scrollProgress = document.getElementById('scrollProgress');
    if (scrollProgress && hasScrollFx) {
      const dots = Array.from(scrollProgress.querySelectorAll('.scroll-progress-dot'));
      const sections = dots
        .map((dot) => document.querySelector(dot.getAttribute('href')))
        .filter(Boolean);
      if (sections.length) {
        scrollProgress.classList.add('js-active');
        const fill = document.getElementById('scrollProgressFill');

        ScrollTrigger.create({
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          onUpdate: (self) => {
            if (fill) fill.style.height = `${self.progress * 100}%`;
          },
        });

        sections.forEach((section, i) => {
          ScrollTrigger.create({
            trigger: section,
            start: 'top center',
            end: 'bottom center',
            onToggle: (self) => {
              if (self.isActive) dots.forEach((dot, j) => dot.classList.toggle('is-active', j === i));
            },
          });
        });
      }
    }
  } catch (err) {
    console.error('Scroll motion setup failed, continuing without it:', err);
  }

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

    // Live finger-tracking drag on the front card: it follows the touch
    // 1:1 while dragging, flies off-screen on release past the threshold
    // (swap happens while it's off-screen, then it settles back in from
    // the opposite side), or springs back to centre below the threshold.
    let startX = null;
    let dragging = false;

    stack.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      dragging = true;
      mainSlot.style.transition = 'none';
    }, { passive: true });

    stack.addEventListener('touchmove', (e) => {
      if (!dragging || startX === null) return;
      const dx = e.touches[0].clientX - startX;
      mainSlot.style.transform = `translateX(${dx}px) rotate(${dx / 24}deg)`;
    }, { passive: true });

    stack.addEventListener('touchend', (e) => {
      if (!dragging || startX === null) return;
      dragging = false;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;

      if (Math.abs(dx) > 40) {
        const dir = dx < 0 ? -1 : 1;
        mainSlot.style.transition = 'transform 0.3s cubic-bezier(.4,0,1,1), opacity 0.3s ease';
        mainSlot.style.transform = `translateX(${dir * 420}px) rotate(${dir * 18}deg)`;
        mainSlot.style.opacity = '0';
        if (hint) hint.classList.add('is-hidden');
        setTimeout(() => {
          offset = (offset + (dir < 0 ? 1 : -1) + photos.length) % photos.length;
          render();
          mainSlot.style.transition = 'none';
          mainSlot.style.transform = `translateX(${-dir * 60}px) rotate(${-dir * 6}deg)`;
          requestAnimationFrame(() => {
            mainSlot.style.transition = 'transform 0.4s cubic-bezier(.2,.8,.2,1), opacity 0.3s ease';
            mainSlot.style.transform = 'translateX(0) rotate(0deg)';
            mainSlot.style.opacity = '1';
          });
        }, 260);
      } else {
        mainSlot.style.transition = 'transform 0.4s cubic-bezier(.2,.8,.2,1)';
        mainSlot.style.transform = 'translateX(0) rotate(0deg)';
      }
    }, { passive: true });
  });

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

  // Animated stat counters — a slot-machine reel reveal: each character
  // gets its own vertical strip of random digits above the real value,
  // sliding top-to-bottom into place, cascading left to right so the
  // leading digit lands first and the rest follow.
  const statStrips = document.querySelectorAll('.stats-strip, .stats-highlight');
  if (statStrips.length) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function buildReel(counter, finalChar, ci) {
      const isDigit = /[0-9]/.test(finalChar);
      const reel = document.createElement('span');
      reel.className = 'reel-digit';

      if (!isDigit) {
        reel.textContent = finalChar;
        reel.classList.add('reel-static');
        counter.appendChild(reel);
        setTimeout(() => reel.classList.add('is-in'), ci * 180);
        return;
      }

      const randomCount = 9 + Math.floor(Math.random() * 3);
      const strip = document.createElement('span');
      strip.className = 'reel-strip';
      const finalSpan = document.createElement('span');
      finalSpan.textContent = finalChar;
      strip.appendChild(finalSpan);
      for (let i = 0; i < randomCount; i += 1) {
        const s = document.createElement('span');
        s.textContent = String(Math.floor(Math.random() * 10));
        strip.appendChild(s);
      }
      strip.style.transform = `translateY(-${randomCount}em)`;
      reel.appendChild(strip);
      counter.appendChild(reel);

      setTimeout(() => {
        strip.style.transition = 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)';
        strip.style.transform = 'translateY(0)';
      }, ci * 180);
    }

    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const counters = Array.from(entry.target.querySelectorAll('.stat-val'));

          counters.forEach((counter) => {
            const target = Math.round(parseFloat(counter.dataset.target));
            const prefix = counter.dataset.prefix || '';
            const suffix = counter.dataset.suffix || '';
            const finalText = `${prefix}${target}${suffix}`;
            const statEl = counter.closest('.stat');

            if (reduceMotion) {
              counter.textContent = finalText;
              statEl.classList.add('is-visible');
              return;
            }

            statEl.classList.add('is-visible');
            counter.textContent = '';
            finalText.split('').forEach((ch, ci) => buildReel(counter, ch, ci));
          });

          statObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    statStrips.forEach((el) => statObserver.observe(el));
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

  // GLightbox for portfolio galleries — slide images are created fresh by
  // GLightbox at runtime, so the sitewide blur-up loader never sees them and
  // they'd stay stuck at opacity:0 (a black-looking lightbox). Mark them
  // loaded the same way as any other image once their slide is ready.
  if (window.GLightbox) {
    GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
      afterSlideLoad: ({ slide }) => {
        slide.querySelectorAll('img').forEach(markImgLoaded);
      },
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
