// =====================
// LOADER (your original)
// =====================
const loader = document.getElementById("loader");
const app = document.getElementById("app"); // (ако нямаш #app в HTML, това е OK, ползваме optional chaining)
const barFill = document.getElementById("barFill");

const config = {
  minDurationMs: 2200,
  maxDurationMs: 3400,
  tickMs: 120,
};

let progress = 0;

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const totalDuration = rand(config.minDurationMs, config.maxDurationMs);
const steps = Math.ceil(totalDuration / config.tickMs);

function stepAmount(p) {
  if (p < 35) return rand(6, 11);
  if (p < 70) return rand(3, 7);
  if (p < 90) return rand(1, 3);
  return 0;
}

let currentStep = 0;

const interval = setInterval(() => {
  currentStep++;
  const cap = 92;

  progress = Math.min(cap, progress + stepAmount(progress));
  if (barFill) barFill.style.width = progress + "%";

  if (currentStep >= steps) {
    clearInterval(interval);

    if (barFill) barFill.style.width = "100%";

    setTimeout(() => {
      loader?.classList.add("loader--done");
      app?.classList.remove("app--hidden");
      document.body.classList.add("is-ready"); // ✅ за твоите entrance анимации
    }, 420);
  }
}, config.tickMs);

// =====================
// TOPBAR: milky bg on scroll
// =====================
const topbar = document.querySelector(".topbar");
const SCROLL_TRIGGER = 24;

function updateNavOnScroll() {
  if (!topbar) return;
  topbar.classList.toggle("is-scrolled", window.scrollY > SCROLL_TRIGGER);
}
window.addEventListener("scroll", updateNavOnScroll, { passive: true });
updateNavOnScroll();

// =====================
// MOBILE MENU + letters + swipe
// =====================
const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");
const mobileClose = document.getElementById("mobileMenuClose");

function openMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.classList.add("is-open");
  burger.classList.add("is-open");
  mobileMenu.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  animateMobileLinksIn();
}

function closeMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.classList.remove("is-open");
  burger.classList.remove("is-open");
  mobileMenu.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function toggleMenu() {
  if (!mobileMenu) return;
  const isOpen = mobileMenu.classList.contains("is-open");
  isOpen ? closeMenu() : openMenu();
}

if (burger && mobileMenu) burger.addEventListener("click", toggleMenu);
if (mobileClose) mobileClose.addEventListener("click", closeMenu);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mobileMenu?.classList.contains("is-open")) closeMenu();
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => closeMenu());
});

let lettersWrapped = false;

function wrapLinkLetters() {
  if (lettersWrapped || !mobileMenu) return;

  const links = mobileMenu.querySelectorAll(".mobileMenu__nav a");
  links.forEach((a) => {
    const text = a.textContent.trim();
    a.setAttribute("aria-label", text);

    const wrapper = document.createElement("span");
    wrapper.className = "letters";
    wrapper.setAttribute("aria-hidden", "true");

    [...text].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "letter";
      s.textContent = ch === " " ? "\u00A0" : ch;
      wrapper.appendChild(s);
    });

    a.textContent = "";
    a.appendChild(wrapper);
  });

  lettersWrapped = true;
}

function animateMobileLinksIn() {
  wrapLinkLetters();
  const letters = mobileMenu?.querySelectorAll(".letter") || [];
  letters.forEach((el) => el.classList.remove("in"));
  letters.forEach((el, i) => {
    el.style.transitionDelay = `${i * 12}ms`;
    requestAnimationFrame(() => el.classList.add("in"));
  });
}

let touchStartY = 0;
let touchStartX = 0;
let isSwiping = false;

mobileMenu?.addEventListener(
  "touchstart",
  (e) => {
    if (!mobileMenu.classList.contains("is-open")) return;
    const t = e.touches[0];
    touchStartY = t.clientY;
    touchStartX = t.clientX;
    isSwiping = true;
  },
  { passive: true }
);

mobileMenu?.addEventListener(
  "touchmove",
  (e) => {
    if (!isSwiping) return;
    const t = e.touches[0];
    const dy = t.clientY - touchStartY;
    const dx = t.clientX - touchStartX;

    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      isSwiping = false;
      closeMenu();
    }
  },
  { passive: true }
);

mobileMenu?.addEventListener(
  "touchend",
  () => {
    isSwiping = false;
  },
  { passive: true }
);

