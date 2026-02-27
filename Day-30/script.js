const API_PRODUCTS = "/api/products";
const API_ORDERS = "/api/orders";
const CART_KEY = "titan_cart_v1";

const grid = document.getElementById("grid");
const emptyState = document.getElementById("emptyState");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const categoryPills = document.getElementById("categoryPills");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");

const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const cartItemsEl = document.getElementById("cartItems");
const cartBadge = document.getElementById("cartBadge");
const cartSubtitle = document.getElementById("cartSubtitle");
const subtotalEl = document.getElementById("subtotal");
const shippingEl = document.getElementById("shipping");
const totalEl = document.getElementById("total");
const checkoutBtn = document.getElementById("checkoutBtn");
const clearCartBtn = document.getElementById("clearCartBtn");

const checkoutModal = document.getElementById("checkoutModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const checkoutForm = document.getElementById("checkoutForm");
const orderSpinner = document.getElementById("orderSpinner");

const toast = document.getElementById("toast");

let allProducts = [];
let filtered = [];
let activeCategory = "";
let searchTerm = "";
let cart = loadCart(); // [{productId, qty, snapshot:{name,price,image,category}}]

function moneyINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function openDrawer() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeDrawer() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function openModal() {
  checkoutModal.classList.remove("hidden");
  checkoutModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  checkoutModal.classList.add("hidden");
  checkoutModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

openCartBtn.addEventListener("click", () => {
  renderCart();
  openDrawer();
});
closeCartBtn.addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) return showToast("Your cart is empty.");
  closeDrawer();
  openModal();
});
closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

clearCartBtn.addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
  updateBadge();
  showToast("Cart cleared.");
});

resetFiltersBtn.addEventListener("click", () => {
  activeCategory = "";
  searchTerm = "";
  searchInput.value = "";
  setActivePill("");
  applyFilters();
});

function setActivePill(cat) {
  [...categoryPills.querySelectorAll(".pill")].forEach((p) => {
    p.classList.toggle("is-active", p.dataset.category === cat);
  });
}

categoryPills.addEventListener("click", (e) => {
  const btn = e.target.closest(".pill");
  if (!btn) return;
  activeCategory = btn.dataset.category || "";
  setActivePill(activeCategory);
  applyFilters();
});

let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchTerm = searchInput.value.trim();
    applyFilters();
  }, 120);
});

sortSelect.addEventListener("change", applyFilters);

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateBadge() {
  const count = cart.reduce((sum, x) => sum + x.qty, 0);
  cartBadge.textContent = String(count);
}

function addToCart(product) {
  const existing = cart.find((x) => x.productId === product._id);
  if (existing) existing.qty += 1;
  else {
    cart.push({
      productId: product._id,
      qty: 1,
      snapshot: {
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category
      }
    });
  }
  saveCart();
  updateBadge();
  showToast("Added to cart ✅");
}

function decQty(productId) {
  const item = cart.find((x) => x.productId === productId);
  if (!item) return;
  item.qty -= 1;
  if (item.qty <= 0) cart = cart.filter((x) => x.productId !== productId);
  saveCart();
  renderCart();
  updateBadge();
}

function incQty(productId) {
  const item = cart.find((x) => x.productId === productId);
  if (!item) return;
  item.qty += 1;
  saveCart();
  renderCart();
  updateBadge();
}

function removeItem(productId) {
  cart = cart.filter((x) => x.productId !== productId);
  saveCart();
  renderCart();
  updateBadge();
}

function calcTotals() {
  const subtotal = cart.reduce((sum, x) => sum + (x.snapshot.price * x.qty), 0);
  // simple shipping rule
  const shipping = subtotal > 0 && subtotal < 1500 ? 99 : 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

function renderCart() {
  const count = cart.reduce((s, x) => s + x.qty, 0);
  cartSubtitle.textContent = count === 0 ? "Cart is empty" : `${count} item(s)`;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `
      <div class="emptyState">
        <div class="emptyState__icon">🛍️</div>
        <div class="emptyState__title">Your cart is empty</div>
        <div class="emptyState__text">Add a few items to start your order.</div>
      </div>
    `;
  } else {
    cartItemsEl.innerHTML = cart.map((x) => `
      <div class="cartItem">
        <img src="${x.snapshot.image}" alt="${escapeHtml(x.snapshot.name)}" />
        <div>
          <div class="cartItem__name">${escapeHtml(x.snapshot.name)}</div>
          <div class="cartItem__meta">
            <span>${moneyINR(x.snapshot.price)} • <span style="text-transform:capitalize">${escapeHtml(x.snapshot.category)}</span></span>
            <button class="remove" data-remove="${x.productId}">Remove</button>
          </div>

          <div class="cartItem__meta" style="margin-top:10px">
            <div class="qty">
              <button data-dec="${x.productId}" aria-label="Decrease quantity">−</button>
              <span>${x.qty}</span>
              <button data-inc="${x.productId}" aria-label="Increase quantity">+</button>
            </div>
            <strong>${moneyINR(x.snapshot.price * x.qty)}</strong>
          </div>
        </div>
      </div>
    `).join("");
  }

  const { subtotal, shipping, total } = calcTotals();
  subtotalEl.textContent = moneyINR(subtotal);
  shippingEl.textContent = moneyINR(shipping);
  totalEl.textContent = moneyINR(total);
}

