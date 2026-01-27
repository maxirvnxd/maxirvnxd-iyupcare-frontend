// =========================================================
// api.js (FINAL)
// =========================================================

// UBAH kalau backend kamu beda host/port:
const API_BASE = "http://127.0.0.1:8000/api";

// -------------------- TOKEN HELPERS --------------------
function setToken(token) {
  localStorage.setItem("token", token);
}

function getToken() {
  return localStorage.getItem("token");
}

function clearToken() {
  localStorage.removeItem("token");
}

// -------------------- RESPONSE PARSER --------------------
async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  // Kalau kosong
  if (!text) return null;

  // Kalau server ngirim JSON
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return { raw: text, parse_error: String(e) };
    }
  }

  // Kalau bukan JSON
  return { raw: text };
}

// -------------------- MAIN API FUNCTION --------------------
/**
 * api("/kalkulator", { method:"POST", body:{...}, auth:true })
 *
 * @param {string} path - contoh: "/auth/login", "/kalkulator"
 * @param {object} options
 * @param {string} options.method - GET/POST/PUT/DELETE
 * @param {object|null} options.body - object yg akan di-JSON.stringify
 * @param {boolean} options.auth - kalau true, otomatis kirim Authorization Bearer token
 * @param {object} options.headers - header tambahan (opsional)
 */
async function api(path, { method = "GET", body = null, auth = false, headers: extraHeaders = {} } = {}) {
  // Pastikan path diawali "/"
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  const headers = {
    "Accept": "application/json",
    ...extraHeaders,
  };

  // Body JSON hanya untuk method yg mengirim data
  const hasBody = body !== null && body !== undefined && method !== "GET";
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  // Auth header kalau protected
  if (auth) {
    const token = getToken();
    if (!token) {
      const err = new Error("TOKEN_MISSING: Login dulu agar ada token.");
      err.status = 401;
      err.payload = null;
      throw err;
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  // DEBUG (kalau perlu)
  // console.log("API REQUEST:", method, `${API_BASE}${cleanPath}`, { body, headers });

  const res = await fetch(`${API_BASE}${cleanPath}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : null,
  });

  const data = await parseResponse(res);

  // Error handling
  if (!res.ok) {
    // Laravel sering kirim errors di: { message, errors: {field:[...]} }
    let msg = `HTTP ${res.status}`;
    if (data?.message) msg = data.message;
    else if (data?.error) msg = data.error;

    // kalau ada validasi laravel errors, gabungkan jadi 1 string
    if (data?.errors && typeof data.errors === "object") {
      const parts = [];
      for (const [field, arr] of Object.entries(data.errors)) {
        if (Array.isArray(arr) && arr.length) parts.push(`${field}: ${arr[0]}`);
      }
      if (parts.length) msg = parts.join(" | ");
    }

    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

// -------------------- UI HELPERS (optional) --------------------
// Kalau kamu sudah punya showOk/showError di auth.js, ini boleh dihapus.
// Tapi ini aman kalau dibutuhkan.
function showOk(el, text) {
  if (!el) return;
  el.innerHTML = `<div class="alert ok">${text}</div>`;
}

function showError(el, err) {
  if (!el) return;

  let msg = "Terjadi error.";
  if (typeof err === "string") msg = err;
  else if (err?.message) msg = err.message;

  // tampilkan juga payload kalau ada (untuk debug)
  const details = err?.payload ? `<pre style="white-space:pre-wrap;margin:8px 0 0">${JSON.stringify(err.payload, null, 2)}</pre>` : "";

  el.innerHTML = `<div class="alert err">${msg}${details}</div>`;
}

// =========================================================
// Notes pemakaian singkat:
//
// Login:
// const data = await api("/auth/login", { method:"POST", body:{ email, password } });
// setToken(data.token);
//
// Protected request:
// const resp = await api("/kalkulator", { method:"POST", body:payload, auth:true });
//
// Logout:
// await api("/auth/logout", { method:"POST", auth:true });
// clearToken();
// =========================================================
