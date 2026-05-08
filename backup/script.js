const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll("[data-nav-link]");
const filterButtons = document.querySelectorAll("[data-filter]");
const projectCards = document.querySelectorAll(".project-card");
const projectShowcase = document.querySelector("#project-showcase");
const previewModal = document.querySelector("#project-preview-modal");
const previewCloseButtons = document.querySelectorAll("[data-close-preview]");
const showcaseMedia = document.querySelector("#showcase-media");
const showcaseLabel = document.querySelector("#showcase-label");
const showcaseTitle = document.querySelector("#showcase-title");
const showcaseCopy = document.querySelector("#showcase-copy");
const showcaseActions = document.querySelector("#showcase-actions");
const featurePreviews = document.querySelectorAll(".preview[data-asset-base]");
const revealTargets = document.querySelectorAll(".reveal");
const sections = document.querySelectorAll("[data-section]");

const assetPresenceCache = new Map();
const assetSourceCache = new Map();
const carouselRegistry = new WeakMap();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const projectAssetRoot = new URL("../assets/projects/", window.location.href).href;
const assetBaseAliases = {
  "prism-gameplay": "prism",
};

let activeProjectCard = null;
let pinnedProjectCard = null;
let hoverIntentTimer = null;
let showcaseRenderToken = 0;

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
    closeProjectPreview();
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");

    projectCards.forEach((card) => {
      const category = card.dataset.category;
      const shouldShow = filter === "all" || category === filter;
      card.classList.toggle("is-hidden", !shouldShow);
    });

    clearHoverIntent();

    if (pinnedProjectCard?.classList.contains("is-hidden")) {
      closeProjectPreview();
    }

    const visibleCards = [...projectCards].filter((card) => !card.classList.contains("is-hidden"));
    const nextActiveCard =
      pinnedProjectCard ??
      visibleCards.find((card) => card === activeProjectCard) ??
      visibleCards[0];

    if (nextActiveCard) {
      setActiveProjectCard(nextActiveCard, Boolean(pinnedProjectCard));
    }
  });
});

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPosterMarkup(variant) {
  return `
    <div class="showcase-poster showcase-poster--${variant}">
      <div class="showcase-poster__window">
        <div class="showcase-poster__bar"></div>
        <div class="showcase-poster__notes">
          <span>BUILD</span>
          <span>FOCUS</span>
          <span>PREVIEW</span>
        </div>
        <div class="showcase-poster__lines">
          <i></i><i></i><i></i><i></i>
        </div>
      </div>
    </div>
  `;
}

function getCarouselMarkup(sources, alt) {
  const safeAlt = escapeHtml(alt);
  const total = sources.length;

  return `
    <div class="media-carousel${total > 1 ? " is-multi" : ""}" data-carousel data-interval="4200">
      <div class="media-carousel__slides">
        ${sources
          .map(
            (src, index) => `
              <figure class="media-carousel__slide${index === 0 ? " is-active" : ""}" data-carousel-slide>
                <img
                  class="media-carousel__backdrop"
                  src="${src}"
                  alt=""
                  aria-hidden="true"
                  ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
                  decoding="async"
                />
                <div class="media-carousel__frame">
                  <div class="media-carousel__viewport">
                    <img
                      class="media-carousel__image"
                      src="${src}"
                      alt="${safeAlt}"
                      ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
                      decoding="async"
                    />
                  </div>
                </div>
              </figure>
            `,
          )
          .join("")}
      </div>
      ${
        total > 1
          ? `
            <button class="media-carousel__arrow media-carousel__arrow--prev" type="button" data-carousel-prev aria-label="이전 이미지">
              <span aria-hidden="true">&#8249;</span>
            </button>
            <button class="media-carousel__arrow media-carousel__arrow--next" type="button" data-carousel-next aria-label="다음 이미지">
              <span aria-hidden="true">&#8250;</span>
            </button>
            <div class="media-carousel__count" data-carousel-count>1 / ${total}</div>
          `
          : ""
      }
    </div>
  `;
}

function clearHoverIntent() {
  if (!hoverIntentTimer) return;
  window.clearTimeout(hoverIntentTimer);
  hoverIntentTimer = null;
}

function assetExists(path) {
  if (assetPresenceCache.has(path)) {
    return assetPresenceCache.get(path);
  }

  const request = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = path;
  });

  assetPresenceCache.set(path, request);
  return request;
}

