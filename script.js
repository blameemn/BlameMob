/* ============================================================
   BLAMEMOB V2 — interactions (vanilla, no dependencies)
   ============================================================ */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = n => '₱' + n.toLocaleString('en-PH');

  /* ---------- countdown to next Thursday 11:00 PHT (03:00 UTC) ---------- */
  function nextDrop() {
    const now = new Date();
    const d = new Date(now);
    const delta = (4 - d.getUTCDay() + 7) % 7;   // 4 = Thursday
    d.setUTCDate(d.getUTCDate() + delta);
    d.setUTCHours(3, 0, 0, 0);
    if (d <= now) d.setUTCDate(d.getUTCDate() + 7);
    return d;
  }
  let target = nextDrop();
  const cd = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') };
  const pad = n => String(n).padStart(2, '0');
  function tickCountdown() {
    let diff = Math.max(0, target - new Date());
    if (diff === 0) target = nextDrop();
    const sec = Math.floor(diff / 1000);
    cd.d.textContent = pad(Math.floor(sec / 86400));
    cd.h.textContent = pad(Math.floor(sec / 3600) % 24);
    cd.m.textContent = pad(Math.floor(sec / 60) % 60);
    cd.s.textContent = pad(sec % 60);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ---------- scroll state ---------- */
  let ticking = false;
  function onFrame() {
    document.body.classList.toggle('scrolled', window.scrollY > 30);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
  }, { passive: true });
  onFrame();

  /* ---------- reveal (layout rect — clip-path targets need this) ---------- */
  const revealEls = $$('[data-reveal]');
  if (reduced) {
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    function checkReveals() {
      const vh = window.innerHeight;
      for (let i = revealEls.length - 1; i >= 0; i--) {
        const r = revealEls[i].getBoundingClientRect();
        if (r.top < vh * 0.94 && r.bottom > 0) {
          revealEls[i].classList.add('in');
          revealEls.splice(i, 1);
        }
      }
    }
    window.addEventListener('scroll', () => requestAnimationFrame(checkReveals), { passive: true });
    window.addEventListener('resize', checkReveals);
    checkReveals();
    setTimeout(checkReveals, 300);
  }

  /* ---------- active nav ---------- */
  const navLinks = $$('.nav-links a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-30% 0px -62% 0px' });
    ['shop', 'lookbook', 'album', 'about', 'signup'].forEach(id => {
      const el = document.getElementById(id); if (el) io.observe(el);
    });
  }

  /* ---------- overlay plumbing ---------- */
  const scrim = $('#scrim'), drawer = $('#cartDrawer'), modal = $('#quickView');
  const menu = $('#mobileMenu'), menuBtn = $('#menuBtn');
  function sync() {
    const d = drawer.classList.contains('open');
    const m = modal.classList.contains('open');
    const u = menu.classList.contains('open');
    document.body.classList.toggle('locked', d || m || u);
    scrim.classList.toggle('show', d || m);
    drawer.setAttribute('aria-hidden', String(!d));
    modal.setAttribute('aria-hidden', String(!m));
    menu.setAttribute('aria-hidden', String(!u));
  }
  function closeAll() {
    drawer.classList.remove('open'); modal.classList.remove('open');
    menu.classList.remove('open'); menuBtn.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    sync();
  }
  function openCart() { closeAll(); drawer.classList.add('open'); sync(); }
  function openModal() { closeAll(); modal.classList.add('open'); sync(); }
  $('#cartOpen').addEventListener('click', openCart);
  $$('[data-close]').forEach(b => b.addEventListener('click', closeAll));
  scrim.addEventListener('click', closeAll);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
    if (e.key === 'Tab' && (drawer.classList.contains('open') || modal.classList.contains('open'))) {
      const box = drawer.classList.contains('open') ? drawer : modal;
      const f = $$('button, a, input', box).filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- mobile menu ---------- */
  menuBtn.addEventListener('click', () => {
    const willOpen = !menu.classList.contains('open');
    closeAll();
    menu.classList.toggle('open', willOpen);
    menuBtn.classList.toggle('open', willOpen);
    menuBtn.setAttribute('aria-expanded', String(willOpen));
    sync();
  });
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', closeAll));

  /* ---------- toast ---------- */
  const toast = $('#toast'), toastText = $('#toastText');
  let toastTimer;
  function showToast(msg) {
    toastText.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  /* ---------- cart ---------- */
  let cart = [];
  const cartBody = $('#cartBody'), cartCount = $('#cartCount'), cartTotal = $('#cartTotal');
  function addToCart(name, price, img, size) {
    const key = name + '|' + size;
    const found = cart.find(i => i.key === key);
    if (found) found.qty += 1;
    else cart.push({ key, name, price, img, size, qty: 1 });
    renderCart();
    cartCount.classList.remove('pop'); void cartCount.offsetWidth; cartCount.classList.add('pop');
    showToast('Added to bag — ' + name);
  }
  function renderCart() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
    cartCount.textContent = count;
    cartTotal.textContent = money(total);
    if (!cart.length) {
      cartBody.innerHTML = `<div class="cart-empty"><span class="display">Empty Bag</span><p>Go grab something<br>before it's gone.</p><a href="#shop" class="btn btn-ghost" data-cart-close style="margin-top:8px">Shop the drop <svg viewBox="0 0 24 24"><use href="#i-arrow-diag"/></svg></a></div>`;
      const link = $('[data-cart-close]', cartBody);
      if (link) link.addEventListener('click', closeAll);
      return;
    }
    cartBody.innerHTML = cart.map(i => `
      <div class="cart-line" data-key="${i.key}">
        <img src="${i.img}" alt="${i.name}">
        <div class="cart-line-info">
          <h5>${i.name}</h5><small>Size ${i.size} / Black</small>
          <div class="qty"><button data-act="minus" aria-label="Decrease quantity">−</button><span>${i.qty}</span><button data-act="plus" aria-label="Increase quantity">+</button></div>
          <button class="cart-remove" data-act="remove">Remove</button>
        </div>
        <div class="cart-line-price">${money(i.price * i.qty)}</div>
      </div>`).join('');
  }
  cartBody.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const key = btn.closest('.cart-line').dataset.key;
    const item = cart.find(i => i.key === key); if (!item) return;
    const act = btn.dataset.act;
    if (act === 'plus') item.qty += 1;
    if (act === 'minus') { item.qty -= 1; if (item.qty < 1) cart = cart.filter(i => i.key !== key); }
    if (act === 'remove') cart = cart.filter(i => i.key !== key);
    renderCart();
  });
  $('#checkoutBtn').addEventListener('click', () => showToast(cart.length ? 'Demo store — checkout not connected' : 'Your bag is empty'));
  renderCart();

  /* ---------- quick view ---------- */
  let current = null;
  function openQV(product) {
    current = product;
    const d = product.dataset;
    $('#qvImg').src = d.img; $('#qvImg').alt = d.name;
    $('#qvName').textContent = d.name;
    $('#qvCat').textContent = d.cat;
    $('#qvPrice').textContent = money(+d.price);
    $('#qvAddPrice').textContent = money(+d.price);
    $('#qvDesc').textContent = d.desc;
    $$('#qvSizes button').forEach((b, n) => b.classList.toggle('sel', n === 1));
    openModal();
    setTimeout(() => { const c = $('[data-close]', modal); if (c) c.focus(); }, 100);
  }
  $('#qvSizes').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#qvSizes button').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
  });
  $('#qvAdd').addEventListener('click', () => {
    if (!current) return;
    const size = (($('.sel', $('#qvSizes')) || {}).textContent || 'M').trim();
    addToCart(current.dataset.name, +current.dataset.price, current.dataset.img, size);
    closeAll();
  });
  $$('.product').forEach(p => {
    const media = $('.product-media', p);
    media.addEventListener('click', e => { if (!e.target.closest('.product-add')) openQV(p); });
    media.addEventListener('keydown', e => {
      if (e.target === media && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openQV(p); }
    });
    $('.product-add', p).addEventListener('click', e => {
      e.stopPropagation();
      addToCart(p.dataset.name, +p.dataset.price, p.dataset.img, 'M');
    });
  });

  /* ---------- newsletter ---------- */
  const form = $('#signupForm'), email = $('#signupEmail'), note = $('#signupNote');
  function subscribe() {
    const v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      note.textContent = 'That email doesn’t look right. Try again.';
      note.className = 'signup-note err';
      email.focus();
      return;
    }
    note.textContent = 'You’re in. Watch your inbox.';
    note.className = 'signup-note ok';
    form.reset();
    try { localStorage.setItem('blamemob_subscriber', v); } catch (_) {}
  }
  $('#signupSubmit').addEventListener('click', subscribe);
  email.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); subscribe(); } });
  form.addEventListener('submit', e => { e.preventDefault(); subscribe(); });

  /* ---------- anchors + misc ---------- */
  $('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const targetEl = document.querySelector(id);
      if (!targetEl) return;
      e.preventDefault();
      const top = targetEl.getBoundingClientRect().top + window.scrollY - 78;
      window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
      try { if (history.replaceState) history.replaceState(null, '', id); } catch (_) {}
    });
  });
})();
