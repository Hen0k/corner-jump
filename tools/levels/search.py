"""Search for winnable Corner Jump starting layouts.

Board: 8x8, dark squares only ((x+y) even, a1 = (0,0) is dark). Diagonal jumps in
any direction capture the jumped piece. Win = one piece left.
A layout is a shape plus one removed piece (the opening).

In rotated coordinates u=(x+y)/2, v=(x-y)/2 diagonal jumps become orthogonal ones,
so diagonal "rectangles" on the board are diamonds/parallelograms in those coords.
"""
import json, sys
from functools import lru_cache

F = "abcdefgh"
DARK = [(x, y) for y in range(8) for x in range(8) if (x + y) % 2 == 0]
IDX = {s: i for i, s in enumerate(DARK)}
DIRS = [(1, 1), (1, -1), (-1, 1), (-1, -1)]
MOVES = []  # (from_bit, over_bit, to_bit)
for (x, y) in DARK:
    for dx, dy in DIRS:
        t = (x + 2 * dx, y + 2 * dy)
        if 0 <= t[0] < 8 and 0 <= t[1] < 8:
            MOVES.append((1 << IDX[(x, y)], 1 << IDX[(x + dx, y + dy)], 1 << IDX[t]))

def name(s): return F[s[0]] + str(s[1] + 1)
def mask(sq): 
    m = 0
    for s in sq: m |= 1 << IDX[s]
    return m
def squares(m): return [DARK[i] for i in range(32) if m >> i & 1]

# Symmetries that keep dark squares dark: identity, 180 turn, both diagonal mirrors.
SYMS = [lambda x, y: (x, y), lambda x, y: (7 - x, 7 - y),
        lambda x, y: (y, x), lambda x, y: (7 - y, 7 - x)]
def canon(m):
    return min(mask([f(*s) for s in squares(m)]) for f in SYMS)

@lru_cache(maxsize=None)
def win(m):
    if m & (m - 1) == 0: return True
    for a, b, c in MOVES:
        if m & a and m & b and not m & c:
            if win(m ^ a ^ b ^ c): return True
    return False

def solution(m):
    out = []
    while m & (m - 1):
        for a, b, c in MOVES:
            if m & a and m & b and not m & c and win(m ^ a ^ b ^ c):
                out.append((a, b, c)); m ^= a ^ b ^ c; break
    return [f"{name(squares(a)[0])}-{name(squares(c)[0])}" for a, b, c in out]

def forgiving(m):
    """Share of legal first moves that keep the game winnable (higher = easier)."""
    legal = [(a, b, c) for a, b, c in MOVES if m & a and m & b and not m & c]
    good = sum(win(m ^ a ^ b ^ c) for a, b, c in legal)
    return good, len(legal)

def main():
    # ---- shape families -------------------------------------------------------
    def uv_to_xy(u, v): return (u + v, u - v)
    def ok(s): return 0 <= s[0] < 8 and 0 <= s[1] < 8

    global shapes
    shapes = {}  # canon mask -> (family, label)
    def add(family, label, sq):
        sq = list(dict.fromkeys(sq))
        if not sq or not all(ok(s) for s in sq): return
        m = mask(sq)
        c = canon(m)
        if c not in shapes: shapes[c] = (family, label, m)

    # 1. Corner triangles (diagonal rows against a corner).
    # Rows x-y = 6, 4, 2, 0 hold 2, 4, 6, 8 pieces.
    for k in range(2, 5):
        add("Void-corner triangle", f"{k} rows", [(x, y) for (x, y) in DARK if 8 - 2 * k <= x - y <= 6])
    for k in range(2, 5):
        add("Dark-corner triangle", f"{k} rows", [(x, y) for (x, y) in DARK if x + y <= 2 * (k - 1)])

    # 2. Diamonds / parallelograms: a x b blocks in (u,v), every placement on the board.
    for a in range(2, 7):
        for b in range(a, 7):
            if not 6 <= a * b <= 20: continue
            for u0 in range(-4, 8):
                for v0 in range(-4, 8):
                    add("Diamond", f"{a}x{b}", [uv_to_xy(u0 + i, v0 + j) for i in range(a) for j in range(b)])

    # 3. Staircase triangles floating in (u,v) (all four orientations, every placement).
    for k in range(3, 6):
        base = [(i, j) for i in range(k) for j in range(k - i)]
        for flip in range(4):
            tri = [((-i if flip & 1 else i), (-j if flip & 2 else j)) for i, j in base]
            for u0 in range(-4, 12):
                for v0 in range(-6, 8):
                    add("Staircase", f"{k} steps", [uv_to_xy(u0 + i, v0 + j) for i, j in tri])

    # 4. Plus / cross shapes in (u,v).
    for arm in (1, 2):
        for w in (1, 2):
            cells = set()
            for i in range(-arm, arm + w):
                for j in range(w): cells.add((i, j)); cells.add((j, i))
            for u0 in range(-2, 10):
                for v0 in range(-6, 8):
                    add("Cross", f"arm {arm}, width {w}", [uv_to_xy(u0 + i, v0 + j) for i, j in cells])

    # 5. Diagonal bands against an edge: n full diagonal rows parallel to a void-corner triangle
    #    but not touching the corner (trapezoids).
    for start in (0, 2):
        for k in (2, 3):
            rows = list(range(start, start + 2 * k, 2))
            add("Band", f"rows {rows}", [(x, y) for (x, y) in DARK if (x - y) in rows])

    print(len(shapes), "distinct shapes", file=sys.stderr)

    results = []
    for c, (family, label, m) in sorted(shapes.items(), key=lambda kv: bin(kv[0]).count("1")):
        n = bin(m).count("1")
        if n > 20 or n < 6: continue
        opens = []
        for s in squares(m):
            st = m ^ mask([s])
            if win(st):
                g, t = forgiving(st)
                opens.append({"open": name(s), "good": g, "legal": t, "solution": solution(st)})
        print(f"{family:22} {label:14} n={n:2} wins={len(opens)}/{n}", file=sys.stderr)
        if opens:
            results.append({"family": family, "label": label, "pieces": [name(s) for s in squares(m)],
                            "count": n, "openings": opens, "tried": n})
        win.cache_clear() if win.cache_info().currsize > 3_000_000 else None

    json.dump(results, open(sys.argv[1] if len(sys.argv) > 1 else "levels.json", "w"), indent=1)
    print(len(results), "winnable shapes", file=sys.stderr)


if __name__ == "__main__":
    main()
