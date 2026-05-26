console.log("🔄 Server Starting...");

import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { verify as verifyCBE } from '@jvhaile/cbe-verifier';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = path.resolve(__dirname, '..');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN || '8572602423:AAFv798LVotVnWRF4vcu6eg00OByN0CKqRQ';
if (!botToken) { 
    console.error("❌ CRITICAL ERROR: BOT_TOKEN is missing!"); 
}
const bot = new Telegraf(botToken);

// 🚀 CACHE BUSTER ADDED HERE: Appends ?v=2 to force Telegram to download the latest Vercel build
const baseAppUrl = process.env.APP_URL || 'https://winbingoet1.vercel.app';
const appUrl = `${baseAppUrl}?v=3`; 

// --- 🧠 GAME MANAGER (Multiplayer Logic) ---
class GameManager {
    private rooms: Map<number, any> = new Map();
    constructor() {
        [10, 20, 50, 100].forEach(stake => {
            this.rooms.set(stake, { 
                roomId: `RM-${stake}`, stake, status: 'WAITING', 
                players: [], calledNumbers: [], currentCall: null, 
                pot: 0, nextGameTime: Date.now() + 5000 
            });
        });
        setInterval(() => this.gameLoop(), 1000);
    }
    private gameLoop() {
        this.rooms.forEach((room) => {
            if (room.status === 'WAITING' && Date.now() > room.nextGameTime && room.players.length > 0) {
                this.startGame(room);
            } else if (room.status === 'PLAYING' && Date.now() > room.nextGameTime) {
                if (room.calledNumbers.length >= 75) this.endGame(room);
                else this.callNumber(room);
            }
        });
    }
    private startGame(room: any) {
        room.status = 'PLAYING'; room.calledNumbers = []; room.currentCall = null;
        room.pot = Math.floor((room.players.length * room.stake) * 0.8);
        this.callNumber(room);
    }
    private callNumber(room: any) {
        let nextNum;
        do { nextNum = Math.floor(Math.random() * 75) + 1; } while (room.calledNumbers.includes(nextNum));
        room.calledNumbers.push(nextNum); room.currentCall = nextNum; room.nextGameTime = Date.now() + 4000;
    }
    private endGame(room: any) {
        room.status = 'WAITING'; room.players = []; room.pot = 0; room.currentCall = null; room.nextGameTime = Date.now() + 10000;
    }
    public addPlayer(stake: number, userId: string) {
        const room = this.rooms.get(stake);
        if (room && !room.players.includes(userId)) {
            room.players.push(userId);
            room.pot = Math.floor((room.players.length * room.stake) * 0.8);
        }
    }
    public getRoomState(stake: number) { return this.rooms.get(stake); }
    public getLobbyStats() {
        const stats: any[] = [];
        this.rooms.forEach(r => {
            const displayPlayers = r.status === 'PLAYING' ? r.players.length : r.players.length + Math.floor(Math.random() * 2);
            stats.push({ stake: r.stake, players: displayPlayers, pot: (displayPlayers * r.stake * 0.8).toFixed(0), status: r.status });
        });
        return stats;
    }
}
const gameManager = new GameManager();

// ==========================================
// 🔌 API ROUTES (MUST BE BEFORE STATIC FILES)
// ==========================================

// 🛠️ MAGIC ADMIN LINK (Moved to Top)
app.get('/api/setup/admin/:tid', async (req, res) => {
    try {
        const tid = BigInt(req.params.tid);
        const user = await prisma.user.findUnique({ where: { telegramId: tid } });
        if (!user) return res.send(`❌ User ${tid} not found in database. Start the bot first!`);
        
        await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
        res.send(`<h1>✅ SUCCESS!</h1><p>User <b>${tid}</b> is now a Super Admin.</p><p>Restart the Mini App to see the Admin Panel.</p>`);
    } catch (e: any) {
        res.status(500).send("Error: " + e.message);
    }
});

// User & Game APIs
app.get('/api/user/:tid', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(req.params.tid) } });
        if (!user) return res.status(404).json({ error: "Not found" });
        res.json({ ...user, telegramId: user.telegramId.toString() });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/game/buy-ticket', async (req, res) => {
    const { tid, price } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if (!user || user.balance < price) return res.status(400).json({ success: false, message: "Insufficient Balance" });
        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: price } } }),
            prisma.gameHistory.create({ data: { userId: user.id, roomId: `RM-${price}`, stake: price, result: 'STAKE', amount: -price }})
        ]);
        gameManager.addPlayer(price, user.telegramId.toString());
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get('/api/lobby/stats', (req, res) => res.json(gameManager.getLobbyStats()));
app.get('/api/game/sync/:stake', (req, res) => res.json(gameManager.getRoomState(parseInt(req.params.stake)) || {}));

