function extractToken(resp) {
  // fleksibel: tergantung AuthController kamu return field apa
  return resp?.token || resp?.access_token || resp?.data?.token || resp?.data?.access_token || null;
}

function showError(el, err) {
  const payload = err?.payload;
  let msg = err?.message || "Terjadi error";

  // kalau 422 biasanya ada errors:{field:[...]}
  if (payload?.errors) {
    const parts = [];
    for (const k of Object.keys(payload.errors)) {
      parts.push(`${k}: ${payload.errors[k].join(", ")}`);
    }
    msg = parts.join(" | ");
  }
  el.className = "msg error";
  el.textContent = msg;
}

function showOk(el, msg) {
  el.className = "msg";
  el.textContent = msg;
}

function requireAuthOrRedirect() {
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
  }
}
