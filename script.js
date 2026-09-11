document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const footerMonthEl = document.getElementById('footerMonth');
  if (footerMonthEl) footerMonthEl.textContent = String(new Date().getMonth() + 1).padStart(2, '0') + '’';

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
    // Every trigger below is created on DOMContentLoaded, before
    // below-the-fold images (most are loading="lazy") have finished
    // loading and settled their layout height. That shifts section
    // heights afterwards, silently invalidating start/end positions
    // computed against the stale layout -- refresh once everything
    // (including images) has actually loaded to pick up the real sizes.
    if (hasScrollFx) window.addEventListener('load', () => ScrollTrigger.refresh());

    // Portfolio sticky stack -- the wrapper height was a hand-tuned vh
    // guess sized against one test viewport, so it drifted (dead scroll
    // or overlap) on any other window height, since vh scales with the
    // viewport while the cards' actual content height mostly doesn't.
    // Measure the real combined card height instead and set it exactly,
    // on load/resize so it also survives lazy-image layout shifts.
    const pfStack = document.querySelector('.pf-stack');
    if (pfStack) {
      const setPfStackHeight = () => {
        if (window.innerWidth <= 900) {
          pfStack.style.height = '';
          return;
        }
        let total = 0;
        pfStack.querySelectorAll('.pf-card, #ctaStack').forEach((card) => { total += card.offsetHeight; });
        pfStack.style.height = total + 'px';
      };
      setPfStackHeight();
      window.addEventListener('load', () => {
        setPfStackHeight();
        if (hasScrollFx) ScrollTrigger.refresh();
      });
      window.addEventListener('resize', setPfStackHeight);
    }

    // Editorial strip (home page marquee) is pinned just below the fixed
    // nav via a hand-picked top offset per breakpoint (see style.css).
    // Those guesses assume one exact nav height, so any drift (real
    // fonts vs. this env's fallback, OS font metrics, a longer nav
    // label) can shrink the gap to nothing and let the marquee overlap
    // the nav. Measure the nav's actual rendered height instead and pin
    // the strip right below it, on load/resize so it also survives
    // late font swaps.
    const editorialStrip = document.getElementById('editorialStrip');
    const siteNav = document.querySelector('.site-nav');
    // On mobile, .hero-intro-name (the "Dimitri Lening" name beat) sits
    // below the strip via its own hardcoded padding-top (760px breakpoint
    // in style.css), guessed against the same assumed strip height/
    // position as the old top:92px offset above. Once the strip's real
    // position is measured instead, that guess can fall short and the
    // name ends up overlapping the strip's last row of photos -- clear
    // it dynamically too, from the strip's actual measured bottom edge.
    const heroIntroName = document.getElementById('heroIntroName');
    // The hero portrait (.hero-bg) fills the whole section behind the
    // strip (inset: 0). On wide screens object-fit: contain happens to
    // letterbox it away from the very top, so it never reaches the strip
    // -- but that's incidental, not a rule: on narrow screens the image
    // is both narrower and pushed up by its own object-position tweak
    // (see style.css, 760px breakpoint), so it reaches right into the
    // strip's band and visibly overlaps it. Pin the image's top to the
    // strip's actual bottom edge instead, so it always starts clear of
    // the strip the way it only accidentally does on desktop.
    const heroBg = document.getElementById('heroBg');
    if (editorialStrip && siteNav) {
      const positionEditorialStrip = () => {
        editorialStrip.style.top = siteNav.getBoundingClientRect().height + 'px';
        const stripBottom = editorialStrip.getBoundingClientRect().bottom;
        if (heroBg) heroBg.style.top = stripBottom + 'px';
        if (heroIntroName && window.innerWidth <= 760) {
          heroIntroName.style.paddingTop = (stripBottom + 24) + 'px';
        } else if (heroIntroName) {
          heroIntroName.style.paddingTop = '';
        }
      };
      positionEditorialStrip();
      window.addEventListener('load', positionEditorialStrip);
      window.addEventListener('resize', positionEditorialStrip);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(positionEditorialStrip);
      }
    }

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
      const heroCurtain = document.getElementById('heroCurtain');
      if (heroCurtain) gsap.set(heroCurtain, { opacity: 0 });
      // The headline is revealed word by word (not as one block) -- see
      // the per-word loop below, which schedules each .hero-word
      // individually between the eyebrow (before) and the detail line +
      // CTA row (after).
      const heroEyebrowEl = document.querySelector('.hero-eyebrow');
      gsap.set(heroEyebrowEl, { opacity: 0, y: 24 });
      const heroAfterWordsEls = gsap.utils.toArray('.hero-cta, .hero-cta-secondary, .hero-stats');
      gsap.set(heroAfterWordsEls, { opacity: 0, y: 24 });
      const heroWordEls = gsap.utils.toArray('.hero-sub .hero-word');
      // Plain words stay in place and just light up from dim to full
      // color -- the same "lit" mechanic as the reach section's
      // "...deutschlandweit unterwegs." line -- instead of fading/rising
      // in, so the reveal reads as text lighting up rather than moving.
      gsap.set(heroWordEls.filter((w) => !w.classList.contains('hero-word-accent')), { color: 'rgba(247, 227, 180, 0.35)' });
      // The three service categories (Events, Unternehmen, Sport) get a
      // camera-iris wipe instead of the plain fade+rise every other word
      // uses -- a nod to the f-stop/aperture motif used elsewhere in the
      // hero, and a clearer "this one's different" cue than a snap-focus
      // blur ever was.
      const heroAccentWords = heroWordEls.filter((w) => w.classList.contains('hero-word-accent'));
      gsap.set(heroAccentWords, { opacity: 0, clipPath: 'circle(0% at 50% 50%)', scale: 0.85 });
      const heroLogoTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-photo',
          start: 'top top',
          end: () => `+=${window.innerHeight * 5.2}`,
          scrub: true,
          pin: true,
          anticipatePin: 1,
        },
      });
      heroLogoTl
        .to(heroLogoImg, { scale: 5.5, filter: 'blur(24px)', ease: 'none', duration: 0.5 }, 0)
        .to(heroLogoIntro, { autoAlpha: 0, ease: 'none', duration: 0.4 }, 0.15)
        // Phase 2: name + short description, a personal beat before the
        // main copy takes over -- given explicit, non-overlapping
        // durations so it's always fully gone (not still fading) before
        // anything else starts.
        .to(heroIntroNameEls, { opacity: 1, x: 0, ease: 'power2.out', duration: 0.3, stagger: 0.08 }, 0.6)
        .to(heroIntroNameEls, { opacity: 0, x: '60vw', ease: 'power1.in', duration: 0.3, stagger: 0.05 }, 1.3)
        // Phase 3: only once the name has fully left does a solid curtain
        // drop over the photo -- the face is no longer visible at all --
        // and the eyebrow leads the headline in.
        .to(heroCurtain, { opacity: 1, ease: 'power2.out', duration: 0.3 }, 1.7)
        .to(heroEyebrowEl, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.3 }, 1.9);
      // Phase 4: the headline cascades in one word at a time, scrubbed to
      // scroll like everything else -- each word gets an explicit start
      // time (rather than a stagger on one shared tween) so the plain
      // words and the iris-wipe category words stay in their correct
      // reading order even though they animate differently.
      const WORDS_START = 2.2;
      const WORD_STEP = 0.14;
      heroWordEls.forEach((word, i) => {
        const start = WORDS_START + i * WORD_STEP;
        if (word.classList.contains('hero-word-accent')) {
          heroLogoTl.to(word, {
            opacity: 1, scale: 1, clipPath: 'circle(75% at 50% 50%)',
            ease: 'power2.out', duration: 0.45,
          }, start);
        } else {
          heroLogoTl.to(word, { color: '#f7e3b4', ease: 'none', duration: 0.22 }, start);
        }
      });
      const wordsEnd = WORDS_START + (heroWordEls.length - 1) * WORD_STEP + 0.45;
      // Phase 5: detail line + CTA land once the whole headline is in --
      // just the shared fade+rise, no extra scale punch (that used to
      // visibly "inflate" the button as you scrolled through it).
      heroLogoTl.to(heroAfterWordsEls, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.3, stagger: 0.08 }, wordsEnd + 0.1);
      // No slide-out phase -- once the copy has landed the pin just holds
      // it there; further scrolling releases the pin and the whole
      // section scrolls away normally into Leistungen underneath, instead
      // of animating the copy back out first.
    }

    // Editorial strip is a plain CSS marquee (see style.css) -- no JS
    // needed, it just loops on its own.

    // Leistungen → Einsatzgebiet cross-fade — two opacity/position
    // tweens scrubbed to the same scroll range. Every scroll position
    // maps to one well-defined visual state, so there's no pin-release
    // hand-off to time correctly (unlike the fade-curtain bridges this
    // replaces).
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

    // Stats section black-to-white crossfade — the page's one deliberate
    // light section would otherwise just cut in hard against the dark
    // page; fading its own background in as it scrolls into view (and
    // back out as it leaves) makes the switch feel intentional rather
    // than abrupt.
    const statsHighlight = document.querySelector('.stats-highlight');
    if (statsHighlight && hasScrollFx) {
      const statsVals = gsap.utils.toArray(statsHighlight.querySelectorAll('.stat-val'));
      const statsLabels = gsap.utils.toArray(statsHighlight.querySelectorAll('.stats-highlight-text'));
      const statsRows = gsap.utils.toArray(statsHighlight.querySelectorAll('.stats-highlight-row'));
      gsap.fromTo(
        statsHighlight,
        { backgroundColor: '#000000' },
        {
          backgroundColor: '#ffffff',
          ease: 'none',
          scrollTrigger: {
            trigger: statsHighlight,
            start: 'top bottom',
            end: 'top 40%',
            scrub: true,
          },
        }
      );
      gsap.fromTo(statsVals, { color: '#ffffff' }, {
        color: '#111111', ease: 'none',
        scrollTrigger: { trigger: statsHighlight, start: 'top bottom', end: 'top 40%', scrub: true },
      });
      gsap.fromTo(statsLabels, { color: 'rgba(255,255,255,0.7)' }, {
        color: '#555555', ease: 'none',
        scrollTrigger: { trigger: statsHighlight, start: 'top bottom', end: 'top 40%', scrub: true },
      });
      gsap.fromTo(statsRows, { borderTopColor: 'rgba(255,255,255,0.25)' }, {
        borderTopColor: 'rgba(0,0,0,0.14)', ease: 'none',
        scrollTrigger: { trigger: statsHighlight, start: 'top bottom', end: 'top 40%', scrub: true },
      });

      gsap.fromTo(
        statsHighlight,
        { backgroundColor: '#ffffff' },
        {
          backgroundColor: '#000000',
          ease: 'none',
          scrollTrigger: {
            trigger: statsHighlight,
            start: 'bottom 60%',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
      gsap.fromTo(statsVals, { color: '#111111' }, {
        color: '#ffffff', ease: 'none',
        scrollTrigger: { trigger: statsHighlight, start: 'bottom 60%', end: 'bottom top', scrub: true },
      });
      gsap.fromTo(statsLabels, { color: '#555555' }, {
        color: 'rgba(255,255,255,0.7)', ease: 'none',
        scrollTrigger: { trigger: statsHighlight, start: 'bottom 60%', end: 'bottom top', scrub: true },
      });
      gsap.fromTo(statsRows, { borderTopColor: 'rgba(0,0,0,0.14)' }, {
        borderTopColor: 'rgba(255,255,255,0.25)', ease: 'none',
        scrollTrigger: { trigger: statsHighlight, start: 'bottom 60%', end: 'bottom top', scrub: true },
      });
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