// =====================
// SCROLL SPY (active link) ✅ FIXED (top-offset based)
// =====================
function setActiveLinkById(id) {
  const allLinks = document.querySelectorAll(".navPill__link, .mobileMenu__nav a");
  allLinks.forEach((a) => a.classList.remove("is-active"));

  const targets = document.querySelectorAll(
    `.navPill__link[href="#${CSS.escape(id)}"], .mobileMenu__nav a[href="#${CSS.escape(id)}"]`
  );
  targets.forEach((a) => a.classList.add("is-active"));
}

(function initScrollSpy() {
  // Ако browser няма CSS.escape (рядко), правим fallback
  if (!window.CSS) window.CSS = {};
  if (!CSS.escape) CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");

  // Колко пиксела под topbar-а искаш да “мериш”
  const TOP_OFFSET = 120; // ✅ може да го пипнеш: 96 / 110 / 120

  const candidates = Array.from(document.querySelectorAll("section[id], main[id], header[id]"));

  // Взимаме само тези, които имат и съответен линк в менюто
  const sections = candidates.filter((el) => {
    if (!el.id) return false;
    return !!document.querySelector(`a[href="#${CSS.escape(el.id)}"]`);
  });

  // Debug ако искаш:
  // console.log("ScrollSpy sections:", sections.map((s) => s.id));

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const inView = entries.filter((e) => e.isIntersecting);
      if (!inView.length) return;

      // ✅ Избираме секцията, чийто top е най-близо до TOP_OFFSET
      const best = inView
        .map((e) => ({
          id: e.target.id,
          dist: Math.abs(e.boundingClientRect.top - TOP_OFFSET),
        }))
        .sort((a, b) => a.dist - b.dist)[0];

      if (best?.id) setActiveLinkById(best.id);
    },
    {
      threshold: [0.01, 0.1, 0.2, 0.35],
      rootMargin: `-${TOP_OFFSET}px 0px -55% 0px`,
    }
  );

  sections.forEach((sec) => observer.observe(sec));

  // Ако има hash при load
  const hash = (location.hash || "").replace("#", "");
  if (hash && document.getElementById(hash)) setActiveLinkById(hash);
})();

// =====================
// HERO crossfade (2 photos)
// =====================
const heroImages = ["img/hero5.jpg", "img/about2.jpg"];

(function initHeroSlider() {
  const layerA = document.querySelector(".hero__bgLayer.is-a");
  const layerB = document.querySelector(".hero__bgLayer.is-b");
  if (!layerA || !layerB) return;

  layerA.style.backgroundImage = `url("${heroImages[0]}")`;
  layerB.style.backgroundImage = `url("${heroImages[1]}")`;

  let activeIsA = true;
  layerA.classList.add("is-active");

  const INTERVAL = 7500;

  setInterval(() => {
    activeIsA = !activeIsA;
    if (activeIsA) {
      layerA.classList.add("is-active");
      layerB.classList.remove("is-active");
    } else {
      layerB.classList.add("is-active");
      layerA.classList.remove("is-active");
    }
  }, INTERVAL);
})();

// =====================
// ABOUT (first about section) reveal
// =====================
(function initAboutReveal() {
  const about = document.querySelector(".about");
  if (!about) return;

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) about.classList.add("is-visible");
    },
    { threshold: 0.25 }
  );

  obs.observe(about);
})();

// =====================
// ABOUT DETAILS reveal (ONLY ONCE) + REPLAY COLLAGE EVERY 10s
// =====================
(function initAboutDetailsRevealAndReplay() {
  const section = document.querySelector(".aboutDetails");
  const collage = document.querySelector(".aboutDetails .collage");
  if (!section || !collage) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) return;

  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      if (entries[0].isIntersecting) {
        section.classList.add("is-visible");
        obs.disconnect();
      }
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
  );
  revealObserver.observe(section);

  const PERIOD_MS = 10000;
  let timer = null;

  const replay = () => {
    if (!section.classList.contains("is-visible")) return;
    collage.classList.add("is-cycle");
    void collage.offsetHeight;
    collage.classList.remove("is-cycle");
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(replay, PERIOD_MS);
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  const inViewObs = new IntersectionObserver(
    (entries) => {
      const inView = entries[0]?.isIntersecting;
      if (inView) start();
      else stop();
    },
    { threshold: 0.25 }
  );
  inViewObs.observe(section);

  const classObs = new MutationObserver(() => {
    if (section.classList.contains("is-visible")) {
      replay();
      start();
      classObs.disconnect();
    }
  });
  classObs.observe(section, { attributes: true, attributeFilter: ["class"] });

  if (section.classList.contains("is-visible")) {
    replay();
    start();
  }
})();

