import "./shim.js";
import { TelegramClient, utils, sessions, Api } from "telegram";
const StringSession = sessions.StringSession;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const toast = (t, ms = 3500) => { const e = $("toast"); e.textContent = t; e.classList.remove("hidden"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.add("hidden"), ms); };

/* ---------- IndexedDB: сообщения и файлы ---------- */
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

/* ---------- состояние ---------- */
let client = null, cur = null, dialogs = [];
let ghost = localStorage.getItem("ghost") !== "0";
const store = new Map();     // key -> запись сообщения
const mediaRef = new Map();  // key -> media (только для текущей сессии)

/* ---------- режим призрака ---------- */
const BLOCK = new Set([
  "account.UpdateStatus", "messages.ReadHistory", "channels.ReadHistory",
  "messages.ReadMessageContents", "channels.ReadMessageContents",
  "messages.SetTyping", "messages.ReadDiscussion",
]);
function patchInvoke() {
  const orig = client.invoke.bind(client);
  client._origInvoke = orig;
  client.invoke = async (req, ...rest) => {
    if (ghost && req && BLOCK.has(req.className)) return true;
    return orig(req, ...rest);
  };
}
function paintGhost() {
  const b = $("ghostBtn");
  b.classList.toggle("ghost-on", ghost);
  b.textContent = ghost ? "Призрак: вкл" : "Призрак: выкл";
}
async function setGhost(v) {
  ghost = v; localStorage.setItem("ghost", v ? "1" : "0"); paintGhost();
  if (v && client?._origInvoke) {
    try { await client._origInvoke(new Api.account.UpdateStatus({ offline: true })); } catch {}
  }
  toast(v ? "Режим призрака включён" : "Режим призрака выключен");
}

/* ---------- запись сообщений ---------- */
const kindOf = (m) => {
  const c = m.media?.className;
  if (c === "MessageMediaPhoto") return "photo";
  if (c === "MessageMediaDocument") return (m.media.document?.mimeType || "").startsWith("video") ? "video" : "file";
  return m.media ? "other" : "";
};
function rec(m) {
  if (!m || m.className !== "Message" || !m.peerId) return null;
  const chatId = String(utils.getPeerId(m.peerId));
  const key = chatId + ":" + m.id;
  const text = m.message || "";
  let r = store.get(key);
  if (!r) {
    r = { key, chatId, id: m.id, isChannel: m.peerId.className === "PeerChannel", out: !!m.out,
          date: m.date, text, kind: kindOf(m), ttl: m.media?.ttlSeconds || 0, deleted: false, edits: [], saved: false };
  } else if (r.text !== text) { r.edits.push(r.text); r.text = text; }
  store.set(key, r);
  persist(r);
  return r;
}
async function handleMsg(m) {
  const r = rec(m);
  if (!r) return;
  if (m.media) mediaRef.set(r.key, m.media);
  if (!r.out && r.ttl && !r.saved && m.media) { // временное фото/видео: сохраняем сразу
    download(r).then(() => { if (cur && cur.id === r.chatId) renderChat(); }).catch(() => {});
  }
}
async function download(r) {
  const media = mediaRef.get(r.key);
  if (!media) return null;
  const buf = await client.downloadMedia(media, {});
  if (!buf) return null;
  const type = r.kind === "photo" ? "image/jpeg" : (media.document?.mimeType || "video/mp4");
  const b = new Blob([buf], { type });
  await tx("blobs", "readwrite", (s) => s.put(b, r.key));
  r.saved = true; persist(r);
  return b;
}
async function getBlob(r) {
  return (await tx("blobs", "readonly", (s) => s.get(r.key))) || (await download(r));
}

