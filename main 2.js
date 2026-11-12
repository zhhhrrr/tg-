import "./shim.js";
import { Buffer } from "buffer";
import { TelegramClient, utils, sessions, Api } from "telegram";
import { CustomFile } from "telegram/client/uploads";
const StringSession = sessions.StringSession;
const VERSION = "v6";

/* ===================== утилиты ===================== */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function toast(t, ms = 3500) { const e = $("toast"); e.textContent = t; e.classList.remove("hidden"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.add("hidden"), ms); }
const COLORS = ["#e17076", "#faa774", "#a695e7", "#7bc862", "#6ec9cb", "#65aadd", "#ee7aae"];
const colorOf = (id) => { let h = 0; for (const ch of String(id || "0")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLORS[h % 7]; };
const nameOf = (e) => !e ? "" : (e.title || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.username || (e.deleted ? "Удалённый аккаунт" : "Без имени"));
const hm = (ts) => new Date(ts * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const dayKey = (ts) => { const d = new Date(ts * 1000); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };
const dayLabel = (ts) => { const d = new Date(ts * 1000); const o = { day: "numeric", month: "long" }; if (d.getFullYear() !== new Date().getFullYear()) o.year = "numeric"; return d.toLocaleDateString("ru-RU", o); };
function ftime(ts) {
  if (!ts) return ""; const d = new Date(ts * 1000), n = new Date();
  if (d.toDateString() === n.toDateString()) return hm(ts);
  if ((n - d) / 864e5 < 6) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
const plural = (n) => (n % 10 === 1 && n % 100 !== 11) ? "участник" : ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) ? "участника" : "участников";
const ICON = {
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 8v4"/><circle cx="12" cy="15" r=".6"/></svg>',
  cal: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  clip: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.3 3.3 0 014.7 4.7L9.5 17.2a1.7 1.7 0 01-2.4-2.4L14 8"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  mute: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 5L6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6"/></svg>',
  chats: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2h-8l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
};

/* ===================== IndexedDB ===================== */
const dbp = new Promise((res, rej) => {
  const r = indexedDB.open("tgclient", 1);
  r.onupgradeneeded = () => { r.result.createObjectStore("msgs", { keyPath: "key" }); r.result.createObjectStore("blobs"); };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
async function tx(store, mode, fn) {
  const db = await dbp;
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => res(r && r.result);
    t.onerror = () => rej(t.error);
  });
}
const persist = (r) => tx("msgs", "readwrite", (s) => s.put(r)).catch(() => {});

/* ===================== состояние ===================== */
let client = null, cur = null, dialogs = [], filter = "all", query = "", tab = "chats";
let ghost = localStorage.getItem("ghost") !== "0";
const store = new Map(), mediaRef = new Map(), ents = new Map(), avatars = new Map(), avLoading = new Set();

/* ===================== режим призрака ===================== */
const BLOCK = new Set(["account.UpdateStatus", "messages.ReadHistory", "channels.ReadHistory", "messages.ReadMessageContents", "channels.ReadMessageContents", "messages.SetTyping", "messages.ReadDiscussion"]);
function patchInvoke() {
  const orig = client.invoke.bind(client);
  client._origInvoke = orig;
  client.invoke = async (req, ...rest) => (ghost && req && BLOCK.has(req.className)) ? true : orig(req, ...rest);
}
async function setGhost(v) {
  ghost = v; localStorage.setItem("ghost", v ? "1" : "0"); paintHeader();
  if (v && client?._origInvoke) { try { await client._origInvoke(new Api.account.UpdateStatus({ offline: true })); } catch {} }
  toast(v ? "Режим призрака включён" : "Режим призрака выключен");
}

/* ===================== записи сообщений ===================== */
const kindOf = (m) => {
  const c = m.media?.className;
  if (c === "MessageMediaPhoto") return "photo";
  if (c === "MessageMediaDocument") {
    const d = m.media.document, at = d?.attributes || [];
    if (at.some((a) => a.className === "DocumentAttributeSticker")) return "sticker";
    if (at.some((a) => a.className === "DocumentAttributeAudio" && a.voice)) return "voice";
    if (at.some((a) => a.className === "DocumentAttributeVideo") || /^video/.test(d?.mimeType || "")) return "video";
    return "file";
  }
  return m.media ? "other" : "";
};
const LABEL = { photo: "📷 Фото", video: "🎞 Видео", voice: "🎤 Голосовое", sticker: "Стикер", file: "📎 Файл", other: "📎 Вложение" };
const labelOf = (r) => LABEL[r.kind] || "";
function dimsOf(m) {
  try {
    if (m.media?.className === "MessageMediaPhoto") { const s = (m.media.photo?.sizes || []).filter((x) => x.w && x.h); const l = s[s.length - 1]; return l ? [l.w, l.h] : [0, 0]; }
    const a = (m.media?.document?.attributes || []).find((x) => x.className === "DocumentAttributeVideo");
    return a ? [a.w, a.h] : [0, 0];
  } catch { return [0, 0]; }
}
function reactsOf(m) {
  const res = m.reactions?.results || [];
  const reacts = res.map((x) => ({ e: x.reaction?.emoticon || "⭐", n: x.count, mine: x.chosenOrder != null }));
  const who = (m.reactions?.recentReactions || []).map((x) => { let id = ""; try { id = String(utils.getPeerId(x.peerId)); } catch {} return { e: x.reaction?.emoticon || "⭐", id }; });
  return { reacts, who };
}
async function resolveSender(m) {
  try {
    const s = m.sender;
    if (s) { const id = String(utils.getPeerId(s)); ents.set(id, s); return { id, name: nameOf(s) }; }
    if (m.fromId) {
      const id = String(utils.getPeerId(m.fromId)); let e = ents.get(id);
      if (!e) { try { e = await client.getEntity(m.fromId); ents.set(id, e); } catch {} }
      return { id, name: nameOf(e) };
    }
  } catch {}
  return { id: "", name: "" };
}
function rec(m, sd) {
  if (!m || m.className !== "Message" || !m.peerId) return null;
  const chatId = String(utils.getPeerId(m.peerId)), key = chatId + ":" + m.id, text = m.message || "";
  let r = store.get(key);
  if (!r) {
    const [w, h] = dimsOf(m);
    r = { key, chatId, id: m.id, isChannel: m.peerId.className === "PeerChannel", out: !!m.out, date: m.date, text, kind: kindOf(m),
          ttl: m.media?.ttlSeconds || 0, deleted: false, edits: [], saved: false, from: sd.name || "", fromId: sd.id || "",
          replyTo: m.replyTo?.replyToMsgId || 0, fwd: m.fwdFrom ? (m.fwdFrom.fromName || "1") : "", w, h, reacts: [], who: [] };
  } else {
    if (r.text !== text) { r.edits.push(r.text); r.text = text; }
    if (!r.from && sd.name) { r.from = sd.name; r.fromId = sd.id || r.fromId; }
  }
  if (m.reactions !== undefined) { const x = reactsOf(m); r.reacts = x.reacts; r.who = x.who; }
  store.set(key, r); persist(r);
  return r;
}
async function handleMsg(m) {
  if (!m || m.className !== "Message" || !m.peerId) return null;
  const sd = m.out ? { id: "me", name: "Вы" } : await resolveSender(m);
  const r = rec(m, sd);
  if (!r) return null;
  if (m.media) mediaRef.set(r.key, m.media);
  if (!r.out && r.ttl && !r.saved && m.media) download(r).then(() => { if (cur && cur.id === r.chatId) renderChat({ keepPos: true }); }).catch(() => {});
  return r;
}
function reconcile(chatId, ids) {
  if (ids.length < 2) return;
  const set = new Set(ids), lo = Math.min(...ids), hi = Math.max(...ids);
  for (const r of store.values()) if (r.chatId === chatId && !r.deleted && r.id > lo && r.id < hi && !set.has(r.id)) { r.deleted = true; persist(r); }
}
async function fetchFor(entity, chatId, opts) {
  const msgs = (await client.getMessages(entity, opts)).filter((m) => m && m.id);
  for (const m of msgs) await handleMsg(m);
  reconcile(chatId, msgs.map((m) => m.id));
  return msgs;
}

/* ===================== файлы ===================== */
async function download(r) {
  const media = mediaRef.get(r.key); if (!media) return null;
  const buf = await client.downloadMedia(media, {}); if (!buf) return null;
  const type = r.kind === "photo" ? "image/jpeg" : (media.document?.mimeType || "video/mp4");
  const b = new Blob([buf], { type });
  await tx("blobs", "readwrite", (s) => s.put(b, r.key));
  r.saved = true; persist(r); return b;
}
async function getBlob(r) { return (await tx("blobs", "readonly", (s) => s.get(r.key))) || (await download(r)); }
async function saveBlob(r) {
  const blob = await getBlob(r); if (!blob) { toast("Файл недоступен"); return; }
  const ext = blob.type.includes("video") ? "mp4" : "jpg";
  const f = new File([blob], `tg_${r.id}.${ext}`, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] });
  else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = f.name; a.click(); }
}
function probeVideo(f) {
  return new Promise((res) => {
    const v = document.createElement("video"), url = URL.createObjectURL(f); v.preload = "metadata";
    const done = (o) => { URL.revokeObjectURL(url); res(o); };
    v.onloadedmetadata = () => done({ d: Math.round(v.duration) || 0, w: v.videoWidth || 0, h: v.videoHeight || 0 });
    v.onerror = () => done({ d: 0, w: 0, h: 0 }); setTimeout(() => done({ d: 0, w: 0, h: 0 }), 4000); v.src = url;
  });
}

