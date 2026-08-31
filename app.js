
const $ = (s) => document.querySelector(s);
const state = {
  lang: localStorage.getItem("as_lang") || "en",
  token: localStorage.getItem("as_token") || "",
  user: JSON.parse(localStorage.getItem("as_user") || "null"),
  tab: "home",
  centres: [],
  booking: null,
  deferredPrompt: null,
  authMode: "login",
  server: localStorage.getItem("as_server") || "",
};
const t = (k) => (window.I18N?.[state.lang]?.[k] || window.I18N?.en?.[k] || k);

function toast(msg) {
  const el = $("#toast");
  el.hidden = false;
  el.textContent = msg;
  setTimeout(() => (el.hidden = true), 2600);
}

function apiBase() {
  const cloud = (window.ANNASETU_CLOUD || "").replace(/\/$/, "");
  const typed = String(state.server || "").replace(/\/$/, "");
  return typed || cloud;
}
async function api(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const body = opts.body || {};
  const hosted = location.protocol === "http:" || location.protocol === "https:";
  const useCloud = hosted || apiBase().length > 8;
  if (!useCloud && window.LocalAPI) {
    const clean = path.split("?")[0];
    if (path.includes("centreId=")) {
      const q = path.split("centreId=")[1];
      const all = await window.LocalAPI.handle("/api/slots", method, body, state.token);
      return all.filter((s) => s.centreId === q);
    }
    return window.LocalAPI.handle(clean, method, body, state.token);
  }
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (state.token) headers.Authorization = "Bearer " + state.token;
  try {
    const res = await fetch(apiBase() + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (e) {
    if (!hosted && window.LocalAPI) return window.LocalAPI.handle(path.split("?")[0], method, body, state.token);
    throw e;
  }
}

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("as_token", token);
  localStorage.setItem("as_user", JSON.stringify(user));
}
function logout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("as_token");
  localStorage.removeItem("as_user");
  state.tab = "home";
  render();
}
function setLang(lang) {
  state.lang = lang;
  localStorage.setItem("as_lang", lang);
  document.documentElement.lang = lang === "hi" ? "hi" : lang === "te" ? "te" : "en";
  render();
}

function navFor(role) {
  if (role === "farmer") return [["home",t("home")],["book",t("book")],["token",t("token")],["track",t("track")],["more",t("more")]];
  if (role === "centre") return [["home",t("queue")],["scan",t("scan")],["yard",t("yard")],["more",t("more")]];
  if (role === "transport") return [["home",t("trips")],["more",t("more")]];
  if (role === "payment") return [["home",t("dbt")],["more",t("more")]];
  if (role === "sms") return [["home","SMS"],["more",t("more")]];
  if (role === "officer") return [["home",t("myDistrict")],["heat",t("crowded")],["tickets",t("tickets")],["more",t("more")]];
  if (role === "admin") return [["home",t("control")],["heat",t("crowded")],["tickets",t("tickets")],["more",t("more")]];
  if (role === "collector") return [["home",t("collector")],["staff",t("officers")],["heat",t("yards")],["more",t("more")]];
  if (role === "minister") return [["home",t("state")],["staff",t("cadre")],["heat",t("heatmap")],["more",t("more")]];
  return [["home",t("home")],["more",t("more")]];
}

function chrome(inner) {
  return `
    <header class="top">
      <div class="brand"><div class="mark">अ</div><div><b>${t("brand")}</b><small>${t("tag")}</small></div></div>
      <div class="top-actions">
        <button class="install ${state.deferredPrompt ? "" : "hidden"}" id="installBtn">${t("installApp")}</button>
        <div class="lang">
          <button data-l="en" class="${state.lang==="en"?"on":""}">EN</button>
          <button data-l="hi" class="${state.lang==="hi"?"on":""}">हिं</button>
          <button data-l="te" class="${state.lang==="te"?"on":""}">తె</button>
        </div>
        ${state.user ? `<button class="ghost" id="out">${t("logout")}</button>` : ""}
      </div>
    </header>
    ${inner}`;
}