// =====================
// GALLERY (10 photos) - slider + thumbs + lightbox
// FIX: NO SHIFT on 9/10 (remove inline:center behavior)
// =====================
(function initGallery() {
  const GALLERY_TOTAL = 10;
  const GALLERY_PATH = "img/gallery";

  const images = Array.from({ length: GALLERY_TOTAL }, (_, i) => ({
    full: `${GALLERY_PATH}/${i + 1}.webp`,
    thumb: `${GALLERY_PATH}/${i + 1}.webp`,
    alt: `Галерия снимка ${i + 1}`,
  }));

  const mainImg = document.getElementById("galMainImg");
  const counter = document.getElementById("galCounter");
  const countText = document.getElementById("galleryCountText");
  const thumbsWrap = document.getElementById("galleryThumbs");
  const prevBtn = document.getElementById("galPrev");
  const nextBtn = document.getElementById("galNext");
  const frameMedia = document.querySelector(".galleryFrame__media");

  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbCounter = document.getElementById("lbCounter");
  const lbThumbs = document.getElementById("lbThumbs");
  const lbPrev = document.getElementById("lbPrev");
  const lbNext = document.getElementById("lbNext");
  const lbClose = document.getElementById("lbClose");

  if (!mainImg || !counter || !thumbsWrap) return;

  let index = 0;

  function keepThumbVisible(container, el) {
    if (!container || !el) return;

    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();

    const leftOverflow = eRect.left < cRect.left;
    const rightOverflow = eRect.right > cRect.right;

    if (leftOverflow || rightOverflow) {
      el.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    }
  }

  function setMain(i, { scrollThumb = true } = {}) {
    index = (i + images.length) % images.length;

    const item = images[index];
    mainImg.src = item.full;
    mainImg.alt = item.alt;

    counter.textContent = `${index + 1} / ${images.length}`;
    if (countText) countText.textContent = `${images.length} СНИМКИ ОТ КЪЩА ДЕНИ И ОКОЛНОСТИТЕ`;

    thumbsWrap.querySelectorAll(".galleryThumb").forEach((t) => t.classList.remove("is-active"));
    const active = thumbsWrap.querySelector(`[data-idx="${index}"]`);
    active?.classList.add("is-active");

    if (scrollThumb && active) {
      keepThumbVisible(thumbsWrap, active);
    }

    if (lb?.classList.contains("is-open")) syncLightbox();
  }

  function buildThumbs() {
    thumbsWrap.innerHTML = images
      .map(
        (img, i) => `
          <button class="galleryThumb" type="button" data-idx="${i}" aria-label="Снимка ${i + 1}">
            <img src="${img.thumb}" alt="${img.alt}" loading="lazy">
          </button>
        `
      )
      .join("");

    thumbsWrap.querySelectorAll(".galleryThumb").forEach((btn) => {
      btn.addEventListener("click", () => setMain(Number(btn.dataset.idx), { scrollThumb: true }));
    });
  }

  function prev() {
    setMain(index - 1);
  }
  function next() {
    setMain(index + 1);
  }

  prevBtn?.addEventListener("click", prev);
  nextBtn?.addEventListener("click", next);

  function buildLightboxThumbs() {
    if (!lbThumbs) return;
    if (lbThumbs.childElementCount) return;

    lbThumbs.innerHTML = images
      .map(
        (img, i) => `
          <button class="lightbox__thumb" type="button" data-idx="${i}" aria-label="Снимка ${i + 1}">
            <img src="${img.thumb}" alt="${img.alt}" loading="lazy">
          </button>
        `
      )
      .join("");

    lbThumbs.querySelectorAll(".lightbox__thumb").forEach((btn) => {
      btn.addEventListener("click", () => setMain(Number(btn.dataset.idx), { scrollThumb: true }));
    });
  }

  function syncLightbox() {
    if (!lbImg || !lbCounter) return;
    const item = images[index];

    lbImg.src = item.full;
    lbImg.alt = item.alt;
    lbCounter.textContent = `${index + 1} / ${images.length}`;

    lbThumbs?.querySelectorAll(".lightbox__thumb").forEach((t) => t.classList.remove("is-active"));
    const active = lbThumbs?.querySelector(`[data-idx="${index}"]`);
    active?.classList.add("is-active");

    if (active && lbThumbs) keepThumbVisible(lbThumbs, active);
  }

  function openLightbox() {
    if (!lb) return;
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    buildLightboxThumbs();
    syncLightbox();
  }

  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  frameMedia?.addEventListener("click", openLightbox);
  frameMedia?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") openLightbox();
  });

  lbClose?.addEventListener("click", closeLightbox);
  lbPrev?.addEventListener("click", prev);
  lbNext?.addEventListener("click", next);

  lb?.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });

  window.addEventListener("keydown", (e) => {
    if (!lb?.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  });

  buildThumbs();
  setMain(0, { scrollThumb: false });
})();