/* ===================== аватарки ===================== */
const avQueue = []; let avBusy = 0;
function avatarHTML(id, name, size) {
  const url = avatars.get(String(id));
  const ini = esc((name || "?").trim().slice(0, 1).toUpperCase());
  return `<div class="ava" data-aid="${esc(id)}" style="--s:${size}px;background:${colorOf(id)}"${url ? ' data-done="1"' : ""}>${url ? `<img src="${url}" alt="">` : ini}</div>`;
}
function hydrateAvatars() {
  document.querySelectorAll(".ava[data-aid]:not([data-done])").forEach((el) => {
    const id = el.dataset.aid; if (avatars.has(id)) { setAva(el, avatars.get(id)); return; }
    if (avLoading.has(id)) return; const ent = ents.get(id); if (!ent) return;
    avLoading.add(id); avQueue.push({ id, ent });
  });
  pumpAvatars();
}
function setAva(el, url) { el.innerHTML = `<img src="${url}" alt="">`; el.dataset.done = "1"; }
function pumpAvatars() {
  while (avBusy < 3 && avQueue.length) {
    const { id, ent } = avQueue.shift(); avBusy++;
    (async () => {
      try {
        const buf = await client.downloadProfilePhoto(ent, { isBig: false });
        if (buf && buf.length) {
          const url = URL.createObjectURL(new Blob([buf], { type: "image/jpeg" })); avatars.set(id, url);
          document.querySelectorAll(`.ava[data-aid="${CSS.escape(id)}"]`).forEach((el) => setAva(el, url));
        }
      } catch {} finally { avBusy--; pumpAvatars(); }
    })();
  }
}