/* ---------- живые обновления ---------- */
function onUpdate(u) {
  const c = u.className;
  if (c === "UpdateDeleteMessages" || c === "UpdateDeleteChannelMessages") {
    const ch = c === "UpdateDeleteChannelMessages" ? "-100" + String(u.channelId) : null;
    for (const r of store.values()) {
      if (u.messages.includes(r.id) && (ch ? r.chatId === ch : !r.isChannel) && !r.deleted) { r.deleted = true; persist(r); }
    }
    if (cur) renderChat();
  } else if (["UpdateNewMessage", "UpdateNewChannelMessage", "UpdateEditMessage", "UpdateEditChannelMessage"].includes(c)) {
    handleMsg(u.message).then(() => { if (cur) renderChat(); });
  }
}

/* ---------- экраны ---------- */
const show = (id) => { for (const s of ["login", "main"]) $(s).classList.toggle("hidden", s !== id); };

function ask(label, secret) {
  return new Promise((res) => {
    $("mLabel").textContent = label;
    const i = $("mInput"); i.type = secret ? "password" : "text"; i.value = "";
    $("modal").classList.remove("hidden"); i.focus();
    $("mOk").onclick = () => { $("modal").classList.add("hidden"); res(i.value.trim()); };
  });
}

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
  patchInvoke();
  client.addEventHandler(onUpdate);
  const all = await tx("msgs", "readonly", (s) => s.getAll());
  for (const r of all || []) store.set(r.key, r);
  show("main"); paintGhost();
  if (ghost) setGhost(true);
  await loadDialogs();
}

async function loadDialogs() {
  $("list").innerHTML = '<div class="empty">Загрузка…</div>';
  dialogs = await client.getDialogs({ limit: 60 });
  $("list").innerHTML = dialogs.map((d, i) => {
    const name = d.title || d.name || "Без названия";
    const last = d.message?.message || (d.message?.media ? "📎 Вложение" : "");
    return `<div class="dlg" data-i="${i}"><div class="ava">${esc(name.slice(0, 1).toUpperCase())}</div>
      <div class="b"><div class="t">${esc(name)}</div><div class="s">${esc(last)}</div></div>
      ${d.unreadCount ? `<span class="unread">${d.unreadCount}</span>` : ""}</div>`;
  }).join("") || '<div class="empty">Чатов нет</div>';
}

async function openChat(d) {
  cur = { id: String(d.id), entity: d.inputEntity, name: d.title || d.name || "Чат" };
  $("title").textContent = cur.name;
  $("list").classList.add("hidden"); $("msgs").classList.remove("hidden");
  $("send").classList.remove("hidden"); $("back").classList.remove("hidden");
  $("msgs").innerHTML = '<div class="empty">Загрузка…</div>';
  try {
    const msgs = await client.getMessages(d.inputEntity, { limit: 60 });
    for (const m of msgs.slice().reverse()) await handleMsg(m);
  } catch (e) { toast("Не удалось загрузить: " + (e.message || e), 6000); }
  renderChat(true);
}

function fmt(ts) { return new Date(ts * 1000).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }

function renderChat(scroll) {
  if (!cur) return;
  const box = $("msgs");
  const atBottom = scroll || box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  const rows = [...store.values()].filter((r) => r.chatId === cur.id).sort((a, b) => a.date - b.date || a.id - b.id).slice(-300);
  box.innerHTML = rows.map((r) => {
    let h = "";
    if (r.deleted) h += `<span class="tag">🗑 удалено</span>`;
    if (r.ttl) h += `<span class="tag ttl">⏱ временное${r.saved ? ", сохранено" : ""}</span>`;
    if (r.edits.length) h += `<span class="tag edit" data-act="hist" data-k="${esc(r.key)}">✏ изменено (${r.edits.length})</span>`;
    if (r.kind) {
      const label = r.kind === "photo" ? "📷 Фото" : r.kind === "video" ? "🎞 Видео" : "📎 Файл";
      h += `<div data-media="${esc(r.key)}"><button class="mbtn" data-act="show" data-k="${esc(r.key)}">${label}</button>` +
           (r.kind === "photo" || r.kind === "video" ? `<button class="mbtn" data-act="save" data-k="${esc(r.key)}">В галерею</button>` : "") + `</div>`;
    }
    if (r.text) h += esc(r.text);
    return `<div class="m ${r.out ? "out" : ""} ${r.deleted ? "deleted" : ""}">${h}<div class="meta">${fmt(r.date)}</div></div>`;
  }).join("") || '<div class="empty">Сообщений нет</div>';
  if (atBottom) box.scrollTop = box.scrollHeight;
}

