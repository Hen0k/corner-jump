// Win confetti and the win/deadlock sounds. Everything is drawn and synthesized here, so there are no asset files.
(function (root) {
  let ctx = null, muted = false;
  try { muted = localStorage.getItem("cj:muted") === "1"; } catch (e) {}

  // Browsers only allow audio after a tap, so the context is created or resumed on the first touch.
  function audio() {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  window.addEventListener("pointerdown", audio, { once: true, capture: true });

  function tone(a, freq, start, dur, type, gain) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g).connect(a.destination);
    o.start(start); o.stop(start + dur + 0.05);
  }

  // A short rising fanfare: C-E-G arpeggio into a held major chord, plus a sparkle.
  function celebrate() { const a = !muted && audio(); if (a) playClip(a, "win", synthCelebrate); }
  function synthCelebrate(a) {
    const t = a.currentTime + 0.05;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(a, f, t + i * 0.11, 0.25, "triangle", 0.22));
    [523.25, 659.25, 783.99, 1046.5].forEach(f => tone(a, f, t + 0.48, 0.9, "triangle", 0.12));
    [2093, 2637, 3136, 2637, 3136].forEach((f, i) => tone(a, f, t + 0.5 + i * 0.07, 0.15, "sine", 0.05));
  }

  // Win and deadlock clips live in sounds/. If a file is missing or can't be decoded, the synthesized version plays.
  const clips = {}, playing = new Set();
  for (const [name, url] of [["win", "sounds/win.mp3"], ["fahh", "sounds/fahh.mp3"]])
    fetch(url).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) clips[name] = b; }).catch(() => {});
  function playClip(a, name, fallback) {
    const clip = clips[name];
    if (!clip) return fallback(a);
    const go = buf => { clips[name] = buf; const src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination); src.onended = () => playing.delete(src); playing.add(src); src.start(); };
    if (clip instanceof AudioBuffer) return go(clip);
    a.decodeAudioData(clip.slice(0), go, () => { delete clips[name]; fallback(a); });
  }
  function stop() { for (const src of playing) { try { src.stop(); } catch (e) {} } playing.clear(); }
  function fahh() { const a = !muted && audio(); if (a) playClip(a, "fahh", synthFahh); }

  // A synthesized take on the meme "Fahh": a breathy "f" into a falling, voice-like "aaah".
  function synthFahh(a) {
    const t = a.currentTime + 0.05;
    // "f": a burst of filtered noise
    const len = Math.floor(a.sampleRate * 0.18), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = a.createBufferSource(); n.buffer = buf;
    const hp = a.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
    const ng = a.createGain(); ng.gain.value = 0.35;
    n.connect(hp).connect(ng).connect(a.destination); n.start(t);
    // "aaah": a sawtooth voice through two vowel formants, pitch sliding down
    const v = a.createOscillator(); v.type = "sawtooth";
    v.frequency.setValueAtTime(330, t + 0.12);
    v.frequency.linearRampToValueAtTime(300, t + 0.4);
    v.frequency.exponentialRampToValueAtTime(140, t + 1.3);
    const vib = a.createOscillator(), vg = a.createGain(); vib.frequency.value = 6; vg.gain.value = 6;
    vib.connect(vg).connect(v.frequency);
    const g = a.createGain();
    g.gain.setValueAtTime(0, t + 0.1);
    g.gain.linearRampToValueAtTime(0.5, t + 0.2);
    g.gain.setValueAtTime(0.5, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    [[800, 6], [1200, 8]].forEach(([f, q]) => {
      const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
      v.connect(bp).connect(g);
    });
    g.connect(a.destination);
    v.start(t + 0.1); vib.start(t + 0.1); v.stop(t + 1.5); vib.stop(t + 1.5);
  }

  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("canvas"), g = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
    c.className = "confetti"; document.body.appendChild(c);
    const W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; g.scale(dpr, dpr);
    const colors = ["#b8432f", "#f2c94c", "#4f6b55", "#e8dcc0", "#5b8def", "#e07a62"];
    const bits = Array.from({ length: 160 }, (_, i) => {
      const left = i % 2 === 0;
      return { x: left ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.3),
        vx: (left ? 1 : -1) * (4 + Math.random() * 7), vy: -(9 + Math.random() * 9),
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, color: colors[i % colors.length] };
    });
    const t0 = performance.now();
    (function frame(now) {
      g.clearRect(0, 0, W, H);
      for (const b of bits) {
        b.vy += 0.28; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        g.save(); g.translate(b.x, b.y); g.rotate(b.r);
        g.fillStyle = b.color; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)));
        g.restore();
      }
      if (now - t0 < 4000) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  function setMuted(m) { muted = m; if (m) stop(); try { localStorage.setItem("cj:muted", m ? "1" : "0"); } catch (e) {} }

  root.CornerJumpFx = { confetti, celebrate, fahh, stop, setMuted, isMuted: () => muted };
})(window);
