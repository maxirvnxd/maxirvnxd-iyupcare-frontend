// =========================================================
// api.js (PROD-READY for iYupCare)
// Default behavior:
// - Local dev (localhost/127.0.0.1/file): http://127.0.0.1:8000/api
// - Non-local (Vercel/production): https://maxirvnxd-iyupcare-backend.hf.space/api
//
// Override options (highest priority first):
// A) window.__API_BASE__ = "https://.../api"   (set BEFORE loading api.js)
// B) <meta name="api-base" content="https://.../api">  (in HTML <head>)
// C) localStorage API_BASE via setApiBase("https://.../api")
// =========================================================

(() => {
  "use strict";

  // -------------------- CONFIG --------------------
  const DEFAULT_LOCAL_API_BASE = "http://127.0.0.1:8000/api";
  const DEFAULT_HF_API_BASE = "https://maxirvnxd-iyupcare-backend.hf.space/api";

  const STORAGE_KEY_TOKEN = "token";
  const STORAGE_KEY_API_BASE = "API_BASE";

  function normalizeApiBase(url) {
    if (!url || typeof url !== "string") return null;
    let u = url.trim();

    // allow "/api" relative
    if (u.startsWith("/")) return u.replace(/\/+$/, "");

    // must be http(s)
    if (!/^https?:\/\//i.test(u)) return null;

    return u.replace(/\/+$/, "");
  }

  function isLocalEnvironment() {
    const host = (location.hostname || "").toLowerCase();
    const proto = (location.protocol || "").toLowerCase();

    return (
      proto === "file:" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local")
    );
  }

  function detectApiBase() {
    // 1) Explicit global variable (highest priority)
    if (typeof window.__API_BASE__ === "string") {
      const v = normalizeApiBase(window.__API_BASE__);
      if (v) return v;
    }

    // 2) Meta tag
    const meta = document.querySelector('meta[name="api-base"]');
    if (meta && typeof meta.content === "string") {
      const v = normalizeApiBase(meta.content);
      if (v) return v;
    }

    // 3) localStorage override
    const fromStorage = localStorage.getItem(STORAGE_KEY_API_BASE);
    if (fromStorage) {
      const v = normalizeApiBase(fromStorage);
      if (v) return v;
    }

    // 4) Default by environment
    if (isLocalEnvironment()) return DEFAULT_LOCAL_API_BASE;
    return DEFAULT_HF_API_BASE;
  }

  let API_BASE = detectApiBase();

  // Expose minimal helpers globally for your other scripts
  window.getApiBase = function getApiBase() {
    return API_BASE;
  };

  window.setApiBase = function setApiBase(url) {
    const v = normalizeApiBase(url);
    if (!v) {
      throw new Error(
        "API_BASE tidak valid. Contoh benar: https://.../api atau http://127.0.0.1:8000/api"
      );
    }
    API_BASE = v;
    localStorage.setItem(STORAGE_KEY_API_BASE, v);
    return v;
  };

  window.clearApiBase = function clearApiBase() {
    localStorage.removeItem(STORAGE_KEY_API_BASE);
    API_BASE = detectApiBase();
    return API_BASE;
  };

  // -------------------- TOKEN HELPERS --------------------
  window.setToken = function setToken(token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  };

  window.getToken = function getToken() {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  };

  window.clearToken = function clearToken() {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  // -------------------- RESPONSE PARSER --------------------
  async function parseResponse(res) {
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!text) return null;

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch (e) {
        return { raw: text, parse_error: String(e) };
      }
    }

    return { raw: text };
  }

  function buildErrorMessage(resStatus, data) {
    let msg = `HTTP ${resStatus}`;

    if (data && typeof data === "object") {
      if (typeof data.message === "string" && data.message.trim()) {
        msg = data.message;
      } else if (typeof data.error === "string" && data.error.trim()) {
        msg = data.error;
      }

      // Laravel validation format: { message, errors: { field: [..] } }
      if (data.errors && typeof data.errors === "object") {
        const parts = [];
        for (const [field, arr] of Object.entries(data.errors)) {
          if (Array.isArray(arr) && arr.length) parts.push(`${field}: ${arr[0]}`);
        }
        if (parts.length) msg = parts.join(" | ");
      }
    }

    return msg;
  }

  // -------------------- MAIN API FUNCTION --------------------
  /**
   * api("/auth/login", { method:"POST", body:{...} })
   * api("/kalkulator", { method:"POST", body:{...}, auth:true })
   */
  window.api = async function api(
    path,
    { method = "GET", body = null, auth = false, headers: extraHeaders = {}, signal = undefined } = {}
  ) {
    const cleanPath = String(path || "");
    const finalPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;

    const headers = {
      Accept: "application/json",
      ...extraHeaders,
    };

    const m = String(method || "GET").toUpperCase();
    const hasBody = body !== null && body !== undefined && m !== "GET";
    if (hasBody) headers["Content-Type"] = "application/json";

    if (auth) {
      const token = window.getToken();
      if (!token) {
        const err = new Error("TOKEN_MISSING: Login dulu agar ada token.");
        err.status = 401;
        err.payload = null;
        throw err;
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${API_BASE}${finalPath}`, {
        method: m,
        headers,
        body: hasBody ? JSON.stringify(body) : null,
        signal,
      });
    } catch (netErr) {
      const err = new Error(`NETWORK_ERROR: ${netErr?.message || "fetch gagal"}`);
      err.status = 0;
      err.payload = null;
      throw err;
    }

    const data = await parseResponse(res);

    if (!res.ok) {
      const err = new Error(buildErrorMessage(res.status, data));
      err.status = res.status;
      err.payload = data;
      throw err;
    }

    return data;
  };

  // -------------------- UI HELPERS (optional) --------------------
  window.showOk = function showOk(el, text) {
    if (!el) return;
    el.innerHTML = `<div class="alert ok">${text}</div>`;
  };

  window.showError = function showError(el, err) {
    if (!el) return;

    let msg = "Terjadi error.";
    if (typeof err === "string") msg = err;
    else if (err?.message) msg = err.message;

    const details =
      err?.payload
        ? `<pre style="white-space:pre-wrap;margin:8px 0 0">${escapeHtml(
            JSON.stringify(err.payload, null, 2)
          )}</pre>`
        : "";

    el.innerHTML = `<div class="alert err">${escapeHtml(msg)}${details}</div>`;
  };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Optional quick check:
  // console.log("[api.js] API_BASE =", API_BASE);
})();
