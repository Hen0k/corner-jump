# Corner Jump (Telegram mini app)

A static web app: `index.html`, `style.css`, `game.js` (rules + solver), `app.js` (screen). No build step.

## Put it online
Telegram needs an HTTPS address. Any static host works, for example:
- **GitHub Pages:** push this folder to a repository, then Settings > Pages > deploy from the main branch.
- **Netlify Drop:** drag this folder onto https://app.netlify.com/drop.

## Connect it to a Telegram bot
1. In Telegram, open @BotFather and send `/newbot`. Pick a name and a username.
2. Send `/newapp`, choose the bot, and give the HTTPS address of `index.html` when asked for the Web App URL. Set a short name, for example `cornerjump`.
3. Optional: `/mybots` > your bot > Bot Settings > Menu Button, and set the same URL so the game opens from the chat's menu button.
4. Open the game at `https://t.me/<bot username>/<short name>`.

## Levels
Levels live in `LEVELS` in `game.js`, ordered from easiest to hardest. Each level lists its starting squares (`pieces`) and the openings that can be won (`open`). Players can only pick a winnable opening.

The levels came from `tools/levels/search.py`, which tries diamonds, wedges, crosses, diagonal bands and corner triangles on the dark squares and keeps the shapes that can be cleared to one piece. `tools/levels/rate.py` adds a difficulty score: the chance that random moves win. `tools/levels/catalog.json` is the result the levels were built from.

## Effects
`fx.js` draws the win confetti on a canvas and plays `sounds/win.mp3` on a win and `sounds/fahh.mp3` on a deadlock. Clips play through audio elements first (most reliable in Telegram's webviews), then Web Audio, and fall back to synthesized sounds if a clip is missing. Every tap or key press tries to unlock audio until it works, because some webviews ignore the first one. The 🔊 button mutes sound, and the choice is remembered. Restart and Undo stop a clip that is still playing.
