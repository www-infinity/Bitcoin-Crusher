/* =====================================================================
   Bitcoin Crusher — Auth System
   auth.js — login / register, SHA-256 passwords, AES-GCM encrypted
             profile storage, GitHub repo commit via workflow dispatch.
   ===================================================================== */
/* global window, crypto, fetch */
window.AUTH = (() => {
  "use strict";

  const USERS_KEY      = "bc_users_v1";
  const SESSION_KEY    = "bc_session_v1";
  const ADMIN_USERNAME = "Kris";
  const ADMIN_EMAIL    = "tigerbalm7623@gmail.com";
  const ADMIN_PASSWORD = "Kris";

  /* ------------------------------------------------------------------
     CRYPTO HELPERS
  ------------------------------------------------------------------ */
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function deriveKey(password, salt) {
    const mat = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
      mat, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
  }

  async function encryptData(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await deriveKey(password, salt);
    const enc  = new TextEncoder().encode(JSON.stringify(data));
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
    const combined = new Uint8Array(16 + 12 + cipher.byteLength);
    combined.set(salt, 0); combined.set(iv, 16);
    combined.set(new Uint8Array(cipher), 28);
    return btoa(String.fromCharCode(...combined));
  }

  async function decryptData(b64, password) {
    const combined = new Uint8Array(atob(b64).split("").map((c) => c.charCodeAt(0)));
    const salt   = combined.slice(0, 16);
    const iv     = combined.slice(16, 28);
    const cipher = combined.slice(28);
    const key    = await deriveKey(password, salt);
    const plain  = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  }

  /* ------------------------------------------------------------------
     USER STORE (localStorage)
  ------------------------------------------------------------------ */
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); }
    catch (_) { return {}; }
  }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

  async function ensureAdmin() {
    const users = getUsers();
    if (!users[ADMIN_USERNAME]) {
      const hash = await sha256(ADMIN_PASSWORD);
      users[ADMIN_USERNAME] = {
        username: ADMIN_USERNAME, email: ADMIN_EMAIL, passwordHash: hash,
        role: "admin", createdAt: new Date().toISOString(),
        spinCount: 0, totalScore: 0, conversations: [], tokens: [],
      };
      saveUsers(users);
    }
  }

  /* ------------------------------------------------------------------
     SESSION (sessionStorage)
  ------------------------------------------------------------------ */
  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (_) { return null; }
  }
  function setSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      username: user.username, email: user.email, role: user.role,
    }));
  }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  /* ------------------------------------------------------------------
     PUBLIC AUTH API
  ------------------------------------------------------------------ */
  async function login(usernameOrEmail, password) {
    await ensureAdmin();
    const users = getUsers();
    const hash  = await sha256(password);
    const user  = Object.values(users).find(
      (u) => (u.username === usernameOrEmail || u.email === usernameOrEmail) && u.passwordHash === hash
    );
    if (!user) throw new Error("Invalid username/email or password.");
    setSession(user);
    return { username: user.username, email: user.email, role: user.role };
  }

  async function register(username, email, password) {
    await ensureAdmin();
    if (!/^[a-zA-Z0-9_-]{2,32}$/.test(username))
      throw new Error("Username must be 2-32 alphanumeric characters (_, - allowed).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Please enter a valid email address.");
    if (password.length < 4)
      throw new Error("Password must be at least 4 characters.");
    const users = getUsers();
    if (users[username]) throw new Error("Username already taken.");
    if (Object.values(users).some((u) => u.email === email))
      throw new Error("Email already registered.");
    const hash = await sha256(password);
    const user = {
      username, email, passwordHash: hash, role: "user",
      createdAt: new Date().toISOString(),
      spinCount: 0, totalScore: 0, conversations: [], tokens: [],
    };
    users[username] = user;
    saveUsers(users);
    setSession(user);
    return { username, email, role: "user" };
  }

  function logout()       { clearSession(); }
  function currentUser()  { return getSession(); }
  function isAdmin()      { const u = getSession(); return u && u.role === "admin"; }

  function updateUserStats(username, spinCount, totalScore) {
    const users = getUsers();
    if (users[username]) {
      users[username].spinCount  = spinCount;
      users[username].totalScore = totalScore;
      saveUsers(users);
    }
  }

  function addTokenToUser(username, tokenSummary) {
    const users = getUsers();
    if (!users[username]) return;
    users[username].tokens = users[username].tokens || [];
    users[username].tokens.push(tokenSummary);
    if (users[username].tokens.length > 500) users[username].tokens = users[username].tokens.slice(-500);
    saveUsers(users);
  }

  /** Save a chat message pair (encrypted) to the user record */
  async function saveConversation(username, userMsg, aiMsg) {
    const users = getUsers();
    if (!users[username]) return;
    try {
      const seed = username + "_conv_" + (users[username].createdAt || "");
      const entry = { ts: new Date().toISOString(), user: userMsg, ai: aiMsg };
      const enc  = await encryptData(entry, seed);
      users[username].conversations = users[username].conversations || [];
      users[username].conversations.push({ encryptedAt: entry.ts, data: enc });
      if (users[username].conversations.length > 100) {
        users[username].conversations = users[username].conversations.slice(-100);
      }
      saveUsers(users);
    } catch (_) {}
  }

  /** Commit the user's public profile JSON to the GitHub repo */
  async function saveProfileToRepo(username, token, owner, repo, branch) {
    if (!token || !owner || !repo) return null;
    const users = getUsers();
    const user  = users[username];
    if (!user) return null;

    const publicProfile = {
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      spinCount: user.spinCount,
      totalScore: user.totalScore,
      tokenCount: (user.tokens || []).length,
      savedAt: new Date().toISOString(),
    };

    const dispatchUrl =
      "https://api.github.com/repos/" + owner + "/" + repo +
      "/actions/workflows/save-profile.yml/dispatches";

    try {
      const res = await fetch(dispatchUrl, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref: branch || "main",
          inputs: {
            profile_data: JSON.stringify(publicProfile, null, 2),
            username: username,
          },
        }),
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /** Decrypt and list conversations for a user (for admin) */
  async function getConversations(username) {
    const users = getUsers();
    const user  = users[username];
    if (!user || !user.conversations || !user.conversations.length) return [];
    const seed = username + "_conv_" + (user.createdAt || "");
    const results = [];
    for (const entry of user.conversations) {
      try {
        const dec = await decryptData(entry.data, seed);
        results.push(dec);
      } catch (_) {
        results.push({ ts: entry.encryptedAt, user: "[encrypted]", ai: "[encrypted]" });
      }
    }
    return results;
  }

  function getUserList() {
    const users = getUsers();
    return Object.values(users).map((u) => ({
      username: u.username, email: u.email, role: u.role,
      createdAt: u.createdAt, spinCount: u.spinCount, totalScore: u.totalScore,
    }));
  }

  return {
    ensureAdmin, login, register, logout, currentUser, isAdmin,
    updateUserStats, addTokenToUser, saveConversation, saveProfileToRepo,
    getConversations, getUserList,
  };
})();
