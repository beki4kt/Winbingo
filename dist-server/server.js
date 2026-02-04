// server.ts
console.log("🔄 server.ts is starting...");
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
class GameManager {
    rooms = new Map();
    constructor() {
        [10, 20, 50, 100].forEach(stake => {
            this.rooms.set(stake, { roomId: `RM-${stake}`, stake, status: 'WAITING', players: [], calledNumbers: [], currentCall: null, pot: 0, nextGameTime: Date.now() + 5000 });
        });
        setInterval(() => this.gameLoop(), 1000);
    }
    gameLoop() {
        this.rooms.forEach((room) => {
            if (room.status === 'WAITING') {
                if (Date.now() > room.nextGameTime && room.players.length > 0)
                    this.startGame(room);
            }
            else if (room.status === 'PLAYING') {
                if (Date.now() > room.nextGameTime) {
                    if (room.calledNumbers.length >= 75)
                        this.endGame(room);
                    else
                        this.callNumber(room);
                }
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
            // Fake lively data if empty
            const displayPlayers = r.status === 'PLAYING' ? r.players.length : r.players.length + Math.floor(Math.random() * 2);
            stats.push({ stake: r.stake, players: displayPlayers, pot: (displayPlayers * r.stake * 0.8).toFixed(0), status: r.status });
        });
        return stats;
    }
}
const gameManager = new GameManager();
// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    console.error("❌ BOT_TOKEN missing!");
    process.exit(1);
}
const bot = new Telegraf(botToken);
const appUrl = process.env.APP_URL || 'https://winbingo.fly.dev';
// --- KEYBOARDS ---
const dashboardMenu = Markup.inlineKeyboard([
    [Markup.button.webApp('Play Now 🎮', appUrl)],
    [Markup.button.callback('Deposit ➕', 'deposit_start'), Markup.button.callback('Withdraw ➖', 'withdraw_start')],
    [Markup.button.callback('Balance 💰', 'balance')]
]);
const cancelKeyboard = Markup.keyboard([['❌ Cancel']]).resize();
// --- STATE MANAGEMENT ---
const userStates = new Map();
// --- 🤖 BOT HANDLERS ---
bot.start(async (ctx) => {
    try {
        await ctx.setChatMenuButton({ type: 'commands' });
    }
    catch (e) { }
    // 1. Register User
    if (ctx.from) {
        await prisma.user.upsert({
            where: { telegramId: BigInt(ctx.from.id) },
            update: { username: ctx.from.username, firstName: ctx.from.first_name },
            create: { telegramId: BigInt(ctx.from.id), username: ctx.from.username, firstName: ctx.from.first_name, isRegistered: true }
        });
    }
    // 2. Handle Deep Link (from Mini App)
    // When Mini App sends "https://t.me/bot?start=deposit", payload is "deposit"
    const payload = ctx.payload;
    if (payload === 'deposit') {
        return triggerDeposit(ctx);
    }
    else if (payload === 'withdraw') {
        return triggerWithdraw(ctx);
    }
    // 3. Normal Start
    ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 **Welcome to Win Bingo!**\n\nChoose an option below:", parse_mode: 'Markdown', ...dashboardMenu });
});
// COMMANDS
bot.command('menu', (ctx) => ctx.reply("🏆 **Main Menu**", dashboardMenu));
bot.command('deposit', (ctx) => triggerDeposit(ctx));
bot.command('withdraw', (ctx) => triggerWithdraw(ctx));
bot.command('balance', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
    ctx.reply(`💰 **Wallet:** ${user?.balance.toFixed(2)} ETB\n🪙 **Coins:** ${user?.coins}`);
});
// ACTIONS (Button Clicks)
bot.action('deposit_start', (ctx) => triggerDeposit(ctx));
bot.action('withdraw_start', (ctx) => triggerWithdraw(ctx));
bot.action('balance', async (ctx) => {
    if (!ctx.from)
        return;
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
    ctx.reply(`💰 **Wallet:** ${user?.balance.toFixed(2)} ETB`, dashboardMenu);
});
// --- DEPOSIT/WITHDRAW LOGIC ---
function triggerDeposit(ctx) {
    userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: {} });
    ctx.reply("💵 **Deposit Funds**\n\nPlease enter the amount you want to deposit (ETB):", cancelKeyboard);
}
function triggerWithdraw(ctx) {
    userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
    ctx.reply("🏦 **Withdraw Funds**\n\nPlease enter the amount to withdraw (ETB):", cancelKeyboard);
}
// --- TEXT HANDLER ---
bot.on('text', async (ctx) => {
    const uid = ctx.from.id.toString();
    const text = ctx.message.text;
    const state = userStates.get(uid);
    if (text === '❌ Cancel') {
        userStates.delete(uid);
        return ctx.reply("❌ Cancelled.", Markup.removeKeyboard()).then(() => ctx.reply("Main Menu", dashboardMenu));
    }
    if (!state)
        return;
    if (state.step === 'DEPOSIT_AMOUNT') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 5)
            return ctx.reply("❌ Invalid. Min 5 ETB.");
        ctx.reply(`To Deposit ${amount} ETB:\n1. Transfer to 0924497619 (Telebirr)\n2. Send the SMS here.`, Markup.removeKeyboard());
        userStates.set(uid, { step: 'DEPOSIT_CONFIRM', data: { amount } });
    }
    else if (state.step === 'DEPOSIT_CONFIRM') {
        // Auto-Approve for Demo (In prod, verify SMS)
        await prisma.user.update({ where: { telegramId: BigInt(uid) }, data: { balance: { increment: state.data.amount } } });
        ctx.reply(`✅ **Received!** +${state.data.amount} ETB added.`, dashboardMenu);
        userStates.delete(uid);
    }
    else if (state.step === 'WITHDRAW_AMOUNT') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0)
            return ctx.reply("❌ Invalid.");
        userStates.set(uid, { step: 'WITHDRAW_PHONE', data: { amount } });
        ctx.reply("Enter Phone Number:", Markup.removeKeyboard());
    }
    else if (state.step === 'WITHDRAW_PHONE') {
        // Create Pending Transaction
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
        if (user) {
            await prisma.transaction.create({
                data: { userId: user.id, type: 'WITHDRAWAL', amount: state.data.amount, phone: text, status: 'PENDING' }
            });
            await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: state.data.amount } } });
        }
        ctx.reply(`✅ **Request Sent!**\n${state.data.amount} ETB to ${text}`, dashboardMenu);
        userStates.delete(uid);
    }
});
// --- 🔌 ADMIN APIs (New) ---
// 1. MANUAL ADD BALANCE (Super Admin)
app.post('/api/admin/add-balance', async (req, res) => {
    const { telegramId, amount } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        await prisma.user.update({
            where: { id: user.id },
            data: { balance: { increment: parseFloat(amount) } }
        });
        bot.telegram.sendMessage(telegramId, `🎁 **Bonus!** Admin added ${amount} ETB to your wallet.`);
        res.json({ success: true, newBalance: user.balance + parseFloat(amount) });
    }
    catch (e) {
        res.status(500).json({ error: "Error adding balance" });
    }
});
// 2. Existing Admin APIs
app.get('/api/admin/pending', async (req, res) => {
    const txs = await prisma.transaction.findMany({ where: { status: 'PENDING' }, include: { user: true }, orderBy: { date: 'desc' } });
    const safeTxs = txs.map(t => ({ ...t, user: { ...t.user, telegramId: t.user.telegramId.toString() } }));
    res.json(safeTxs);
});
// --- GAME APIs ---
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
app.get('/api/game/sync/:stake', (req, res) => {
    const room = gameManager.getRoomState(parseInt(req.params.stake));
    res.json(room || {});
});
app.get('/api/lobby/stats', (req, res) => res.json(gameManager.getLobbyStats()));
app.get('/api/user/:tid', async (req, res) => {
    const tid = BigInt(req.params.tid);
    const user = await prisma.user.findUnique({ where: { telegramId: tid } });
    if (user)
        res.json({ ...user, telegramId: user.telegramId.toString() });
    else
        res.status(404).json({ error: "Not Found" });
});
// --- SERVE APP ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
// --- 🛠️ SECRET ADMIN SETUP ROUTE ---
app.get('/api/setup/admin/:tid', async (req, res) => {
    try {
        const tid = BigInt(req.params.tid);
        // 1. Ensure user exists
        const user = await prisma.user.findUnique({ where: { telegramId: tid } });
        if (!user)
            return res.send(`❌ User ${tid} not found. Please start the bot first.`);
        // 2. Make them Admin
        await prisma.user.update({
            where: { id: user.id },
            data: { isAdmin: true }
        });
        res.send(`✅ SUCCESS! User ${tid} is now a Super Admin. Restart your Mini App.`);
    }
    catch (e) {
        res.status(500).send("Error: " + e.message);
    }
});
app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    bot.launch().catch(e => console.error("Bot failed:", e));
});
