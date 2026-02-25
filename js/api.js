// =========================================================
// api.js (PROD + ADMIN READY for iYupCare)
// - Support USER token ("token")
// - Support ADMIN token ("admin_token")
// - api(...) => default pakai token user
// - apiAdmin(...) => pakai token admin
// =========================================================

(() => {
  "use strict";

  // -------------------- CONFIG --------------------
  const DEFAULT_LOCAL_API_BASE = "http://127.0.0.1:8000/api";
  const DEFAULT_HF_API_BASE = "https://maxirvnxd-iyupcare-backend.hf.space/api";

  const STORAGE_KEY_TOKEN = "token";
  const STORAGE_KEY_ADMIN_TOKEN = "admin_token";
  const STORAGE_KEY_API_BASE = "API_BASE";

  function normalizeApiBase(url) {
    if (!url || typeof url !== "string") return null;
    let u = url.trim();
    if (u.startsWith("/")) return u.replace(/\/+$/, "");
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
    if (typeof window.__API_BASE__ === "string") {
      const v = normalizeApiBase(window.__API_BASE__);
      if (v) return v;
    }

    const meta = document.querySelector('meta[name="api-base"]');
    if (meta && typeof meta.content === "string") {
      const v = normalizeApiBase(meta.content);
      if (v) return v;
    }

    const fromStorage = localStorage.getItem(STORAGE_KEY_API_BASE);
    if (fromStorage) {
      const v = normalizeApiBase(fromStorage);
      if (v) return v;
    }

    return isLocalEnvironment()
      ? DEFAULT_LOCAL_API_BASE
      : DEFAULT_HF_API_BASE;
  }

  let API_BASE = detectApiBase();

  window.getApiBase = () => API_BASE;

  window.setApiBase = function (url) {
    const v = normalizeApiBase(url);
    if (!v) throw new Error("API_BASE tidak valid.");
    API_BASE = v;
    localStorage.setItem(STORAGE_KEY_API_BASE, v);
    return v;
  };

  window.clearApiBase = function () {
    localStorage.removeItem(STORAGE_KEY_API_BASE);
    API_BASE = detectApiBase();
    return API_BASE;
  };

  // -------------------- TOKEN HELPERS --------------------
  window.setToken = function (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  };

  window.getToken = function () {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  };

  window.clearToken = function () {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  // ADMIN TOKEN
  window.setAdminToken = function (token) {
    localStorage.setItem(STORAGE_KEY_ADMIN_TOKEN, token);
  };

  window.getAdminToken = function () {
    return localStorage.getItem(STORAGE_KEY_ADMIN_TOKEN);
  };

  window.clearAdminToken = function () {
    localStorage.removeItem(STORAGE_KEY_ADMIN_TOKEN);
  };

  // -------------------- RESPONSE PARSER --------------------
  async function parseResponse(res) {
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!text) return null;

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    }

    return { raw: text };
  }

  function buildErrorMessage(resStatus, data) {
    let msg = `HTTP ${resStatus}`;

    if (data?.message) msg = data.message;
    if (data?.error) msg = data.error;

    if (data?.errors) {
      const parts = [];
      for (const [field, arr] of Object.entries(data.errors)) {
        if (Array.isArray(arr) && arr.length)
          parts.push(`${field}: ${arr[0]}`);
      }
      if (parts.length) msg = parts.join(" | ");
    }

    return msg;
  }

  function isFormDataBody(body) {
    return typeof FormData !== "undefined" && body instanceof FormData;
  }

  // -------------------- CORE REQUEST --------------------
  async function coreApi(
    path,
    {
      method = "GET",
      body = null,
      auth = false,
      headers: extraHeaders = {},
      signal = undefined,
      tokenKey = "user", // "user" or "admin"
    } = {}
  ) {
    const cleanPath = String(path || "");
    const finalPath = cleanPath.startsWith("/")
      ? cleanPath
      : `/${cleanPath}`;

    const m = method.toUpperCase();
    const hasBody = body !== null && body !== undefined && m !== "GET";
    const bodyIsFD = isFormDataBody(body);

    const headers = {
      Accept: "application/json",
      ...extraHeaders,
    };

    if (hasBody && !bodyIsFD) {
      headers["Content-Type"] = "application/json";
    }

    if (auth) {
      let token =
        tokenKey === "admin"
          ? window.getAdminToken()
          : window.getToken();

      if (!token) {
        const err = new Error("TOKEN_MISSING: Login dulu.");
        err.status = 401;
        throw err;
      }

      headers["Authorization"] = `Bearer ${token}`;
    }

    let fetchBody = null;
    if (hasBody) {
      fetchBody = bodyIsFD ? body : JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(`${API_BASE}${finalPath}`, {
        method: m,
        headers,
        body: fetchBody,
        signal,
      });
    } catch (netErr) {
      const err = new Error("NETWORK_ERROR: " + netErr.message);
      err.status = 0;
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
  }

  // USER API
  window.api = function (path, options = {}) {
    return coreApi(path, { ...options, tokenKey: "user" });
  };

  // ADMIN API
  window.apiAdmin = function (path, options = {}) {
    return coreApi(path, {
      ...options,
      auth: true,
      tokenKey: "admin",
    });
  };

  // -------------------- UI HELPERS --------------------
  window.showOk = function (el, text) {
    if (!el) return;
    el.style.display = "block";
    el.innerHTML = `<div class="alert ok">${text}</div>`;
  };

  window.showError = function (el, err) {
    if (!el) return;
    el.style.display = "block";

    let msg = "Terjadi error.";
    if (typeof err === "string") msg = err;
    else if (err?.message) msg = err.message;

    el.innerHTML = `<div class="alert err">${msg}</div>`;
  };
})();