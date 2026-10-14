// Corner Jump game rules and solver. No DOM code here, so it also runs in Node for tests.
(function (root) {
  const FILES = "abcdefgh";
  const DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const key = (x, y) => x + "," + y;
  const parse = k => k.split(",").map(Number);
  const name = k => { const [x, y] = parse(k); return FILES[x] + (y + 1); };
  const fromName = n => key(FILES.indexOf(n[0]), +n.slice(1) - 1);
  const onBoard = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;

  // Levels from easiest to hardest, found by the level search (tools/levels/search.py).
  // pieces: starting squares. open: the openings that can be won, precomputed so startup stays fast.
  const LEVELS = [
    { id: "s1", title: "Diamond 3×3", tier: "Easy",
      pieces: "c1 b2 d2 a3 c3 e3 b4 d4 c5",
      open: "c1 b2 a3 e3 d4 c5" },
    { id: "s2", title: "Diamond 3×3", tier: "Easy",
      pieces: "c3 b4 d4 a5 c5 e5 b6 d6 c7",
      open: "c3 b4 d4 a5 e5 b6 d6 c7" },
    { id: "s3", title: "Cross", tier: "Easy",
      pieces: "a1 e1 b2 d2 c3 b4 d4 a5 e5",
      open: "a1" },
    { id: "s4", title: "Diamond 3×3", tier: "Easy",
      pieces: "d2 c3 e3 b4 d4 f4 c5 e5 d6",
      open: "d2 c3 e3 b4 f4 c5 e5 d6" },
    { id: "s5", title: "Wedge", tier: "Easy",
      pieces: "d2 c3 b4 d4 a5 c5 b6 d6 c7 d8",
      open: "c3 d4 d6 c7" },
    { id: "s6", title: "Diamond 2×5", tier: "Easy",
      pieces: "f2 e3 g3 d4 f4 c5 e5 b6 d6 c7",
      open: "d4 e5" },
    { id: "s7", title: "Diagonal band", tier: "Easy",
      pieces: "c1 e1 d2 f2 e3 g3 f4 h4 g5 h6",
      open: "d2 f2 g3 g5" },
    { id: "s8", title: "Cross", tier: "Medium",
      pieces: "a3 e3 b4 d4 c5 b6 d6 a7 e7",
      open: "a3 a7" },
    { id: "s9", title: "Diamond 2×5", tier: "Medium",
      pieces: "e1 d2 f2 c3 e3 b4 d4 a5 c5 b6",
      open: "c3 d4" },
    { id: "s10", title: "Diamond 2×5", tier: "Medium",
      pieces: "e3 d4 f4 c5 e5 b6 d6 a7 c7 b8",
      open: "c5 d6" },
    { id: "s11", title: "Wedge", tier: "Medium",
      pieces: "g1 f2 e3 g3 d4 f4 e5 g5 f6 g7",
      open: "f2 g3 g5 f6" },
    { id: "s12", title: "Wedge", tier: "Medium",
      pieces: "e1 d2 c3 e3 b4 d4 c5 e5 d6 e7",
      open: "d2 e3 e5 d6" },
    { id: "s13", title: "Wedge", tier: "Medium",
      pieces: "f2 e3 d4 f4 c5 e5 d6 f6 e7 f8",
      open: "e3 f4 f6 e7" },
    { id: "s14", title: "Wedge", tier: "Medium",
      pieces: "h2 g3 f4 h4 e5 g5 f6 h6 g7 h8",
      open: "h4 h6" },
    { id: "br", title: "Bottom-right corner", tier: "Medium",
      pieces: "c1 e1 g1 d2 f2 h2 e3 g3 f4 h4 g5 h6",
      open: "c1 e1 e3 f4 h4 h6" },
    { id: "tl", title: "Top-left corner", tier: "Medium",
      pieces: "a3 b4 a5 c5 b6 d6 a7 c7 e7 b8 d8 f8",
      open: "a3 a5 c5 d6 d8 f8" },
    { id: "s16", title: "Diamond 3×4", tier: "Medium",
      pieces: "d2 c3 e3 b4 d4 f4 a5 c5 e5 b6 d6 c7",
      open: "d2 c3 e3 b4 d4 f4 a5 c5 e5 b6 d6 c7" },
    { id: "s17", title: "Cross", tier: "Medium",
      pieces: "b4 d4 a5 c5 e5 b6 d6 a7 c7 e7 b8 d8",
      open: "b4 d4 a5 e5 a7 e7 b8 d8" },
    { id: "s18", title: "Cross", tier: "Medium",
      pieces: "c3 e3 b4 d4 f4 c5 e5 b6 d6 f6 c7 e7",
      open: "c3 e3 b4 f4 b6 f6 c7 e7" },
    { id: "s19", title: "Cross", tier: "Medium",
      pieces: "b2 d2 a3 c3 e3 b4 d4 a5 c5 e5 b6 d6",
      open: "b2 d2 a3 e3 a5 e5 b6 d6" },
    { id: "s20", title: "Cross", tier: "Hard",
      pieces: "b2 f2 c3 e3 d4 c5 e5 b6 f6",
      open: "b2 f2 b6 f6" },
    { id: "s21", title: "Diamond 2×6", tier: "Hard",
      pieces: "f2 e3 g3 d4 f4 c5 e5 b6 d6 a7 c7 b8",
      open: "f2 e3 g3 d4 f4 c5 e5 b6 d6 a7 c7 b8" },
    { id: "s22", title: "Diagonal band", tier: "Hard",
      pieces: "a1 c1 b2 d2 c3 e3 d4 f4 e5 g5 f6 h6 g7 h8",
      open: "a1 b2 d2 d4 e5 g5 g7 h8" },
    { id: "s23", title: "Diamond 3×5", tier: "Hard",
      pieces: "e1 d2 f2 c3 e3 g3 b4 d4 f4 a5 c5 e5 b6 d6 c7",
      open: "e1 d2 f2 c3 e3 g3 b4 d4 f4 a5 c5 e5 b6 d6 c7" },
    { id: "s24", title: "Diamond 4×4", tier: "Hard",
      pieces: "d2 c3 e3 b4 d4 f4 a5 c5 e5 g5 b6 d6 f6 c7 e7 d8",
      open: "c3 e3 b4 f4 b6 f6 c7 e7" },
    { id: "s25", title: "Diagonal band", tier: "Expert",
      pieces: "a1 c1 e1 b2 d2 f2 c3 e3 g3 d4 f4 h4 e5 g5 f6 h6 g7 h8",
      open: "c1 e1 c3 e3 f4 h4 f6 h6" },
    { id: "s26", title: "Diamond 4×5", tier: "Expert",
      pieces: "e1 d2 f2 c3 e3 g3 b4 d4 f4 h4 a5 c5 e5 g5 b6 d6 f6 c7 e7 d8",
      open: "e1 d2 b4 d4 h4 a5 e5 g5 e7 d8" },
    { id: "s27", title: "Big corner triangle", tier: "Expert",
      pieces: "a1 c1 e1 g1 b2 d2 f2 h2 c3 e3 g3 d4 f4 h4 e5 g5 f6 h6 g7 h8",
      open: "d2 f2 c3 g3 g5 f6" },
    { id: "s28", title: "Cross", tier: "Expert",
      pieces: "b2 f2 a3 c3 e3 g3 b4 d4 f4 c5 e5 b6 d6 f6 a7 c7 e7 g7 b8 f8",
      open: "c3 e3 b4 f4 b6 f6 c7 e7" },
  ].map(l => ({ ...l, pieces: l.pieces.split(" ").map(fromName), open: l.open.split(" ").map(fromName) }));

  // All jumps available on a board, as {from, over, to}.
  function jumps(pieces) {
    const set = pieces instanceof Set ? pieces : new Set(pieces);
    const out = [];
    for (const k of set) {
      const [x, y] = parse(k);
      for (const [dx, dy] of DIRS) {
        const over = key(x + dx, y + dy), tx = x + 2 * dx, ty = y + 2 * dy, to = key(tx, ty);
        if (onBoard(tx, ty) && set.has(over) && !set.has(to)) out.push({ from: k, over, to });
      }
    }
    return out;
  }

  function apply(pieces, move) {
    const next = new Set(pieces);
    next.delete(move.from); next.delete(move.over); next.add(move.to);
    return next;
  }

  // Depth-first search over 32-bit boards (one bit per dark square), with a memo of
  // positions that cannot be won. Returns the moves to one piece, or null when lost.
  const DARK = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 0) DARK.push(key(x, y));
  const BIT = new Map(DARK.map((k, i) => [k, i]));
  const MOVES = []; // [from, over, to] bit masks
  for (const k of DARK) {
    const [x, y] = parse(k);
    for (const [dx, dy] of DIRS) {
      const tx = x + 2 * dx, ty = y + 2 * dy;
      if (onBoard(tx, ty)) MOVES.push([1 << BIT.get(k), 1 << BIT.get(key(x + dx, y + dy)), 1 << BIT.get(key(tx, ty))]);
    }
  }
  const toMove = ([a, b, c]) => ({ from: DARK[31 - Math.clz32(a)], over: DARK[31 - Math.clz32(b)], to: DARK[31 - Math.clz32(c)] });
  const dead = new Set();
  function search(m) {
    if ((m & (m - 1)) === 0) return [];
    if (dead.has(m)) return null;
    for (const mv of MOVES) {
      if ((m & mv[0]) && (m & mv[1]) && !(m & mv[2])) {
        const rest = search(m ^ mv[0] ^ mv[1] ^ mv[2]);
        if (rest) { rest.push(mv); return rest; }
      }
    }
    if (dead.size > 2e6) dead.clear(); // keep memory bounded on phones
    dead.add(m);
    return null;
  }
  function solve(pieces) {
    let m = 0;
    for (const k of pieces) m |= 1 << BIT.get(k);
    const sol = search(m);
    return sol && sol.reverse().map(toMove);
  }

  // Openings for a level, each marked winnable or not.
  function openings(level) {
    if (level.open) return level.pieces.map(k => ({ square: k, winnable: level.open.includes(k) }));
    return level.pieces.map(k => ({ square: k, winnable: !!solve(level.pieces.filter(p => p !== k)) }));
  }

  const api = { LEVELS, jumps, apply, solve, openings, name, parse, key };
  if (typeof module !== "undefined") module.exports = api; else root.CornerJump = api;
})(this);