function landing() {
  return chrome(`
    <div class="wrap">
      <section class="hero">
        <div>
          <div class="kicker">${t("kicker")}</div>
          <h1>${t("heroTitle")}</h1>
          <p>${t("heroBody")}</p>
          <p class="muted" style="margin-top:10px">${t("smile")}</p>
        </div>
        <div class="panel" id="staffPanel">
          ${
            state.authMode === "register"
              ? `<h3>${t("register")}</h3>
            <label>${t("name")}</label><input id="rname" />
            <label>${t("phone")}</label><input id="rphone" inputmode="numeric" />
            
            <div class="g2 grid"><div><label>${t("village")}</label><input id="rvillage" value="Narsingi" /></div>
            <div><label>${t("district")}</label><input id="rdistrict" value="Rangareddy" /></div></div>
            <button class="btn full" id="doReg" style="margin-top:12px">${t("register")}</button>
            <button class="btn soft full" id="toLogin" style="margin-top:8px">${t("haveAccount")}</button>
            <p class="muted" style="margin-top:8px">${t("otpHint")}</p>
            <div class="err" id="staffErr"></div>`
              : `<h3>${t("signin")}</h3>
            <label>${t("phone")}</label>
            <input id="staffPhone" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="${t("enterMobile")}" />
            <label>${t("pin")}</label>
            <input id="staffPin" type="password" inputmode="numeric" maxlength="4" autocomplete="current-password" placeholder="${t("enterPin")}" />
            <button class="btn full" id="staffGo" style="margin-top:14px">${t("continueBtn")}</button>
            <div class="or">${t("orWord")}</div>
            <label>${t("otpLabel")}</label>
            <input id="otpBox" inputmode="numeric" maxlength="6" placeholder="${t("enterOtp")}" />
            <div class="g2 grid" style="margin-top:8px">
              <button class="btn soft" id="sendOtp">${t("getOtp")}</button>
              <button class="btn gold" id="goOtp">${t("verifyOtp")}</button>
            </div>
            <div id="smsBubble" class="sms hidden"></div>
            <button class="btn soft full" id="toReg" style="margin-top:14px">${t("createFarmer")}</button>
            <input id="serverUrl" class="hidden" value="${state.server || ""}" />
            <div class="err" id="staffErr"></div>`
          }
        </div>
      </section>
      <section class="stats">
        <div class="stat"><span>${t("liveCentres")}</span><b>6</b></div>
        <div class="stat"><span>QR + map</span><b>ON</b></div>
        <div class="stat"><span>EN · हिं · తె</span><b>3</b></div>
        <div class="stat"><span>MSP paddy</span><b>₹2300</b></div>
      </section>
    </div>`);
}

function shell(body) {
  const items = navFor(state.user.role);
  return chrome(`
    <div class="shell">
      <aside class="side">
        <div class="muted" style="color:#9fb3aa">${state.user.name}</div>
        <div style="font-weight:800;margin-top:4px">${state.user.role.toUpperCase()}</div>
        <nav>${items.map(([id,l]) => `<button class="${state.tab===id?"on":""}" data-tab="${id}">${l}</button>`).join("")}</nav>
      </aside>
      <section class="main">${body}</section>
    </div>
    <nav class="mnav">${items.map(([id,l]) => `<button class="${state.tab===id?"on":""}" data-tab="${id}">${l}</button>`).join("")}</nav>
  `);
}

function crowdWhy(c) {
  const booked = c.fill || 0;
  const wait = c.waiting || 0;
  if (wait >= 15 || booked >= 75) return wait + " farmers waiting · " + booked + "% of today's slots — CROWDED";
  if (wait >= 8 || booked >= 45) return wait + " farmers waiting · " + booked + "% of today's slots — BUSY";
  return wait + " farmers waiting · " + booked + "% of today's slots — OPEN";
}

function farmerHome() {
  const b = state.booking;
  const smart = state.smart;
  const best = smart?.best;
  const pay = b?.payment;
  return `
    <div class="grid g2">
      <div class="token">
        <div class="muted" style="color:#c9e6d8">${state.user.name} · farmer</div>
        <div class="num">${b?.tokenNo || "BOOK"}</div>
        <div>${b?.centreName || "No token yet"}</div>
        <div class="muted" style="color:#c9e6d8">${b ? b.date + " · " + b.window + " · " + b.status : "Use Farmer tools below"}</div>
      </div>
      <div class="grid g2">
        <div class="card"><span class="muted">${t("farmersAhead")}</span><h3 style="font-size:28px">${b?.ahead ?? "—"}</h3></div>
        <div class="card"><span class="muted">${t("wait")}</span><h3 style="font-size:28px">${b ? Math.round(b.waitMin)+"m" : "—"}</h3></div>
        <div class="card"><span class="muted">MSP / q</span><h3 style="font-size:28px">₹2,300</h3></div>
        <div class="card"><span class="muted">DBT</span><h3 style="font-size:22px">${pay ? "₹" + pay.amount + " " + pay.status : "pending"}</h3></div>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>${t("farmerTools")}</h3>
      <div class="grid g3" style="margin-top:8px">
        <button class="btn full" data-go="book">${t("bookSlot")}</button>
        <button class="btn gold full" data-go="token">${t("gateToken")}</button>
        <button class="btn soft full" data-go="track">${t("trackLot")}</button>
        <button class="btn soft full" data-go="map">${t("centreMap")}</button>
        <button class="btn soft full" data-go="help">${t("helpDesk")}</button>
        <button class="btn soft full" data-go="more">${t("profile")}</button>
      </div>
    </div>
    ${best ? `<div class="card" style="margin-top:14px"><h3>Least crowded now</h3><p><b>${best.name}</b> · ${best.predicted || best.waitMin || 0} min · ${best.waiting || 0} waiting</p></div>` : ""}
    <div class="card" style="margin-top:14px">
      <h3>Centres</h3>
      ${(smart?.centres || state.centres).map(c => `<div class="centre"><div><b>${c.name}</b><div class="muted">${c.district} · ${c.waiting ?? 0} waiting</div></div><span class="chip ${c.status==="crowded"?"bad":c.status==="busy"?"warn":""}">${c.status}</span></div>`).join("")}
    </div>`;
}