// =====================
// PRICING reveal: left -> center -> right
// =====================
(function initPricingReveal() {
  const section = document.querySelector(".pricing");
  if (!section) return;

  const cards = Array.from(section.querySelectorAll(".priceCard"));
  if (!cards.length) return;

  const ordered = cards
    .map((card) => ({
      el: card,
      left: card.getBoundingClientRect().left,
    }))
    .sort((a, b) => a.left - b.left)
    .map((item) => item.el);

  ordered.forEach((card, i) => {
    card.style.setProperty("--d", 400 + i * 420);
  });

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) {
    section.classList.add("is-visible");
    return;
  }

  const obs = new IntersectionObserver(
    (entries, o) => {
      if (entries[0].isIntersecting) {
        section.classList.add("is-visible");
        o.disconnect();
      }
    },
    { threshold: 0.22, rootMargin: "0px 0px -12% 0px" }
  );

  obs.observe(section);
})();



// =====================
// AMENITIES (УДОБСТВА) tabs + dynamic list
// =====================
(function initAmenities() {
    const wrap = document.getElementById("udobstva");
    if (!wrap) return;
  
    const grid = document.getElementById("amenGrid");
    const extraGrid = document.getElementById("amenExtraGrid");
    const tabs = Array.from(wrap.querySelectorAll(".amenTab"));
  
    if (!grid || !tabs.length) return;
  
    // ✅ Данни (редактирай свободно)
    const DATA = {
      dvor: [
        "СЕЗОНЕН БАСЕЙН 5М",
        "ЦЕЛОГОДИШНО ДЖАКУЗИ",
        "БАРБЕКЮ НАВЕС",
        "ОЗЕЛЕНЕН ДВОР",
        "ЧАДЪРИ И ШЕЗЛОНГИ",
        "ЛЮЛКА И ХАМАК",
        "ДЕТСКИ БАТУТ",
        "ПАРКИНГ",
        "ТЕРАСИ",
      ],
      vutre: [
        "ТРАПЕЗАРИЯ",
        "КЛИМАТИК",
        "ДЕТСКИ ИГРАЧКИ",
        "МУЗИКАЛНА УРЕДБА",
        "WI-FI ИНТЕРНЕТ",
        "ДОМАШНИ ЛЮБИМЦИ ОК",
        "ЕЛЕКТРИЧЕСКО ОТОПЛЕНИЕ",
        "ТЕЛЕВИЗОР",
        "БЕБЕШКА КОШАРА",
      ],
      kuhnq: [
        "ПЪЛНО ОБОРУДВАНЕ",
        "ХЛАДИЛНИК",
        "ТЕРМОКАНА",
        "ПОСУДА",
        "МИКРОВЪЛНОВА",
        "ТОСТЕР",
        "ПЕЧКА И ФУРНА",
        "КАФЕМАШИНА",
        "СЪДОМИЯЛНА",
      ],
      banq: [
        "КЪРПИ И САПУНИ",
        "ПЕРАЛНЯ",
        "ЮТИЯ И ДЪСКА",
      ],
    };
  
    const EXTRA = [
      "ТЕМАТИЧНА УКРАСА",
      "ПРАЗНИЧНИ ПАКЕТИ",
      "КЕТЪРИНГ / ХРАНА",
    ];
  
    function renderItems(list) {
      // reset + animate in
      grid.classList.add("is-anim");
      grid.innerHTML = list
        .map(
          (t) => `
            <div class="amenItem">
              <div class="amenItem__check" aria-hidden="true">✓</div>
              <div class="amenItem__text">${t}</div>
            </div>
          `
        )
        .join("");
  
      const items = Array.from(grid.querySelectorAll(".amenItem"));
      items.forEach((el) => el.classList.remove("is-in"));
  
      // stagger
      items.forEach((el, i) => {
        el.style.transitionDelay = `${i * 45}ms`;
        requestAnimationFrame(() => el.classList.add("is-in"));
      });
  
      // махаме клас след малко (за следващи рендъри)
      setTimeout(() => grid.classList.remove("is-anim"), 600);
    }
  
    function setActive(tabKey) {
      tabs.forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tabKey));
      renderItems(DATA[tabKey] || []);
    }
  
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => setActive(btn.dataset.tab));
    });
  
    // Extra
    if (extraGrid) {
      extraGrid.innerHTML = EXTRA.map(
        (t) => `
          <div class="amenItem">
            <div class="amenItem__check" aria-hidden="true">✓</div>
            <div class="amenItem__text">${t}</div>
          </div>
        `
      ).join("");
    }
  
    // init default
    setActive("dvor");
  })();

  
  // =====================
