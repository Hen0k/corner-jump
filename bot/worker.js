// Corner Jump bot as a Cloudflare Worker.
// - /start or /play in the bot chat: sends the game as a chat widget (Bot API 10.4 sendWidget),
//   with a button under it that opens the full mini app.
// - Widget queries "w:<mask>" (sent when a level is cleared): saves the solved-levels mask
//   into that message's chat data, so the ✓ marks follow the player to every device.
// - GET /setup?key=<WEBHOOK_SECRET>: points the bot's webhook at this worker.
//
// Secrets: BOT_TOKEN, WEBHOOK_SECRET. Variable: APP_URL (the mini app's https address).
import WIDGET, { LEVEL_COUNT } from "./widget.js";

async function tg(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await res.json();
  if (!out.ok) console.log(method, JSON.stringify(out));
  return out;
}

function sendGame(env, chatId) {
  const body = {
    chat_id: chatId,
    html: WIDGET,
    allow_queries: true,
    caption: "Corner Jump: clear the board down to one piece.",
  };
  if (env.APP_URL) body.reply_markup = { inline_keyboard: [[{ text: "Open full game", web_app: { url: env.APP_URL } }]] };
  return tg(env, "sendWidget", body);
}

async function onWidgetQuery(env, q) {
  const m = /^w:([0-9a-z]{1,7})$/.exec(q.data || "");
  const mask = m ? parseInt(m[1], 36) : NaN;
  if (Number.isFinite(mask) && mask > 0 && mask < 2 ** LEVEL_COUNT && q.chat && q.message_id) {
    await tg(env, "editMessageWidgetData", { chat_id: q.chat.id, message_id: q.message_id, chat_data: mask.toString(36) });
    return tg(env, "answerWidgetQuery", { widget_query_id: q.id, data: "saved" });
  }
  return tg(env, "answerWidgetQuery", { widget_query_id: q.id });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/setup") {
      if (url.searchParams.get("key") !== env.WEBHOOK_SECRET) return new Response("Wrong key", { status: 403 });
      const out = await tg(env, "setWebhook", {
        url: `${url.origin}/webhook`,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ["message", "widget_query"],
      });
      await tg(env, "setMyCommands", { commands: [{ command: "play", description: "Play Corner Jump in the chat" }] });
      return Response.json(out);
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) return new Response("", { status: 403 });
      const update = await request.json();
      const msg = update.message;
      if (msg && msg.chat.type === "private" && /^\/(start|play)\b/.test(msg.text || "")) await sendGame(env, msg.chat.id);
      if (update.widget_query) await onWidgetQuery(env, update.widget_query);
      return new Response("ok");
    }

    return new Response("Corner Jump bot");
  },
};