/* ---------- действия ---------- */
$("msgs").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const r = store.get(b.dataset.k); if (!r) return;
  try {
    if (b.dataset.act === "hist") {
      const el = b.parentElement;
      if (el.querySelector(".old")) { el.querySelectorAll(".old").forEach((x) => x.remove()); return; }
      r.edits.slice().reverse().forEach((t) => { const d = document.createElement("div"); d.className = "old"; d.textContent = t || "(пусто)"; b.after(d); });
    } else if (b.dataset.act === "show") {
      b.textContent = "Загрузка…";
      const blob = await getBlob(r);
      if (!blob) { b.textContent = "Недоступно"; toast("Файл больше недоступен на сервере"); return; }
      const url = URL.createObjectURL(blob);
      const wrap = b.parentElement;
      wrap.querySelector("img,video")?.remove();
      const el = document.createElement(blob.type.startsWith("video") ? "video" : "img");
      el.src = url; if (el.tagName === "VIDEO") { el.controls = true; el.playsInline = true; }
      wrap.prepend(el); b.remove();
    } else if (b.dataset.act === "save") {
      const blob = await getBlob(r);
      if (!blob) { toast("Файл недоступен"); return; }
      const ext = blob.type.includes("video") ? "mp4" : "jpg";
      const f = new File([blob], `tg_${r.id}.${ext}`, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] });
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = f.name; a.click(); }
    }
  } catch (err) { if (err.name !== "AbortError") toast("Ошибка: " + (err.message || err), 6000); }
});

$("list").addEventListener("click", (e) => {
  const d = e.target.closest(".dlg"); if (d) openChat(dialogs[Number(d.dataset.i)]);
});
$("back").onclick = () => {
  cur = null; $("title").textContent = "Чаты";
  $("msgs").classList.add("hidden"); $("send").classList.add("hidden"); $("back").classList.add("hidden");
  $("list").classList.remove("hidden");
};
$("send").onsubmit = async (e) => {
  e.preventDefault();
  const t = $("text").value.trim(); if (!t || !cur) return;
  $("text").value = "";
  try { const m = await client.sendMessage(cur.entity, { message: t }); await handleMsg(m); renderChat(true); }
  catch (err) { toast("Не отправлено: " + (err.message || err), 6000); }
};
$("ghostBtn").onclick = () => setGhost(!ghost);
$("menuBtn").onclick = async () => {
  const v = await ask("Введите «обновить» чтобы перезагрузить чаты, или «выход» чтобы выйти");
  if (v.toLowerCase() === "обновить") { if (cur) $("back").onclick(); loadDialogs(); }
  if (v.toLowerCase() === "выход") { localStorage.removeItem("sess"); localStorage.removeItem("apiId"); localStorage.removeItem("apiHash"); location.reload(); }
};
$("loginBtn").onclick = async () => {
  const id = $("apiId").value.trim(), hash = $("apiHash").value.trim();
  if (!id || !hash) { toast("Введите api_id и api_hash"); return; }
  localStorage.setItem("apiId", id); localStorage.setItem("apiHash", hash);
  try { await start(id, hash); } catch (e) { toast("Не удалось войти: " + (e.message || e), 8000); }
};

/* ---------- запуск ---------- */
const savedId = localStorage.getItem("apiId"), savedHash = localStorage.getItem("apiHash");
if (savedId && savedHash) { show("main"); start(savedId, savedHash).catch((e) => { show("login"); toast("Ошибка: " + (e.message || e), 8000); }); }
else show("login");
if ("storage" in navigator && navigator.storage.persist) navigator.storage.persist();