// Admin APIs
app.get('/api/admin/pending', async (req, res) => {
    const txs = await prisma.transaction.findMany({ where: { status: 'PENDING' }, include: { user: true }, orderBy: { date: 'desc' } });
    const safeTxs = txs.map(t => ({ ...t, user: { ...t.user, telegramId: t.user.telegramId.toString() } }));
    res.json(safeTxs);
});

app.post('/api/admin/add-balance', async (req, res) => {
    const { telegramId, amount } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
        if (!user) return res.status(404).json({ success: false });
        await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: parseFloat(amount) } } });
        bot.telegram.sendMessage(telegramId, `🎁 Admin added ${amount} ETB.`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/admin/action', async (req, res) => {
    const { auth, id, action } = req.body;
    if (auth !== 'admin123') return res.status(403).send("Forbidden access authorization keys");

    try {
        const tx = await prisma.transaction.findUnique({ where: { id }, include: { user: true } });
        if (!tx || tx.status !== 'PENDING') return res.status(400).json({ success: false, message: "Invalid tx tracking state status" });

        if (action === 'APPROVE') {
            if (tx.type === 'DEPOSIT') {
                await prisma.$transaction([
                    prisma.user.update({ where: { id: tx.userId }, data: { balance: { increment: tx.amount } } }),
                    prisma.transaction.update({ where: { id }, data: { status: 'APPROVED' } })
                ]);
                bot.telegram.sendMessage(tx.user.telegramId.toString(), `🔔 **Deposit Approved!**\n\nYour account has been credited with +${tx.amount} ETB via Telebirr confirmation verification.`);
            } else {
                await prisma.transaction.update({ where: { id }, data: { status: 'APPROVED' } });
                bot.telegram.sendMessage(tx.user.telegramId.toString(), `💸 **Withdrawal Completed Successfully!**\n\nYour payout request transfer for ${tx.amount} ETB has been executed over Telebirr channel networks.`);
            }
        } 
        else if (action === 'REJECT') {
            if (tx.type === 'WITHDRAWAL') {
                await prisma.$transaction([
                    prisma.user.update({ where: { id: tx.userId }, data: { balance: { increment: tx.amount } } }),
                    prisma.transaction.update({ where: { id }, data: { status: 'REJECTED' } })
                ]);
            } else {
                await prisma.transaction.update({ where: { id }, data: { status: 'REJECTED' } });
            }
            bot.telegram.sendMessage(tx.user.telegramId.toString(), `⚠️ **Transaction Request Refused/Rejected**\n\nYour ${tx.type.toLowerCase()} request for ${tx.amount} ETB was denied or rejected by system operators. Contact support services if you require details.`);
        }

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ==========================================
// 🤖 BOT LOGIC
// ==========================================

const dashboardMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('Play Now 🎮', appUrl)],
  [Markup.button.callback('Register Account 📝', 'reg_start')],
  [Markup.button.callback('Deposit ➕', 'deposit_start'), Markup.button.callback('Withdraw ➖', 'withdraw_start')],
  [Markup.button.callback('Balance 💰', 'balance')]
]);

const cancelKeyboard = Markup.keyboard([['❌ Cancel']]).resize();
const shareContactKeyboard = Markup.keyboard([
  [Markup.button.contactRequest('📱 Share Contact to Register')],
  ['❌ Cancel']
]).resize();

const userStates = new Map<string, { step: string, data: any }>();

// 1. START COMMAND (Handles Deep Links & Registers initial entry)
bot.start(async (ctx) => {
    const uid = ctx.from.id;
    try {
        await prisma.user.upsert({
            where: { telegramId: BigInt(uid) },
            update: { username: ctx.from.username, firstName: ctx.from.first_name },
            create: { 
                telegramId: BigInt(uid), 
                username: ctx.from.username, 
                firstName: ctx.from.first_name, 
                isRegistered: false,
                balance: 0.0,
                coins: 0
            }
        });
    } catch(e) { console.error("DB Error on startup:", e); }

    const payload = ctx.payload;
    if (payload === 'deposit') return triggerDeposit(ctx);
    if (payload === 'withdraw') return triggerWithdraw(ctx);

    ctx.replyWithPhoto(
        { source: path.join(rootPath, 'win.png') }, 
        { 
            caption: `🏆 **Welcome to Win Bingo, ${ctx.from.first_name}!**\n\nEthiopia's premier high-stakes Telegram Bingo application. Use the dashboard below or click the menu button to play!`, 
            parse_mode: 'Markdown', 
            ...dashboardMenu 
        }
    );
});

// 2. EXPLICIT COMMANDS
bot.command('menu', (ctx) => ctx.reply("🏆 Main Dashboard Menu:", dashboardMenu));
bot.command('deposit', (ctx) => triggerDeposit(ctx));
bot.command('withdraw', (ctx) => triggerWithdraw(ctx));

