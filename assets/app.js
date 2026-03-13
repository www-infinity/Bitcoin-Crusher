/* =====================================================================
   Bitcoin Crusher — ∞ Infinity Slot Machine
   app.js — spin logic, reel animation, GitHub API commit
   ===================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------
     SYMBOLS
  ------------------------------------------------------------------ */
  const SYMBOLS = [
    { emoji: "₿",  label: "BTC",    value: 3,  weight: 8 },
    { emoji: "💎", label: "DIAM",   value: 5,  weight: 6 },
    { emoji: "∞",  label: "INF",    value: 8,  weight: 5 },
    { emoji: "🧱", label: "BLOCK",  value: 4,  weight: 7 },
    { emoji: "⭐", label: "STAR",   value: 2,  weight: 10 },
    { emoji: "🍄", label: "MARIO",  value: 6,  weight: 5 },
    { emoji: "👑", label: "CROWN",  value: 7,  weight: 4 },
    { emoji: "🚀", label: "PUMP",   value: 9,  weight: 3 },
    { emoji: "💰", label: "BAG",    value: 4,  weight: 7 },
    { emoji: "🔥", label: "FIRE",   value: 3,  weight: 9 },
    { emoji: "🥇", label: "GOLD",   value: 10, weight: 2 },
    { emoji: "🌕", label: "MOON",   value: 6,  weight: 5 },
  ];

  const REEL_COUNT = 5;
  const SYMBOL_HEIGHT = 160; // px — must match CSS

  /* ------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------ */
  let spinCount = 0;
  let totalScore = 0;
  let isSpinning = false;
  let history = [];
  let cfg = { owner: "", repo: "", branch: "main" };

  /* ------------------------------------------------------------------
     DOM REFS
  ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const strips = Array.from({ length: REEL_COUNT }, (_, i) => $(`strip${i}`));
  const spinBtn = $("spinBtn");
  const spinCounterEl = $("spinCounter");
  const scoreCounterEl = $("scoreCounter");
  const resultBar = $("resultBar");
  const resultText = $("resultText");
  const consoleLog = $("consoleLog");
  const historyEl = $("history");
  const histCountEl = $("histCount");
  const winOverlay = $("winOverlay");
  const lever = $("lever");

  /* ------------------------------------------------------------------
     WEIGHTED RANDOM SYMBOL PICK
  ------------------------------------------------------------------ */
  const totalWeight = SYMBOLS.reduce((a, s) => a + s.weight, 0);
  function pickSymbol() {
    let r = Math.random() * totalWeight;
    for (const s of SYMBOLS) {
      r -= s.weight;
      if (r <= 0) return s;
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  /* ------------------------------------------------------------------
     REEL INITIALIZATION — fill each strip with many symbols
  ------------------------------------------------------------------ */
  function buildStrip(stripEl) {
    stripEl.innerHTML = "";
    // fill enough symbols to allow smooth spinning illusion (24 symbols)
    const count = 24;
    for (let i = 0; i < count; i++) {
      const sym = pickSymbol();
      const div = document.createElement("div");
      div.className = "reel-symbol";
      div.innerHTML = `<span>${sym.emoji}</span><span class="sym-label">${sym.label}</span>`;
      stripEl.appendChild(div);
    }
  }

  function initReels() {
    strips.forEach((strip) => buildStrip(strip));
  }

  /* ------------------------------------------------------------------
     SPIN ANIMATION
  ------------------------------------------------------------------ */

  /** Animate one reel: rapid shuffle then land on finalSymbol */
  function animateReel(reelEl, stripEl, finalSymbol, delay, duration) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Rebuild strip with fresh random symbols, final symbol at specific position
        stripEl.innerHTML = "";
        const count = 20;
        for (let i = 0; i < count; i++) {
          const sym = i === count - 1 ? finalSymbol : pickSymbol();
          const div = document.createElement("div");
          div.className = "reel-symbol";
          div.innerHTML = `<span>${sym.emoji}</span><span class="sym-label">${sym.label}</span>`;
          stripEl.appendChild(div);
        }

        // Set initial position far above
        const startY = -(count - 2) * SYMBOL_HEIGHT;
        stripEl.style.transition = "none";
        stripEl.style.transform = `translateY(${startY}px)`;

        // Force reflow
        void stripEl.offsetHeight;

        // Animate down to center on final symbol (index count-1)
        // Target Y to show the last symbol centered: translateY(-(count-1)*height + 0) = translateY so bottom item shows
        // We want position -(count-2)*height so the last symbol is visible
        const targetY = -(count - 2) * SYMBOL_HEIGHT;
        // Actually we want to end up showing the final (last) symbol
        // Strip starts at startY = -(count-2)*height (near last symbol)
        // Let's start far above and scroll down
        const farY = -startY; // start from top (symbol 0)
        stripEl.style.transform = `translateY(${farY}px)`;
        void stripEl.offsetHeight;

        stripEl.style.transition = `transform ${duration}ms cubic-bezier(.17,.67,.35,1.05)`;
        // End showing the final symbol: translateY to -(count-1)*SYMBOL_HEIGHT + some offset
        // The reel window shows a single symbol centered at height=160.
        // stripEl is a column of count*160 px.  We want the last item centered.
        // translateY(0) shows item[0]. translateY(-N*160) shows item[N].
        const endY = -(count - 1) * SYMBOL_HEIGHT;
        stripEl.style.transform = `translateY(${endY}px)`;

        // Snap the reel to the final symbol (used by both transitionend and the fallback)
        let settled = false;
        function settleReel() {
          if (settled) return;
          settled = true;
          stripEl.innerHTML = "";
          const finalDiv = document.createElement("div");
          finalDiv.className = "reel-symbol";
          finalDiv.innerHTML = `<span>${finalSymbol.emoji}</span><span class="sym-label">${finalSymbol.label}</span>`;
          stripEl.appendChild(finalDiv);
          stripEl.style.transition = "none";
          stripEl.style.transform = "translateY(0)";
          reelEl.classList.remove("spinning");
          resolve();
        }

        stripEl.addEventListener("transitionend", settleReel, { once: true });

        // Fallback: guarantee the reel stops even if transitionend never fires
        // (can happen on tab-blur, browser quirks, or rapid interactions)
        setTimeout(settleReel, duration + 500);
      }, delay);
    });
  }

  /* ------------------------------------------------------------------
     EVALUATE RESULT
  ------------------------------------------------------------------ */
  function evaluate(symbols) {
    const counts = {};
    symbols.forEach((s) => {
      counts[s.label] = (counts[s.label] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts));
    const total = symbols.reduce((a, s) => a + s.value, 0);

    if (max === 5) {
      return { tier: "jackpot", label: "🎰 JACKPOT! ALL MATCH!", score: total * 50 };
    } else if (max === 4) {
      return { tier: "win-big", label: "💎 MEGA WIN — 4 of a kind!", score: total * 12 };
    } else if (max === 3) {
      return { tier: "win-medium", label: "⭐ BIG WIN — 3 of a kind!", score: total * 5 };
    } else if (max === 2) {
      return { tier: "win-small", label: "✅ WIN — pair found!", score: total * 2 };
    } else {
      return { tier: "lose", label: "🔄 No match. Spin again.", score: 0 };
    }
  }

  /* ------------------------------------------------------------------
     AUTH TOKEN — from CI-injected GHP secret (window.BITCOIN_CRUSHER_TOKEN)
  ------------------------------------------------------------------ */
  function getAuthToken() {
    return (window.BITCOIN_CRUSHER_TOKEN || "").trim();
  }

  /* ------------------------------------------------------------------
     GITHUB API — COMMIT FILE (via Contents API)
     Uses PUT /repos/{owner}/{repo}/contents/{path} which requires the
     GHP token to have Contents: Read and Write (fine-grained PAT) or
     public_repo / repo scope (classic PAT).
  ------------------------------------------------------------------ */

  /** Encode a UTF-8 string to base64 (handles non-Latin1 / emoji characters). */
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    return btoa(bytes.reduce((data, byte) => data + String.fromCharCode(byte), ""));
  }

  async function commitSpinRecord(spinData) {
    const token = getAuthToken();
    const { owner, repo, branch } = cfg;

    if (!token || !owner || !repo) {
      log("⚠️  GHP secret not available — skipping repo commit (local spin only).", "warn");
      return null;
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `spins/spin-${ts}.json`;
    if (!/^spins\/spin-[\dT-]+\.json$/.test(filename)) {
      log("❌ Invalid spin filename — aborting commit.", "err");
      return null;
    }

    const content = JSON.stringify(spinData, null, 2) + "\n";
    const contentBase64 = utf8ToBase64(content);
    const targetBranch = branch || "main";
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      log(`📡 Committing → ${filename}`, "");

      // Check if the file already exists (needed to supply its SHA for updates).
      let existingSha;
      try {
        const getRes = await fetch(`${fileUrl}?ref=${encodeURIComponent(targetBranch)}`, { headers });
        if (getRes.ok) {
          const existing = await getRes.json();
          existingSha = existing.sha;
        } else if (getRes.status !== 404) {
          const err = await getRes.json().catch(() => ({}));
          log(`⚠️  Could not check for existing file (${getRes.status}): ${err.message || getRes.statusText}`, "warn");
        }
      } catch (fetchErr) {
        log(`⚠️  Network error checking for existing file: ${fetchErr.message}`, "warn");
      }

      const commitMsg = `🎰 Spin #${spinData.spinNumber}: ${spinData.result} [${(spinData.symbols || []).join(" ")}]`;
      const body = {
        message: commitMsg,
        content: contentBase64,
        branch: targetBranch,
      };
      if (existingSha) body.sha = existingSha;

      const res = await fetch(fileUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        log(`❌ GitHub API error ${res.status}: ${err.message || res.statusText}`, "err");
        return null;
      }

      const data = await res.json();
      const commitSha = data.commit && data.commit.sha ? data.commit.sha.slice(0, 7) : null;
      const commitUrl =
        data.commit && data.commit.html_url
          ? data.commit.html_url
          : `https://github.com/${owner}/${repo}/commits/${targetBranch}`;

      log(`✅ Committed → ${filename}${commitSha ? ` (${commitSha})` : ""}`, "ok");
      return { sha: commitSha, url: commitUrl, filename };
    } catch (e) {
      log(`❌ Network error: ${e.message}`, "err");
      return null;
    }
  }

  /* ------------------------------------------------------------------
     CONFETTI / COIN BURST
  ------------------------------------------------------------------ */
  function burstCoins(count = 6) {
    const machine = $("machine");
    const emojis = ["💰", "💎", "₿", "⭐", "🥇", "🪙"];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement("div");
        el.className = "coin-burst";
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.left = `${10 + Math.random() * 80}%`;
        el.style.top = `${20 + Math.random() * 50}%`;
        machine.appendChild(el);
        el.addEventListener("animationend", () => el.remove(), { once: true });
      }, i * 80);
    }
  }

  /* ------------------------------------------------------------------
     LEVER PULL ANIMATION
  ------------------------------------------------------------------ */
  function pullLever() {
    lever.classList.add("pulled");
    setTimeout(() => lever.classList.remove("pulled"), 500);
  }

  /* ------------------------------------------------------------------
     LOGGER
  ------------------------------------------------------------------ */
  function log(msg, type = "") {
    const ts = new Date().toLocaleTimeString();
    const line = `[${ts}] ${msg}\n`;
    if (type === "err") {
      consoleLog.innerHTML += `<span class="log-err">${escHtml(line)}</span>`;
    } else if (type === "ok") {
      consoleLog.innerHTML += `<span class="log-ok">${escHtml(line)}</span>`;
    } else if (type === "warn") {
      consoleLog.innerHTML += `<span class="log-warn">${escHtml(line)}</span>`;
    } else {
      consoleLog.textContent += line;
    }
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  function escHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  }

  /* ------------------------------------------------------------------
     HISTORY RENDER
  ------------------------------------------------------------------ */
  function addHistoryItem(spinData, commitInfo) {
    history.unshift({ spinData, commitInfo });
    histCountEl.textContent = `${history.length} spin${history.length !== 1 ? "s" : ""}`;

    const item = document.createElement("div");
    const isJackpot = spinData.tier === "jackpot";
    const isWin = spinData.tier !== "lose";
    item.className = `hist-item${isJackpot ? " jackpot-item" : ""}`;

    const resultClass = isJackpot ? "jackpot" : isWin ? "win" : "";
    const commitHtml = commitInfo
      ? commitInfo.sha
        ? `<div class="hist-commit">📝 <a href="${escHtml(commitInfo.url)}" target="_blank" rel="noreferrer">${escHtml(commitInfo.sha)}</a> — ${escHtml(commitInfo.filename)}</div>`
        : `<div class="hist-commit">📡 <a href="${escHtml(commitInfo.url)}" target="_blank" rel="noreferrer">queued</a> — ${escHtml(commitInfo.filename)}</div>`
      : `<div class="hist-commit" style="color:var(--muted2)">⚡ local only</div>`;

    item.innerHTML = `
      <div class="hist-symbols">${spinData.symbols.join(" ")}</div>
      <div class="hist-result ${resultClass}">${escHtml(spinData.result)}</div>
      <div class="hist-time">Spin #${spinData.spinNumber} · +${spinData.score} pts · ${new Date(spinData.timestamp).toLocaleTimeString()}</div>
      ${commitHtml}
    `;

    if (historyEl.children.length === 0) {
      historyEl.appendChild(item);
    } else {
      historyEl.insertBefore(item, historyEl.firstChild);
    }
  }

  /* ------------------------------------------------------------------
     MAIN SPIN FUNCTION
  ------------------------------------------------------------------ */
  async function spin() {
    if (isSpinning) return;
    isSpinning = true;
    spinBtn.disabled = true;

    // Pull lever
    pullLever();

    // Clear result bar
    resultBar.className = "result-bar";
    resultText.textContent = "Spinning…";
    winOverlay.textContent = "";
    winOverlay.className = "win-overlay";

    // Pick final symbols
    const finalSymbols = Array.from({ length: REEL_COUNT }, () => pickSymbol());

    log(`🎰 SPIN #${spinCount + 1} — rolling reels…`);

    // Animate reels with staggered delays
    const BASE_DURATION = 900;
    const promises = strips.map((strip, i) => {
      const reelEl = document.getElementById(`reel${i}`);
      reelEl.classList.add("spinning");
      return animateReel(reelEl, strip, finalSymbols[i], i * 220, BASE_DURATION + i * 180);
    });

    await Promise.all(promises);

    spinCount++;
    spinCounterEl.textContent = spinCount;

    // Evaluate
    const evalResult = evaluate(finalSymbols);
    totalScore += evalResult.score;
    scoreCounterEl.textContent = totalScore;

    // Update result bar
    resultBar.className = `result-bar ${evalResult.tier !== "lose" ? evalResult.tier : ""}`;
    resultText.textContent = evalResult.label;

    // Win effects
    if (evalResult.tier === "jackpot") {
      winOverlay.textContent = "🎰 JACKPOT! 🎰";
      winOverlay.className = "win-overlay show";
      burstCoins(14);
      setTimeout(() => { winOverlay.className = "win-overlay"; }, 2800);
    } else if (evalResult.tier === "win-big") {
      burstCoins(8);
    } else if (evalResult.tier === "win-medium") {
      burstCoins(4);
    }

    // Build spin record
    const spinData = {
      spinNumber: spinCount,
      timestamp: new Date().toISOString(),
      symbols: finalSymbols.map((s) => s.emoji),
      symbolLabels: finalSymbols.map((s) => s.label),
      symbolValues: finalSymbols.map((s) => s.value),
      result: evalResult.label,
      tier: evalResult.tier,
      score: evalResult.score,
      totalScore,
      repo: cfg.owner && cfg.repo ? `${cfg.owner}/${cfg.repo}` : "unset",
    };

    log(`   Result: ${evalResult.label} (+${evalResult.score} pts, total: ${totalScore})`);

    // Commit to GitHub
    const commitInfo = await commitSpinRecord(spinData);

    addHistoryItem(spinData, commitInfo);

    isSpinning = false;
    spinBtn.disabled = false;
  }

  /* ------------------------------------------------------------------
     CONFIG
  ------------------------------------------------------------------ */
  function readInputsToCfg() {
    cfg.owner = $("cfgOwner").value.trim() || cfg.owner;
    cfg.repo = $("cfgRepo").value.trim() || cfg.repo;
    cfg.branch = $("cfgBranch").value.trim() || "main";
    updateRepoLink();
  }

  function pushCfgToInputs() {
    $("cfgOwner").value = cfg.owner;
    $("cfgRepo").value = cfg.repo;
    $("cfgBranch").value = cfg.branch;
    updateRepoLink();
  }

  function updateRepoLink() {
    if (cfg.owner && cfg.repo) {
      $("repoLink").href = `https://github.com/${cfg.owner}/${cfg.repo}`;
    }
  }

  const CFG_KEY = "bitcoin_crusher_cfg_v1";

  function saveCfg() {
    readInputsToCfg();
    const safe = { owner: cfg.owner, repo: cfg.repo, branch: cfg.branch };
    localStorage.setItem(CFG_KEY, JSON.stringify(safe));
    log("✅ Config saved.", "ok");
  }

  function loadCfg() {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) { log("ℹ️  No saved config found.", "warn"); return; }
    try {
      const saved = JSON.parse(raw);
      Object.assign(cfg, saved);
      pushCfgToInputs();
      log(`✅ Config loaded: ${cfg.owner}/${cfg.repo} (branch: ${cfg.branch})`, "ok");
    } catch (e) {
      log("❌ Failed to parse saved config.", "err");
    }
  }

  function clearCfg() {
    localStorage.removeItem(CFG_KEY);
    cfg = { owner: "", repo: "", branch: "main" };
    pushCfgToInputs();
    log("🧼 Config cleared.", "warn");
  }

  /* ------------------------------------------------------------------
     TICKER ANIMATION
  ------------------------------------------------------------------ */
  function animateTicker() {
    const ticker = $("ticker");
    const messages = [
      "INFINITY SYSTEM ACTIVE — CRUSHING BITCOIN — ∞ ∞ ∞",
      "EVERY SPIN IS A RECORD. EVERY RECORD IS FOREVER.",
      "B55 GRAVITY ENGINE ENGAGED — SILVER INDEX RISING",
      "ACCUMULATING INFINITY ENERGY — SPIN TO GROW",
      "₿ BTC → 💎 DIAMOND → 🥇 GOLD → ∞ INFINITY",
    ];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % messages.length;
      ticker.style.opacity = "0";
      setTimeout(() => {
        ticker.textContent = messages[idx];
        ticker.style.opacity = "0.8";
      }, 400);
    }, 4000);
  }

  /* ------------------------------------------------------------------
     DEFAULT REPO CONFIG (pre-fill from page URL / meta)
  ------------------------------------------------------------------ */
  function prefillFromRepoMeta() {
    // Try to detect owner/repo from the page's URL (works on GitHub Pages)
    const m = location.hostname.match(/^([^.]+)\.github\.io$/);
    if (m) {
      cfg.owner = cfg.owner || m[1];
      const pathParts = location.pathname.replace(/^\//, "").split("/");
      if (pathParts[0] && pathParts[0] !== "") {
        cfg.repo = cfg.repo || pathParts[0];
      }
    }
    // Hard-coded defaults for this repo
    cfg.owner = cfg.owner || "www-infinity";
    cfg.repo = cfg.repo || "Bitcoin-Crusher";
    cfg.branch = cfg.branch || "main";
  }

  /* ------------------------------------------------------------------
     WIRE EVENTS
  ------------------------------------------------------------------ */
  function wireEvents() {
    spinBtn.addEventListener("click", spin);

    // Also spin on lever click
    lever.addEventListener("click", () => { if (!isSpinning) spin(); });
    lever.closest(".lever-wrap").addEventListener("click", () => { if (!isSpinning) spin(); });

    $("btnSaveCfg").addEventListener("click", saveCfg);
    $("btnLoadCfg").addEventListener("click", loadCfg);
    $("btnClearCfg").addEventListener("click", clearCfg);
    $("clearLog").addEventListener("click", () => { consoleLog.textContent = ""; });

    // Keyboard shortcut: space bar to spin
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !e.target.matches("input,textarea,button")) {
        e.preventDefault();
        if (!isSpinning) spin();
      }
    });
  }

  /* ------------------------------------------------------------------
     INIT
  ------------------------------------------------------------------ */
  function init() {
    prefillFromRepoMeta();
    loadCfg();

    pushCfgToInputs();
    initReels();
    animateTicker();
    wireEvents();
    log("🧱 Bitcoin Crusher — Infinity Slot Machine ready.");
    if (window.BITCOIN_CRUSHER_TOKEN && cfg.owner && cfg.repo) {
      log(`✅ Repo: ${cfg.owner}/${cfg.repo} (branch: ${cfg.branch}) — GHP secret active, every spin will be committed.`, "ok");
    } else if (window.BITCOIN_CRUSHER_TOKEN) {
      log("✅ GHP secret active — set Owner/Repo above and save to enable auto-commit on each spin.", "ok");
    } else {
      log("⚠️  GHP secret not found — spins are local only (no commit will be made).", "warn");
    }
    log("🎰  Hit SPIN & CRUSH (or press Space) to start!");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
