# 🤖 Roblox Robux & Telegram Stars Sotuv Boti (24/7 Bepul Serverda Ishlatish)

Telegram kanalingiz obunachilariga Robux va Telegram Stars sotish uchun tayyorlangan professional Telegram bot.

---

## 🌐 Botni noutbuk o'chiq bo'lsa ham 24/7 ishlatish (Serverga qo'yish):

Bot kompyuteringiz o'chiq bo'lsa ham uzluksiz ishlashi uchun uni bepul **Render.com** serveriga joylash eng oson va qulay usuldir.

### 🚀 Render.com serveriga joylash bo'yicha yo'riqnoma:

1. **GitHub proyekt yaratish:**
   - Ushbu jilddagi fayllarni (`bot.py`, `requirements.txt`, `Procfile`, `.env.example`) o'zingizning GitHub akkountingizga (`repository`) yuklang.

2. **Render.com sahifasiga kirish:**
   - [render.com](https://render.com) saytiga kiring va GitHub orqali ro'yxatdan o'ting.

3. **Yangi xizmat qo'shish:**
   - **"New +"** tugmasini bosing va **"Background Worker"** bo'limini tanlang.
   - GitHub repository ingizni ulang.

4. **Sozlamalarni kiritish:**
   - **Name:** `roblox-bot`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python bot.py`
   - **Instance Type:** `Free` (Bepul)

5. **Environment Variables (.env ma'lumotlarini kiritish):**
   - **"Environment Variables"** bo'limiga kirib quyidagilarni qo'shing:
     - `BOT_TOKEN` = `8987724485:AAEPxu-e0MU-0Rj_x0kywJudd-Bsz4i6Ekg`
     - `ADMIN_ID` = `Sizning Telegram ID ingiz`
     - `ADMIN_USERNAME` = `@flexyha`

6. **"Create Background Worker"** tugmasini bosing.
   - Bo'ldi! Bot Render serverida 24/7 rejimda noutbukingiz o'chiq bo'lsa ham ishlayveradi.

---

## 📂 Fayllar strukturasi:
- `bot.py` - Botning asosiy kodi (aiogram 3.x kutubxonasida).
- `.env` - Bot Token, Admin ID va Admin username sozlamalari.
- `Procfile` - Render/Railway 24/7 server fayli.
- `requirements.txt` - Kerakli Python kutubxonalari.
