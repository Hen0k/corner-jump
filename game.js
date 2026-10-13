// Corner Jump game rules and solver. No DOM code here, so it also runs in Node for tests.
(function (root) {
  const FILES = "abcdefgh";
  const DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const key = (x, y) => x + "," + y;
  const parse = k => k.split(",").map(Number);
  const name = k => { const [x, y] = parse(k); return FILES[x] + (y + 1); };
  const onBoard = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;

  // Each level is a starting shape. Both void corners hold 2 + 4 + 6 = 12 pieces.
  const triangle = test => {
    const out = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 0 && test(x, y)) out.push(key(x, y));
    return out;
  };
  const LEVELS = [
    { id: "br", title: "Bottom-right corner", pieces: triangle((x, y) => [2, 4, 6].includes(x - y)) },
    { id: "tl", title: "Top-left corner", pieces: triangle((x, y) => [2, 4, 6].includes(y - x)) },
  ];

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

  // Depth-first search with a memo of positions that cannot be won.
  // Returns the list of moves to one piece, or null when the position is lost.
  const dead = new Set();
  function solve(pieces) {
    const set = pieces instanceof Set ? pieces : new Set(pieces);
    if (set.size === 1) return [];
    const id = [...set].sort().join(";");
    if (dead.has(id)) return null;
    for (const m of jumps(set)) {
      const rest = solve(apply(set, m));
      if (rest) return [m, ...rest];
    }
    dead.add(id);
    return null;
  }

  // Openings for a level, each marked winnable or not.
  function openings(level) {
    return level.pieces.map(k => ({ square: k, winnable: !!solve(level.pieces.filter(p => p !== k)) }));
  }

  const api = { LEVELS, jumps, apply, solve, openings, name, parse, key };
  if (typeof module !== "undefined") module.exports = api; else root.CornerJump = api;
})(this);
