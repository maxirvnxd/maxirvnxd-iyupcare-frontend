async function loadMeAndRender(greetId){
  const el = document.getElementById(greetId);
  if(!el) return;
  try{
    const me = await api("/me", { auth:true });
    const name = me?.name || "Bunda";
    el.textContent = `Halo, ${name}!`;
  }catch(e){
    el.textContent = "Halo!";
  }
}

function monthsBetween(d1, d2){
  const y = d2.getFullYear() - d1.getFullYear();
  const m = d2.getMonth() - d1.getMonth();
  return y*12 + m + (d2.getDate() >= d1.getDate() ? 0 : -1);
}

function ageTextFromBirthdate(birthISO){
  if(!birthISO) return "—";
  const birth = new Date(birthISO);
  const now = new Date();
  const total = Math.max(0, monthsBetween(birth, now));
  const years = Math.floor(total/12);
  const months = total % 12;
  return `${years} Thn ${months} Bulan`;
}

async function loadAnakList(selectId){
  const sel = document.getElementById(selectId);
  if(!sel) return [];
  sel.innerHTML = `<option value="">Memuat...</option>`;
  try{
    const res = await api("/anak", { auth:true });
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    sel.innerHTML = `<option value="">- pilih anak -</option>` + list.map(a => {
      return `<option value="${a.id}">${a.nama ?? ("Anak #" + a.id)}</option>`;
    }).join("");
    return list;
  }catch(e){
    sel.innerHTML = `<option value="">Gagal memuat anak</option>`;
    return [];
  }
}

async function loadMonitoringByAnak(anakId){
  if(!anakId) return [];
  try{
    const res = await api(`/anak/${anakId}/monitoring`, { auth:true });
    // sesuaikan bentuk response: bisa {data:[...]} atau [...]
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    return list;
  }catch(e){
    return [];
  }
}
