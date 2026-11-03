import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail, sendEmailVerification, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, collection, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, writeBatch, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const initial = n => (n || "?").trim()[0].toUpperCase();
const chatIdFor = (a, b) => [a, b].sort().join("_");
const fmt = ts => ts ? new Date(ts.toMillis()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
let me = null, meDoc = null, mode = "login", activeChat = null, unsubMsgs = null, unsubChats = null;
const profiles = new Map();

async function profile(uid) {
  if (profiles.has(uid)) return profiles.get(uid);
  const s = await getDoc(doc(db, "users", uid));
  const p = s.exists() ? { uid, ...s.data() } : { uid, name: "Unknown", username: "?" };
  profiles.set(uid, p); return p;
}

/* ---------- auth ---------- */
function setMode(m) {
  mode = m;
  document.querySelectorAll(".reg").forEach(e => e.classList.toggle("hidden", m !== "register"));
  $("a-go").textContent = m === "register" ? "Create account" : "Log in";
  $("a-toggle").textContent = m === "register" ? "Have an account? Log in" : "New here? Create an account";
  $("a-err").textContent = "";
}
$("a-toggle").onclick = () => setMode(mode === "login" ? "register" : "login");
$("a-reset").onclick = async () => {
  const email = $("a-email").value.trim();
  if (!email) return $("a-err").textContent = "Enter your email first, then tap Forgot password.";
  try { await sendPasswordResetEmail(auth, email); $("a-err").textContent = "Reset link sent. Check your inbox."; }
  catch (e) { $("a-err").textContent = e.message; }
};
$("a-go").onclick = async () => {
  const email = $("a-email").value.trim(), pass = $("a-pass").value;
  $("a-err").textContent = "";
  try {
    if (mode === "login") return void await signInWithEmailAndPassword(auth, email, pass);
    const name = $("a-name").value.trim(), username = $("a-user").value.trim().toLowerCase();
    if (!name) throw new Error("Enter your name.");
    if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error("Username must be 3–20 characters: a–z, 0–9 or _.");
    if (pass.length < 8) throw new Error("Password needs at least 8 characters.");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    try {
      const b = writeBatch(db);
      b.set(doc(db, "usernames", username), { uid: cred.user.uid });
      b.set(doc(db, "users", cred.user.uid), { name, username, usernameLower: username, bio: "", createdAt: serverTimestamp(), online: true, lastSeen: serverTimestamp() });
      await b.commit();
      sendEmailVerification(cred.user).catch(() => {});
    } catch { await deleteUser(cred.user); throw new Error("That username is taken. Pick another."); }
  } catch (e) { $("a-err").textContent = e.message.replace("Firebase: ", ""); }
};
$("logout").onclick = async () => { await setPresence(false); signOut(auth); };
$("verify").onclick = async () => { await sendEmailVerification(auth.currentUser); $("verify").textContent = "Sent"; };

/* ---------- presence ---------- */
const setPresence = on => me ? updateDoc(doc(db, "users", me.uid), { online: on, lastSeen: serverTimestamp() }).catch(() => {}) : Promise.resolve();
addEventListener("visibilitychange", () => setPresence(document.visibilityState === "visible"));
addEventListener("pagehide", () => setPresence(false));

onAuthStateChanged(auth, async user => {
  unsubChats?.(); unsubMsgs?.(); activeChat = null;
  me = user;
  $("auth").classList.toggle("hidden", !!user);
  $("app").classList.toggle("hidden", !user);
  if (!user) return;
  $("verify").classList.toggle("hidden", user.emailVerified);
  // registration writes the profile just after sign-in; wait briefly for it
  for (let i = 0; i < 10 && !(meDoc = (await getDoc(doc(db, "users", user.uid))).data()); i++) await new Promise(r => setTimeout(r, 400));
  meDoc ??= { name: user.email, username: "" };
  $("me-name").textContent = meDoc.name; $("me-av").textContent = initial(meDoc.name);
  setPresence(true); watchChats();
});

/* ---------- conversations ---------- */
function watchChats() {
  const q = query(collection(db, "chats"), where("members", "array-contains", me.uid));
  unsubChats = onSnapshot(q, async snap => {
    const chats = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.lastAt?.toMillis() ?? 0) - (a.lastAt?.toMillis() ?? 0));
    const rows = await Promise.all(chats.map(async c => ({ c, p: await profile(c.members.find(m => m !== me.uid)) })));
    const list = $("chatlist"); list.innerHTML = "";
    if (!rows.length) list.innerHTML = '<div class="empty">No conversations yet.<br>Search a username above to say hi.</div>';
    rows.forEach(({ c, p }) => {
      const n = c.unread?.[me.uid] || 0;
      const b = document.createElement("button");
      b.className = "row" + (activeChat?.id === c.id ? " on" : "");
      b.innerHTML = '<div class="av"></div><div class="meta"><b></b><small></small></div><span class="badge"></span>';
      b.querySelector(".av").textContent = initial(p.name);
      b.querySelector("b").textContent = p.name;
      b.querySelector("small").textContent = c.lastMessage || "";
      const badge = b.querySelector(".badge"); badge.textContent = n; badge.classList.toggle("hidden", !n || activeChat?.id === c.id);
      b.onclick = () => openChat(p);
      list.appendChild(b);
    });
  }, e => console.error(e));
}

