import os
import httpx
from fastapi import FastAPI, Request

app = FastAPI()
TOKEN = os.getenv("BOT_TOKEN")

@app.post("/webhook")
async def handle_webhook(request: Request):
    try:
        update = await request.json()
        # This will show in Vercel 'Functions' logs
        print(f"!!! REACHED WEBHOOK: {update}") 

        if "message" in update:
            chat_id = update["message"]["chat"]["id"]
            text = update["message"].get("text", "")

            # Send a direct reply without using any database
            url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
            async with httpx.AsyncClient() as client:
                await client.post(url, json={
                    "chat_id": chat_id, 
                    "text": f"🚀 I AM ALIVE!\nYou sent: {text}\n\nConnection to Vercel is 100% working."
                })
        
        return {"ok": True}
    except Exception as e:
        print(f"ERROR: {e}")
        return {"ok": True} # Still return 200 to Telegram

@app.get("/api")
async def health():
    return {"status": "Vercel is running"}