function bookView() {
  const ranked = state.smart?.ranked || [];
  const bestId = state.smart?.best?.id;
  return `<div class="grid g2">
    <div class="card"><h3>${t("bookTitle")}</h3>
    <p class="muted">AI ranks the least crowded centre first.</p>
    <label>Centre</label><select id="centre">${(ranked.length?ranked:state.centres).map(c=>`<option value="${c.id}" ${c.id===bestId?"selected":""}>${c.name} · AI ${c.predicted||c.waitMin||0} min · ${c.status}</option>`).join("")}</select>
    <label>Date</label><select id="date"></select>
    <label>Window</label><select id="window"></select>
    <label>Expected quintals</label><input id="qty" value="24" />
    <div class="sms" id="mspBox">MSP preview loading…</div>
    <button class="btn full" id="doBook" style="margin-top:12px">${t("confirmSlot")}</button>
    <div class="err" id="err"></div></div>
    <div class="card"><h3>Why this centre?</h3>
      ${ranked.slice(0,4).map((c,i)=>`<div class="centre"><div><b>${i+1}. ${c.name}</b><div class="muted">predicted ${c.predicted} min · heat ${c.heat}</div></div><span class="chip ${i===0?"":"warn"}">${i===0?"best":c.status}</span></div>`).join("") || "<p class='muted'>Open after centres load.</p>"}
    </div></div>`;
}

function tokenView() {
  const b = state.booking;
  if (!b) return `<div class="card">${t("noToken")}</div>`;
  const payload = encodeURIComponent("ANNASETU|" + b.tokenNo + "|" + (b.centreName||"") + "|" + (b.date||""));
  const qr = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + payload;
  return `<div class="grid g2">
    <div class="token">
      <div>${t("gatePass")}</div>
      <div class="num">${b.tokenNo}</div>
      <div style="background:#fff;padding:12px;border-radius:16px;margin:12px auto;width:196px;height:196px">
        <img alt="QR" src="${qr}" width="172" height="172" style="display:block;margin:0 auto" />
      </div>
      <div>${b.centreName}</div>
      <div>${b.date} · ${b.window}</div>
      <div style="margin-top:10px"><span class="chip blue">${b.status}</span></div>
      <p class="muted" style="color:#c9e6d8;margin-top:8px">Staff enters this token on Scan QR.</p>
    </div>
    <div class="card">
      <p class="muted">Yard crowded? Shift to another PPC any time until the gate scans your token.</p>
      ${b.status==="booked"?`<button class="btn gold full" id="doChange">Change centre</button>
        <div id="changeBox" class="hidden"><label>New centre</label><select id="newCentre">${state.centres.map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}</select>
        <label>Date</label><select id="newDate"></select><label>Window</label><select id="newWindow"></select>
        <button class="btn full" id="confirmChange">Confirm move</button></div>`:""}
      ${b.status==="booked"?`<button class="btn danger full" id="doCancel" style="margin-top:8px">Cancel token</button>`:""}
    </div></div>`;
}

function trackView() {
  const b = state.booking;
  const steps = [["booked","Slot booked"],["checked_in","Checked in"],["weighed","Weighed"],["lifted","Lorry lifted"],["delivered","At mill"],["paid","DBT paid"]];
  const idx = Math.max(0, steps.findIndex(s => s[0]===(b?.status)));
  return `<div class="card"><h3>${t("trailTitle")}</h3><div class="timeline">${steps.map((s,i)=>`<div class="dot"><b>${s[1]}</b><div class="muted">${i<=idx && b ? "done / current" : "pending"}</div></div>`).join("")}</div>
    ${b?.weigh?`<div class="sms"><b>Receipt ${b.weigh.receipt||""}</b><div>${b.weigh.netQuintal||b.weigh.net_q} q · ₹${b.weigh.amount}</div></div>`:""}
    ${b?.payment?`<div class="sms"><b>Payment ${b.payment.status}</b><div>${b.payment.utr||""}</div></div>`:""}
    ${b?.trip?`<div class="sms"><b>Transport ${b.trip.status}</b><div>${b.trip.vehicle} · ${b.trip.mill}</div></div>`:""}
  </div>`;
}

function mapView() {
  const list = state.smart?.centres || state.centres;
  const lats = list.map(c => c.lat).filter(Boolean);
  const lngs = list.map(c => c.lng).filter(Boolean);
  const minLa = Math.min(...lats), maxLa = Math.max(...lats);
  const minLn = Math.min(...lngs), maxLn = Math.max(...lngs);
  const dots = list.map(c => {
    const x = ((c.lng - minLn) / (maxLn - minLn || 1)) * 86 + 6;
    const y = (1 - (c.lat - minLa) / (maxLa - minLa || 1)) * 70 + 8;
    const col = c.status === "crowded" ? "#b42318" : c.status === "busy" ? "#c2410c" : "#0b6e4f";
    return `<div class="pin" style="left:${x}%;top:${y}%;background:${col}" title="${c.name}"><span>${c.name.split(" ")[0]} · ${c.predicted || c.waitMin || 0}m</span></div>`;
  }).join("");
  return `<div class="card"><h3>Live centre map · AI wait</h3>
    <div class="geomap">${dots}</div>
    <p class="muted" style="margin-top:8px">Green = open, orange = busy, red = jammed. Numbers are predicted minutes.</p>
  </div>`;
}

