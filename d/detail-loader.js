(function () {
  const pageMatch = decodeURIComponent(location.pathname).match(/product-([12])\.html$/);
  const pageIndex = pageMatch ? pageMatch[1] : "1";
  const mdPath = `product-${pageIndex}.md`;
  const imageBase = `images/product-${pageIndex}/`;

  const text = (value, fallback = "") => {
    if (value === undefined || value === null || value === "") return fallback;
    return String(value);
  };

  const bindText = (key, value) => {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => {
      el.textContent = text(value, el.textContent);
      // 본문 줄바꿈 보존 (당근 SingleFile의 부모 요소 white-space에 의존하지 않도록)
      if (key === "body") el.style.whiteSpace = "pre-line";
    });
  };

  const imageList = (images) => {
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === "string") return images.split(",").map((item) => item.trim()).filter(Boolean);
    return [];
  };

  const setMeta = (data) => {
    const title = text(data.title, document.title.split("|")[0].trim());
    const category = text(data.category, "중고거래");
    const body = text(data.body, "");
    document.title = `${title} | ${category} | 당근 중고거래`;

    [
      ["meta[property='og:title']", `${title} | ${category} | 당근 중고거래`],
      ["meta[name='twitter:title']", `${title} | ${category} | 당근 중고거래`],
      ["meta[name='description']", body.replace(/\s+/g, " ").trim()],
      ["meta[property='og:description']", body.replace(/\s+/g, " ").trim()],
      ["meta[name='twitter:description']", body.replace(/\s+/g, " ").trim()],
      ["meta[property='karrot:embed_view_type:title']", text(data.price, "")],
      ["meta[property='karrot:embed_view_type:description']", title],
      ["meta[property='karrot:embed_view_type:tag_group_csv']", `중고거래,${category}`],
    ].forEach(([selector, content]) => {
      const el = document.querySelector(selector);
      if (el && content) el.setAttribute("content", content);
    });
  };

  const setProfileImage = async () => {
    const target = document.querySelector('[data-bind="profile-image"]');
    if (!target) return;
    try {
      const res = await fetch("_profile-img-data.txt");
      if (!res.ok) throw new Error("profile image not found");
      target.src = (await res.text()).trim();
    } catch (error) {
      target.removeAttribute("src");
    }
  };

  const setCarousel = (data) => {
    const images = imageList(data.images);
    if (!images.length) return;

    const currentImages = Array.from(document.querySelectorAll("img._1wus0xp0"));
    if (!currentImages.length) return;

    const template = currentImages[0];
    const container = template.parentElement;
    if (!container) return;

    currentImages.slice(1).forEach((img) => img.remove());
    template.src = `${imageBase}${images[0]}`;
    template.alt = text(data.title, "상품 이미지");
    template.setAttribute("data-carousel-index", "0");
    template.setAttribute("data-bind", "carousel-image");

    images.slice(1, 10).forEach((filename, index) => {
      const img = template.cloneNode(false);
      img.src = `${imageBase}${filename}`;
      img.alt = text(data.title, "상품 이미지");
      img.setAttribute("data-carousel-index", String(index + 1));
      container.appendChild(img);
    });

    const slides = Array.from(container.querySelectorAll("img._1wus0xp0"));
    let active = 0;
    const dots = document.querySelector("ol._1wus0xpa");
    const prevBtn = document.querySelector('[aria-label="Previous item"]');
    const nextBtn = document.querySelector('[aria-label="Next item"]');
    const single = slides.length <= 1;

    if (single) {
      if (dots) dots.style.display = "none";
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
    }

    const renderDots = () => {
      if (!dots || single) return;
      dots.innerHTML = slides.map((_, index) => (
        `<li class="_1wus0xpb sprinkles_display_flex_base__1byufe82i sprinkles_justifyContent_center_base__1byufe8su">` +
        `<button type="button" aria-label="Carousel indicator" data-carousel-dot="${index}" class="_1wus0xpc sprinkles_display_block_base__1byufe826 sprinkles_overflow_hidden__1byufe819 sprinkles_width_1.5_base__1byufe84i sprinkles_height_1.5_base__1byufe86m sprinkles_cursor_pointer__1byufe81o${index === 0 ? " _1wus0xpd" : ""}"></button></li>`
      )).join("");
    };

    const render = () => {
      slides.forEach((img, index) => {
        img.style.display = index === active ? "" : "none";
      });
      document.querySelectorAll("[data-carousel-dot]").forEach((dot) => {
        dot.classList.toggle("_1wus0xpd", Number(dot.dataset.carouselDot) === active);
      });
    };

    const move = (delta) => {
      active = (active + delta + slides.length) % slides.length;
      render();
    };

    renderDots();
    render();

    document.querySelector('[aria-label="Previous item"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      move(-1);
    });
    document.querySelector('[aria-label="Next item"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      move(1);
    });
    dots?.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-carousel-dot]");
      if (!dot) return;
      active = Number(dot.dataset.carouselDot);
      render();
    });
  };

  const setMannerBar = (data) => {
    const bar = document.querySelector('[data-bind="manner-bar"]');
    if (!bar) return;
    const temp = parseFloat(data["manner-temp"]);
    if (!Number.isFinite(temp)) return;
    // 당근 게이지는 매너온도 값과 거의 비례 (39.4°C → 39.8%). 단순화하여 동일 % 사용.
    const pct = Math.max(0, Math.min(99.9, temp));
    bar.style.width = pct + "%";
  };

  const applyData = (data) => {
    bindText("title", data.title);
    bindText("category", data.category);
    bindText("time", data.time);
    bindText("price", data.price);
    bindText("body", data.body);
    bindText("chats", data.chats);
    bindText("likes", data.likes);
    bindText("views", data.views);
    bindText("seller-name", data["seller-name"]);
    bindText("seller-region", data["seller-region"]);
    bindText("manner-temp", data["manner-temp"]);
    setMannerBar(data);
    setMeta(data);
    setCarousel(data);
  };

  document.addEventListener("DOMContentLoaded", async () => {
    if (typeof window.parseMd !== "function") {
      console.warn("[detail-loader] window.parseMd is not defined; check md-loader.js load order");
      return;
    }
    try {
      const res = await fetch(mdPath, { cache: "no-store" });
      if (!res.ok) throw new Error(`${mdPath} HTTP ${res.status}`);
      const data = window.parseMd(await res.text());
      console.info("[detail-loader] loaded", mdPath, data);
      applyData(data);
      await setProfileImage();
    } catch (error) {
      console.warn("[detail-loader] md fetch failed:", error);
      await setProfileImage();
    }
  });
})();
