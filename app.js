(function () {
  const G = window.CornerJump, Fx = window.CornerJumpFx;
  const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData ? window.Telegram.WebApp : null;
  const haptic = (type, style) => { try { if (!tg) return; type === "impact" ? tg.HapticFeedback.impactOccurred(style) : tg.HapticFeedback.notificationOccurred(style); } catch (e) {} };

  const $ = id => document.getElementById(id);
  const boardEl = $("board"), statusEl = $("status"), countEl = $("count");
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem("cj:" + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("cj:" + k, JSON.stringify(v)); } catch (e) {} },
  };

  // Winnable openings per level, worked out once at startup.
  const openings = {};
  for (const l of G.LEVELS) openings[l.id] = new Map(G.openings(l).map(o => [o.square, o.winnable]));

  let level = G.LEVELS.find(l => l.id === store.get("level")) || G.LEVELS[0];
  let phase, pieces, history, selected, hintMove;
  // Blind mode hides every hint: openings aren't marked, legal landing squares aren't shown, and Hint is off.
  let blind = store.get("blind") === true;
  const pieceEls = new Map(); // square -> element

  // Board cells, rank 8 at the top.
  const cells = new Map();
  for (let y = 7; y >= 0; y--) for (let x = 0; x < 8; x++) {
    const k = G.key(x, y), b = document.createElement("button");
    b.type = "button"; b.className = "cell" + ((x + y) % 2 === 0 ? " dark" : "");
    b.setAttribute("aria-label", G.name(k));
    if ((x + y) % 2 === 0) b.addEventListener("click", () => tap(k)); else b.tabIndex = -1;
    boardEl.appendChild(b); cells.set(k, b);
  }
  const place = (el, k) => { const [x, y] = G.parse(k); el.style.left = x * 12.5 + "%"; el.style.top = (7 - y) * 12.5 + "%"; };

  // Level picker: a dropdown plus previous and next buttons.
  const levelSel = $("level");
  const solvedMark = l => Object.keys((store.get("solved") || {})[l.id] || {}).length ? " ✓" : "";
  function fillLevels() {
    levelSel.innerHTML = "";
    G.LEVELS.forEach((l, i) => {
      const o = document.createElement("option");
      o.value = l.id; o.textContent = `Level ${i + 1} · ${l.tier} · ${l.title}${solvedMark(l)}`;
      levelSel.appendChild(o);
    });
  }
  const goLevel = l => { if (!l) return; level = l; store.set("level", l.id); start(); };
  const step = d => goLevel(G.LEVELS[G.LEVELS.indexOf(level) + d]);
  levelSel.addEventListener("change", () => goLevel(G.LEVELS.find(l => l.id === levelSel.value)));
  $("prev").addEventListener("click", () => step(-1));
  $("next").addEventListener("click", () => step(1));
  fillLevels();

  function start() {
    Fx.stop();
    phase = "pick"; pieces = new Set(level.pieces); history = []; selected = null; hintMove = null;
    for (const el of pieceEls.values()) el.remove();
    pieceEls.clear();
    for (const k of pieces) {
      const el = document.createElement("div"); el.className = "piece"; place(el, k);
      boardEl.appendChild(el); pieceEls.set(k, el);
    }
    levelSel.value = level.id;
    const i = G.LEVELS.indexOf(level);
    $("prev").disabled = i === 0; $("next").disabled = i === G.LEVELS.length - 1;
    hideMain();
    render();
  }

  function tap(k) {
    if (phase === "pick") {
      if (!pieces.has(k)) return;
      if (!blind && !openings[level.id].get(k)) { toast("This opening can't be cleared. Pick a brighter piece."); haptic("notify", "error"); return; }
      history.push({ pieces: new Set(pieces), removed: k });
      pieces.delete(k);
      const el = pieceEls.get(k); el.classList.add("gone"); setTimeout(() => el.remove(), 250); pieceEls.delete(k);
      phase = "play"; haptic("impact", "medium");
      return render();
    }
    if (phase !== "play") return;
    const moves = G.jumps(pieces);
    if (selected) {
      const m = moves.find(m => m.from === selected && m.to === k);
      if (m) return jump(m);
    }
    if (blind) {
      if (pieces.has(k)) { selected = selected === k ? null : k; haptic("impact", "light"); }
      else if (selected) { toast("That's not a legal jump."); haptic("notify", "warning"); }
      return render();
    }
    if (pieces.has(k)) {
      if (!moves.some(m => m.from === k)) { selected = null; toast("That piece has no jump right now."); haptic("notify", "warning"); return render(); }
      selected = selected === k ? null : k; haptic("impact", "light");
    } else selected = null;
    render();
  }

  function jump(m) {
    history.push({ pieces: new Set(pieces), move: m });
    pieces = G.apply(pieces, m);
    const mover = pieceEls.get(m.from), victim = pieceEls.get(m.over);
    pieceEls.delete(m.from); pieceEls.delete(m.over); pieceEls.set(m.to, mover);
    place(mover, m.to);
    victim.classList.add("gone"); setTimeout(() => victim.remove(), 250);
    selected = null; hintMove = null;
    haptic("impact", "medium");
    if (pieces.size === 1) {
      phase = "won"; haptic("notify", "success");
      Fx.confetti(); Fx.celebrate();
      const solved = store.get("solved") || {}; (solved[level.id] = solved[level.id] || {})[history[0].removed] = true; store.set("solved", solved); fillLevels(); levelSel.value = level.id;
      const next = G.LEVELS[G.LEVELS.indexOf(level) + 1];
      showMain(next ? "Next level" : "Play again", () => { if (next) { level = next; store.set("level", next.id); } start(); });
    } else if (!G.jumps(pieces).length) {
      phase = "stuck"; haptic("notify", "error");
      Fx.fahh();
      showMain("Try again", start);
    }
    render();
  }

  function undo() {
    const last = history.pop(); if (!last) return;
    Fx.stop();
    pieces = last.pieces; selected = null; hintMove = null;
    phase = last.removed ? "pick" : "play";
    // rebuild piece elements without animation
    for (const el of pieceEls.values()) el.remove();
    pieceEls.clear();
    for (const k of pieces) { const el = document.createElement("div"); el.className = "piece"; place(el, k); boardEl.appendChild(el); pieceEls.set(k, el); }
    hideMain(); render();
  }

  function hint() {
    if (blind) return;
    if (phase === "pick") { toast("Bright pieces are openings you can win from. Tap one."); return; }
    if (phase !== "play") return;
    // Big boards can take a moment to search, so let the screen update first.
    $("hint").disabled = true;
    setTimeout(() => {
      const sol = G.solve(pieces);
      if (!sol) { toast("There's no way to win from here. Undo to back up."); haptic("notify", "warning"); return render(); }
      hintMove = sol[0]; selected = hintMove.from; render();
    }, 20);
  }

  function render() {
    const moves = phase === "play" ? G.jumps(pieces) : [];
    for (const [k, c] of cells) {
      c.classList.toggle("target", !blind && !!selected && moves.some(m => m.from === selected && m.to === k));
      c.classList.toggle("hint", !!hintMove && hintMove.to === k);
    }
    for (const [k, el] of pieceEls) {
      el.classList.toggle("selected", k === selected);
      el.classList.toggle("locked", !blind && phase === "pick" && !openings[level.id].get(k));
    }
    const left = pieces.size;
    countEl.textContent = left + (left === 1 ? " piece" : " pieces") + " left";
    statusEl.textContent = {
      pick: level.title + (blind ? ". Blind mode: tap any piece to remove it and make the opening." : ". Tap a bright piece to remove it and make the opening."),
      play: blind ? (selected ? "Tap the empty square to jump to." : "Tap the piece you want to jump with.")
                  : (selected ? "Tap a yellow square to jump there." : "Tap a piece that can jump."),
      won: "Cleared! One piece left. You solved " + level.title.toLowerCase() + ".",
      stuck: "No jumps left with " + left + " pieces on the board. Undo or try again.",
    }[phase];
    $("undo").disabled = !history.length;
    $("hint").hidden = blind;
    $("hint").disabled = phase === "won" || phase === "stuck";
    const b = $("blind");
    b.setAttribute("aria-pressed", blind); b.textContent = blind ? "Blind: on" : "Blind: off";
  }

  let mainHandler = null;
  function showMain(text, fn) {
    if (!tg) { toast(text === "Try again" ? "Stuck. Tap Restart or Undo." : "Solved! Tap a level to play again."); return; }
    if (mainHandler) tg.MainButton.offClick(mainHandler);
    mainHandler = () => { hideMain(); fn(); };
    tg.MainButton.setText(text); tg.MainButton.onClick(mainHandler); tg.MainButton.show();
  }
  function hideMain() { if (tg && mainHandler) { tg.MainButton.offClick(mainHandler); tg.MainButton.hide(); mainHandler = null; } }

  let toastTimer;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2600); }

  $("undo").addEventListener("click", undo);
  $("hint").addEventListener("click", hint);
  $("restart").addEventListener("click", start);
  $("blind").addEventListener("click", () => {
    blind = !blind; store.set("blind", blind);
    if (blind) hintMove = null;
    toast(blind ? "Blind mode on. No hints on any level." : "Blind mode off. Hints are back.");
    render();
  });
  const soundBtn = $("sound");
  const showSound = () => { const on = !Fx.isMuted(); soundBtn.textContent = on ? "🔊" : "🔇"; soundBtn.setAttribute("aria-pressed", on); soundBtn.setAttribute("aria-label", on ? "Sound on" : "Sound off"); };
  soundBtn.addEventListener("click", () => { Fx.setMuted(!Fx.isMuted()); showSound(); });
  showSound();

  if (tg) { tg.ready(); tg.expand(); }
  start();
})();
