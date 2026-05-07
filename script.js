const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll("[data-nav-link]");
const revealTargets = document.querySelectorAll("[data-reveal]");
const carousels = document.querySelectorAll("[data-carousel]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("is-nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("is-nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

carousels.forEach((carousel) => {
  const slides = [...carousel.querySelectorAll(".project-carousel__slide")];
  const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
  const prevButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");

  if (slides.length <= 1) return;

  let currentIndex = 0;
  let autoplayId = null;

  const setActiveSlide = (nextIndex) => {
    currentIndex = (nextIndex + slides.length) % slides.length;

    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === currentIndex);
    });

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
    });
  };

  const stopAutoplay = () => {
    if (!autoplayId) return;
    window.clearInterval(autoplayId);
    autoplayId = null;
  };

  const startAutoplay = () => {
    if (prefersReducedMotion.matches) return;
    stopAutoplay();
    autoplayId = window.setInterval(() => {
      setActiveSlide(currentIndex + 1);
    }, 4200);
  };

  prevButton?.addEventListener("click", () => {
    setActiveSlide(currentIndex - 1);
    startAutoplay();
  });

  nextButton?.addEventListener("click", () => {
    setActiveSlide(currentIndex + 1);
    startAutoplay();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      setActiveSlide(index);
      startAutoplay();
    });
  });

  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);
  carousel.addEventListener("focusin", stopAutoplay);
  carousel.addEventListener("focusout", startAutoplay);

  startAutoplay();
});

if (prefersReducedMotion.matches) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -40px",
    },
  );

  revealTargets.forEach((target) => observer.observe(target));
}
