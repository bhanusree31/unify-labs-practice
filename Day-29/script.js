const views = {
  grid: document.getElementById("viewGrid"),
  post: document.getElementById("viewPost"),
  editor: document.getElementById("viewEditor")
};

const els = {
  blogGrid: document.getElementById("blogGrid"),
  emptyState: document.getElementById("emptyState"),
  btnEmptyCreate: document.getElementById("btnEmptyCreate"),
  btnHome: document.getElementById("btnHome"),
  btnNew: document.getElementById("btnNew"),
  btnBack: document.getElementById("btnBack"),
  btnEdit: document.getElementById("btnEdit"),
  btnDelete: document.getElementById("btnDelete"),
  btnCancel: document.getElementById("btnCancel"),
  btnTheme: document.getElementById("btnTheme"),
  themeLabel: document.getElementById("themeLabel"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  toast: document.getElementById("toast"),

  postTitle: document.getElementById("postTitle"),
  postCategory: document.getElementById("postCategory"),
  postDate: document.getElementById("postDate"),
  postContent: document.getElementById("postContent"),

  editorHeading: document.getElementById("editorHeading"),
  postForm: document.getElementById("postForm"),
  titleInput: document.getElementById("titleInput"),
  categoryInput: document.getElementById("categoryInput"),
  contentInput: document.getElementById("contentInput")
};

let cache = { posts: [], activeId: null, editingId: null };

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.add("hidden"), 2200);
}

function setView(name) {
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch { return "—"; }
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    let msg = "Request failed.";
    try { msg = (await res.json())?.message || msg; } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// Theme
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  els.themeLabel.textContent = theme === "light" ? "Dark" : "Light";
  localStorage.setItem("zenith_theme", theme);
}
function initTheme() {
  const saved = localStorage.getItem("zenith_theme");
  applyTheme(saved === "dark" ? "dark" : "light");
}
els.btnTheme.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

// Grid helpers
function buildCategoryOptions(posts) {
  const cats = [...new Set(posts.map(p => (p.category || "").trim()).filter(Boolean))].sort();
  els.categoryFilter.innerHTML = `
    <option value="">All Categories</option>
    ${cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("")}
  `;
}

function getFilteredPosts() {
  const q = (els.searchInput.value || "").trim().toLowerCase();
  const cat = (els.categoryFilter.value || "").trim().toLowerCase();

  return cache.posts.filter(p => {
    const title = (p.title || "").toLowerCase();
    const category = (p.category || "").toLowerCase();
    const matchesQ = !q || title.includes(q) || category.includes(q);
    const matchesC = !cat || category === cat;
    return matchesQ && matchesC;
  });
}

function renderGrid() {
  const posts = getFilteredPosts();

  if (!posts.length) {
    els.blogGrid.innerHTML = "";
    els.emptyState.classList.remove("hidden");
    return;
  }
  els.emptyState.classList.add("hidden");

  els.blogGrid.innerHTML = posts.map(p => {
    const preview = (p.content || "").slice(0, 150).trim() + ((p.content || "").length > 150 ? "…" : "");
    return `
      <article class="card">
        <div class="card-top">
          <span class="pill"><span class="dot"></span>${escapeHTML(p.category || "General")}</span>
          <span class="muted" style="font-size:12px">${escapeHTML(formatDate(p.createdAt))}</span>
        </div>
        <h3>${escapeHTML(p.title || "Untitled")}</h3>
        <p>${escapeHTML(preview || "No content")}</p>
        <div class="card-actions">
          <button class="btn ghost" type="button" data-open="${p._id}">Read</button>
          <button class="btn ghost" type="button" data-edit="${p._id}">Edit</button>
          <button class="btn danger" type="button" data-del="${p._id}">Delete</button>
        </div>
      </article>
    `;
  }).join("");

  els.blogGrid.querySelectorAll("[data-open]").forEach(btn =>
    btn.addEventListener("click", () => openPost(btn.dataset.open))
  );
  els.blogGrid.querySelectorAll("[data-edit]").forEach(btn =>
    btn.addEventListener("click", () => openEditor(btn.dataset.edit))
  );
  els.blogGrid.querySelectorAll("[data-del]").forEach(btn =>
    btn.addEventListener("click", () => deletePost(btn.dataset.del))
  );
}

async function loadPosts() {
  cache.posts = await api("/api/posts");
  buildCategoryOptions(cache.posts);
  renderGrid();
}

// Views
async function openPost(id) {
  const post = await api(`/api/posts/${id}`);
  cache.activeId = id;

  els.postTitle.textContent = post.title || "Untitled";
  els.postCategory.textContent = post.category || "General";
  els.postDate.textContent = `Published: ${formatDate(post.createdAt)} • Updated: ${formatDate(post.updatedAt)}`;
  els.postContent.textContent = post.content || "";

  els.btnEdit.dataset.id = id;
  els.btnDelete.dataset.id = id;

  setView("post");
  location.hash = `#/post/${id}`;
}

function openEditor(id = null) {
  cache.editingId = id;

  if (!id) {
    els.editorHeading.textContent = "New Post";
    els.titleInput.value = "";
    els.categoryInput.value = "";
    els.contentInput.value = "";
    setView("editor");
    location.hash = "#/new";
    return;
  }

  const post = cache.posts.find(p => p._id === id);
  els.editorHeading.textContent = "Edit Post";
  els.titleInput.value = post?.title || "";
  els.categoryInput.value = post?.category || "";
  els.contentInput.value = post?.content || "";

  setView("editor");
  location.hash = `#/edit/${id}`;
}

async function createPost(payload) {
  await api("/api/posts", { method: "POST", body: JSON.stringify(payload) });
  showToast("Post created.");
  await loadPosts();
  setView("grid");
  location.hash = "#/";
}

async function updatePost(id, payload) {
  await api(`/api/posts/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  showToast("Post updated.");
  await loadPosts();
  await openPost(id);
}

async function deletePost(id) {
  const ok = confirm("Delete this post permanently?");
  if (!ok) return;

  await api(`/api/posts/${id}`, { method: "DELETE" });
  showToast("Post deleted.");
  await loadPosts();
  setView("grid");
  location.hash = "#/";
}

// UI events
els.btnHome.addEventListener("click", () => { setView("grid"); location.hash = "#/"; });
els.btnNew.addEventListener("click", () => openEditor(null));
els.btnEmptyCreate.addEventListener("click", () => openEditor(null));
els.btnBack.addEventListener("click", () => { setView("grid"); location.hash = "#/"; });
els.btnEdit.addEventListener("click", () => { const id = els.btnEdit.dataset.id; if (id) openEditor(id); });
els.btnDelete.addEventListener("click", () => { const id = els.btnDelete.dataset.id; if (id) deletePost(id); });
els.btnCancel.addEventListener("click", () => { setView("grid"); location.hash = "#/"; });

els.postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: els.titleInput.value.trim(),
    category: els.categoryInput.value.trim(),
    content: els.contentInput.value.trim()
  };

  if (!payload.title || !payload.category || !payload.content) {
    showToast("Please fill Title, Category, and Content.");
    return;
  }

  try {
    if (!cache.editingId) await createPost(payload);
    else await updatePost(cache.editingId, payload);
  } catch (err) {
    showToast(err.message || "Save failed.");
  }
});

els.searchInput.addEventListener("input", renderGrid);
els.categoryFilter.addEventListener("change", renderGrid);

// Router
async function handleRoute() {
  const hash = location.hash || "#/";
  const parts = hash.replace("#/", "").split("/").filter(Boolean);

  try {
    if (parts.length === 0) { setView("grid"); return; }
    const [route, id] = parts;

    if (route === "post" && id) return await openPost(id);
    if (route === "new") return openEditor(null);
    if (route === "edit" && id) return openEditor(id);

    setView("grid");
  } catch (err) {
    showToast(err.message || "Navigation error.");
    setView("grid");
  }
}

window.addEventListener("hashchange", handleRoute);

// Init
(async function init() {
  initTheme();
  try {
    await loadPosts();
    await handleRoute();
  } catch (err) {
    showToast(err.message || "Failed to load posts.");
  }
})();