/* ===================== фото в ленте ===================== */
const phQueue = []; let phBusy = 0;
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); phQueue.push(e.target); } pumpPhotos(); }, { rootMargin: "300px" });
function observePhotos() { document.querySelectorAll(".ph:not([data-seen])").forEach((el) => { el.dataset.seen = "1"; io.observe(el); }); }
function pumpPhotos() {
  while (phBusy < 2 && phQueue.length) {
    const el = phQueue.shift(); phBusy++;
    (async () => {
      try {
        const r = store.get(el.dataset.k); const b = r && await getBlob(r);
        if (b) { el.innerHTML = `<img src="${URL.createObjectURL(b)}" alt="">`; el.classList.add("ok"); }
        else el.textContent = "Фото недоступно";
      } catch { el.textContent = "Фото недоступно"; } finally { phBusy--; pumpPhotos(); }
    })();
  }
}

/* ===================== шапка и экраны ===================== */
function paintHeader() {
  const h = $("hdr"); if (!h) return;
  const g = `<button class="pill sq ${ghost ? "on" : ""}" data-act="ghost" aria-label="Режим призрака">${ICON.shield}</button>`;
  if (!cur) h.innerHTML = `<button class="pill txt" data-act="refresh">Обновить</button><div class="pill ttl"><b>Чаты</b></div>${g}`;
  else h.innerHTML = `<button class="pill sq" data-act="back" aria-label="Назад">${ICON.back}</button><div class="pill ttl"><b>${esc(cur.name)}</b><small>${esc(cur.sub)}</small></div><button class="pill sq" data-act="cal" aria-label="Календарь">${ICON.cal}</button>${g}`;
}
function showView(chat) {
  $("list").classList.toggle("hidden", chat); $("tools").classList.toggle("hidden", chat); $("tabs").classList.toggle("hidden", chat);
  $("msgs").classList.toggle("hidden", !chat); $("send").classList.toggle("hidden", !chat);
  if (!chat) { $("toLatest").classList.add("hidden"); $("replybar").classList.add("hidden"); }
  paintHeader();
}
function paintTools() {
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.dataset.f === filter));
  $("tabs").innerHTML = `<button class="tab ${tab === "chats" ? "on" : ""}" data-act="tabchats">${ICON.chats}<span>Чаты</span></button><button class="tab" data-act="tabset">${ICON.gear}<span>Настройки</span></button>`;
}
function sheet(html) { const s = $("sheet"); s.innerHTML = `<div class="sh-bg" data-act="close"></div><div class="sh-body">${html}</div>`; s.classList.remove("hidden"); }
const closeSheet = () => $("sheet").classList.add("hidden");
function ask(label, secret) {
  return new Promise((res) => {
    $("mLabel").textContent = label; const i = $("mInput"); i.type = secret ? "password" : "text"; i.value = "";
    $("modal").classList.remove("hidden"); i.focus(); $("mOk").onclick = () => { $("modal").classList.add("hidden"); res(i.value.trim()); };
  });
}

