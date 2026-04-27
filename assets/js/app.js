/* ========================================================================
   Sweet Sentiments — App shell
   Header, footer, cart drawer, WhatsApp ordering flow
   ======================================================================== */

const SS_PHONE = "263717235937"; // wa.me format — no + or spaces

const SS = {
  /* ─── Cart state (localStorage) ─── */
  loadCart() {
    try { return JSON.parse(localStorage.getItem("ss-cart") || "[]"); }
    catch { return []; }
  },
  saveCart(cart) { localStorage.setItem("ss-cart", JSON.stringify(cart)); this.renderCartBadge(); },
  cart() { return this.loadCart(); },

  add(slug, qty = 1) {
    const cart = this.loadCart();
    const existing = cart.find(i => i.slug === slug);
    if (existing) existing.qty += qty;
    else cart.push({ slug, qty });
    this.saveCart(cart);
    this.toast("Added to your selection.");
    this.renderCartBody();
  },
  remove(slug) {
    this.saveCart(this.loadCart().filter(i => i.slug !== slug));
    this.renderCartBody();
  },
  setQty(slug, qty) {
    const cart = this.loadCart();
    const item = cart.find(i => i.slug === slug);
    if (item) {
      item.qty = Math.max(1, qty);
      this.saveCart(cart);
      this.renderCartBody();
    }
  },
  count() { return this.loadCart().reduce((s, i) => s + i.qty, 0); },
  total() {
    return this.loadCart().reduce((s, i) => {
      const p = window.SS_findProduct(i.slug);
      return p ? s + p.price * i.qty : s;
    }, 0);
  },

  /* ─── Toast ─── */
  toast(msg) {
    let t = document.getElementById("ss-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "ss-toast";
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove("show"), 2200);
  },

  /* ─── Cart UI ─── */
  renderCartBadge() {
    const badge = document.querySelector(".cart-badge");
    if (!badge) return;
    const c = this.count();
    badge.textContent = c;
    badge.classList.toggle("show", c > 0);
  },

  renderCartBody() {
    const body = document.getElementById("cart-body");
    const foot = document.getElementById("cart-foot");
    if (!body || !foot) return;
    const items = this.loadCart();
    this.renderCartBadge();

    if (!items.length) {
      body.innerHTML = `
        <div class="cart-empty">
          <div class="ic">— for now —</div>
          <p>Your selection is empty. Browse the collection and start choosing the sentiment you'd like to send.</p>
          <a href="shop.html" class="btn btn-ghost" style="margin-top:18px;">Browse the Shop</a>
        </div>`;
      foot.style.display = "none";
      return;
    }

    foot.style.display = "block";
    body.innerHTML = items.map(it => {
      const p = window.SS_findProduct(it.slug);
      if (!p) return "";
      return `
        <div class="cart-item">
          <img src="${p.image}" alt="${p.name}">
          <div>
            <div class="name">${p.name}</div>
            <div class="meta">${p.categoryLabel}</div>
            <div class="qty">
              <button data-act="dec" data-slug="${p.slug}" aria-label="Decrease">−</button>
              <span>${it.qty}</span>
              <button data-act="inc" data-slug="${p.slug}" aria-label="Increase">+</button>
            </div>
          </div>
          <div class="price-col">
            <div class="p"><small>USD</small> $${(p.price * it.qty).toFixed(0)}</div>
            <div class="rm" data-act="rm" data-slug="${p.slug}">remove</div>
          </div>
        </div>`;
    }).join("");

    foot.querySelector(".sub").textContent = "$" + this.total().toFixed(0);
    foot.querySelector(".tot").textContent = "$" + this.total().toFixed(0);

    body.querySelectorAll("[data-act]").forEach(b => {
      b.addEventListener("click", e => {
        const slug = b.dataset.slug;
        const it = this.loadCart().find(i => i.slug === slug);
        if (b.dataset.act === "inc") this.setQty(slug, it.qty + 1);
        if (b.dataset.act === "dec") this.setQty(slug, it.qty - 1);
        if (b.dataset.act === "rm") this.remove(slug);
      });
    });
  },

  openCart() {
    document.querySelector(".cart-overlay")?.classList.add("open");
    document.querySelector(".cart-drawer")?.classList.add("open");
    document.body.style.overflow = "hidden";
    this.renderCartBody();
  },
  closeCart() {
    document.querySelector(".cart-overlay")?.classList.remove("open");
    document.querySelector(".cart-drawer")?.classList.remove("open");
    document.body.style.overflow = "";
  },
  openMenu() {
    document.querySelector(".menu-overlay")?.classList.add("open");
    document.querySelector(".mobile-menu")?.classList.add("open");
    document.body.style.overflow = "hidden";
  },
  closeMenu() {
    document.querySelector(".menu-overlay")?.classList.remove("open");
    document.querySelector(".mobile-menu")?.classList.remove("open");
    document.body.style.overflow = "";
  },

  /* ─── WhatsApp message builders ─── */
  waUrl(message) {
    return `https://wa.me/${SS_PHONE}?text=${encodeURIComponent(message)}`;
  },

  waGreeting() {
    return this.waUrl("Hi Sweet Sentiments, I'd like to ask about a gift.");
  },

  waSingleProduct(slug, fields = {}) {
    const p = window.SS_findProduct(slug);
    if (!p) return this.waGreeting();
    const url = location.origin + location.pathname.replace(/[^/]*$/, "") + "product.html?p=" + slug;
    const lines = [
      "Hi Sweet Sentiments,",
      "",
      "I'd like to order this gift:",
      "",
      `🎁 ${p.name} — $${p.price}`,
      `Link: ${url}`,
    ];
    if (fields.cardMessage) lines.push("", `Card message: "${fields.cardMessage}"`);
    if (fields.recipient) lines.push(`Recipient: ${fields.recipient}`);
    if (fields.deliveryDate) lines.push(`Delivery date: ${fields.deliveryDate}`);
    lines.push("", "Please confirm availability and how to pay. Thank you 🌹");
    return this.waUrl(lines.join("\n"));
  },

  waCart(fields = {}) {
    const items = this.loadCart();
    if (!items.length) return this.waGreeting();
    const lines = [
      "Hi Sweet Sentiments,",
      "",
      "I'd like to place an order:",
      ""
    ];
    items.forEach((it, idx) => {
      const p = window.SS_findProduct(it.slug);
      if (!p) return;
      lines.push(`${idx + 1}. ${p.name} × ${it.qty} — $${(p.price * it.qty).toFixed(0)}`);
    });
    lines.push("", `Subtotal: $${this.total().toFixed(0)}`);
    if (fields.cardMessage) lines.push("", `Card message: "${fields.cardMessage}"`);
    if (fields.recipient) lines.push(`Recipient: ${fields.recipient}${fields.phone ? ", " + fields.phone : ""}`);
    if (fields.deliveryDate) lines.push(`Delivery: ${fields.deliveryDate}${fields.zone ? ", " + fields.zone : ""}`);
    lines.push("", "Please confirm and send payment details. Thank you 🌹");
    return this.waUrl(lines.join("\n"));
  },

  waBespoke(form) {
    const lines = [
      "Hi Sweet Sentiments,",
      "",
      "I'd like to commission a bespoke sentiment.",
      "",
      `Name: ${form.name || "—"}`,
      `WhatsApp: ${form.phone || "—"}`,
      `Occasion: ${form.occasion || "—"}`,
      `Budget: ${form.budget || "—"}`,
      "",
      "What I have in mind:",
      form.idea || "—",
      "",
      "Thank you 🌹"
    ];
    return this.waUrl(lines.join("\n"));
  }
};

