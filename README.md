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
Levels live in `LEVELS` in `game.js`. Each level is a list of starting squares. The app runs the solver at startup and only lets players pick openings that can be won.
