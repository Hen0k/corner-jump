#!/usr/bin/env python3
"""Send the chat widget once, without running the bot. Good for a first look.

  BOT_TOKEN=123:abc python3 tools/widget/send.py            # sends to the last person who messaged the bot
  BOT_TOKEN=123:abc CHAT_ID=12345 python3 tools/widget/send.py

Without the bot running, clearing a level still works and is remembered on the device,
but the ✓ marks aren't saved into the message. Only works while the bot has no webhook set.
"""
import json, os, sys, urllib.request
from pathlib import Path

token = os.environ.get("BOT_TOKEN") or sys.exit("Set BOT_TOKEN")
html = (Path(__file__).resolve().parents[2] / "widget" / "widget.html").read_text()


def call(method, **body):
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/{method}", json.dumps(body).encode(),
                                 {"content-type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} failed: {e.read().decode()}")


chat_id = os.environ.get("CHAT_ID")
if not chat_id:
    updates = call("getUpdates")["result"]
    chats = [u["message"]["chat"]["id"] for u in updates if "message" in u and u["message"]["chat"]["type"] == "private"]
    if not chats:
        sys.exit("Send any message to the bot in Telegram first, or set CHAT_ID.")
    chat_id = chats[-1]
print(call("sendWidget", chat_id=chat_id, html=html, allow_queries=True,
           caption="Corner Jump: clear the board down to one piece.")["ok"] and f"Sent to {chat_id}")