async function resolveAssetSources(base) {
  if (!base) return [];

  if (assetSourceCache.has(base)) {
    return assetSourceCache.get(base);
  }

  const request = (async () => {
    const normalizedBase = assetBaseAliases[base] ?? base;
    const numberedSources = [];

    for (let index = 1; index <= 6; index += 1) {
      const candidate = `${projectAssetRoot}${normalizedBase}-${index}.webp`;
      if (await assetExists(candidate)) {
        numberedSources.push(candidate);
        continue;
      }
      break;
    }

    if (numberedSources.length) {
      return numberedSources;
    }

    const singleCandidates = [
      `${projectAssetRoot}${normalizedBase}.webp`,
      `${projectAssetRoot}${normalizedBase}.png`,
      `${projectAssetRoot}${normalizedBase}.jpg`,
      `${projectAssetRoot}${normalizedBase}.jpeg`,
      `${projectAssetRoot}${normalizedBase}.avif`,
    ];

    for (const candidate of singleCandidates) {
      if (await assetExists(candidate)) {
        return [candidate];
      }
    }

    return [];
  })();

  assetSourceCache.set(base, request);
  return request;
}

function destroyCarousels(root) {
  root.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const cleanup = carouselRegistry.get(carousel);
    cleanup?.();
    carouselRegistry.delete(carousel);
  });
}

function setupCarousel(carousel) {
  if (carouselRegistry.has(carousel)) return;

  const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
  if (!slides.length) return;

  const prevButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const countLabel = carousel.querySelector("[data-carousel-count]");
  const intervalMs = Number(carousel.dataset.interval || 4200);
  let currentIndex = Math.max(
    0,
    slides.findIndex((slide) => slide.classList.contains("is-active")),
  );
  let timerId = null;

  const updateCarousel = () => {
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === currentIndex);
    });

    if (countLabel) {
      countLabel.textContent = `${currentIndex + 1} / ${slides.length}`;
    }
  };

  const stopAuto = () => {
    if (!timerId) return;
    window.clearInterval(timerId);
    timerId = null;
  };

  const startAuto = () => {
    if (slides.length <= 1 || prefersReducedMotion.matches) return;
    stopAuto();
    timerId = window.setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      updateCarousel();
    }, intervalMs);
  };

  const moveCarousel = (direction) => {
    currentIndex = (currentIndex + direction + slides.length) % slides.length;
    updateCarousel();
    startAuto();
  };

  const onPrevClick = () => moveCarousel(-1);
  const onNextClick = () => moveCarousel(1);
  const onMouseEnter = () => stopAuto();
  const onMouseLeave = () => startAuto();
  const onFocusIn = () => stopAuto();
  const onFocusOut = () => {
    window.setTimeout(() => {
      if (!carousel.contains(document.activeElement)) {
        startAuto();
      }
    }, 0);
  };

  prevButton?.addEventListener("click", onPrevClick);
  nextButton?.addEventListener("click", onNextClick);
  carousel.addEventListener("mouseenter", onMouseEnter);
  carousel.addEventListener("mouseleave", onMouseLeave);
  carousel.addEventListener("focusin", onFocusIn);
  carousel.addEventListener("focusout", onFocusOut);

  updateCarousel();
  startAuto();

  carouselRegistry.set(carousel, () => {
    stopAuto();
    prevButton?.removeEventListener("click", onPrevClick);
    nextButton?.removeEventListener("click", onNextClick);
    carousel.removeEventListener("mouseenter", onMouseEnter);
    carousel.removeEventListener("mouseleave", onMouseLeave);
    carousel.removeEventListener("focusin", onFocusIn);
    carousel.removeEventListener("focusout", onFocusOut);
  });
}

function setupCarouselsIn(root) {
  root.querySelectorAll("[data-carousel]").forEach((carousel) => {
    setupCarousel(carousel);
  });
}

async function enhanceFeaturePreviews() {
  await Promise.all(
    [...featurePreviews].map(async (preview) => {
      const assetBase = preview.dataset.assetBase;
      const sources = await resolveAssetSources(assetBase);

      if (!sources.length) return;

      const alt =
        preview.dataset.assetAlt ??
        preview.closest(".feature__inner")?.querySelector("h2")?.textContent?.trim() ??
        "Project preview";

      preview.insertAdjacentHTML(
        "beforeend",
        `<div class="preview-media-layer">${getCarouselMarkup(sources, alt)}</div>`,
      );
      preview.classList.add("has-real-media");
      setupCarouselsIn(preview);
    }),
  );
}

