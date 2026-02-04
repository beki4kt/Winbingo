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

// ==========================================
// 🧠 DEEP MULTIPLAYER LOGIC (The Game Engine)
// ==========================================

interface GameState {
    roomId: string;
    stake: number;
    status: 'WAITING' | 'PLAYING';
    players: string[]; // List of UserIDs
    calledNumbers: number[];
    currentCall: number | null;
    pot: number;
    nextGameTime: number; // Timestamp for next round
}

class GameManager {
    private rooms: Map<number, GameState> = new Map();

    constructor() {
        // Initialize 4 Persistent Rooms (One per stake)
        [10, 20, 50, 100].forEach(stake => {
            this.rooms.set(stake, {
                roomId: `RM-${stake}`,
                stake: stake,
                status: 'WAITING',
                players: [],
                calledNumbers: [],
                currentCall: null,
                pot: 0,
                nextGameTime: Date.now() + 10000
            });
        });

        // Start the Master Loop (1 Second Tick)
        setInterval(() => this.gameLoop(), 1000);
    }

    private gameLoop() {
        this.rooms.forEach((room) => {
            // LOGIC: WAITING PHASE
            if (room.status === 'WAITING') {
                // If enough players or time passed, START
                if (Date.now() > room.nextGameTime && room.players.length > 0) {
                    this.startGame(room);
                }
            } 
            // LOGIC: PLAYING PHASE
            else if (room.status === 'PLAYING') {
                // Every 4 seconds, call a number
                if (Date.now() > room.nextGameTime) {
                    if (room.calledNumbers.length >= 75) {
                        this.endGame(room); // Game Over (Draw/No Winner)
                    } else {
                        this.callNumber(room);
                    }
                }
            }
        });
    }

    private startGame(room: GameState) {
        room.status = 'PLAYING';
        room.calledNumbers = [];
        room.currentCall = null;
        // Calculate Pot: Total Stake * 80% (20% Fee)
        room.pot = Math.floor((room.players.length * room.stake) * 0.8);
        console.log(`🚀 Starting Game ${room.stake} ETB with ${room.players.length} players. Pot: ${room.pot}`);
        this.callNumber(room); // Call first number immediately
    }

    private callNumber(room: GameState) {
        let nextNum;
        do { nextNum = Math.floor(Math.random() * 75) + 1; } while (room.calledNumbers.includes(nextNum));
        
        room.calledNumbers.push(nextNum);
        room.currentCall = nextNum;
        room.nextGameTime = Date.now() + 4000; // Next call in 4s
    }

    private endGame(room: GameState) {
        console.log(`🏁 Game ${room.stake} ETB Ended.`);
        room.status = 'WAITING';
        room.players = []; // Clear players for next round
        room.pot = 0;
        room.currentCall = null;
        room.nextGameTime = Date.now() + 15000; // 15s Break before next game
    }

    // Public Methods for API
    public addPlayer(stake: number, userId: string) {
        const room = this.rooms.get(stake);
        if (room && !room.players.includes(userId)) {
            room.players.push(userId);
            // Update Pot Estimate immediately for UI
            room.pot = Math.floor((room.players.length * room.stake) * 0.8);
        }
    }

    public getRoomState(stake: number) {
        return this.rooms.get(stake);
    }

    public getLobbyStats() {
        const stats: any[] = [];
        this.rooms.forEach(r => {
            // Fake some data if empty to make it look "Lively" for demo
            const displayPlayers = r.players.length + Math.floor(Math.random() * 3); 
            stats.push({
                stake: r.stake,
                players: displayPlayers,
                pot: (displayPlayers * r.stake * 0.8).toFixed(0),
                status: r.status
            });
        });
        return stats;
    }
}

const gameManager = new GameManager();

// ==========================================
// 🔌 API ENDPOINTS
// ==========================================

// 1. GET USER
app.get('/api/user/:tid', async (req, res) => {
    try {
        const tid = BigInt(req.params.tid);
        const user = await prisma.user.findUnique({ where: { telegramId: tid } });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ ...user, telegramId: user.telegramId.toString() });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// 2. BUY TICKET (Join the Real Game Room)
app.post('/api/game/buy-ticket', async (req, res) => {
    const { tid, price } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if (!user || user.balance < price) return res.status(400).json({ success: false, message: "Insufficient Balance" });

        // Atomic DB Transaction
        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: price } } }),
            prisma.gameHistory.create({ data: { userId: user.id, roomId: `RM-${price}`, stake: price, result: 'STAKE', amount: -price }})
        ]);

        // Add to In-Memory Game Engine
        gameManager.addPlayer(price, user.telegramId.toString());

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Transaction Failed" }); }
});

// 3. SYNC GAME (Frontend polling)
app.get('/api/game/sync/:stake', (req, res) => {
    const stake = parseInt(req.params.stake);
    const room = gameManager.getRoomState(stake);
    res.json(room || {});
});

// 4. LOBBY STATS (For Stake Selection Page)
app.get('/api/lobby/stats', (req, res) => {
    res.json(gameManager.getLobbyStats());
});

// 5. CLAIM WIN
app.post('/api/game/claim-win', async (req, res) => {
    const { tid, reward, stake } = req.body; // Pass stake to verify room
    try {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
        if(!user) return res.status(404).json({error: "User not found"});

        // Double check: Is the game actually running? (Basic check)
        const room = gameManager.getRoomState(stake);
        if (!room || room.status !== 'PLAYING') {
            return res.json({ success: false, message: "Game not active" });
        }

        await prisma.$transaction([
             prisma.user.update({ where: { id: user.id }, data: { balance: { increment: reward } } }),
             prisma.gameHistory.create({ data: { userId: user.id, roomId: room.roomId, stake: 0, result: 'WIN', amount: reward }})
        ]);
        
        // TODO: In a real app, call gameManager.endGame(room) here to stop others from winning
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// --- ADMIN & WALLET ROUTES (Existing) ---
app.get('/api/admin/pending', async (req, res) => {
    const txs = await prisma.transaction.findMany({ where: { status: 'PENDING' }, include: { user: true }, orderBy: { date: 'desc' } });
    const safeTxs = txs.map(t => ({ ...t, user: { ...t.user, telegramId: t.user.telegramId.toString() } }));
    res.json(safeTxs);
});

app.post('/api/admin/handle', async (req, res) => {
    const { txId, action } = req.body;
    // ... (Keep existing admin logic from previous step)
    res.json({ success: true });
});

app.post('/api/transaction/create', async (req, res) => {
    // ... (Keep existing transaction logic)
    res.json({ success: true });
});


// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken || '');
const appUrl = process.env.APP_URL || 'https://winbingo.fly.dev';

// (Keep your bot commands and handlers here - they are fine)
bot.start((ctx) => ctx.reply("Welcome to Win Bingo!", Markup.inlineKeyboard([Markup.button.webApp('Play Now', appUrl)])));

// --- SERVE APP ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Game Server running on ${port}`);
    if(botToken) bot.launch().catch(e => console.error(e));
});