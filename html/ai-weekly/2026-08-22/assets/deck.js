(function () {
  "use strict";

  const allSlides = Array.from(document.querySelectorAll(".slide"));
  const includeAppendix = new URLSearchParams(window.location.search).get("appendix") === "1";
  const slides = includeAppendix
    ? allSlides
    : allSlides.filter((slide) => slide.dataset.deckAppendix !== "true");
  const counter = document.getElementById("deckCounter");
  const progress = document.getElementById("progress");
  const toc = document.getElementById("toc");
  const tocItems = document.getElementById("tocItems");
  const tocButton = document.getElementById("tocButton");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsToggle = document.getElementById("settingsToggle");
  const themeButton = document.getElementById("themeButton");
  let current = 0;
  let touchStart = null;
  let chromeTimer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hashIndex() {
    const match = window.location.hash.match(/(?:#\/|#slide-)(\d+)$/);
    return match ? clamp(Number(match[1]) - 1, 0, slides.length - 1) : 0;
  }

  function slideLabel(slide, index) {
    return slide.getAttribute("aria-label") ||
      slide.querySelector("h1")?.textContent.trim() ||
      `슬라이드 ${index + 1}`;
  }

  function updateHash(index) {
    const nextHash = `#/${index + 1}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }

  function showSlide(index, options = {}) {
    current = clamp(index, 0, slides.length - 1);
    allSlides.forEach((slide) => {
      const slideIndex = slides.indexOf(slide);
      const active = slideIndex === current;
      slide.classList.toggle("is-deck-omitted", slideIndex < 0);
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });

    slides.forEach((slide, slideIndex) => {
      slide.querySelectorAll("[data-slide-total]").forEach((node) => {
        node.textContent = String(slides.length);
      });
      slide.querySelectorAll("[data-slide-number]").forEach((node) => {
        node.textContent = String(slideIndex + 1).padStart(2, "0");
      });
    });

    counter.textContent = `${current + 1} / ${slides.length}`;
    progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    tocItems.querySelectorAll(".toc-item").forEach((item, itemIndex) => {
      item.classList.toggle("current", itemIndex === current);
      item.setAttribute("aria-current", itemIndex === current ? "page" : "false");
    });
    document.title = `${slideLabel(slides[current], current)} · ${slides[0].querySelector("h1")?.textContent.trim() || "발표자료"}`;
    if (!options.skipHash) updateHash(current);
  }

  function move(delta) {
    showSlide(current + delta);
  }

  function buildToc() {
    slides.forEach((slide, index) => {
      const button = document.createElement("button");
      const number = document.createElement("span");
      const label = document.createElement("span");
      button.type = "button";
      button.className = "toc-item";
      number.textContent = String(index + 1).padStart(2, "0");
      label.textContent = slideLabel(slide, index);
      button.append(number, label);
      button.addEventListener("click", () => {
        showSlide(index);
        setToc(false);
      });
      tocItems.appendChild(button);
    });
  }

  function numberFigures() {
    let figureNumber = 0;
    slides.forEach((slide) => {
      slide.querySelectorAll("figure").forEach((figure) => {
        const caption = figure.querySelector(":scope > figcaption");
        if (!caption) return;
        figureNumber += 1;
        figure.dataset.deckFigureNumber = String(figureNumber);
        const explicitTitle = caption.querySelector("[data-deck-figure-title]")?.textContent.trim();
        const slideTitle = slide.querySelector("h1")?.textContent.trim();
        figure.dataset.deckFigureTitle = explicitTitle || slideTitle || "발표 그림";

        const bandLabel = caption.querySelector(":scope > b");
        if (bandLabel) {
          bandLabel.textContent = `그림 ${figureNumber}`;
          return;
        }
        const title = caption.querySelector(":scope > strong");
        if (!title) return;
        title.dataset.deckFigureTitle ||= title.textContent.trim();
        title.textContent = `그림 ${figureNumber} · ${title.dataset.deckFigureTitle}`;
      });
    });
  }

  function setToc(open) {
    if (open) setSettings(false);
    toc.classList.toggle("open", open);
    toc.setAttribute("aria-hidden", String(!open));
    tocButton.setAttribute("aria-expanded", String(open));
    if (open) showChrome();
  }

  function setSettings(open) {
    settingsPanel.classList.toggle("is-open", open);
    settingsPanel.setAttribute("aria-hidden", String(!open));
    settingsToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      setToc(false);
      showChrome();
    }
  }

  function savedTheme() {
    try {
      return window.localStorage.getItem("aimlquant-deck-theme");
    } catch (_error) {
      return null;
    }
  }

  function applyTheme(theme) {
    document.documentElement.className = `theme-${theme}`;
    themeButton.textContent = theme === "dark" ? "☾" : "☀";
    themeButton.setAttribute("aria-pressed", String(theme === "dark"));
    themeButton.setAttribute("title", theme === "dark" ? "라이트 모드로 전환" : "나이트 모드로 전환");
    try {
      window.localStorage.setItem("aimlquant-deck-theme", theme);
    } catch (_error) {
      // Local files and private browsing may reject storage. Navigation still works.
    }
  }

  function toggleTheme() {
    applyTheme(document.documentElement.classList.contains("theme-dark") ? "light" : "dark");
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }

  function fitStage() {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    document.documentElement.style.setProperty("--deck-scale", String(scale));
  }

  function hideChrome() {
    if (!toc.classList.contains("open") && !settingsPanel.classList.contains("is-open")) {
      document.body.classList.add("chrome-hidden");
    }
  }

  function showChrome() {
    document.body.classList.remove("chrome-hidden");
    window.clearTimeout(chromeTimer);
    chromeTimer = window.setTimeout(hideChrome, 2600);
  }

  function setupImageLightbox() {
    const targets = Array.from(document.querySelectorAll(".slide figure > img"))
      .filter((target) => !target.closest("a"));
    if (!targets.length) return;

    const lightbox = document.createElement("div");
    lightbox.className = "deck-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.hidden = true;
    lightbox.innerHTML =
      '<div class="deck-lightbox__toolbar">' +
        '<strong class="deck-lightbox__title" id="deckLightboxTitle"></strong>' +
        '<div class="deck-lightbox__actions">' +
          '<a class="deck-lightbox__original" data-deck-lightbox-original href="#" target="_blank" rel="noopener" hidden>원본 열기 ↗</a>' +
          '<button type="button" data-deck-lightbox-action="zoom-out" aria-label="축소">−</button>' +
          '<output class="deck-lightbox__scale" aria-live="polite">100%</output>' +
          '<button type="button" data-deck-lightbox-action="zoom-in" aria-label="확대">+</button>' +
          '<button type="button" data-deck-lightbox-action="reset" aria-label="화면에 맞춤">맞춤</button>' +
          '<button type="button" data-deck-lightbox-action="close" aria-label="닫기">×</button>' +
        '</div>' +
      '</div>' +
      '<div class="deck-lightbox__viewport" tabindex="0"><div class="deck-lightbox__stage"></div></div>' +
      '<p class="deck-lightbox__hint">클릭 시 150%·전체화면 · 휠·+/− 확대 · 드래그 이동 · Esc 닫기</p>';
    document.body.appendChild(lightbox);

    const viewport = lightbox.querySelector(".deck-lightbox__viewport");
    const lightboxStage = lightbox.querySelector(".deck-lightbox__stage");
    const title = lightbox.querySelector(".deck-lightbox__title");
    const scaleOutput = lightbox.querySelector(".deck-lightbox__scale");
    const closeButton = lightbox.querySelector('[data-deck-lightbox-action="close"]');
    const originalLink = lightbox.querySelector("[data-deck-lightbox-original]");
    let visual = null;
    let lastFocus = null;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let drag = null;
    let enteredFullscreen = false;
    const MIN_SCALE = 1;
    const MAX_SCALE = 6;
    const INITIAL_SCALE = 1.5;

    function figureLabel(target) {
      const figure = target.closest("figure");
      return figure?.querySelector("figcaption")?.textContent.replace(/\s+/g, " ").trim() || target.alt || "확대 이미지";
    }

    function constrainPan() {
      if (!visual || scale <= 1) {
        panX = 0;
        panY = 0;
        return;
      }
      const width = visual.offsetWidth * scale;
      const height = visual.offsetHeight * scale;
      const maxX = Math.max(0, (width - viewport.clientWidth) / 2 + viewport.clientWidth * 0.2);
      const maxY = Math.max(0, (height - viewport.clientHeight) / 2 + viewport.clientHeight * 0.2);
      panX = clamp(panX, -maxX, maxX);
      panY = clamp(panY, -maxY, maxY);
    }

    function renderView() {
      constrainPan();
      lightboxStage.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
      scaleOutput.textContent = `${Math.round(scale * 100)}%`;
      viewport.classList.toggle("is-zoomed", scale > 1);
    }

    function resetView() {
      scale = 1;
      panX = 0;
      panY = 0;
      renderView();
    }

    function zoomAt(nextScale, clientX, clientY) {
      const next = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      if (next === scale) return;
      const rect = viewport.getBoundingClientRect();
      const x = typeof clientX === "number" ? clientX - rect.left - rect.width / 2 : 0;
      const y = typeof clientY === "number" ? clientY - rect.top - rect.height / 2 : 0;
      const worldX = (x - panX) / scale;
      const worldY = (y - panY) / scale;
      panX = x - worldX * next;
      panY = y - worldY * next;
      scale = next;
      renderView();
    }

    function enterViewerFullscreen() {
      if (!lightbox.requestFullscreen || document.fullscreenElement === lightbox) return;
      try {
        const attempt = lightbox.requestFullscreen({ navigationUI: "hide" });
        if (attempt && typeof attempt.then === "function") {
          attempt.then(() => {
            enteredFullscreen = document.fullscreenElement === lightbox;
          }).catch(() => {});
        }
      } catch (_error) {
        // The fixed full-viewport viewer remains available where the API is unsupported.
      }
    }

    function openLightbox(target) {
      const figure = target.closest("figure");
      const originalUrl = figure?.dataset.originalUrl;
      originalLink.hidden = !originalUrl;
      originalLink.href = originalUrl || "#";
      lastFocus = document.activeElement;
      visual = document.createElement("img");
      visual.src = target.currentSrc || target.src;
      visual.alt = target.alt || "";
      visual.className = "deck-lightbox__visual";
      visual.draggable = false;
      lightboxStage.replaceChildren(visual);
      title.textContent = figureLabel(target);
      lightbox.setAttribute("aria-labelledby", "deckLightboxTitle");
      lightbox.setAttribute("aria-hidden", "false");
      lightbox.hidden = false;
      document.body.classList.add("deck-lightbox-open");
      document.documentElement.classList.add("deck-lightbox-open");
      resetView();
      zoomAt(INITIAL_SCALE);
      enterViewerFullscreen();
      requestAnimationFrame(() => {
        lightbox.classList.add("is-open");
        closeButton.focus({ preventScroll: true });
      });
    }

    function closeLightbox() {
      if (lightbox.hidden) return;
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("deck-lightbox-open");
      document.documentElement.classList.remove("deck-lightbox-open");
      if (document.fullscreenElement === lightbox) document.exitFullscreen?.();
      lightbox.hidden = true;
      lightboxStage.replaceChildren();
      visual = null;
      enteredFullscreen = false;
      drag = null;
      lastFocus?.focus?.({ preventScroll: true });
    }

    targets.forEach((target) => {
      const figure = target.closest("figure");
      figure?.classList.add("is-deck-zoomable");
      target.dataset.deckZoomable = "true";
      target.tabIndex = 0;
      target.setAttribute("role", "button");
      target.setAttribute("aria-haspopup", "dialog");
      target.setAttribute("aria-label", `${figureLabel(target)} — 전체화면으로 확대`);
      target.title = "클릭하여 전체화면으로 확대";
      target.addEventListener("click", () => openLightbox(target));
      target.addEventListener("keydown", (event) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          openLightbox(target);
        }
      });
      target.addEventListener("dragstart", (event) => event.preventDefault());
    });

    lightbox.addEventListener("click", (event) => {
      const control = event.target.closest("[data-deck-lightbox-action]");
      if (!control) return;
      const action = control.dataset.deckLightboxAction;
      if (action === "close") closeLightbox();
      if (action === "zoom-in") zoomAt(scale + 0.25);
      if (action === "zoom-out") zoomAt(scale - 0.25);
      if (action === "reset") resetView();
    });

    viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoomAt(scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), event.clientX, event.clientY);
    }, { passive: false });

    viewport.addEventListener("dblclick", (event) => {
      event.preventDefault();
      zoomAt(scale > 1 ? 1 : 2, event.clientX, event.clientY);
    });

    viewport.addEventListener("pointerdown", (event) => {
      if (scale <= 1) return;
      viewport.setPointerCapture(event.pointerId);
      drag = { x: event.clientX, y: event.clientY, panX, panY };
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!drag) return;
      panX = drag.panX + event.clientX - drag.x;
      panY = drag.panY + event.clientY - drag.y;
      renderView();
    });

    function endDrag() {
      drag = null;
      viewport.classList.remove("is-dragging");
    }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (["+", "="].includes(event.key)) {
        event.preventDefault();
        zoomAt(scale + 0.25);
      } else if (event.key === "-") {
        event.preventDefault();
        zoomAt(scale - 0.25);
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (!lightbox.hidden && !document.fullscreenElement && enteredFullscreen) {
        enteredFullscreen = false;
        closeLightbox();
      }
    });
    window.addEventListener("resize", renderView);
  }

  document.getElementById("prevButton").addEventListener("click", () => move(-1));
  document.getElementById("nextButton").addEventListener("click", () => move(1));
  themeButton.addEventListener("click", toggleTheme);
  document.getElementById("fullscreenButton").addEventListener("click", toggleFullscreen);
  tocButton.addEventListener("click", () => setToc(!toc.classList.contains("open")));
  settingsToggle.addEventListener("click", () => setSettings(!settingsPanel.classList.contains("is-open")));

  document.addEventListener("keydown", (event) => {
    showChrome();
    if (document.body.classList.contains("deck-lightbox-open")) return;
    if (event.key === "Escape") {
      setToc(false);
      setSettings(false);
      return;
    }
    if (event.target.matches("input, textarea, button, a, select, [contenteditable='true']")) return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      move(1);
    } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      showSlide(0);
    } else if (event.key === "End") {
      event.preventDefault();
      showSlide(slides.length - 1);
    } else if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
    } else if (event.key.toLowerCase() === "d") {
      toggleTheme();
    } else if (event.key.toLowerCase() === "m") {
      setToc(!toc.classList.contains("open"));
    }
  });

  document.addEventListener("click", (event) => {
    if (toc.classList.contains("open") && !event.target.closest(".toc, .toc-button")) {
      setToc(false);
    }
    if (settingsPanel.classList.contains("is-open") && !event.target.closest(".deck-settings")) {
      setSettings(false);
    }
  });
  document.addEventListener("mousemove", showChrome);
  document.addEventListener("touchstart", (event) => {
    touchStart = event.touches[0]?.clientX ?? null;
    showChrome();
  }, { passive: true });
  document.addEventListener("touchend", (event) => {
    if (touchStart === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
    if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });
  window.addEventListener("hashchange", () => showSlide(hashIndex(), { skipHash: true }));
  window.addEventListener("resize", fitStage);
  window.addEventListener("beforeprint", () => document.body.classList.remove("chrome-hidden"));

  numberFigures();
  buildToc();
  setupImageLightbox();
  fitStage();
  applyTheme(savedTheme() === "dark" ? "dark" : "light");
  showSlide(hashIndex(), { skipHash: true });
  showChrome();
})();