/* ─── Render header & footer & shell ─── */
function ssShell() {
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const navLink = (href, label) => {
    const active = here === href || (href === "shop.html" && here.startsWith("shop")) ? " active" : "";
    return `<a class="${active}" href="${href}">${label}</a>`;
  };

  const headerHTML = `
    <div class="announce">
      <span class="announce-pulse"></span>
      <span>Nationwide delivery · Order before 2pm · +263 71 723 5937</span>
    </div>
    <header class="site-header" id="ss-header">
      <div class="inner">
        <button class="icon-btn menu-trigger" aria-label="Open menu" onclick="SS.openMenu()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <nav class="primary hide-mobile">
          ${navLink("shop.html", "Shop")}
          ${navLink("occasions.html", "Occasions")}
          ${navLink("bespoke.html", "Bespoke")}
          ${navLink("about.html", "About")}
          ${navLink("journal.html", "Journal")}
          ${navLink("contact.html", "Contact")}
        </nav>
        <a href="index.html" class="brand-mark" aria-label="Sweet Sentiments — Home">
          <span class="name">Sweet Sentiments</span>
          <span class="tag">Curated Gifts · Delivered Everywhere</span>
        </a>
        <div class="utility">
          <a class="btn-wa-pill hide-mobile" href="${SS.waGreeting()}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11.7 11.7 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zM12 22a10 10 0 0 1-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 1 1 22 12c0 5.5-4.5 10-10 10zm5.5-7.5l-2-1c-.3-.2-.6-.2-.8.1l-.8 1c-.2.2-.4.3-.7.1a8.1 8.1 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.4.1-.6l.6-.6.3-.6v-.4l-1-2.4c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.4 2.9 1.2 2.9.8 3.4.8.5-.1 1.5-.6 1.7-1.2.2-.6.2-1 .1-1.2 0-.1-.2-.2-.5-.4z"/></svg>
            WhatsApp
          </a>
          <button class="icon-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <button class="icon-btn" aria-label="Cart" onclick="SS.openCart()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 6h15l-1.5 9h-12L6 6z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>
            <span class="cart-badge">0</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile menu -->
    <div class="menu-overlay" onclick="SS.closeMenu()"></div>
    <aside class="mobile-menu">
      <div class="between">
        <span class="eyebrow">Menu</span>
        <button class="icon-btn" onclick="SS.closeMenu()" aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <nav>
        <a href="shop.html">Shop</a>
        <a href="occasions.html">Occasions</a>
        <a href="bespoke.html">Bespoke</a>
        <a href="about.html">About</a>
        <a href="journal.html">Journal</a>
        <a href="contact.html">Contact</a>
      </nav>
      <a class="btn btn-whatsapp" style="margin-top: auto;" href="${SS.waGreeting()}" target="_blank" rel="noopener">
        Order on WhatsApp
      </a>
    </aside>
  `;

  const footerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="grid">
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="shop.html?c=hampers">Hampers</a></li>
              <li><a href="shop.html?c=money-bouquets">Money Bouquets</a></li>
              <li><a href="shop.html?c=chocolate-towers">Chocolate Towers</a></li>
              <li><a href="shop.html?c=balloons">Balloons</a></li>
              <li><a href="shop.html?c=setups">Romantic Setups</a></li>
              <li><a href="bespoke.html">Bespoke</a></li>
              <li><a href="shop.html">All Gifts</a></li>
            </ul>
          </div>
          <div>
            <h4>Help</h4>
            <ul>
              <li><a href="contact.html">Delivery Zones</a></li>
              <li><a href="contact.html">How Ordering Works</a></li>
              <li><a href="bespoke.html">Bespoke Requests</a></li>
              <li><a href="#">Care Instructions</a></li>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Returns</a></li>
            </ul>
          </div>
          <div>
            <h4>Sweet Sentiments</h4>
            <ul>
              <li><a href="about.html">About</a></li>
              <li><a href="journal.html">Journal</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Wholesale</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Sustainability</a></li>
            </ul>
          </div>
          <div class="news">
            <h4>Newsletter</h4>
            <p>Receive the next collection first.</p>
            <form class="field" onsubmit="event.preventDefault(); SS.toast('Thank you — we will be in touch.'); this.reset();">
              <div class="field">
                <input type="email" placeholder="your@email.com" required style="border:0;border-bottom:1px solid var(--ink);border-radius:0;background:transparent;padding:10px 32px 10px 0;">
              </div>
            </form>
            <p style="margin-top:18px; font-size:.86rem;">
              <a href="https://instagram.com" target="_blank">Instagram</a> ·
              <a href="${SS.waGreeting()}" target="_blank">WhatsApp</a>
            </p>
          </div>
        </div>
        <div class="strip">
          <div>© Sweet Sentiments 2026 · Delivered Beautifully</div>
          <div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- Sticky WhatsApp on mobile -->
    <a href="${SS.waGreeting()}" class="sticky-wa show-mobile" target="_blank" rel="noopener" aria-label="WhatsApp order">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11.7 11.7 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zM12 22a10 10 0 0 1-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 1 1 22 12c0 5.5-4.5 10-10 10zm5.5-7.5l-2-1c-.3-.2-.6-.2-.8.1l-.8 1c-.2.2-.4.3-.7.1a8.1 8.1 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.4.1-.6l.6-.6.3-.6v-.4l-1-2.4c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.4 2.9 1.2 2.9.8 3.4.8.5-.1 1.5-.6 1.7-1.2.2-.6.2-1 .1-1.2 0-.1-.2-.2-.5-.4z"/></svg>
    </a>

    <!-- Cart drawer -->
    <div class="cart-overlay" onclick="SS.closeCart()"></div>
    <aside class="cart-drawer" aria-label="Cart">
      <div class="cart-head">
        <h2>Your Selection</h2>
        <button class="cart-close" onclick="SS.closeCart()" aria-label="Close cart">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="cart-body" id="cart-body"></div>
      <div class="cart-foot" id="cart-foot" style="display:none;">
        <div class="cart-row"><span>Subtotal</span><span class="sub">$0</span></div>
        <div class="cart-row total"><span>Total</span><span class="tot">$0</span></div>
        <div class="cart-personalisation">
          <div class="field">
            <label for="cart-recipient">Recipient & phone</label>
            <input type="text" id="cart-recipient" placeholder="Tinashe Moyo · 077 123 4567">
          </div>
          <div class="field">
            <label for="cart-delivery">Delivery date & zone</label>
            <input type="text" id="cart-delivery" placeholder="14 May · delivery address">
          </div>
          <div class="field">
            <label for="cart-card">Card message</label>
            <textarea id="cart-card" placeholder="What should we write on the card?" maxlength="200"></textarea>
          </div>
        </div>
        <button class="btn btn-whatsapp btn-block btn-lg" onclick="SS.checkout()">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.5 3.5A11.7 11.7 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zM12 22a10 10 0 0 1-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 1 1 22 12c0 5.5-4.5 10-10 10zm5.5-7.5l-2-1c-.3-.2-.6-.2-.8.1l-.8 1c-.2.2-.4.3-.7.1a8.1 8.1 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.4.1-.6l.6-.6.3-.6v-.4l-1-2.4c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.4 2.9 1.2 2.9.8 3.4.8.5-.1 1.5-.6 1.7-1.2.2-.6.2-1 .1-1.2 0-.1-.2-.2-.5-.4z"/></svg>
          Send Order via WhatsApp
        </button>
        <p class="micro">Your order will open in WhatsApp for confirmation. We respond within 30 minutes during studio hours (08:00–18:00).</p>
      </div>
    </aside>
  `;

  document.body.insertAdjacentHTML("afterbegin", headerHTML);
  document.body.insertAdjacentHTML("beforeend", footerHTML);

  // sticky-on-scroll header
  const header = document.getElementById("ss-header");
  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  SS.renderCartBadge();
}

SS.checkout = function() {
  const recipient = document.getElementById("cart-recipient")?.value || "";
  const delivery = document.getElementById("cart-delivery")?.value || "";
  const cardMessage = document.getElementById("cart-card")?.value || "";
  const url = SS.waCart({ recipient, deliveryDate: delivery, cardMessage });
  window.open(url, "_blank");
};

/* ─── Card renderer (used across pages) ─── */
function ssRenderProductCard(p) {
  return `
    <article class="card-product" data-slug="${p.slug}">
      <a class="thumb" href="product.html?p=${p.slug}" aria-label="${p.name}">
        ${p.tag ? `<span class="tag-pill ${p.tag === 'NEW' ? 'gold' : p.tag === 'LIMITED' ? 'ink' : ''}">${p.tag}</span>` : ""}
        <button class="fav-btn" aria-label="Favourite" data-fav="${p.slug}" onclick="event.preventDefault(); ssToggleFav(this);"><svg viewBox="0 0 24 24" stroke-width="1.6"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg></button>
        <img src="${p.image}" alt="${p.name}" loading="lazy">
      </a>
      <div class="body">
        <a href="product.html?p=${p.slug}" style="color: inherit;">
          <div class="title">${p.name}</div>
          <div class="desc">${p.short}</div>
        </a>
      </div>
      <div class="foot">
        <div class="price"><small>USD</small> $${p.price}</div>
        <button class="btn-add" onclick="SS.add('${p.slug}'); SS.openCart();">Add</button>
      </div>
    </article>
  `;
}

function ssToggleFav(btn) {
  btn.classList.toggle("active");
  const slug = btn.dataset.fav;
  const favs = JSON.parse(localStorage.getItem("ss-favs") || "[]");
  if (btn.classList.contains("active")) {
    if (!favs.includes(slug)) favs.push(slug);
  } else {
    const idx = favs.indexOf(slug);
    if (idx >= 0) favs.splice(idx, 1);
  }
  localStorage.setItem("ss-favs", JSON.stringify(favs));
}

function ssRehydrateFavs() {
  const favs = JSON.parse(localStorage.getItem("ss-favs") || "[]");
  document.querySelectorAll("[data-fav]").forEach(b => {
    if (favs.includes(b.dataset.fav)) b.classList.add("active");
  });
}

/* ─── Boot ─── */
document.addEventListener("DOMContentLoaded", () => {
  ssShell();
  // ESC to close drawers
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") { SS.closeCart(); SS.closeMenu(); }
  });
  // Hydrate favs after any product cards mount
  setTimeout(ssRehydrateFavs, 50);
});