// ROOMS (СТАИ) render
// =====================
(function initRooms() {
    const mount = document.getElementById("roomsGrid");
    if (!mount) return;
  
    // малък helper за SVG икони
    const ICONS = {
      bed: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3 10v10M21 10v10M3 17h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M4 10h16a1.5 1.5 0 0 1 1.5 1.5V17H2.5v-5.5A1.5 1.5 0 0 1 4 10Z"
                stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>`,
      fork: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M6 3v7a3 3 0 0 0 6 0V3M14 3v18M18 3v18"
                stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
      kitchen: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M7 3h10v18H7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M9 7h6M9 11h6M9 15h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>`,
      bath: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3 12h18M6 12v3a6 6 0 0 0 12 0v-3M8 6a2 2 0 0 1 4 0v6"
                stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
      terrace: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 20h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M6 20V9a6 6 0 0 1 12 0v11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M9 12h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>`,
    };
  
    // ✅ Редактирай текстовете тук
    const DATA = [
      {
        n: "1",
        title: "ПЪРВИ ЕТАЖ",
        sub: "ДНЕВНА И ОБЩИ ПОМЕЩЕНИЯ",
        items: [
          {
            icon: "bed",
            kicker: "ДНЕВНА",
            title: "УДОБНА МЕКА МЕБЕЛ, МАСА, ТЕЛЕВИЗОР",
            chips: ["ДИВАН ЗА ДВАМА", "КЛИМАТИК", "TV"],
          },
          {
            icon: "fork",
            kicker: "ТРАПЕЗАРИЯ",
            title: "ПРОСТОРНА ТРАПЕЗАРИЯ ЗА ХРАНЕНЕ",
            chips: [],
          },
          {
            icon: "kitchen",
            kicker: "КУХНЯ",
            title: "НАПЪЛНО ОБОРУДВАНА С ВСИЧКИ УРЕДИ",
            chips: [],
          },
          {
            icon: "bath",
            kicker: "БАНЯ",
            title: "БАНЯ И ТОАЛЕТНА",
            chips: [],
          },
        ],
      },
      {
        n: "2",
        title: "ВТОРИ ЕТАЖ",
        sub: "2 ДВОЙНИ СТАИ + ТЕРАСА",
        items: [
          {
            icon: "bed",
            kicker: "СТАЯ 1",
            title: "ДВОЙНО ЛЕГЛО",
            chips: ["ДВОЙНО ЛЕГЛО", "TV"],
          },
          {
            icon: "bed",
            kicker: "СТАЯ 2",
            title: "2 ЕДИНИЧНИ ЛЕГЛА",
            chips: ["2 ЛЕГЛА", "TV"],
          },
          {
            icon: "terrace",
            kicker: "ТЕРАСА",
            title: "ЦЕЛОГОДИШНА С ОТОПЛЕНИЕ",
            chips: ["МАСА", "ОТОПЛЕНИЕ", "ПУШЕНЕТО ПОЗВОЛЕНО"],
          },
          {
            icon: "bath",
            kicker: "БАНЯ",
            title: "БАНЯ И ТОАЛЕТНА",
            chips: [],
          },
        ],
      },
      {
        n: "3",
        title: "ТРЕТИ ЕТАЖ",
        sub: "ФАМИЛНА СТАЯ ЗА 4 ГОСТИ",
        items: [
          {
            icon: "bed",
            kicker: "ФАМИЛНА СТАЯ",
            title: "ПРОСТОРНА СТАЯ С ТЕРАСА",
            chips: ["1 ДВОЙНО", "2 ЕДИНИЧНИ", "КЛИМАТИК", "TV", "ТЕРАСА"],
          },
        ],
      },
    ];
  
    function render() {
      mount.innerHTML = DATA.map((floor) => {
        const itemsHtml = floor.items.map((it) => {
          const chips = (it.chips || []).map((c) => `<span class="roomChip">${c}</span>`).join("");
          return `
            <div class="roomItem">
              <div class="roomIcon" aria-hidden="true">${ICONS[it.icon] || ICONS.bed}</div>
              <div class="roomMeta">
                <div class="roomMeta__kicker">${it.kicker}</div>
                <div class="roomMeta__title">${it.title}</div>
                ${chips ? `<div class="roomChips">${chips}</div>` : ``}
              </div>
            </div>
          `;
        }).join("");
  
        return `
          <article class="floorCard">
            <header class="floorCard__head">
              <div class="floorBadge" aria-hidden="true">${floor.n}</div>
              <div>
                <h3 class="floorTitle">${floor.title}</h3>
                <div class="floorSub">${floor.sub}</div>
              </div>
            </header>
            <div class="floorCard__body">
              ${itemsHtml}
            </div>
          </article>
        `;
      }).join("");
    }
  
    render();
  })();
// =====================
// BOOKING / РЕЗЕРВАЦИЯ
// - calendar (range select)
// - price per nights (EUR + ~BGN)
// - clear X button
// - enables submit only when range is selected
// =====================
(function initBooking() {
    const root = document.getElementById("rezervacia");
    if (!root) return;
  
    // calendar refs
    const monthEl = document.getElementById("calMonth");
    const gridEl = document.getElementById("calGrid");
    const prevBtn = document.getElementById("calPrev");
    const nextBtn = document.getElementById("calNext");
  
    // ui refs
    const hint = document.getElementById("bkHint");
    const priceBar = document.getElementById("bkPrice");
    const fromText = document.getElementById("bkFromText");
    const toText = document.getElementById("bkToText");
    const nightsText = document.getElementById("bkNights");
    const eurText = document.getElementById("bkEur");
    const bgnText = document.getElementById("bkBgn");
    const clearBtn = document.getElementById("bkClear");
  
    // form refs
    const checkinEl = document.getElementById("bkCheckin");
    const checkoutEl = document.getElementById("bkCheckout");
    const submitBtn = document.getElementById("bkSubmit");
    const noteEl = document.getElementById("bkNote");
    const form = document.getElementById("bookingForm");
  
    if (!monthEl || !gridEl || !prevBtn || !nextBtn) return;
  
    // =====================
    // SETTINGS
    // =====================
    const BG_MONTHS = [
      "ЯНУАРИ",
      "ФЕВРУАРИ",
      "МАРТ",
      "АПРИЛ",
      "МАЙ",
      "ЮНИ",
      "ЮЛИ",
      "АВГУСТ",
      "СЕПТЕМВРИ",
      "ОКТОМВРИ",
      "НОЕМВРИ",
      "ДЕКЕМВРИ",
    ];
  
    const BG_MONTHS_SHORT = ["ЯНУ", "ФЕВ", "МАР", "АПР", "МАЙ", "ЮНИ", "ЮЛИ", "АВГ", "СЕП", "ОКТ", "НОЕ", "ДЕК"];
  
    // PRICING
    const FX_EUR_TO_BGN = 1.95583; // фиксиран курс
    const DEFAULT_NIGHT_EUR = 95; // базова цена/нощ в евро (редактирай)
  
    // Ако искаш: уикенд +10€
    function pricePerNightEUR(dateObj) {
      const day = dateObj.getDay(); // Sun=0..Sat=6
      const isWeekend = day === 5 || day === 6; // Fri/Sat
      return DEFAULT_NIGHT_EUR + (isWeekend ? 10 : 0);
    }
  
    // =====================
    // HELPERS
    // =====================
    const today = new Date();
  
    const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  
    const fmtISO = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${da}`;
    };
  
    const fmtShortBG = (d) => `${d.getDate()} ${BG_MONTHS_SHORT[d.getMonth()]}`;
  
    // Monday-first index: JS Sun=0..Sat=6 -> Mon=0..Sun=6
    const mondayFirstIndex = (jsDay) => (jsDay + 6) % 7;
  
    function isSame(a, b) {
      return (
        a &&
        b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
      );
    }
  
    function nightsBetween(a, b) {
      const ms = 24 * 60 * 60 * 1000;
      return Math.round((atMidnight(b).getTime() - atMidnight(a).getTime()) / ms);
    }
  
    function calcTotalEUR(startDate, endDate) {
      let total = 0;
      const n = nightsBetween(startDate, endDate);
      for (let i = 0; i < n; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        total += pricePerNightEUR(d);
      }
      return total;
    }
  
    function setHint(text) {
      if (!hint) return;
      const t = hint.querySelector(".bkHint__text");
      if (t) t.textContent = text || "";
    }
  
    // =====================
    // STATE
    // =====================
    let view = new Date(today.getFullYear(), today.getMonth(), 1);
    let start = null; // Date (midnight)
    let end = null; // Date (midnight)
  
    // (по желание) блокирани дати - пример:
    // const DISABLED = new Set(["2026-01-01","2026-01-02"]);
    const DISABLED = new Set([]);
  
    function isDisabled(d) {
      const md = atMidnight(d);
      if (md.getTime() < atMidnight(today).getTime()) return true; // минали дни
      return DISABLED.has(fmtISO(md));
    }
  
    function isInRange(d) {
      if (!start || !end) return false;
      const t = d.getTime();
      return t > start.getTime() && t < end.getTime();
    }
  
    // =====================
    // UI UPDATE
    // =====================
    function updateUI() {
      const hasRange = !!(start && end);
  
      // hidden inputs
      if (checkinEl) checkinEl.value = start ? fmtISO(start) : "";
      if (checkoutEl) checkoutEl.value = end ? fmtISO(end) : "";
  
      // submit enable
      if (submitBtn) submitBtn.disabled = !hasRange;
  
      // hint vs price bar
      if (hint) hint.hidden = hasRange;
      if (priceBar) priceBar.hidden = !hasRange;
  
      if (!hasRange) {
        if (noteEl) noteEl.textContent = "";
        setHint("ИЗБЕРЕТЕ ДАТИ ЗА ДА ВИДИТЕ ЦЕНА");
        return;
      }
  
      const n = nightsBetween(start, end);
      const totalEUR = calcTotalEUR(start, end);
      const totalBGN = totalEUR * FX_EUR_TO_BGN;
  
      if (fromText) fromText.textContent = fmtShortBG(start);
      if (toText) toText.textContent = fmtShortBG(end);
      if (nightsText) nightsText.textContent = String(n);
  
      if (eurText) eurText.textContent = String(Math.round(totalEUR));
      if (bgnText) bgnText.textContent = String(Math.round(totalBGN));
  
      if (noteEl) noteEl.textContent = `Избрани дати: ${fmtISO(start)} → ${fmtISO(end)} (${n} нощи)`;
    }
  
    // =====================
    // RENDER CALENDAR
    // =====================
    function render() {
      const y = view.getFullYear();
      const m = view.getMonth();
  
      monthEl.textContent = `${BG_MONTHS[m]} ${y}`;
  
      const first = new Date(y, m, 1);
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const offset = mondayFirstIndex(first.getDay()); // 0..6
  
      const cells = [];
      for (let i = 0; i < offset; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  
      gridEl.innerHTML = cells
        .map((d) => {
          if (!d) return `<div class="calDay is-muted" aria-hidden="true"></div>`;
  
          const disabled = isDisabled(d);
          const classes = [
            "calDay",
            disabled ? "is-disabled" : "",
            isSame(d, atMidnight(today)) ? "is-today" : "",
            start && isSame(d, start) ? "is-start" : "",
            end && isSame(d, end) ? "is-end" : "",
            isInRange(d) ? "is-inrange" : "",
          ]
            .filter(Boolean)
            .join(" ");
  
          return `<button type="button" class="${classes}" data-date="${fmtISO(d)}">${d.getDate()}</button>`;
        })
        .join("");
  
      // bind day clicks
      gridEl.querySelectorAll("button.calDay").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.classList.contains("is-disabled")) return;
  
          const pickedStr = btn.dataset.date;
          if (!pickedStr) return;
  
          const picked = new Date(pickedStr + "T00:00:00");
          const p = atMidnight(picked);
  
          // selection logic: start -> end (range)
          if (!start || (start && end)) {
            start = p;
            end = null;
          } else {
            if (p.getTime() < start.getTime()) {
              end = start;
              start = p;
            } else if (p.getTime() === start.getTime()) {
              start = p;
              end = null;
            } else {
              end = p;
            }
          }
  
          updateUI();
          render();
        });
      });
    }
  
    // =====================
    // NAV
    // =====================
    prevBtn.addEventListener("click", () => {
      view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
      render();
    });
  
    nextBtn.addEventListener("click", () => {
      view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      render();
    });
  
    // Clear selection
    clearBtn?.addEventListener("click", () => {
      start = null;
      end = null;
      updateUI();
      render();
    });
  
    // init
    updateUI();
    render();
  
    // =====================
    // SUBMIT (frontend demo)
    // =====================
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!(start && end)) return;
  
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
  
      // ✅ Тук връзваш backend / email / whatsapp
      // demo message:
      const n = nightsBetween(start, end);
      const totalEUR = calcTotalEUR(start, end);
      const totalBGN = totalEUR * FX_EUR_TO_BGN;
  
      if (noteEl) {
        noteEl.textContent = `Заявката е подготвена ✅ (${payload.checkin} → ${payload.checkout}, ${n} нощи) • ~${Math.round(
          totalBGN
        )} лв`;
      }
  
      // Пример за mailto:
      // const subject = encodeURIComponent("Заявка за резервация");
      // const body = encodeURIComponent(
      //   `Име: ${payload.name}\nТелефон: ${payload.phone}\nEmail: ${payload.email}\nГости: ${payload.guests}\nДати: ${payload.checkin} → ${payload.checkout}\nНощи: ${n}\nЦена: ${Math.round(totalEUR)}€ (~${Math.round(totalBGN)} лв)\nСъобщение: ${payload.message || ""}`
      // );
      // window.location.href = `mailto:denislavrangelov@abv.bg?subject=${subject}&body=${body}`;
    });
  })();

  
  // =====================
