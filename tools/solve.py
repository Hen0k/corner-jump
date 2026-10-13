import sys
from functools import lru_cache
F="abcdefgh"
def name(s): return F[s[0]]+str(s[1]+1)
DIRS=[(1,1),(1,-1),(-1,1),(-1,-1)]
def onb(x,y): return 0<=x<8 and 0<=y<8
def solve(start):
    @lru_cache(maxsize=None)
    def rec(st):
        if len(st)==1: return []
        s=set(st)
        for (x,y) in st:
            for dx,dy in DIRS:
                m=(x+dx,y+dy); t=(x+2*dx,y+2*dy)
                if onb(*t) and m in s and t not in s:
                    n=frozenset(s-{(x,y),m}|{t})
                    r=rec(n)
                    if r is not None: return [((x,y),m,t)]+r
        return None
    return rec(frozenset(start)), rec.cache_info().currsize
# void corner h1: diagonal rows x-y=6,4,2
void=[(x,y) for x in range(8) for y in range(8) if x-y in (6,4,2)]
# single corner a1: anti-diagonals x+y=0,2,4 (9) and 0..6 (16)
single3=[(x,y) for x in range(8) for y in range(8) if x+y in (0,2,4)]
single4=[(x,y) for x in range(8) for y in range(8) if x+y in (0,2,4,6)]
for label,lay in [("void corner (2+4+6=12)",void),("single corner 3 rows (1+3+5=9)",single3),("single corner 4 rows (1+3+5+7=16)",single4)]:
    print("==",label,len(lay))
    for p in sorted(lay,key=lambda s:(s[1],s[0])):
        sol,n=solve([q for q in lay if q!=p])
        print(f"  remove {name(p)}: {'WIN' if sol is not None else 'no win'} (states {n})"+ (" | "+" ".join(f"{name(a)}x{name(b)}>{name(c)}" for a,b,c in sol) if sol else ""))
        sys.stdout.flush()
