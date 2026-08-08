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

prepareDeferredImages(".project-media img, .gallery-item img");

const projectsSection = document.querySelector(".projects-scroll-section");
const projectsViewport = document.querySelector(".projects-viewport");
const projectsTrack = document.querySelector(".projects-track");
const projectsMotionQuery = window.matchMedia(
  "(min-width: 769px) and (prefers-reduced-motion: no-preference)"
);

if (projectsSection && projectsViewport && projectsTrack) {
  let sectionTop = 0;
  let scrollRange = 0;
  let horizontalOverflow = 0;
  let scrollFrameRequested = false;
  let layoutFrameRequested = false;

  const clamp = (value, minimum, maximum) =>
    Math.min(Math.max(value, minimum), maximum);

  const renderProjects = () => {
    scrollFrameRequested = false;

    if (!projectsSection.classList.contains("is-scroll-driven")) {
      return;
    }

    const progress = scrollRange > 0
      ? clamp((window.scrollY - sectionTop) / scrollRange, 0, 1)
      : 0;
    const translateX = -progress * horizontalOverflow;

    projectsTrack.style.transform =
      `translate3d(${translateX}px, 0, 0)`;
  };

  const requestProjectsRender = () => {
    if (!scrollFrameRequested) {
      scrollFrameRequested = true;
      window.requestAnimationFrame(renderProjects);
    }
  };

  const measureProjects = () => {
    layoutFrameRequested = false;

    if (!projectsMotionQuery.matches) {
      projectsSection.classList.remove("is-scroll-driven");
      projectsSection.style.removeProperty("--projects-scroll-height");
      projectsTrack.style.removeProperty("transform");
      sectionTop = 0;
      scrollRange = 0;
      horizontalOverflow = 0;
      return;
    }

    projectsSection.classList.add("is-scroll-driven");
    projectsTrack.style.transform = "translate3d(0, 0, 0)";

    const viewportHeight = window.innerHeight;
    horizontalOverflow = Math.max(
      0,
      projectsTrack.scrollWidth - projectsViewport.clientWidth
    );

    projectsSection.style.setProperty(
      "--projects-scroll-height",
      `${viewportHeight + horizontalOverflow}px`
    );

    sectionTop = projectsSection.getBoundingClientRect().top + window.scrollY;
    scrollRange = Math.max(0, projectsSection.offsetHeight - viewportHeight);
    requestProjectsRender();
  };

  const requestProjectsMeasure = () => {
    if (!layoutFrameRequested) {
      layoutFrameRequested = true;
      window.requestAnimationFrame(measureProjects);
    }
  };

  window.addEventListener("scroll", requestProjectsRender, { passive: true });
  window.addEventListener("resize", requestProjectsMeasure, { passive: true });
  window.addEventListener("load", requestProjectsMeasure, { once: true });
  window.addEventListener("pageshow", requestProjectsMeasure);
  projectsMotionQuery.addEventListener("change", requestProjectsMeasure);

  document.querySelectorAll("#projects img").forEach((image) => {
    if (!image.complete) {
      image.addEventListener("load", requestProjectsMeasure, { once: true });
    }
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(requestProjectsMeasure);
  }

  requestProjectsMeasure();
}

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
