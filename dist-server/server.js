console.log("🔄 Server Starting...");
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
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
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    console.error("❌ CRITICAL ERROR: BOT_TOKEN is missing!");
}
const bot = new Telegraf(botToken || 'YOUR_TOKEN_HERE'); // Fallback to avoid crash, but won't work
const appUrl = process.env.APP_URL || 'https://winbingo.fly.dev';
// --- 🧠 GAME MANAGER (Multiplayer Logic) ---
class GameManager {
    rooms = new Map();
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
    gameLoop() {
        this.rooms.forEach((room) => {
            if (room.status === 'WAITING' && Date.now() > room.nextGameTime && room.players.length > 0) {
                this.startGame(room);
            }
            else if (room.status === 'PLAYING' && Date.now() > room.nextGameTime) {
                if (room.calledNumbers.length >= 75)
                    this.endGame(room);
                else
                    this.callNumber(room);
            }
        });
    }
    startGame(room) {
        room.status = 'PLAYING';
        room.calledNumbers = [];
        room.currentCall = null;
        room.pot = Math.floor((room.players.length * room.stake) * 0.8);
        this.callNumber(room);
    }
    callNumber(room) {
        let nextNum;
        do {
            nextNum = Math.floor(Math.random() * 75) + 1;
        } while (room.calledNumbers.includes(nextNum));
        room.calledNumbers.push(nextNum);
        room.currentCall = nextNum;
        room.nextGameTime = Date.now() + 4000;
    }
    endGame(room) {
        room.status = 'WAITING';
        room.players = [];
        room.pot = 0;
        room.currentCall = null;
        room.nextGameTime = Date.now() + 10000;
    }
    addPlayer(stake, userId) {
        const room = this.rooms.get(stake);
        if (room && !room.players.includes(userId)) {
            room.players.push(userId);
            room.pot = Math.floor((room.players.length * room.stake) * 0.8);
        }
    }
    getRoomState(stake) { return this.rooms.get(stake); }
    getLobbyStats() {
        const stats = [];
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
        if (!user)
            return res.send(`❌ User ${tid} not found in database. Start the bot first!`);
        await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
        res.send(`<h1>✅ SUCCESS!</h1><p>User <b>${tid}</b> is now a Super Admin.</p><p>Restart the Mini App to see the Admin Panel.</p>`);
    }
    catch (e) {
        res.status(500).send("Error: " + e.message);
    }
});
// User & Game APIs
app.get('/api/user/:tid', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(req.params.tid) } });
        if (!user)
            return res.status(404).json({ error: "Not found" });
        res.json({ ...user, telegramId: user.telegramId.toString() });
    }
    catch (e) {
        res.status(500).json({ error: "Error" });
    }
});
app.post('/api/game/buy-ticket', async (req, res) => {
    const { tid, price } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if (!user || user.balance < price)
            return res.status(400).json({ success: false, message: "Insufficient Balance" });
        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: price } } }),
            prisma.gameHistory.create({ data: { userId: user.id, roomId: `RM-${price}`, stake: price, result: 'STAKE', amount: -price } })
        ]);
        gameManager.addPlayer(price, user.telegramId.toString());
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: "Error" });
    }
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
        if (!user)
            return res.status(404).json({ success: false });
        await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: parseFloat(amount) } } });
        bot.telegram.sendMessage(telegramId, `🎁 Admin added ${amount} ETB.`);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: "Error" });
    }
});
// ==========================================
// 🤖 BOT LOGIC
// ==========================================
const dashboardMenu = Markup.inlineKeyboard([
    [Markup.button.webApp('Play Now 🎮', appUrl)],
    [Markup.button.callback('Deposit ➕', 'deposit_start'), Markup.button.callback('Withdraw ➖', 'withdraw_start')],
    [Markup.button.callback('Balance 💰', 'balance')]
]);
const cancelKeyboard = Markup.keyboard([['❌ Cancel']]).resize();
const userStates = new Map();
// 1. START COMMAND (Handles Deep Links)
bot.start(async (ctx) => {
    const uid = ctx.from.id;
    try {
        await prisma.user.upsert({
            where: { telegramId: BigInt(uid) },
            update: { username: ctx.from.username, firstName: ctx.from.first_name },
            create: { telegramId: BigInt(uid), username: ctx.from.username, firstName: ctx.from.first_name, isRegistered: true }
        });
    }
    catch (e) {
        console.error("DB Error:", e);
    }
    // Check payload (e.g., /start deposit)
    const payload = ctx.payload;
    if (payload === 'deposit')
        return triggerDeposit(ctx);
    if (payload === 'withdraw')
        return triggerWithdraw(ctx);
    ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 **Welcome to Win Bingo!**", parse_mode: 'Markdown', ...dashboardMenu });
});
// 2. EXPLICIT COMMANDS
bot.command('menu', (ctx) => ctx.reply("🏆 Menu", dashboardMenu));
bot.command('deposit', (ctx) => triggerDeposit(ctx));
bot.command('withdraw', (ctx) => triggerWithdraw(ctx)); // Updated to match /withdraw
// 3. ACTIONS
bot.action('deposit_start', (ctx) => triggerDeposit(ctx));
bot.action('withdraw_start', (ctx) => triggerWithdraw(ctx));
bot.action('balance', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from?.id) } });
    ctx.reply(`💰 Balance: ${user?.balance.toFixed(2)} ETB`, dashboardMenu);
});
// 4. FLOWS
function triggerDeposit(ctx) {
    userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: {} });
    ctx.reply("💵 **Deposit Funds**\n\nEnter amount (ETB):", cancelKeyboard);
}
function triggerWithdraw(ctx) {
    userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
    ctx.reply("🏦 **Withdraw Funds**\n\nEnter amount (ETB):", cancelKeyboard);
}
// 5. TEXT LISTENER
bot.on('text', async (ctx) => {
    const uid = ctx.from.id.toString();
    const text = ctx.message.text;
    const state = userStates.get(uid);
    if (text === '❌ Cancel') {
        userStates.delete(uid);
        return ctx.reply("Cancelled.", Markup.removeKeyboard()).then(() => ctx.reply("Menu", dashboardMenu));
    }
    if (!state)
        return;
    if (state.step === 'DEPOSIT_AMOUNT') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 5)
            return ctx.reply("Min 5 ETB.");
        ctx.reply(`To Deposit ${amount} ETB:\n1. Transfer to 0924497619\n2. Send SMS here.`, Markup.removeKeyboard());
        userStates.set(uid, { step: 'DEPOSIT_CONFIRM', data: { amount } });
    }
    else if (state.step === 'DEPOSIT_CONFIRM') {
        // Auto-approve for demo
        await prisma.user.update({ where: { telegramId: BigInt(uid) }, data: { balance: { increment: state.data.amount } } });
        ctx.reply(`✅ Received! +${state.data.amount} ETB`, dashboardMenu);
        userStates.delete(uid);
    }
    else if (state.step === 'WITHDRAW_AMOUNT') {
        const amount = parseFloat(text);
        userStates.set(uid, { step: 'WITHDRAW_PHONE', data: { amount } });
        ctx.reply("Enter Phone:", Markup.removeKeyboard());
    }
    else if (state.step === 'WITHDRAW_PHONE') {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
        if (user) {
            await prisma.transaction.create({ data: { userId: user.id, type: 'WITHDRAWAL', amount: state.data.amount, phone: text, status: 'PENDING' } });
            await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: state.data.amount } } });
        }
        ctx.reply("✅ Request Sent!", dashboardMenu);
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