/* ===================== список чатов ===================== */
const previewOf = (d) => {
  const m = d.message; if (!m) return "";
  const t = m.message || LABEL[kindOf(m)] || (m.className === "MessageService" ? "Служебное сообщение" : "");
  return (m.out ? "Вы: " : "") + t;
};
const isMuted = (d) => { const u = d.dialog?.notifySettings?.muteUntil; return !!u && u > Date.now() / 1000; };
function renderList() {
  const q = query.trim().toLowerCase();
  const html = dialogs.map((d, i) => ({ d, i })).filter(({ d }) => {
    if (filter === "users" && !d.isUser) return false;
    if (filter === "groups" && !d.isGroup) return false;
    if (filter === "channels" && !(d.isChannel && !d.isGroup)) return false;
    return !q || (d.title || d.name || "").toLowerCase().includes(q);
  }).map(({ d, i }) => {
    const id = String(d.id), name = d.title || d.name || "Без названия", mu = isMuted(d);
    return `<div class="dlg" data-act="dlg" data-i="${i}">${avatarHTML(id, name, 56)}<div class="db"><div class="r1"><span class="dn">${esc(name)}</span>${mu ? `<span class="mu">${ICON.mute}</span>` : ""}<span class="dt">${ftime(d.date)}</span></div><div class="r2"><span class="dp">${esc(previewOf(d))}</span>${d.unreadCount ? `<span class="bd ${mu ? "m" : ""}">${d.unreadCount}</span>` : ""}</div></div></div>`;
  }).join("");
  $("list").innerHTML = html || '<div class="empty">Чатов нет</div>';
  hydrateAvatars();
}
let listBusy = false;
async function loadDialogs() {
  if (listBusy) return; listBusy = true;
  if (!dialogs.length) $("list").innerHTML = '<div class="empty">Загрузка…</div>';
  try {
    dialogs = await client.getDialogs({ limit: 100 });
    for (const d of dialogs) if (d.entity) ents.set(String(d.id), d.entity);
    if (!cur) renderList();
  } catch (e) { toast("Не удалось загрузить чаты: " + (e.message || e), 6000); }
  listBusy = false;
}
let rt; const scheduleList = () => { if (cur) return; clearTimeout(rt); rt = setTimeout(loadDialogs, 1500); };

/* ===================== фоновое сохранение (чтобы ловить удалённые) ===================== */
let preloaded = false;
async function preloadChats() {
  if (preloaded) return; preloaded = true;
  for (const d of dialogs.slice(0, 30)) {
    if (!d.inputEntity) continue;
    try { await fetchFor(d.inputEntity, String(d.id), { limit: 40 }); } catch {}
    await sleep(500);
  }
}

/* ===================== чат ===================== */
const windowRows = () => [...store.values()].filter((r) => r.chatId === cur.id && r.id >= cur.win.min && r.id <= cur.win.max).sort((a, b) => a.id - b.id);

async function openChat(d) {
  const e = d.entity, broadcast = !!e?.broadcast;
  cur = { id: String(d.id), entity: d.inputEntity, name: d.title || d.name || "Чат", showSender: !d.isUser && !broadcast, broadcast,
          sub: d.isUser ? "" : broadcast ? "канал" : (e?.participantsCount ? `${e.participantsCount} ${plural(e.participantsCount)}` : "группа"),
          win: { min: 0, max: Infinity }, loading: false, atStart: false, cap: 400, reply: null };
  showView(true); $("msgs").innerHTML = '<div class="empty">Загрузка…</div>';
  try { await loadLatest(); } catch (err) { toast("Не удалось загрузить: " + (err.message || err), 6000); }
  renderChat({ bottom: true });
}
function closeChat() { cur = null; showView(false); renderList(); clearTimeout(rt); loadDialogs(); }
async function loadLatest() {
  const msgs = await fetchFor(cur.entity, cur.id, { limit: 50 });
  const ids = msgs.map((m) => m.id);
  cur.win = { min: ids.length ? Math.min(...ids) : 0, max: Infinity }; cur.atStart = msgs.length < 50;
}
async function loadOlder(silent) {
  if (!cur || cur.loading || cur.atStart) return 0;
  const rows = windowRows(); if (!rows.length) return 0;
  const box = $("msgs");
  if (!silent && rows.length > cur.cap) { const h = box.scrollHeight, t = box.scrollTop; cur.cap += 300; renderChat({ keepPos: true }); box.scrollTop = box.scrollHeight - h + t; return 0; }
  cur.loading = true; const h = box.scrollHeight, t = box.scrollTop; let n = 0;
  try {
    const msgs = await fetchFor(cur.entity, cur.id, { limit: 100, offsetId: cur.win.min });
    n = msgs.length; if (n < 100) cur.atStart = true;
    if (n) cur.win.min = Math.min(cur.win.min, ...msgs.map((m) => m.id));
  } catch (e) { toast("Ошибка загрузки истории: " + (e.message || e), 5000); }
  cur.loading = false;
  if (!silent) { cur.cap += 100; renderChat({ keepPos: true }); box.scrollTop = box.scrollHeight - h + t; }
  return n;
}
async function loadNewer() {
  if (!cur || cur.loading || cur.win.max === Infinity) return;
  cur.loading = true;
  try {
    const msgs = await fetchFor(cur.entity, cur.id, { reverse: true, offsetId: cur.win.max, limit: 50 });
    if (msgs.length < 50) cur.win.max = Infinity; else cur.win.max = Math.max(...msgs.map((m) => m.id));
  } catch (e) { toast("Ошибка загрузки: " + (e.message || e), 5000); }
  cur.loading = false; renderChat({ keepPos: true });
}
async function jumpToDate(ts) {
  closeSheet(); if (!cur) return;
  try {
    const msgs = await fetchFor(cur.entity, cur.id, { reverse: true, offsetDate: ts - 1, limit: 60 });
    if (!msgs.length) { toast("После этой даты сообщений нет"); return; }
    const ids = msgs.map((m) => m.id);
    cur.win = { min: Math.min(...ids), max: msgs.length < 60 ? Infinity : Math.max(...ids) }; cur.atStart = false; cur.cap = 400;
    const target = msgs.find((m) => m.date >= ts) || msgs[0];
    if (target.date >= ts + 86400) toast("В этот день сообщений нет — показан ближайший следующий день", 4500);
    renderChat({ keepPos: true });
    const el = [...document.querySelectorAll(".row")].find((x) => x.dataset.k === cur.id + ":" + target.id);
    if (el) { $("msgs").scrollTop = el.offsetTop - 70; el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1800); }
  } catch (e) { toast("Не удалось перейти к дате: " + (e.message || e), 6000); }
}
async function loadAll() {
  if (!cur) return; window.__stop = false;
  sheet(`<div class="pg"><b>Загрузка всей истории…</b><p id="pgt">0 сообщений</p><button class="wide" data-act="stopall">Остановить</button></div>`);
  let total = 0;
  while (!window.__stop && !cur.atStart) { total += await loadOlder(true); const el = $("pgt"); if (el) el.textContent = total + " сообщений"; await sleep(300); }
  closeSheet(); renderChat({ bottom: true }); toast(cur.atStart ? `История загружена полностью (+${total})` : "Остановлено");
}

