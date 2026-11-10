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

## Blind mode
The "Blind" button turns off every hint on all levels. Openings that can't be won aren't dimmed or locked, legal landing squares aren't highlighted, and the Hint button is hidden. The setting is saved on the device.

When you change any file, bump the `?v=` number on the asset URLs in `index.html` and `fx.js`. Telegram Desktop keeps old copies otherwise.

## Play in the chat (widget)
Telegram's Bot API 10.4 lets a bot send a message that is a small interactive HTML app (a "widget"). `widget/` holds Corner Jump as one: all levels, openings, jumps, undo, restart and blind mode, inside the chat bubble. There's no sound (widgets can't play audio), so it uses haptics instead. A button under the widget opens the full mini app.

- `widget/src.html` is the source. Run `python3 tools/widget/build.py` after changing it or the levels in `game.js`. It writes `widget/widget.html` (what gets sent), `widget/preview.html` (open in a browser to check the layout) and `bot/widget.js`, and fails if the widget is over Telegram's limit of 4096 bytes after zlib compression.
- Progress: cleared levels are remembered on the device. When the bot is running, clearing a level also sends the solved list to the bot, which saves it into that message's chat data, so the ✓ marks show on every device.
- In production Telegram only allows widgets in private chats with the bot, and they can't be forwarded yet.

### Quick look, no server
```
BOT_TOKEN=<token from @BotFather> python3 tools/widget/send.py
```
Message the bot once first. The script sends the widget to the last person who messaged it. It only works while the bot has no webhook.

### Run the bot (Cloudflare Worker, free plan)
`bot/worker.js` answers `/start` and `/play` with the widget and saves progress.
```
cd bot
npx wrangler login
npx wrangler secret put BOT_TOKEN        # the token from @BotFather
npx wrangler secret put WEBHOOK_SECRET   # any random string, letters and digits
npx wrangler deploy
```
Then open `https://<your worker address>/setup?key=<WEBHOOK_SECRET>` once in a browser. It points the bot at the worker and adds the /play command. Change `APP_URL` in `bot/wrangler.toml` if the mini app lives somewhere other than GitHub Pages.