let searchTimer;
$("q").oninput = e => {
  clearTimeout(searchTimer);
  const t = e.target.value.trim().toLowerCase().replace(/^@/, "");
  const box = $("results");
  if (!t) { box.classList.add("hidden"); $("chatlist").classList.remove("hidden"); return; }
  searchTimer = setTimeout(async () => {
    const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const s = await getDocs(query(collection(db, "users"), where("usernameLower", ">=", t), where("usernameLower", "<=", t + "\uf8ff"), limit(15)));
    box.innerHTML = ""; $("chatlist").classList.add("hidden"); box.classList.remove("hidden");
    const found = s.docs.filter(d => d.id !== me.uid);
    if (!found.length) box.innerHTML = '<div class="empty">No one with that username.</div>';
    found.forEach(d => {
      const p = { uid: d.id, ...d.data() }; profiles.set(p.uid, p);
      const b = document.createElement("button"); b.className = "row";
      b.innerHTML = '<div class="av"></div><div class="meta"><b></b><small></small></div>';
      b.querySelector(".av").textContent = initial(p.name);
      b.querySelector("b").textContent = p.name; b.querySelector("small").textContent = "@" + p.username;
      b.onclick = () => { $("q").value = ""; box.classList.add("hidden"); $("chatlist").classList.remove("hidden"); openChat(p); };
      box.appendChild(b);
    });
  }, 250);
};

/* ---------- messages ---------- */
function openChat(p) {
  unsubMsgs?.();
  activeChat = { id: chatIdFor(me.uid, p.uid), peer: p };
  $("none").classList.add("hidden"); $("chat").classList.remove("hidden");
  $("app").classList.add("chat");
  $("c-name").textContent = p.name; $("c-av").textContent = initial(p.name);
  onSnapshot(doc(db, "users", p.uid), s => {
    const d = s.data(); if (!d || activeChat?.peer.uid !== p.uid) return;
    $("c-av").classList.toggle("online", !!d.online);
    $("c-status").textContent = d.online ? "Online" : d.lastSeen ? "Last seen " + new Date(d.lastSeen.toMillis()).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "";
  });
  const id = activeChat.id;
  const q = query(collection(db, "chats", id, "messages"), orderBy("createdAt", "asc"), limit(300));
  unsubMsgs = onSnapshot(q, snap => {
    const box = $("msgs"); box.innerHTML = "";
    snap.docs.forEach(d => {
      const m = d.data(), el = document.createElement("div");
      el.className = "msg" + (m.from === me.uid ? " mine" : "");
      const t = document.createElement("span"); t.textContent = m.text; el.appendChild(t);
      const tm = document.createElement("time"); tm.textContent = fmt(m.createdAt);
      if (m.from === me.uid) { const x = document.createElement("button"); x.className = "del"; x.textContent = "Delete"; x.onclick = () => deleteDoc(d.ref); tm.appendChild(x); }
      el.appendChild(tm); box.appendChild(el);
    });
    box.scrollTop = box.scrollHeight;
    updateDoc(doc(db, "chats", id), { ["unread." + me.uid]: 0 }).catch(() => {});
  }, () => {});
}
$("back").onclick = () => { $("app").classList.remove("chat"); unsubMsgs?.(); activeChat = null; };

async function send() {
  const text = $("txt").value.trim();
  if (!text || !activeChat) return;
  $("txt").value = "";
  const { id, peer } = activeChat, members = [me.uid, peer.uid].sort();
  try {
    await setDoc(doc(db, "chats", id), { members, lastMessage: text.slice(0, 80), lastAt: serverTimestamp(), unread: { [peer.uid]: increment(1) } }, { merge: true });
    await addDoc(collection(db, "chats", id, "messages"), { from: me.uid, text, createdAt: serverTimestamp() });
  } catch (e) { $("txt").value = text; alert("Message not sent: " + e.message); }
}
$("send").onclick = send;
$("txt").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