function msgHTML(r, first, last) {
  const grp = cur.showSender && !r.out;
  const av = grp ? (last ? avatarHTML(r.fromId, r.from, 34) : '<div class="avsp"></div>') : "";
  let b = "";
  if (grp && first && r.from) b += `<div class="nm" style="color:${colorOf(r.fromId)}">${esc(r.from)}</div>`;
  if (r.fwd) b += `<div class="tag fw">↪ Переслано${r.fwd !== "1" ? " от " + esc(r.fwd) : ""}</div>`;
  if (r.replyTo) {
    const q = store.get(cur.id + ":" + r.replyTo), qn = q ? (q.out ? "Вы" : q.from || cur.name) : "Сообщение";
    b += `<div class="rp" data-act="goto" data-k="${esc(cur.id + ":" + r.replyTo)}" style="--c:${q && !q.out ? colorOf(q.fromId) : "#8774e1"}"><b>${esc(qn)}</b><span>${esc(q ? (q.text || labelOf(q)) : "Открыть сообщение")}</span></div>`;
  }
  if (r.deleted) b += `<div class="tag del">🗑 удалено</div>`;
  if (r.ttl) b += `<div class="tag tt">⏱ временное${r.saved ? ", сохранено" : ""}</div>`;
  if (r.kind === "photo") b += `<div class="ph" data-act="view" data-k="${esc(r.key)}" style="${r.w && r.h ? `aspect-ratio:${r.w}/${r.h}` : "min-height:160px"}">Фото…</div>`;
  else if (r.kind === "video") b += `<div class="ph vd" data-act="view" data-k="${esc(r.key)}" style="${r.w && r.h ? `aspect-ratio:${r.w}/${r.h}` : "min-height:160px"}">▶ Видео</div>`;
  else if (r.kind) b += `<div class="lbl">${labelOf(r)}</div>`;
  b += `<div class="tx">${esc(r.text)}<span class="meta">${r.edits.length ? "изм. " : ""}${hm(r.date)}</span></div>`;
  if (r.reacts && r.reacts.length) b += `<div class="rx">${r.reacts.map((x) => `<span class="rc ${x.mine ? "mine" : ""}" data-act="react" data-k="${esc(r.key)}" data-e="${esc(x.e)}">${esc(x.e)} ${x.n}</span>`).join("")}</div>`;
  return `<div class="row ${r.out ? "out" : "in"} ${first ? "gap" : ""}" data-k="${esc(r.key)}">${av}<div class="bb ${first ? "f" : ""} ${last ? "l" : ""} ${r.deleted ? "deleted" : ""}" data-act="msg" data-k="${esc(r.key)}">${b}</div></div>`;
}
function renderChat(o = {}) {
  if (!cur) return;
  const box = $("msgs"), wasBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 150;
  let rows = windowRows(); if (rows.length > cur.cap) rows = rows.slice(-cur.cap);
  let html = "", lastDay = "", prev = null;
  rows.forEach((r, i) => {
    const next = rows[i + 1], day = dayKey(r.date);
    if (day !== lastDay) { html += `<div class="day"><span>${dayLabel(r.date)}</span></div>`; lastDay = day; prev = null; }
    const sameP = prev && prev.fromId === r.fromId && prev.out === r.out;
    const sameN = next && dayKey(next.date) === day && next.fromId === r.fromId && next.out === r.out;
    html += msgHTML(r, !sameP, !sameN); prev = r;
  });
  box.innerHTML = html || '<div class="empty">Сообщений нет</div>';
  if (o.bottom || (!o.keepPos && wasBottom)) box.scrollTop = box.scrollHeight;
  hydrateAvatars(); observePhotos();
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 150;
  $("toLatest").classList.toggle("hidden", nearBottom && cur.win.max === Infinity);
}

