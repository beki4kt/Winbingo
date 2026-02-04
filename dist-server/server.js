// server.ts
console.log("🔄 server.ts is starting...");
import express from 'express';
import { Telegraf } from 'telegraf';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Fix for path resolution whether running via ts-node or node dist-server
const rootPath = path.resolve(__dirname, '..');
const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(cors());
// --- 🎮 GAME ENGINE (The "Live" Bingo Caller) ---
// This runs on the server and generates numbers for everyone
let globalGame = {
    roomId: 'LIVE-ADDIS-1',
    calledNumbers: [],
    currentCall: null,
    status: 'running',
    nextCallTime: Date.now() + 4000
};
// Automatic Number Caller (Every 4 seconds)
setInterval(() => {
    if (globalGame.status === 'running') {
        if (globalGame.calledNumbers.length >= 75) {
            // Reset game if full
            globalGame.calledNumbers = [];
            globalGame.currentCall = null;
        }
        else {
            let nextNum;
            do {
                nextNum = Math.floor(Math.random() * 75) + 1;
            } while (globalGame.calledNumbers.includes(nextNum));
            globalGame.calledNumbers.push(nextNum);
            globalGame.currentCall = nextNum;
        }
    }
}, 4000);
const userStates = new Map();
const usedTransactionIds = new Set();
// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken || '');
const appUrl = process.env.APP_URL || 'https://winbingo.fly.dev';
// --- COMMANDS ---
const commands = [
    { command: 'menu', description: '🏠 Main Menu' },
    { command: 'play', description: '🎮 Play Game' },
    { command: 'deposit', description: '➕ Deposit' },
    { command: 'withdraw', description: '➖ Withdraw' },
    { command: 'balance', description: '💰 Balance' }
];
// --- 🔌 API ENDPOINTS (The Bridge) ---
// 1. Get User Data
app.get('/api/user/:tid', async (req, res) => {
    try {
        const tid = BigInt(req.params.tid);
        const user = await prisma.user.findUnique({ where: { telegramId: tid } });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json({
            username: user.username,
            firstName: user.firstName,
            balance: user.balance,
            telegramId: user.telegramId.toString()
        });
    }
    catch (e) {
        res.status(500).json({ error: "Server Error" });
    }
});
// 2. Buy Ticket
app.post('/api/game/buy-ticket', async (req, res) => {
    const { tid, price } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if (!user || user.balance < price) {
            return res.status(400).json({ success: false, message: "Insufficient Balance" });
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { balance: { decrement: price } }
        });
        res.json({ success: true, newBalance: user.balance - price });
    }
    catch (e) {
        res.status(500).json({ error: "Transaction Failed" });
    }
});
// 3. Claim Win
app.post('/api/game/claim-win', async (req, res) => {
    const { tid, reward } = req.body;
    try {
        await prisma.user.update({
            where: { telegramId: BigInt(tid) },
            data: { balance: { increment: reward } }
        });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: "Error processing win" });
    }
});
// 4. Game Sync (Frontend calls this to get numbers)
app.get('/api/game/sync', (req, res) => {
    res.json(globalGame);
});
// --- SERVE MINI APP ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
// --- START SERVER ---
app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    if (botToken) {
        bot.telegram.setMyCommands(commands);
        bot.launch().catch(e => console.error("Bot failed:", e));
    }
});
// --- HELPER FUNCTIONS ---
function verifyPaymentSMS(text, expectedAmount) { /* (Keep your existing verify function) */ return { valid: false }; }
async function getOrCreateUser(ctx) { }