// 3. REGISTRATION START ACTION
// (Handled below in section 4)

// 4. HANDLERS FOR ACTIONS
bot.action('deposit_start', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    triggerDeposit(ctx);
});
bot.action('deposit_telebirr', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: { method: 'Telebirr' } });
    ctx.editMessageText("💵 **Deposit via Telebirr**\n\nEnter the amount you want to deposit (Minimum 1 ETB):");
});
bot.action('deposit_cbe', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: { method: 'CBE' } });
    ctx.editMessageText("💵 **Deposit via CBE**\n\nEnter the amount you want to deposit (Minimum 1 ETB):");
});
bot.action('withdraw_start', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    triggerWithdraw(ctx);
});
bot.action('balance', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from?.id!) } });
        ctx.reply(`💰 *Your Balance Summary*\n\n💵 Wallet Balance: *${user?.balance.toFixed(2)} ETB*\n🪙 Bonus Win Coins: *${user?.coins || 0}*`, { parse_mode: 'Markdown', ...dashboardMenu });
    } catch (e) { ctx.reply("Could not retrieve balance."); }
});
bot.action('reg_start', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const uid = ctx.from.id;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
        if (user && user.isRegistered) {
            return ctx.reply("⚠️ You are already registered and your account is completely active!");
        }
        ctx.reply("ምዝገባ ለመጀመር እባክዎ ከታች ያለውን ሰማያዊ ቁልፍ በመጫን ስልክ ቁጥርዎን ያጋሩን።\n\nTo begin registration, click the button below to share your contact number safely:", shareContactKeyboard);
    } catch (e) { ctx.reply("Error querying user status."); }
});

// 5. TRIGGER UTILITIES
function triggerDeposit(ctx: any) {
    userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_METHOD', data: {} });
    ctx.reply("💵 **Deposit Funds**\n\nPlease select your preferred payment method:", Markup.inlineKeyboard([
        [
            Markup.button.callback('Telebirr', 'deposit_telebirr'),
            Markup.button.callback('CBE', 'deposit_cbe')
        ]
    ]));
}

function triggerWithdraw(ctx: any) {
    userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
    ctx.reply("🏦 **Withdrawal via Telebirr or CBE**\n\nEnter the amount you wish to withdraw (Minimum 100 ETB):", cancelKeyboard);
}