function heatView() {
  const list = state.smart?.centres || [];
  return `<div class="card"><h3>PPC jam heatmap</h3>
    ${list.map(c => `<div style="margin:10px 0"><div class="centre" style="border:0;padding:0"><b>${c.name}</b><span class="muted">${c.waiting} waiting · ${c.heat}%</span></div>
    <div class="heatbar"><i style="width:${c.heat}%;background:${c.heat>70?"#b42318":c.heat>40?"#c2410c":"#0b6e4f"}"></i></div></div>`).join("") || "Loading…"}
  </div>`;
}

function helpView() {
  return `<div class="card"><h3>Farmer help</h3>
    <p class="muted">Grievance tickets go to the District Controller desk. Minister only sees tickets district could not close.</p>
    <label>Topic</label><select id="topic"><option>Queue delay</option><option>Slot not visible</option><option>Payment pending</option><option>Yard marked crowded wrongly</option></select>
    <label>Details</label><input id="gmsg" placeholder="What went wrong?" />
    <button class="btn full" id="doTicket" style="margin-top:10px">File grievance</button>
    <div class="sms" style="margin-top:12px"><b>How crowd is decided</b><div>1) Auto from live bookings and queue length. 2) Centre staff can override OPEN / BUSY / CROWDED.</div></div>
  </div>`;
}

function moreView() {
  const farmer = state.user.role === "farmer";
  return `<div class="grid g2"><div class="card"><h3>${state.user.name}</h3><p class="muted">${state.user.role} · ${state.user.phone}</p>
    <p class="muted" style="margin:8px 0">${farmer ? "Profile, alerts and help. Gate staff scan your token QR." : "Staff tools"}</p>
    <button class="btn danger full" id="doLogout">Logout</button></div>
    <div class="card"><h3>${t("notifications")}</h3><div id="noteList" class="muted">Loading…</div>
    <button class="btn soft full" id="enablePush">${t("enableBanners")}</button></div>
    ${farmer?`<div class="card" style="grid-column:1/-1"><h3>Help desk</h3>
      <label>Topic</label><select id="topic"><option>Queue delay</option><option>Slot not visible</option><option>Payment pending</option><option>Wrong centre crowding</option></select>
      <label>Details</label><input id="gmsg" placeholder="Short complaint" />
      <button class="btn full" id="doTicket" style="margin-top:10px">Submit ticket</button></div>`:
      `<div class="card"><h3>Staff SMS log</h3><div id="smsList" class="muted">Loading…</div></div>`}
    </div>`;
}

async function render() {
  const root = $("#app");
  if (!state.user) {
    root.innerHTML = landing();
    bindChrome();
    const saveServer = () => {
      const v = ($("#serverUrl")?.value || "").trim();
      state.server = v;
      localStorage.setItem("as_server", v);
    };
    $("#staffGo")?.addEventListener("click", async () => {
      try { saveServer(); await doLogin($("#staffPhone").value, $("#staffPin").value); }
      catch (e) { const err = $("#staffErr"); if (err) err.textContent = e.message; }
    });
    $("#sendOtp")?.addEventListener("click", async () => {
      try {
        saveServer();
        const r = await api("/api/otp/request", { method: "POST", body: { phone: $("#staffPhone").value } });
        const bubble = $("#smsBubble");
        if (bubble) {
          bubble.classList.remove("hidden");
          bubble.innerHTML = r.otp
            `<b>OTP ${r.otp || ""}</b><div>Valid 5 minutes. Sending from Android 6309752008 when gateway is reachable.</div><div class="muted">${r.hint || r.detail || ""}</div>`;
        }
        toast("OTP ready");
      } catch (e) {
        const err = $("#staffErr");
        if (err) err.textContent = e.message;
      }
    });
    $("#goOtp")?.addEventListener("click", async () => {
      try {
        saveServer();
        const data = await api("/api/otp/verify", { method: "POST", body: { phone: $("#staffPhone").value, otp: $("#otpBox").value } });
        if (!data.user) throw new Error("OTP login failed");
        saveAuth(data.token, data.user);
        state.tab = "home";
        toast("OTP login · " + data.user.name);
        render();
      } catch (e) {
        const err = $("#staffErr");
        if (err) err.textContent = e.message;
      }
    });
    $("#toReg")?.addEventListener("click", () => { state.authMode = "register"; render(); });
    $("#toLogin")?.addEventListener("click", () => { state.authMode = "login"; render(); });
    document.querySelectorAll(".demo").forEach((b) => {
      b.onclick = () => {
        if ($("#staffPhone")) $("#staffPhone").value = b.dataset.p;
        toast("Number filled. Tap Send OTP");
      };
    });
    $("#doReg")?.addEventListener("click", async () => {
      try {
        const data = await api("/api/register", {
          method: "POST",
          body: {
            name: $("#rname").value,
            phone: $("#rphone").value,
            pin: ($("#rpin") && $("#rpin").value) || "1234",
            village: $("#rvillage").value,
            district: $("#rdistrict").value,
            lang: state.lang,
          },
        });
        saveAuth(data.token, data.user);
        state.tab = "home";
        toast(t("enter"));
        render();
      } catch (e) {
        const err = $("#staffErr");
        if (err) err.textContent = e.message;
        else toast(e.message);
      }
    });
    return;
  }
  try {
    state.centres = await api("/api/centres");
    state.smart = await api("/api/smart");
    if (state.user.role === "farmer") state.booking = await api("/api/my-booking");
  } catch(e) { if (String(e.message).includes("Login")) return logout(); }
  let body = "";
  if (state.user.role === "farmer") {
    body = state.tab==="book"?bookView():state.tab==="token"?tokenView():state.tab==="track"?trackView():state.tab==="map"?mapView():state.tab==="help"?helpView():state.tab==="more"?moreView():farmerHome();
  } else if (state.user.role === "centre") {
    body = state.tab==="more"?moreView():state.tab==="scan"?`<div class="card"><h3>Scan / enter gate token</h3><input id="scanTok" placeholder="1108" /><button class="btn full" id="doScan" style="margin-top:10px">Find farmer</button><div id="scanRes"></div></div>`:state.tab==="yard"?`<div class="card"><h3>Yard status override</h3><p class="muted">Auto crowd uses bookings. You may override if the physical yard is jammed.</p><div id="yardBox"></div></div>`:`<div class="card" id="qbox">Loading queue…</div>`;
  } else if (state.user.role === "transport") body = state.tab==="more"?moreView():`<div class="card" id="tbox">Loading trips…</div>`;
  else if (state.user.role === "payment") body = state.tab==="more"?moreView():`<div class="card" id="pbox">Loading payments…</div>`;
  else if (state.user.role === "sms") body = state.tab==="more"?moreView():`<div class="card" id="smsStation"><h3>iPhone SMS station · 9666939399</h3><p class="muted">Each card opens Apple Messages. Tap Send so the text leaves from your SIM.</p><div id="pend"></div></div>`;
  else if (state.tab==="heat") body = heatView();
  else if (state.tab==="tickets") body = `<div class="card" id="tkbox">Loading tickets…</div>`;
  else if (state.tab==="staff") body = `<div class="card" id="staffBox">Loading officers…</div>`;
  else if (state.tab==="more"||state.tab==="sms") body = moreView();
  else body = `<div id="abox"></div>`;
  root.innerHTML = shell(body);
  bindChrome();
  root.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { state.tab = b.dataset.tab; render(); });
  root.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { state.tab = b.dataset.go; render(); });
  if (state.tab==="book") wireBook();
  if (state.tab==="token") wireToken();
  if (state.tab==="more" || state.tab==="sms" || state.tab==="help") wireMore();
  if (state.user.role==="centre" && state.tab==="home") loadQueue();
  if (state.user.role==="centre" && state.tab==="yard") loadYard();
  if (state.user.role==="centre" && state.tab==="scan") wireScan();
  if (state.user.role==="transport" && state.tab==="home") loadTrips();
  if (state.user.role==="payment" && state.tab==="home") loadPays();
  if (["admin","minister","officer","collector"].includes(state.user.role) && state.tab==="home") loadAdmin().then(loadTrailEditor);
  if (["admin","minister","officer","collector"].includes(state.user.role) && state.tab==="tickets") loadTickets();
  if (["collector","minister"].includes(state.user.role) && state.tab==="staff") loadStaff();
  if (state.user.role==="sms" && state.tab==="home") loadSmsStation();
  startLiveSync();
}

function bindChrome() {
  document.querySelectorAll("[data-l]").forEach(b => b.onclick = () => setLang(b.dataset.l));
  $("#out")?.addEventListener("click", logout);
  $("#installBtn")?.addEventListener("click", async () => {
    if (!state.deferredPrompt) return toast("On phone Chrome: menu → Add to Home screen");
    state.deferredPrompt.prompt();
    state.deferredPrompt = null;
    render();
  });
}

async function doLogin(phone, pin) {
  try {
    const data = await api("/api/login", { method:"POST", body:{ phone, pin: pin || "1234" } });
    if (!data.user || !data.user.name) throw new Error("Invalid phone or PIN");
    saveAuth(data.token, data.user);
    state.tab = "home";
    toast("Signed in as " + data.user.name);
    render();
  } catch(e) {
    const err = $("#staffErr");
    if (err) err.textContent = e.message;
    toast(e.message);
  }
}

async function loadSlots(centreId, dateSel, winSel) {
  const slots = await api("/api/slots?centreId="+centreId);
  const dates = [...new Set(slots.map(s => s.date))];
  dateSel.innerHTML = dates.map(d => `<option>${d}</option>`).join("");
  const fill = () => {
    const ws = slots.filter(s => s.date === dateSel.value);
    winSel.innerHTML = ws.map(s => `<option value="${s.id}">${s.window} · ${s.left} left</option>`).join("");
  };
  dateSel.onchange = fill; fill();
}

async function wireBook() {
  const centre = $("#centre"); if (!centre) return;
  await loadSlots(centre.value, $("#date"), $("#window"));
  centre.onchange = () => loadSlots(centre.value, $("#date"), $("#window"));
  const updMsp = async () => {
    const m = await api("/api/msp?qty=" + ($("#qty").value || 24));
    $("#mspBox").innerHTML = `<b>MSP calculator</b><div>${m.qty} q × ₹${m.rate} = <b>₹${m.amount.toLocaleString("en-IN")}</b> (indicative, FAQ on weighment)</div>`;
  };
  $("#qty").oninput = updMsp;
  updMsp();
  $("#doBook").onclick = async () => {
    try { await api("/api/book", { method:"POST", body:{ slotId:$("#window").value, qtyQuintal:$("#qty").value } }); toast("Token booked"); state.tab="token"; render(); }
    catch(e) { $("#err").textContent = e.message; }
  };
}

function wireToken() {
  $("#doChange")?.addEventListener("click", async () => {
    $("#changeBox").classList.remove("hidden");
    await loadSlots($("#newCentre").value, $("#newDate"), $("#newWindow"));
    $("#newCentre").onchange = () => loadSlots($("#newCentre").value, $("#newDate"), $("#newWindow"));
  });
  $("#confirmChange")?.addEventListener("click", async () => {
    try { await api("/api/change-centre", { method:"POST", body:{ bookingId: state.booking.id, newSlotId: $("#newWindow").value } }); toast("Centre updated. New token issued."); render(); }
    catch(e) { toast(e.message); }
  });
  $("#doCancel")?.addEventListener("click", async () => {
    try { await api("/api/cancel", { method:"POST", body:{ bookingId: state.booking.id } }); toast("Cancelled"); state.tab="book"; render(); }
    catch(e) { toast(e.message); }
  });
}

async function wireMore() {
  $("#doLogout")?.addEventListener("click", logout);
  try {
    const notes = await api("/api/notifications");
    if ($("#noteList")) $("#noteList").innerHTML = notes.length ? notes.slice(0,10).map(s => `<div class="sms"><b>${s.kind}</b><div>${s.text}</div></div>`).join("") : "No alerts yet.";
  } catch { if ($("#noteList")) $("#noteList").textContent = "No alerts yet."; }
  if ($("#smsList")) {
    try {
      const sms = await api("/api/sms");
      $("#smsList").innerHTML = sms.slice(0,8).map(s => `<div class="sms"><b>${s.phone}</b> · ${s.kind}<div>${s.text}</div></div>`).join("") || "Empty";
    } catch { $("#smsList").textContent = "Staff only."; }
  }
  $("#enablePush")?.addEventListener("click", async () => {
    try {
      if (!("Notification" in window)) return toast("This browser has no banners");
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        new Notification("AnnaSetu", { body: "App notifications are on. Token and payment alerts will appear here." });
        toast("Banners enabled");
      } else toast("Permission denied");
    } catch(e) { toast(e.message); }
  });
  $("#doTicket")?.addEventListener("click", async () => {
    try {
      await api("/api/tickets", { method:"POST", body:{ topic: $("#topic").value, message: $("#gmsg").value } });
      toast("Ticket filed to district desk");
      $("#gmsg").value = "";
    } catch(e) { toast(e.message); }
  });
}

function wireScan() {
  $("#doScan")?.addEventListener("click", async () => {
    try {
      const found = await api("/api/scan", { method:"POST", body:{ tokenNo: $("#scanTok").value } });
      $("#scanRes").innerHTML = `<div class="sms"><b>Token ${found.tokenNo}</b> ${found.farmerName}<div>${found.centreName} · ${found.status} · ${found.window}</div>
        ${found.status==="booked"?`<button class="btn" id="scanIn" style="margin-top:8px">Check in now</button>`:""}</div>`;
      $("#scanIn")?.addEventListener("click", async () => {
        await api("/api/checkin", { method:"POST", body:{ bookingId: found.id } });
        toast("Checked in");
        state.tab = "home";
        render();
      });
    } catch(e) { $("#scanRes").innerHTML = `<p class="err">${e.message}</p>`; }
  });
}

async function loadQueue() {
  const list = await api("/api/queue/C1");
  $("#qbox").innerHTML = `<h3>Narsingi live board</h3>` + (list.map(b => `<div class="qitem"><div><b>#${b.tokenNo}</b> ${b.farmerName}<div class="muted">${b.window} · ${b.status}</div></div><div>
    ${b.status==="booked"?`<button class="chip" data-in="${b.id}">Check in</button>`:""}
    ${b.status==="checked_in"?`<button class="chip" data-w="${b.id}">Weigh</button>`:""}
  </div></div>`).join("") || "<p class='muted'>No tokens.</p>");
  $("#qbox").querySelectorAll("[data-in]").forEach(btn => btn.onclick = async () => { await api("/api/checkin",{method:"POST",body:{bookingId:btn.dataset.in}}); loadQueue(); });
  $("#qbox").querySelectorAll("[data-w]").forEach(btn => btn.onclick = async () => { const net = prompt("Net quintal?","21.4"); if(!net) return; await api("/api/weigh",{method:"POST",body:{bookingId:btn.dataset.w,netQuintal:net,rate:2300}}); loadQueue(); });
}

async function loadTrips() {
  const trips = await api("/api/trips");
  $("#tbox").innerHTML = `<h3>Assigned lots</h3>` + (trips.map(t => `<div class="qitem"><div><b>${t.booking?.tokenNo||t.booking_id}</b><div class="muted">${t.vehicle} → ${t.mill}</div></div><div>
    ${t.status==="assigned"?`<button class="chip" data-s="${t.id}" data-v="lifted">Lift</button>`:""}
    ${t.status==="lifted"?`<button class="chip" data-s="${t.id}" data-v="delivered">Deliver</button>`:""}
    <span class="chip">${t.status}</span></div></div>`).join("") || "<p class='muted'>No trips. Weigh a farmer first.</p>");
  $("#tbox").querySelectorAll("[data-s]").forEach(btn => btn.onclick = async () => { await api("/api/trip-status",{method:"POST",body:{tripId:btn.dataset.s,status:btn.dataset.v}}); loadTrips(); });
}

async function loadPays() {
  const pays = await api("/api/payments");
  $("#pbox").innerHTML = `<h3>DBT desk</h3>` + (pays.map(p => `<div class="qitem"><div><b>₹${p.amount}</b> ${p.farmer_name}<div class="muted">${p.bank||""} · ${p.status}</div></div>
    ${p.status==="pending"?`<button class="chip" data-p="${p.id}">Release</button>`:`<span class="chip">${p.utr||"paid"}</span>`}</div>`).join("") || "<p class='muted'>No payments.</p>");
  $("#pbox").querySelectorAll("[data-p]").forEach(btn => btn.onclick = async () => { await api("/api/pay",{method:"POST",body:{paymentId:btn.dataset.p,status:"paid"}}); loadPays(); });
}

async function loadYard() {
  const list = state.smart?.centres || state.centres || await api("/api/centres");
  $("#yardBox").innerHTML = list.map(c => `<div class="centre"><div><b>${c.name}</b><div class="muted">${crowdWhy(c)}</div></div>
    <select data-st="${c.id}">
      <option value="open" ${c.status==="open"?"selected":""}>OPEN</option>
      <option value="busy" ${c.status==="busy"?"selected":""}>BUSY</option>
      <option value="crowded" ${c.status==="crowded"?"selected":""}>CROWDED</option>
    </select></div>`).join("");
  $("#yardBox").querySelectorAll("select").forEach(sel => sel.onchange = async () => {
    try { await api("/api/centre-status", { method:"POST", body:{ centreId: sel.dataset.st, status: sel.value } }); toast("Yard status updated"); }
    catch(e) { toast(e.message); }
  });
}

async function loadAdmin() {
  const o = await api("/api/command");
  const s = state.smart?.centres || o.centres;
  const minister = state.user.role === "minister";
  $("#abox").innerHTML = minister ? `
    <div class="card"><h3>State Command · Telangana</h3><p class="muted">Read-only statewide picture. District closes tickets. You only escalate policy / MSP / failed DBT.</p></div>
    <div class="grid g3" style="margin-top:12px">
      <div class="stat"><span>Districts covered</span><b>6 yards</b></div>
      <div class="stat"><span>State waiting</span><b>${o.waiting}</b></div>
      <div class="stat"><span>DBT released</span><b>₹${(o.paidAmt||0).toLocaleString("en-IN")}</b></div>
      <div class="stat"><span>Pending pay risk</span><b>₹${(o.pendingAmt||0).toLocaleString("en-IN")}</b></div>
      <div class="stat"><span>Open grievances</span><b>${o.ticketsOpen}</b></div>
      <div class="stat"><span>MSP rate</span><b>₹2300</b></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Which yard is crowded — and why</h3>
      ${s.map(c=>`<div class="centre"><div><b>${c.name}</b><div class="muted">${crowdWhy(c)}</div></div><span class="chip ${c.status==="crowded"?"bad":c.status==="busy"?"warn":""}">${c.status}</span></div>`).join("")}
    </div>` : `
    <div class="card"><h3>District Controller · Rangareddy ops</h3><p class="muted">You run yards, close farmer tickets, watch DBT. Minister sees totals only.</p></div>
    <div class="grid g3" style="margin-top:12px">
      <div class="stat"><span>Farmers</span><b>${o.farmers}</b></div>
      <div class="stat"><span>Today bookings</span><b>${o.bookingsToday}</b></div>
      <div class="stat"><span>Waiting</span><b>${o.waiting}</b></div>
      <div class="stat"><span>DBT out</span><b>₹${(o.paidAmt||0).toLocaleString("en-IN")}</b></div>
      <div class="stat"><span>DBT pending</span><b>₹${(o.pendingAmt||0).toLocaleString("en-IN")}</b></div>
      <div class="stat"><span>Tickets</span><b>${o.ticketsOpen}</b></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Yard control + crowd reason</h3>
      ${o.centres.map(c=>`<div class="centre"><div><b>${c.name}</b><div class="muted">${crowdWhy(c)} · cap ${c.capacity}/slot</div></div><span class="chip ${c.status==="crowded"?"bad":c.status==="busy"?"warn":""}">${c.status}</span></div>`).join("")}
    </div>
    <div class="card" style="margin-top:14px"><h3>Recent DBT</h3>${(o.recentPay||[]).map(p=>`<div class="qitem"><div><b>₹${p.amount}</b> ${p.farmer_name}</div><span class="chip">${p.status}</span></div>`).join("")||"<p class='muted'>None yet. Weigh a farmer first.</p>"}</div>
    <div class="card" style="margin-top:14px" id="trailBox"><h3>Update procurement trail</h3><p class="muted">Change a farmer lot status. Farmer Track screen updates live.</p></div>`;
}

async function loadStaff() {
  const box = $("#staffBox");
  if (!box) return;
  const list = await api("/api/staff");
  const officers = list.filter(x => x.role === "officer");
  box.innerHTML = `<h3>${state.user.role === "minister" ? "State cadre" : "District officers"}</h3>
    <p class="muted">Active means logged roster for today’s procurement. Inactive officers cannot run a yard.</p>` +
    officers.map(o => `<div class="qitem"><div><b>${o.name}</b><div class="muted">${o.district} · ${o.phone}</div></div>
      <span class="chip ${o.active ? "" : "bad"}">${o.active ? "ACTIVE" : "NOT ACTIVE"}</span></div>`).join("") +
    `<h3 style="margin-top:16px">Collectors</h3>` +
    list.filter(x => x.role === "collector").map(o => `<div class="qitem"><div><b>${o.name}</b><div class="muted">${o.district}</div></div><span class="chip">${o.active ? "ACTIVE" : "NOT ACTIVE"}</span></div>`).join("");
}

async function loadTickets() {
  const list = await api("/api/tickets");
  $("#tkbox").innerHTML = `<h3>Grievance desk</h3>` + (list.map(x=>`<div class="qitem"><div><b>${x.topic}</b> · ${x.farmer_name}<div class="muted">${x.message||""}</div></div>
    ${x.status==="open"?`<button class="chip" data-tk="${x.id}">Close</button>`:`<span class="chip">${x.status}</span>`}</div>`).join("") || "<p class='muted'>No tickets.</p>");
  $("#tkbox").querySelectorAll("[data-tk]").forEach(btn => btn.onclick = async () => {
    await api("/api/tickets/close", { method:"POST", body:{ id: btn.dataset.tk } });
    loadTickets();
  });
}


async function loadTrailEditor() {
  const box = $("#trailBox");
  if (!box) return;
  let list = [];
  try { list = await api("/api/queue/C1"); } catch { list = []; }
  const extra = ["C2","C3","C4"];
  for (const c of extra) {
    try { list = list.concat(await api("/api/queue/"+c)); } catch {}
  }
  const steps = ["booked","checked_in","weighed","lifted","delivered","paid","cancelled"];
  box.innerHTML = `<h3>Update procurement trail</h3>` + (list.slice(0,20).map(b => `<div class="qitem"><div><b>#${b.tokenNo}</b> ${b.farmerName}<div class="muted">${b.centreName} · ${b.status}</div></div>
    <select data-tr="${b.id}">${steps.map(s=>`<option value="${s}" ${s===b.status?"selected":""}>${s}</option>`).join("")}</select></div>`).join("") || "<p class='muted'>No live lots.</p>");
  box.querySelectorAll("select[data-tr]").forEach(sel => sel.onchange = async () => {
    try {
      await api("/api/trail", { method:"POST", body:{ bookingId: sel.dataset.tr, status: sel.value } });
      toast("Trail updated");
      loadTrailEditor();
    } catch(e) { toast(e.message); }
  });
}

async function loadSmsStation() {
  const box = $("#pend");
  if (!box) return;
  const list = await api("/api/sms/pending");
  if (!list.length) {
    box.innerHTML = "<p class='muted'>No waiting OTP. When a farmer taps Send OTP, it appears here instantly.</p>";
    return;
  }
  box.innerHTML = list.map((s) => {
    const href = `sms:+91${s.phone}?&body=${encodeURIComponent(s.text)}`;
    return `<div class="qitem"><div><b>+91 ${s.phone}</b><div class="muted">${s.text}</div></div>
      <a class="btn" href="${href}">Send from iPhone</a>
      <button class="chip" data-sent="${s.id}">Mark sent</button></div>`;
  }).join("");
  box.querySelectorAll("[data-sent]").forEach((btn) => {
    btn.onclick = async () => {
      await api("/api/sms/sent", { method: "POST", body: { id: btn.dataset.sent } });
      loadSmsStation();
    };
  });
}

function startLiveSync() {
  if (window.__asLive) clearInterval(window.__asLive);
  window.__asLive = setInterval(() => {
    if (!state.user) return;
    if (state.user.role === "sms") loadSmsStation().catch(() => {});
    if (state.user.role === "admin" || state.user.role === "minister") loadAdmin().catch(() => {});
    if (state.user.role === "centre" && state.tab === "home") loadQueue().catch(() => {});
    if (state.user.role === "farmer") api("/api/my-booking").then((b) => { state.booking = b; }).catch(() => {});
  }, 4000);
}

window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); state.deferredPrompt = e; render(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
render();
