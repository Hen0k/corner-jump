"""Add a difficulty rating to levels.json: the chance that random legal moves win."""
import json, sys
from functools import lru_cache
sys.argv = sys.argv[:1]
from search import MOVES, IDX, mask, F
@lru_cache(maxsize=None)
def p(m):
    if m & (m - 1) == 0: return 1.0
    legal = [a ^ b ^ c for a, b, c in MOVES if m & a and m & b and not m & c]
    return sum(p(m ^ d) for d in legal) / len(legal) if legal else 0.0
sq = lambda n: (F.index(n[0]), int(n[1:]) - 1)
r = json.load(open("levels.json"))
for lv in r:
    full = mask([sq(n) for n in lv["pieces"]])
    for o in lv["openings"]:
        o["random_win"] = p(full ^ mask([sq(o["open"])]))
    p.cache_clear()
json.dump(r, open("levels.json", "w"), indent=1)
