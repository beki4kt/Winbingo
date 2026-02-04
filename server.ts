// server.ts
console.log("🔄 server.ts is starting...");

import express from 'express';
import { Telegraf, Markup, Context } from 'telegraf';
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

// --- 🎮 GAME ENGINE (Simple Caller) ---
let globalGame = { 
    roomId: 'LIVE-1', 
    calledNumbers: [] as number[], 
    currentCall: null as number | null, 
    status: 'running', 
};

setInterval(() => {
    if (globalGame.calledNumbers.length >= 75) {
        globalGame.calledNumbers = [];
        globalGame.currentCall = null;
    } else {
        let nextNum;
        do { nextNum = Math.floor(Math.random() * 75) + 1; } while (globalGame.calledNumbers.includes(nextNum));
        globalGame.calledNumbers.push(nextNum);
        globalGame.currentCall = nextNum;
    }
}, 4000);

// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    console.error("❌ ERROR: BOT_TOKEN is missing in environment variables!");
    process.exit(1); // Exit if no token
}
const bot = new Telegraf(botToken);
const appUrl = process.env.APP_URL || 'https://winbingo.fly.dev';

const commands = [
  { command: 'menu', description: '🏠 Main Menu' },
  { command: 'play', description: '🎮 Play Game' },
  { command: 'balance', description: '💰 Balance' }
];

const dashboardMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('Play Now 🎮', appUrl)],
  [Markup.button.callback('Deposit ➕', 'dep_msg'), Markup.button.callback('Withdraw ➖', 'with_msg')],
  [Markup.button.callback('Balance 💰', 'balance')]
]);

// --- 🤖 BOT HANDLERS ---
bot.start(async (ctx) => {
    try { await ctx.setChatMenuButton({ type: 'commands' }); } catch (e) {}
    if (!ctx.from) return;
    const telegramId = BigInt(ctx.from.id);
    await prisma.user.upsert({
      where: { telegramId },
      update: { username: ctx.from.username, firstName: ctx.from.first_name },
      create: { telegramId, username: ctx.from.username, firstName: ctx.from.first_name, isRegistered: true }
    });
    ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 **Welcome to Win Bingo!**", parse_mode: 'Markdown', ...dashboardMenu });
});

bot.command('menu', (ctx) => ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 Menu", ...dashboardMenu }));
bot.action('balance', async (ctx) => {
    if(!ctx.from) return;
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
    ctx.reply(`💰 Balance: ${user?.balance.toFixed(2)} ETB\n🪙 Coins: ${user?.coins}`);
});
bot.action('dep_msg', (ctx) => ctx.reply("To Deposit, please use the 'Deposit' section inside the Mini App Wallet."));
bot.action('with_msg', (ctx) => ctx.reply("To Withdraw, please use the 'Withdraw' section inside the Mini App Wallet."));


// ==========================================
// 🔌 API ENDPOINTS (Updated for Coins/History)
// ==========================================

// 1. Get User Data (Includes Coins)
app.get('/api/user/:tid', async (req, res) => {
    try {
        const tid = BigInt(req.params.tid);
        const user = await prisma.user.findUnique({ where: { telegramId: tid } });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({
            balance: user.balance,
            coins: user.coins, // Send coin data
            telegramId: user.telegramId.toString()
        });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// 2. Buy Ticket (Records History)
app.post('/api/game/buy-ticket', async (req, res) => {
    const { tid, price, roomId } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if (!user || user.balance < price) return res.status(400).json({ success: false, message: "Insufficient Balance" });

        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: price } } }),
            // Record buy-in as a 'pending' loss until they win
            prisma.gameHistory.create({ data: { userId: user.id, roomId, stake: price, result: 'STAKE', amount: -price }})
        ]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Transaction Failed" }); }
});

// 3. Claim Win (Updates History to WIN)
app.post('/api/game/claim-win', async (req, res) => {
    const { tid, reward, roomId } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if(!user) return res.status(404).json({error: "User not found"});

        await prisma.$transaction([
             prisma.user.update({ where: { id: user.id }, data: { balance: { increment: reward } } }),
             // Add a WIN record
             prisma.gameHistory.create({ data: { userId: user.id, roomId, stake: 0, result: 'WIN', amount: reward }})
        ]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error processing win" }); }
});

// 4. Record Loss (Adds Coins)
app.post('/api/game/record-loss', async (req, res) => {
    const { tid, roomId, stake } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if(!user) return res.status(404).json({error: "User not found"});

        await prisma.$transaction([
            // Add 2 coins for losing
            prisma.user.update({ where: { id: user.id }, data: { coins: { increment: 2 } } }),
            // Record LOSS
            prisma.gameHistory.create({ data: { userId: user.id, roomId, stake: stake, result: 'LOSS', amount: 0 }})
        ]);
        res.json({ success: true, newCoins: user.coins + 2 });
    } catch (e) { res.status(500).json({ error: "Error recording loss" }); }
});

// 5. Exchange Coins (100 Coins = 10 ETB)
app.post('/api/wallet/exchange', async (req, res) => {
    const { tid } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if (!user || user.coins < 100) return res.status(400).json({ success: false, message: "Need 100 coins" });

        await prisma.user.update({
            where: { id: user.id },
            data: { coins: { decrement: 100 }, balance: { increment: 10.0 } }
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Exchange failed" }); }
});

// 6. Get History
app.get('/api/history/:tid', async (req, res) => {
    try {
        const tid = BigInt(req.params.tid);
        const user = await prisma.user.findUnique({ where: { telegramId: tid }, include: { history: { orderBy: { date: 'desc' }, take: 20 } } });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user.history);
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

app.get('/api/game/sync', (req, res) => res.json(globalGame));

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    bot.telegram.setMyCommands(commands);
    bot.launch().then(() => console.log("🤖 Bot launched successfully!")).catch(e => console.error("❌ Bot failed to launch:", e));
});

process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });