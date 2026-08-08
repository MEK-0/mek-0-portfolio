const themeToggle = document.querySelector("#theme-toggle");

const updateThemeControl = (theme) => {
  if (!themeToggle) {
    return;
  }

  const darkModeActive = theme === "dark";
  themeToggle.querySelector(".theme-icon").textContent = darkModeActive ? "☀" : "☾";
  themeToggle.querySelector(".theme-label").textContent = darkModeActive ? "LIGHT" : "DARK";
  themeToggle.setAttribute(
    "aria-label",
    darkModeActive ? "Switch to light mode" : "Switch to dark mode"
  );
};

const applyTheme = (theme, persist = false) => {
  document.documentElement.dataset.theme = theme;
  updateThemeControl(theme);

  if (persist) {
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch (error) {
      // The visual theme still applies when storage is unavailable.
    }
  }
};

applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
  });
}

document.querySelectorAll("a").forEach((link) => {
  Array.from(link.childNodes).forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.includes("↗")) {
      return;
    }

    const fragments = node.textContent.split("↗");
    const replacement = document.createDocumentFragment();

    fragments.forEach((fragment, index) => {
      replacement.append(document.createTextNode(fragment));

      if (index < fragments.length - 1) {
        const arrow = document.createElement("span");
        arrow.className = "external-arrow";
        arrow.textContent = "↗";
        replacement.append(arrow);
      }
    });

    node.replaceWith(replacement);
  });
});

document
  .querySelectorAll('a[href^="#"]')
  .forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      if (!href || href === "#") {
        event.preventDefault();
        return;
      }

      if (!href.startsWith("#")) {
        return;
      }

      const target = document.querySelector(href);

      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    });
  });

const prepareDeferredImages = (selector) => {
  document.querySelectorAll(selector).forEach((image) => {
    const container = image.parentElement;

    if (!container) {
      return;
    }

    const revealImage = () => {
      image.hidden = false;
      container.classList.add("has-image");
    };

    const keepFallback = () => {
      image.hidden = true;
      container.classList.remove("has-image");
    };

    if (image.complete) {
      if (image.naturalWidth > 0) {
        revealImage();
      } else {
        keepFallback();
      }
      return;
    }

    image.addEventListener("load", revealImage, { once: true });
    image.addEventListener("error", keepFallback, { once: true });
  });
};

prepareDeferredImages(".project-media img, .highlight-image-wrap img");

const highlightLightbox = document.querySelector("#highlight-lightbox");
const highlightLightboxImage = document.querySelector("#highlight-lightbox-image");
const highlightLightboxTitle = document.querySelector("#highlight-lightbox-title");
const highlightLightboxPlaceholder = document.querySelector("#lightbox-placeholder");
const highlightCloseButton = document.querySelector(".lightbox-close");
let activeHighlightTrigger = null;

const closeHighlightLightbox = () => {
  if (!highlightLightbox || highlightLightbox.hidden) {
    return;
  }

  highlightLightbox.hidden = true;
  document.body.classList.remove("lightbox-open");

  if (highlightLightboxImage) {
    highlightLightboxImage.hidden = true;
    highlightLightboxImage.removeAttribute("src");
  }

  if (activeHighlightTrigger) {
    activeHighlightTrigger.focus();
    activeHighlightTrigger = null;
  }
};

if (
  highlightLightbox &&
  highlightLightboxImage &&
  highlightLightboxTitle &&
  highlightLightboxPlaceholder &&
  highlightCloseButton
) {
  document.querySelectorAll(".highlight-open").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const sourceImage = trigger.querySelector(".highlight-image-wrap img");
      const title = trigger.dataset.title || "Highlight";
      const imageAvailable = sourceImage && sourceImage.complete && sourceImage.naturalWidth > 0;

      activeHighlightTrigger = trigger;
      highlightLightboxTitle.textContent = title;
      highlightLightboxPlaceholder.hidden = imageAvailable;

      if (imageAvailable) {
        highlightLightboxImage.src = sourceImage.currentSrc || sourceImage.src;
        highlightLightboxImage.alt = sourceImage.alt || title;
        highlightLightboxImage.hidden = false;
      } else {
        highlightLightboxImage.hidden = true;
      }

      highlightLightbox.hidden = false;
      document.body.classList.add("lightbox-open");
      highlightCloseButton.focus();
    });
  });

  highlightCloseButton.addEventListener("click", closeHighlightLightbox);

  highlightLightbox.addEventListener("click", (event) => {
    if (event.target === highlightLightbox) {
      closeHighlightLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !highlightLightbox.hidden) {
      closeHighlightLightbox();
    }
  });
}

const pinnedMotionQuery = window.matchMedia(
  "(min-width: 769px) and (prefers-reduced-motion: no-preference)"
);
const topbar = document.querySelector(".topbar");

const initPinnedHorizontalSection = ({ section, viewport, track }) => {
  if (!section || !viewport || !track) {
    return;
  }

  let sectionTop = 0;
  let scrollRange = 0;
  let horizontalOverflow = 0;
  let scrollFrameRequested = false;
  let layoutFrameRequested = false;

  const clamp = (value, minimum, maximum) =>
    Math.min(Math.max(value, minimum), maximum);

  const render = () => {
    scrollFrameRequested = false;

    if (!section.classList.contains("is-scroll-driven")) {
      return;
    }

    const progress = scrollRange > 0
      ? clamp((window.scrollY - sectionTop) / scrollRange, 0, 1)
      : 0;
    const translateX = -progress * horizontalOverflow;

    track.style.transform =
      `translate3d(${translateX}px, 0, 0)`;
  };

  const requestRender = () => {
    if (!scrollFrameRequested) {
      scrollFrameRequested = true;
      window.requestAnimationFrame(render);
    }
  };

  const measure = () => {
    layoutFrameRequested = false;

    if (!pinnedMotionQuery.matches) {
      section.classList.remove("is-scroll-driven");
      section.style.removeProperty("--pinned-scroll-height");
      track.style.removeProperty("transform");
      sectionTop = 0;
      scrollRange = 0;
      horizontalOverflow = 0;
      return;
    }

    const navHeight = topbar ? topbar.offsetHeight : 80;
    const availableStickyHeight = Math.max(1, window.innerHeight - navHeight);

    document.documentElement.style.setProperty("--nav-height", `${navHeight}px`);
    section.classList.add("is-scroll-driven");
    track.style.transform = "translate3d(0, 0, 0)";

    horizontalOverflow = Math.max(
      0,
      track.scrollWidth - viewport.clientWidth
    );

    section.style.setProperty(
      "--pinned-scroll-height",
      `${availableStickyHeight + horizontalOverflow}px`
    );

    sectionTop = section.getBoundingClientRect().top + window.scrollY - navHeight;
    scrollRange = Math.max(0, section.offsetHeight - availableStickyHeight);
    requestRender();
  };

  const requestMeasure = () => {
    if (!layoutFrameRequested) {
      layoutFrameRequested = true;
      window.requestAnimationFrame(measure);
    }
  };

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestMeasure, { passive: true });
  window.addEventListener("load", requestMeasure, { once: true });
  window.addEventListener("pageshow", requestMeasure);
  pinnedMotionQuery.addEventListener("change", requestMeasure);

  section.querySelectorAll("img").forEach((image) => {
    if (!image.complete) {
      image.addEventListener("load", requestMeasure, { once: true });
    }
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(requestMeasure);
  }

  requestMeasure();
};

initPinnedHorizontalSection({
  section: document.querySelector(".projects-scroll-section"),
  viewport: document.querySelector(".projects-viewport"),
  track: document.querySelector(".projects-track")
});

initPinnedHorizontalSection({
  section: document.querySelector(".highlights-scroll-section"),
  viewport: document.querySelector(".highlights-viewport"),
  track: document.querySelector(".highlights-track")
});

const contactForm = document.querySelector("#contact-form");
const contactStatus = document.querySelector("#contact-status");

if (contactForm && contactStatus) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message || !contactForm.checkValidity()) {
      contactStatus.textContent = "Please complete your name, a valid email, and a message.";
      contactForm.reportValidity();
      return;
    }

    const subject = encodeURIComponent(`Portfolio contact from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );

    contactStatus.textContent = "Opening your mail application…";
    window.location.href =
      `mailto:esat.kolay19@gmail.com?subject=${subject}&body=${body}`;
  });
}