/* ===================== календарь ===================== */
function openCalendar(y, m) {
  if (!cur) return; const now = new Date();
  if (y == null) { y = now.getFullYear(); m = now.getMonth(); }
  const known = new Set(); for (const r of store.values()) if (r.chatId === cur.id) known.add(dayKey(r.date));
  const first = new Date(y, m, 1), offs = (first.getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
  let cells = ""; for (let i = 0; i < offs; i++) cells += "<i></i>";
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(y, m, d), future = dt > now;
    cells += `<button class="cd ${known.has(y + "-" + m + "-" + d) ? "has" : ""}" ${future ? "disabled" : ""} data-act="calday" data-ts="${Math.floor(dt.getTime() / 1000)}">${d}</button>`;
  }
  const pm = new Date(y, m - 1, 1), nm = new Date(y, m + 1, 1), nextOk = nm <= now;
  const title = first.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  sheet(`<div class="cal-h"><button class="pill sq" data-act="calnav" data-y="${pm.getFullYear()}" data-m="${pm.getMonth()}">‹</button><b>${esc(title)}</b><button class="pill sq" ${nextOk ? "" : "disabled"} data-act="calnav" data-y="${nm.getFullYear()}" data-m="${nm.getMonth()}">›</button></div><div class="cal-w"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span></div><div class="cal-g">${cells}</div><p class="hint">Любая дата работает: приложение загрузит сообщения того дня с сервера. Точка — день, который уже сохранён у вас.</p><button class="wide" data-act="loadall">Загрузить всю историю чата</button>`);
}

/* ===================== действия над сообщением ===================== */
const EMOJI = ["👍", "❤️", "🔥", "😂", "😮", "😢", "👎", "🎉"];
function openMsgSheet(r) {
  const who = (r.who || []).map((x) => `${esc(x.e)} ${esc(nameOf(ents.get(x.id)) || "")}`).filter(Boolean).join("<br>");
  const hist = r.edits.length ? `<div class="sh-sec"><b>Прошлые версии</b>${r.edits.slice().reverse().map((t) => `<div class="old">${esc(t || "(пусто)")}</div>`).join("")}</div>` : "";
  sheet(`<div class="rxrow">${EMOJI.map((e) => `<button data-act="react" data-k="${esc(r.key)}" data-e="${e}">${e}</button>`).join("")}</div>
    <button class="wide" data-act="reply" data-k="${esc(r.key)}">Ответить</button>
    ${r.text ? `<button class="wide" data-act="copy" data-k="${esc(r.key)}">Копировать текст</button>` : ""}
    ${r.kind === "photo" || r.kind === "video" ? `<button class="wide" data-act="save" data-k="${esc(r.key)}">Сохранить в галерею</button>` : ""}
    ${r.out && !r.deleted ? `<button class="wide danger" data-act="del" data-k="${esc(r.key)}">Удалить у всех</button>` : ""}
    ${hist}${who ? `<div class="sh-sec"><b>Кто поставил реакции</b><div class="old">${who}</div></div>` : ""}`);
}
async function sendReaction(r, e) {
  const mine = r.reacts.find((x) => x.mine);
  const remove = mine && mine.e === e;
  try {
    await client.invoke(new Api.messages.SendReaction({ peer: cur.entity, msgId: r.id, reaction: remove ? [] : [new Api.ReactionEmoji({ emoticon: e })] }));
    r.reacts = r.reacts.map((x) => x.mine ? { ...x, n: x.n - 1, mine: false } : x).filter((x) => x.n > 0);
    if (!remove) { const x = r.reacts.find((y) => y.e === e); if (x) { x.n++; x.mine = true; } else r.reacts.push({ e, n: 1, mine: true }); }
    persist(r); renderChat({ keepPos: true });
  } catch (err) { toast("Реакция не отправлена: " + (err.message || err), 5000); }
}
function setReply(r) {
  cur.reply = { id: r.id, name: r.out ? "Вы" : r.from || cur.name, text: r.text || labelOf(r) };
  $("replybar").innerHTML = `<div class="rpl"><b>Ответ: ${esc(cur.reply.name)}</b><span>${esc(cur.reply.text)}</span></div><button class="pill sq" data-act="cancelreply">✕</button>`;
  $("replybar").classList.remove("hidden"); $("text").focus();
}
function clearReply() { if (cur) cur.reply = null; $("replybar").classList.add("hidden"); }
function openViewer(r) {
  const v = $("viewer"); v.classList.remove("hidden"); v.innerHTML = `<div class="vtop"><button class="pill txt" data-act="closeview">Закрыть</button><button class="pill txt" data-act="save" data-k="${esc(r.key)}">В галерею</button></div><div class="vbody" id="vbody">Загрузка…</div>`;
  getBlob(r).then((b) => {
    const body = $("vbody"); if (!body) return;
    if (!b) { body.textContent = "Файл недоступен (возможно, удалён на сервере)"; return; }
    const url = URL.createObjectURL(b);
    body.innerHTML = b.type.startsWith("video") ? `<video src="${url}" controls autoplay playsinline></video>` : `<img src="${url}" alt="">`;
  }).catch(() => { const body = $("vbody"); if (body) body.textContent = "Не удалось загрузить"; });
}
async function sendFiles(files) {
  if (!cur) return;
  for (const f of files) {
    try {
      toast("Подготовка: " + f.name, 60000);
      const buf = Buffer.from(await f.arrayBuffer());
      const opts = { file: new CustomFile(f.name || "file", f.size, "", buf), caption: $("text").value.trim(), forceDocument: false,
                     progressCallback: (p) => toast(`Отправка ${Math.round(p * 100)}%`, 60000) };
      if (f.type.startsWith("video")) {
        const v = await probeVideo(f); opts.supportsStreaming = true;
        opts.attributes = [new Api.DocumentAttributeVideo({ duration: v.d, w: v.w, h: v.h, supportsStreaming: true })];
      }
      if (cur.reply) opts.replyTo = cur.reply.id;
      const m = await client.sendFile(cur.entity, opts);
      $("text").value = ""; clearReply();
      if (cur.win.max !== Infinity) await loadLatest();
      await handleMsg(m); renderChat({ bottom: true }); toast("Отправлено");
    } catch (e) { toast("Не отправлено: " + (e.message || e), 7000); }
  }
}

