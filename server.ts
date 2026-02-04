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

// --- 🎮 GAME ENGINE ---
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
if (!botToken) { console.error("❌ BOT_TOKEN missing!"); process.exit(1); }
const bot = new Telegraf(botToken);
const appUrl = process.env.APP_URL || 'https://winbingo.fly.dev';

// --- 🔌 API ENDPOINTS ---

// 1. Get User
app.get('/api/user/:tid', async (req, res) => {
    try {
        const tid = BigInt(req.params.tid);
        const user = await prisma.user.findUnique({ where: { telegramId: tid } });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ ...user, telegramId: user.telegramId.toString() });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// 2. Submit Transaction (Deposit/Withdraw)
app.post('/api/transaction/create', async (req, res) => {
    const { tid, type, amount, method, phone, ref } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if(!user) return res.status(404).json({error: "User not found"});

        if (type === 'WITHDRAWAL' && user.balance < amount) {
            return res.json({ success: false, message: "Insufficient Balance" });
        }

        if (type === 'WITHDRAWAL') {
             // Deduct immediately for withdrawal request
             await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: amount } } });
        }

        await prisma.transaction.create({
            data: { userId: user.id, type, amount, method, phone, ref, status: 'PENDING' }
        });

        // Notify Admin (You) via Bot
        bot.telegram.sendMessage(process.env.ADMIN_ID || tid, `🔔 New ${type} Request: ${amount} ETB\nUser: ${user.firstName}`);

        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Error" }); }
});

// 3. ADMIN: Get Pending Transactions
app.get('/api/admin/pending', async (req, res) => {
    // In production, add password check here!
    const txs = await prisma.transaction.findMany({
        where: { status: 'PENDING' },
        include: { user: true },
        orderBy: { date: 'desc' }
    });
    // Convert BigInt to string for JSON
    const safeTxs = txs.map(t => ({
        ...t,
        user: { ...t.user, telegramId: t.user.telegramId.toString() }
    }));
    res.json(safeTxs);
});

// 4. ADMIN: Approve/Reject
app.post('/api/admin/handle', async (req, res) => {
    const { txId, action } = req.body; // action: 'APPROVE' or 'REJECT'
    try {
        const tx = await prisma.transaction.findUnique({ where: { id: txId }, include: { user: true } });
        if(!tx || tx.status !== 'PENDING') return res.json({ success: false, message: "Invalid Transaction" });

        if (action === 'APPROVE') {
            if (tx.type === 'DEPOSIT') {
                // Add money to user
                await prisma.user.update({ where: { id: tx.userId }, data: { balance: { increment: tx.amount } } });
                bot.telegram.sendMessage(tx.user.telegramId.toString(), `✅ Deposit Approved! +${tx.amount} ETB`);
            } else {
                bot.telegram.sendMessage(tx.user.telegramId.toString(), `✅ Withdrawal Approved! ${tx.amount} ETB sent.`);
            }
            await prisma.transaction.update({ where: { id: txId }, data: { status: 'APPROVED' } });
        } else {
            // REJECT
            if (tx.type === 'WITHDRAWAL') {
                // Refund the deduction
                await prisma.user.update({ where: { id: tx.userId }, data: { balance: { increment: tx.amount } } });
            }
            await prisma.transaction.update({ where: { id: txId }, data: { status: 'REJECTED' } });
            bot.telegram.sendMessage(tx.user.telegramId.toString(), `❌ Transaction Rejected.`);
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Error" }); }
});

// --- STANDARD GAME APIs (Buy Ticket, Claims, etc) ---
app.post('/api/game/buy-ticket', async (req, res) => { /* Same as before... */ res.json({success:true}) }); 
app.get('/api/game/sync', (req, res) => res.json(globalGame));

// --- SERVE APP ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    bot.launch().catch(e => console.error("Bot failed:", e));
});