cartItemsEl.addEventListener("click", (e) => {
  const dec = e.target.closest("[data-dec]");
  const inc = e.target.closest("[data-inc]");
  const rm = e.target.closest("[data-remove]");
  if (dec) return decQty(dec.dataset.dec);
  if (inc) return incQty(inc.dataset.inc);
  if (rm) return removeItem(rm.dataset.remove);
});

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSkeletons() {
  grid.innerHTML = Array.from({ length: 9 }).map(() => `
    <div class="card" style="overflow:hidden">
      <div style="height:190px;background:rgba(255,255,255,0.06)"></div>
      <div style="padding:14px">
        <div style="height:14px;width:70%;background:rgba(255,255,255,0.06);border-radius:8px"></div>
        <div style="height:12px;width:45%;background:rgba(255,255,255,0.05);border-radius:8px;margin-top:10px"></div>
        <div style="height:36px;background:rgba(255,255,255,0.06);border-radius:14px;margin-top:16px"></div>
      </div>
    </div>
  `).join("");
}

function renderProducts(list) {
  grid.innerHTML = list.map((p) => `
    <article class="card">
     <img
  class="card__img"
  src="${p.image}"
  alt="${escapeHtml(p.name)}"
  loading="lazy"
  referrerpolicy="no-referrer"
  onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=60';"
/>
      <div class="card__body">
        <div class="card__top">
          <div>
            <div class="card__name">${escapeHtml(p.name)}</div>
            <div class="card__cat">${escapeHtml(p.category)}</div>
          </div>
          <div class="card__price">${moneyINR(p.price)}</div>
        </div>

        <div class="card__meta">
          <div class="rating">⭐ ${Number(p.rating || 0).toFixed(1)}</div>
          <div class="rating" title="Fast delivery">⚡ Fast</div>
        </div>

        <div class="tagRow">
          ${(Array.isArray(p.tags) ? p.tags.slice(0, 3) : []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>

        <button class="addBtn" data-add="${p._id}">Add to Cart</button>
      </div>
    </article>
  `).join("");

  emptyState.classList.toggle("hidden", list.length !== 0);
  resultCount.textContent = `${list.length} result(s)`;
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  const id = btn.dataset.add;
  const product = allProducts.find((p) => p._id === id);
  if (!product) return;

  addToCart(product);

  btn.classList.add("pop");
  setTimeout(() => btn.classList.remove("pop"), 600);
});

function applyFilters() {
  filtered = [...allProducts];

  if (activeCategory) {
    filtered = filtered.filter((p) => p.category === activeCategory);
  }

  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(s));
  }

  const sort = sortSelect.value;
  if (sort === "price_asc") filtered.sort((a,b) => a.price - b.price);
  if (sort === "price_desc") filtered.sort((a,b) => b.price - a.price);
  if (sort === "rating_desc") filtered.sort((a,b) => (b.rating||0) - (a.rating||0));

  renderProducts(filtered);
}

async function fetchProductsFromApi() {
  renderSkeletons();

  // Fetch unfiltered list once, do filtering on client for instant experience
  const res = await fetch(API_PRODUCTS);
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json();

  // Ensure category normalized
  allProducts = data.map((p) => ({
    ...p,
    _id: String(p._id),
    category: String(p.category || "").toLowerCase()
  }));

  applyFilters();
}

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (cart.length === 0) return showToast("Cart is empty.");

  const fd = new FormData(checkoutForm);
  const customer = {
    name: String(fd.get("name") || "").trim(),
    email: String(fd.get("email") || "").trim(),
    address: String(fd.get("address") || "").trim()
  };

  // only send productId + qty, server will calculate total securely
  const items = cart.map((x) => ({ productId: x.productId, qty: x.qty }));

  orderSpinner.classList.remove("hidden");

  try {
    const res = await fetch(API_ORDERS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, items })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "Checkout failed");
    }

    // success
    cart = [];
    saveCart();
    updateBadge();
    closeModal();
    showToast(`Order placed ✅ Total: ${moneyINR(data.total)}`);
  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    orderSpinner.classList.add("hidden");
  }
});

// INIT
(async function init() {
  updateBadge();
  try {
    await fetchProductsFromApi();
  } catch (e) {
    grid.innerHTML = `
      <div class="emptyState">
        <div class="emptyState__icon">⚠️</div>
        <div class="emptyState__title">Couldn’t load products</div>
        <div class="emptyState__text">${escapeHtml(e.message)}</div>
      </div>
    `;
  }
})();