// 6. CONTACT CALLBACK AND STATE STEPPERS
bot.on('contact', async (ctx) => {
    const contact = ctx.message.contact;
    const uid = ctx.from.id;

    if (contact.user_id !== uid) {
        return ctx.reply("❌ Error: You must share your own personal contact card.");
    }

    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
        if (user && user.isRegistered) {
            return ctx.reply("⚠️ Your phone number is already bound to an active registered account.", Markup.removeKeyboard());
        }

        await prisma.user.update({
            where: { telegramId: BigInt(uid) },
            data: {
                phoneNumber: contact.phone_number,
                isRegistered: true,
                balance: { increment: 100.0 }
            }
        });

        await ctx.reply("✅ *Registration Successful!*\n\nYour account has been securely verified and linked.\n🎁 A **100.00 ETB Welcome Bonus** has been credited to your balance!", { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
        ctx.reply("🏆 Use the menu below to join a lobby:", dashboardMenu);
    } catch (e) {
        console.error(e);
        ctx.reply("❌ There was a database error processing your registration parameters.");
    }
});

bot.on('text', async (ctx) => {
    const uid = ctx.from.id.toString();
    const text = ctx.message.text;
    const state = userStates.get(uid);

    if (text === '❌ Cancel') {
        userStates.delete(uid);
        return ctx.reply("Operation Cancelled.", Markup.removeKeyboard()).then(() => ctx.reply("Dashboard Menu Options:", dashboardMenu));
    }

    if (!state) return;

    // --- DEPOSIT FLOW ---
    if (state.step === 'DEPOSIT_AMOUNT') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 1) return ctx.reply("⚠️ Deposit failed. Minimum payment entry is 1 ETB. Please input a valid amount:");
        
        const method = state.data.method;
        const cbeAccount = process.env.CBE_ACCOUNT_NUMBER || '1000123456789';
        
        if (method === 'CBE') {
            ctx.reply(`💸 **Payment Guide (${amount} ETB)**\n\n1. Send funds to our CBE account:\n👉 \`${cbeAccount}\`\n\n2. Once paid, paste the full CBE SMS confirmation text here:`, cancelKeyboard);
        } else {
            ctx.reply(`💸 **Payment Guide (${amount} ETB)**\n\n1. Send funds to our Telebirr account:\n👉 \`0919184337\`\n\n2. Once paid, paste the Transaction Reference code here:`, cancelKeyboard);
        }
        userStates.set(uid, { step: 'DEPOSIT_CONFIRM', data: { amount, method } });
    }
    else if (state.step === 'DEPOSIT_CONFIRM') {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
        if (!user) return ctx.reply("User profile context error.");

        const cbeMatch = text.match(/FT\w{10}/);
        let method = state.data.method || 'Telebirr';
        let ref = text;

        if (cbeMatch || method === 'CBE') {
            method = 'CBE';
            ref = cbeMatch ? cbeMatch[0] : text;
            const verificationUrl = process.env.CBE_VERIFICATION_URL;
            const cbeAccount = process.env.CBE_ACCOUNT_NUMBER || '1000123456789';
            
            if (verificationUrl) {
                ctx.reply("⏳ Automatically verifying CBE Transaction...");
                try {
                    const result = await verifyCBE({
                        transactionId: ref,
                        accountNumberOfSenderOrReceiver: cbeAccount,
                        cbeVerificationUrl: verificationUrl,
                    });

                    if (result.isRight()) {
                        const txDetail: any = result.extract();
                        if (txDetail.amount && txDetail.amount >= state.data.amount) {
                            await prisma.$transaction([
                                prisma.transaction.create({
                                    data: {
                                        userId: user.id,
                                        type: 'DEPOSIT',
                                        amount: txDetail.amount,
                                        method: 'CBE',
                                        ref: ref,
                                        status: 'APPROVED'
                                    }
                                }),
                                prisma.user.update({
                                    where: { id: user.id },
                                    data: { balance: { increment: txDetail.amount } }
                                })
                            ]);
                            ctx.reply(`✅ **CBE Transaction Verified!**\n\nAmount: ${txDetail.amount} ETB\nRef: ${ref}\n\nYour balance has been updated instantly.`, Markup.removeKeyboard());
                            userStates.delete(uid);
                            return;
                        } else {
                            ctx.reply(`⚠️ Verification succeeded, but the transferred amount (${txDetail.amount} ETB) is less than the requested (${state.data.amount} ETB). Queued for manual admin review.`);
                        }
                    } else {
                        const err = result.extract();
                        const errMsg = typeof err === 'object' && err !== null && 'type' in err ? err.type : 'Unknown';
                        ctx.reply(`❌ Auto-verification failed: ${errMsg}. Queuing for manual review...`);
                    }
                } catch (err: any) {
                    ctx.reply("❌ Auto-verification encountered an error. Queuing for manual review...");
                }
            } else {
                ctx.reply("⚠️ CBE Verification is not fully configured on the server. Queuing for manual review...");
            }
        }

        await prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'DEPOSIT',
                amount: state.data.amount,
                method: method,
                ref: ref,
                status: 'PENDING'
            }
        });

        ctx.reply("✅ **Transaction Logged!**\n\nYour deposit reference receipt has been dispatched to administrators for authorization verification. Your balance updates within 10-15 minutes.", Markup.removeKeyboard());
        userStates.delete(uid);
    }
    // --- WITHDRAW FLOW ---
    else if (state.step === 'WITHDRAW_AMOUNT') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 100) return ctx.reply("⚠️ Minimum withdrawal allowed is 100 ETB. Enter an eligible sum:");
        
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
        if (!user || user.balance < amount) {
            userStates.delete(uid);
            return ctx.reply(`❌ Insufficient funds! Your balance is only ${user?.balance.toFixed(2)} ETB.`, Markup.removeKeyboard());
        }

        ctx.reply("📱 Enter your Telebirr phone number where you wish to receive the payout payout transfer:", cancelKeyboard);
        userStates.set(uid, { step: 'WITHDRAW_PHONE', data: { amount } });
    }
    else if (state.step === 'WITHDRAW_PHONE') {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
        if (user) {
            await prisma.$transaction([
                prisma.transaction.create({
                    data: {
                        userId: user.id,
                        type: 'WITHDRAWAL',
                        amount: state.data.amount,
                        method: 'Telebirr',
                        phone: text,
                        status: 'PENDING'
                    }
                }),
                prisma.user.update({
                    where: { id: user.id },
                    data: { balance: { decrement: state.data.amount } }
                })
            ]);
            ctx.reply(`✅ **Payout Order Placed!**\n\nRequest for ${state.data.amount} ETB to Telebirr (${text}) is queued. Administrators are executing transaction transfers shortly.`, dashboardMenu);
        }
        userStates.delete(uid);
    }
});

// ==========================================
// 🚀 STARTUP
// ==========================================
const distPath = path.join(__dirname, '../dist');
// API routes are defined above, so this wildcard won't block them now
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    bot.launch().then(() => console.log("🤖 Bot Launched!"))
       .catch(e => console.error("❌ Bot Failed:", e));
});

// Graceful Stop
process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });