// =========================================================
// ui.js (minimal helper untuk tabs + accordion + date)
// =========================================================

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Tabs: butuh elemen:
// - container root id, mis. "tabsRoot"
// - tombol tab punya attribute: data-tab="nama"
// - panel punya attribute: data-panel="nama"
function setupTabs(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const tabs = root.querySelectorAll("[data-tab]");
  const panels = root.querySelectorAll("[data-panel]");
  if (!tabs.length || !panels.length) return;

  function activate(name) {
    tabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-tab") === name));
    panels.forEach(p => p.style.display = (p.getAttribute("data-panel") === name ? "" : "none"));
  }

  tabs.forEach(t => {
    t.addEventListener("click", () => activate(t.getAttribute("data-tab")));
  });

  // default: tab pertama
  activate(tabs[0].getAttribute("data-tab"));
}

// Accordion: elemen yang umum dipakai:
// - tombol header: [data-acc-btn]
// - konten: [data-acc-body]
// Kalau struktur kamu beda, bilang—aku sesuaikan.
function setupAccordion(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const btns = root.querySelectorAll("[data-acc-btn]");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-acc-btn");
      const body = root.querySelector(`[data-acc-body="${id}"]`);
      if (!body) return;
      const isOpen = body.style.display !== "none";
      body.style.display = isOpen ? "none" : "";
    });
  });
}