// ROOMS STATS COUNT-UP (on scroll into view)
// - counts numbers inside .countUp[data-count]
// - starts ONLY when #stai enters viewport (once)
// =====================
(function initRoomsCountUp() {
    const section = document.getElementById("stai");
    if (!section) return;
  
    const els = Array.from(section.querySelectorAll(".countUp[data-count]"));
    if (!els.length) return;
  
    const prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  
    // set initial to 0 (so it doesn't show old values)
    els.forEach((el) => (el.textContent = "0"));
  
    function animateCount(el, to, durationMs = 900) {
      const start = performance.now();
      const from = 0;
  
      const step = (now) => {
        const t = Math.min(1, (now - start) / durationMs);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(from + (to - from) * eased);
        el.textContent = String(val);
  
        if (t < 1) requestAnimationFrame(step);
      };
  
      requestAnimationFrame(step);
    }
  
    function run() {
      // ако user има reduce motion -> сетваме директно
      if (prefersReduce) {
        els.forEach((el) => (el.textContent = String(parseInt(el.dataset.count || "0", 10))));
        return;
      }
  
      // staggered start (приятно изглежда)
      els.forEach((el, i) => {
        const to = parseInt(el.dataset.count || "0", 10);
        setTimeout(() => animateCount(el, to, 850 + i * 80), i * 120);
      });
    }
  
    // run once when section is visible
    let done = false;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!done && e.isIntersecting) {
          done = true;
          run();
          obs.disconnect();
        }
      },
      {
        threshold: 0.25,
        rootMargin: "0px 0px -15% 0px",
      }
    );
  
    obs.observe(section);
  })();
  


  // =====================