/* ===================== настройки ===================== */
function openSettings() {
  sheet(`<b class="sh-t">Настройки</b>
    <label class="sw"><span>Режим призрака<small>Не отправлять «в сети», прочтение и «печатает»</small></span><input type="checkbox" id="swGhost" ${ghost ? "checked" : ""}></label>
    <button class="wide" data-act="refresh">Обновить чаты</button>
    <button class="wide danger" data-act="logout">Выйти</button><p class="hint">${VERSION}</p>`);
}

/* ===================== события ===================== */
document.addEventListener("change", (e) => { if (e.target.id === "swGhost") setGhost(e.target.checked); });
$("file").addEventListener("change", (e) => { const fs = [...e.target.files]; e.target.value = ""; if (fs.length) sendFiles(fs); });
$("q").addEventListener("input", (e) => { query = e.target.value; renderList(); });
$("msgs").addEventListener("scroll", () => {
  if (!cur) return; const b = $("msgs");
  if (b.scrollTop < 120) loadOlder();
  const near = b.scrollHeight - b.scrollTop - b.clientHeight < 150;
  if (near && cur.win.max !== Infinity) loadNewer();
  $("toLatest").classList.toggle("hidden", near && cur.win.max === Infinity);
}, { passive: true });
$("send").addEventListener("submit", async (e) => {
  e.preventDefault(); if (!cur) return;
  const t = $("text").value.trim(); if (!t) return;
  $("text").value = "";
  try {
    const opts = { message: t }; if (cur.reply) opts.replyTo = cur.reply.id;
    const m = await client.sendMessage(cur.entity, opts); clearReply();
    if (cur.win.max !== Infinity) await loadLatest();
    await handleMsg(m); renderChat({ bottom: true });
  } catch (err) { $("text").value = t; toast("Не отправлено: " + (err.message || err), 6000); }
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, r = b.dataset.k ? store.get(b.dataset.k) : null;
  try {
    switch (a) {
      case "ghost": setGhost(!ghost); break;
      case "refresh": closeSheet(); loadDialogs(); break;
      case "back": closeChat(); break;
      case "cal": openCalendar(); break;
      case "calnav": openCalendar(Number(b.dataset.y), Number(b.dataset.m)); break;
      case "calday": jumpToDate(Number(b.dataset.ts)); break;
      case "loadall": loadAll(); break;
      case "stopall": window.__stop = true; break;
      case "close": closeSheet(); break;
      case "filter": filter = b.dataset.f; paintTools(); renderList(); break;
      case "dlg": openChat(dialogs[Number(b.dataset.i)]); break;
      case "tabchats": tab = "chats"; closeSheet(); break;
      case "tabset": openSettings(); break;
      case "msg": if (r && window.getSelection().toString() === "") openMsgSheet(r); break;
      case "reply": if (r) { closeSheet(); setReply(r); } break;
      case "copy": if (r) { await navigator.clipboard.writeText(r.text); closeSheet(); toast("Скопировано"); } break;
      case "del": if (r && confirm("Удалить сообщение у всех?")) { await client.deleteMessages(cur.entity, [r.id], { revoke: true }); r.deleted = true; persist(r); closeSheet(); renderChat({ keepPos: true }); } break;
      case "react": if (r) { closeSheet(); await sendReaction(r, b.dataset.e); } break;
      case "goto": { const el = [...document.querySelectorAll(".row")].find((x) => x.dataset.k === b.dataset.k); if (el) { $("msgs").scrollTop = el.offsetTop - 70; el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1800); } else toast("Это сообщение ещё не загружено — прокрутите вверх или выберите дату в календаре"); break; }
      case "view": if (r) openViewer(r); break;
      case "closeview": $("viewer").classList.add("hidden"); $("viewer").innerHTML = ""; break;
      case "save": if (r) await saveBlob(r); break;
      case "cancelreply": clearReply(); break;
      case "tolatest": if (cur.win.max !== Infinity) { await loadLatest(); cur.cap = 400; renderChat({ bottom: true }); } else $("msgs").scrollTo({ top: $("msgs").scrollHeight, behavior: "smooth" }); break;
      case "logout": ["sess", "apiId", "apiHash"].forEach((k) => localStorage.removeItem(k)); location.reload(); break;
    }
  } catch (err) { if (err.name !== "AbortError") toast("Ошибка: " + (err.message || err), 6000); }
});