async function setShowcaseContent(card) {
  const renderToken = ++showcaseRenderToken;

  if (showcaseLabel) {
    showcaseLabel.textContent = card.dataset.previewLabel ?? "";
  }

  if (showcaseTitle) {
    showcaseTitle.textContent = card.dataset.previewTitle ?? card.querySelector("h3")?.textContent ?? "";
  }

  if (showcaseCopy) {
    showcaseCopy.textContent = card.dataset.previewCopy ?? "";
  }

  if (showcaseActions) {
    const actionsMarkup = card.querySelector(".project-card__actions")?.innerHTML?.trim() ?? "";
    showcaseActions.innerHTML = actionsMarkup;
    showcaseActions.hidden = !actionsMarkup;
  }

  if (!showcaseMedia) return;

  destroyCarousels(showcaseMedia);

  if (card.dataset.previewType === "video" && card.dataset.previewSrc) {
    showcaseMedia.innerHTML = `
      <div class="showcase-video">
        <iframe
          src="${card.dataset.previewSrc}"
          title="${escapeHtml(card.dataset.previewTitle ?? "Project preview")}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    `;
    return;
  }

  showcaseMedia.innerHTML = getPosterMarkup(card.dataset.previewVariant ?? "game-library");

  const assetBase = card.dataset.previewAssetBase;
  if (!assetBase) return;

  const sources = await resolveAssetSources(assetBase);
  if (renderToken !== showcaseRenderToken || !sources.length) return;

  destroyCarousels(showcaseMedia);
  showcaseMedia.innerHTML = getCarouselMarkup(
    sources,
    card.dataset.previewTitle ?? card.querySelector("h3")?.textContent ?? "Project preview",
  );
  setupCarouselsIn(showcaseMedia);
}

function setActiveProjectCard(card, interacting = true) {
  activeProjectCard = card;

  projectCards.forEach((item) => {
    item.classList.toggle("is-active", item === card);
    item.classList.toggle("is-pinned", item === pinnedProjectCard);
  });

  if (projectShowcase) {
    projectShowcase.classList.toggle("is-interacting", interacting);
    projectShowcase.classList.toggle("is-locked", Boolean(pinnedProjectCard));
  }

  void setShowcaseContent(card);
}

function previewProjectCard(card, interacting = true) {
  if (pinnedProjectCard && pinnedProjectCard !== card) return;
  setActiveProjectCard(card, interacting);
}

function openProjectPreview(card) {
  clearHoverIntent();
  pinnedProjectCard = card;
  setActiveProjectCard(card, true);
  previewModal?.setAttribute("aria-hidden", "false");
  body.classList.add("preview-open");
}

function closeProjectPreview() {
  clearHoverIntent();
  previewModal?.setAttribute("aria-hidden", "true");
  body.classList.remove("preview-open");
  pinnedProjectCard = null;

  if (activeProjectCard) {
    setActiveProjectCard(activeProjectCard, false);
  }
}

projectCards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    clearHoverIntent();

    if (pinnedProjectCard && pinnedProjectCard !== card) return;

    previewProjectCard(card, true);
  });

  card.addEventListener("mouseleave", () => {
    clearHoverIntent();
  });

  card.addEventListener("focusin", () => {
    clearHoverIntent();
    previewProjectCard(card, true);
  });

  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    openProjectPreview(card);
  });
});

if (projectShowcase) {
  projectShowcase.addEventListener("mouseleave", () => {
    clearHoverIntent();
    if (!pinnedProjectCard && activeProjectCard) {
      setActiveProjectCard(activeProjectCard, false);
    }
  });
}

previewCloseButtons.forEach((button) => {
  button.addEventListener("click", closeProjectPreview);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && previewModal?.getAttribute("aria-hidden") === "false") {
    closeProjectPreview();
  }
});

window.addEventListener("hashchange", () => {
  if (previewModal?.getAttribute("aria-hidden") === "false") {
    closeProjectPreview();
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    rootMargin: "0px 0px -12% 0px",
    threshold: 0.15,
  },
);

revealTargets.forEach((target) => revealObserver.observe(target));

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const currentId = entry.target.id;

      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        link.classList.toggle("is-active", href === `#${currentId}`);
      });
    });
  },
  {
    threshold: 0.3,
    rootMargin: "-20% 0px -60% 0px",
  },
);

sections.forEach((section) => navObserver.observe(section));

const initialCard = [...projectCards].find((card) => card.classList.contains("is-active")) ?? projectCards[0];
if (initialCard) {
  setActiveProjectCard(initialCard, false);
}

void enhanceFeaturePreviews();