// Smooth scroll + Back-to-top
// =====================
(function initSmoothScrollAndTopBtn() {
    const topBtn = document.getElementById("scrollTopBtn");
  
    // show/hide top button
    function onScroll() {
      if (!topBtn) return;
      topBtn.classList.toggle("is-show", window.scrollY > 320);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  
    // click top button -> smooth to top
    topBtn?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  
    // smooth scroll to anchors with header offset
    function getHeaderOffset() {
      const topbar = document.querySelector(".topbar");
      // ако topbar съществува, взимаме реалната му височина
      const h = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 0;
      return h + 16; // малко въздух
    }
  
    function smoothScrollToId(id) {
      const el = document.getElementById(id);
      if (!el) return;
  
      const offset = getHeaderOffset();
      const y = window.scrollY + el.getBoundingClientRect().top - offset;
  
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
  
    // delegate click for all internal anchors
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
  
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
  
      const id = href.slice(1);
      if (!id) return;
  
      const target = document.getElementById(id);
      if (!target) return;
  
      // prevent default jump
      e.preventDefault();
  
      // close mobile menu if you have it (your existing function names)
      // ако твоят код има closeMenu() в scope — това ще работи; иначе няма да пречи
      try {
        if (document.getElementById("mobileMenu")?.classList.contains("is-open") && typeof closeMenu === "function") {
          closeMenu();
        }
      } catch (_) {}
  
      // update URL hash (без да скача)
      history.pushState(null, "", `#${id}`);
  
      smoothScrollToId(id);
    });
  
    // if page loads with hash, smooth scroll to it (after layout)
    window.addEventListener("load", () => {
      const hash = (location.hash || "").replace("#", "");
      if (!hash) return;
      const target = document.getElementById(hash);
      if (!target) return;
  
      // малък timeout да се подредят секциите
      setTimeout(() => smoothScrollToId(hash), 60);
    });
  })();
  