/* ===================== живые обновления ===================== */
function onUpdate(u) {
  const c = u.className;
  if (c === "UpdateDeleteMessages" || c === "UpdateDeleteChannelMessages") {
    const ch = c === "UpdateDeleteChannelMessages" ? "-100" + String(u.channelId) : null;
    for (const r of store.values()) if (u.messages.includes(r.id) && (ch ? r.chatId === ch : !r.isChannel) && !r.deleted) { r.deleted = true; persist(r); }
    if (cur) renderChat({ keepPos: true });
  } else if (["UpdateNewMessage", "UpdateNewChannelMessage", "UpdateEditMessage", "UpdateEditChannelMessage"].includes(c)) {
    handleMsg(u.message).then((r) => {
      if (r && cur && r.chatId === cur.id && (cur.win.max === Infinity)) renderChat({});
      scheduleList();
    });
  } else if (c === "UpdateMessageReactions") {
    try {
      const r = store.get(String(utils.getPeerId(u.peer)) + ":" + u.msgId);
      if (r) { const x = reactsOf({ reactions: u.reactions }); r.reacts = x.reacts; r.who = x.who; persist(r); if (cur) renderChat({ keepPos: true }); }
    } catch {}
  }
}

/* ===================== вход ===================== */
async function start(apiId, apiHash) {
  const session = new StringSession(localStorage.getItem("sess") || "");
  client = new TelegramClient(session, Number(apiId), apiHash, { connectionRetries: 5, useWSS: true, deviceModel: "iPhone", systemVersion: "iOS", appVersion: "1.0", langCode: "ru", systemLangCode: "ru" });
  await client.start({
    phoneNumber: () => ask("Телефон в формате +7..."),
    phoneCode: () => ask("Код из Telegram"),
    password: () => ask("Пароль двухэтапной проверки", true),
    onError: (e) => { toast("Ошибка: " + (e.message || e), 8000); return true; },
  });
  localStorage.setItem("sess", client.session.save());
  patchInvoke(); client.addEventHandler(onUpdate);
  const all = await tx("msgs", "readonly", (s) => s.getAll());
  for (const r of all || []) store.set(r.key, r);
  document.getElementById("login").classList.add("hidden"); document.getElementById("main").classList.remove("hidden");
  paintTools(); showView(false);
  if (ghost) setGhost(true);
  await loadDialogs();
  preloadChats();
}
$("loginBtn").onclick = async () => {
  const id = $("apiId").value.trim(), hash = $("apiHash").value.trim();
  if (!id || !hash) { toast("Введите api_id и api_hash"); return; }
  localStorage.setItem("apiId", id); localStorage.setItem("apiHash", hash);
  try { await start(id, hash); } catch (e) { toast("Не удалось войти", 4000); $("err").textContent = VERSION + " " + (e && (e.name + ": " + e.message + "\n" + e.stack) || e); }
};
const savedId = localStorage.getItem("apiId"), savedHash = localStorage.getItem("apiHash");
if (savedId && savedHash) start(savedId, savedHash).catch((e) => { $("login").classList.remove("hidden"); $("main").classList.add("hidden"); toast("Ошибка входа", 4000); $("err").textContent = VERSION + " " + (e && (e.name + ": " + e.message + "\n" + e.stack) || e); });
else $("login").classList.remove("hidden");
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
