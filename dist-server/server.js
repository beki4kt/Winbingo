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
    calledNumbers: [],
    currentCall: null,
    status: 'running',
};
setInterval(() => {
    if (globalGame.calledNumbers.length >= 75) {
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
}, 4000);
// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    console.error("❌ BOT_TOKEN missing!");
    process.exit(1);
}
const bot = new Telegraf(botToken);
const appUrl = process.env.APP_URL || 'https://winbingo.fly.dev';
// 1. 📋 THE COMMANDS (Blue Menu Button)
const commands = [
    { command: 'menu', description: '🏠 Main Menu' },
    { command: 'play', description: '🎮 Play Game' },
    { command: 'deposit', description: '➕ Deposit Funds' },
    { command: 'withdraw', description: '➖ Withdraw Funds' },
    { command: 'balance', description: '💰 Check Balance' },
    { command: 'help', description: '❓ Support' }
];
// 2. 🎛️ THE INLINE DASHBOARD (Visual Menu)
const dashboardMenu = Markup.inlineKeyboard([
    [Markup.button.webApp('Play Now 🎮', appUrl)],
    [Markup.button.callback('Deposit ➕', 'deposit_start'), Markup.button.callback('Withdraw ➖', 'withdraw_start')],
    [Markup.button.callback('Transfer 💸', 'transfer_start'), Markup.button.callback('Balance 💰', 'balance')],
    [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('Guide 📖', 'instruction')]
]);
const cancelKeyboard = Markup.keyboard([['❌ Cancel']]).resize();
// --- 🧠 SIMPLE STATE MANAGEMENT ---
const userStates = new Map();
// --- 🤖 BOT HANDLERS ---
// START & DEEP LINK HANDLER
bot.start(async (ctx) => {
    try {
        await ctx.setChatMenuButton({ type: 'commands' });
    }
    catch (e) { }
    // Register User
    if (ctx.from) {
        await prisma.user.upsert({
            where: { telegramId: BigInt(ctx.from.id) },
            update: { username: ctx.from.username, firstName: ctx.from.first_name },
            create: { telegramId: BigInt(ctx.from.id), username: ctx.from.username, firstName: ctx.from.first_name, isRegistered: true }
        });
    }
    // CHECK FOR DEEP LINK PARAMETERS (e.g., /start deposit)
    const payload = ctx.payload; // This gets "deposit" or "withdraw"
    if (payload === 'deposit') {
        return triggerDeposit(ctx);
    }
    else if (payload === 'withdraw') {
        return triggerWithdraw(ctx);
    }
    // Default Welcome
    ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 **Welcome to Win Bingo!**\n\nChoose an option below:", parse_mode: 'Markdown', ...dashboardMenu });
});
// COMMANDS
bot.command('menu', (ctx) => ctx.reply("🏆 **Main Menu**", dashboardMenu));
bot.command('play', (ctx) => ctx.reply("🎮 Click below to play!", Markup.inlineKeyboard([[Markup.button.webApp('Play Now', appUrl)]])));
bot.command('balance', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
    ctx.reply(`💰 **Wallet:** ${user?.balance.toFixed(2)} ETB\n🪙 **Coins:** ${user?.coins}`);
});
bot.command('deposit', (ctx) => triggerDeposit(ctx));
bot.command('withdraw', (ctx) => triggerWithdraw(ctx));
bot.command('help', (ctx) => ctx.reply("📞 Contact Support: @AddisSupport"));
// --- 💰 DEPOSIT LOGIC ---
function triggerDeposit(ctx) {
    userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: {} });
    ctx.reply("💵 **Deposit Funds**\n\nPlease enter the amount you want to deposit (ETB):", cancelKeyboard);
}
bot.action('deposit_start', (ctx) => triggerDeposit(ctx));
// --- 🏦 WITHDRAW LOGIC ---
function triggerWithdraw(ctx) {
    userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
    ctx.reply("🏦 **Withdraw Funds**\n\nPlease enter the amount to withdraw (ETB):", cancelKeyboard);
}
bot.action('withdraw_start', (ctx) => triggerWithdraw(ctx));
// --- 📩 TEXT HANDLER (State Machine) ---
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
    // 1. DEPOSIT FLOW
    if (state.step === 'DEPOSIT_AMOUNT') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 5)
            return ctx.reply("❌ Invalid Amount. Minimum is 5 ETB.");
        ctx.reply(`**Payment Instructions**
1. Transfer **${amount} ETB** to Telebirr: \`0924497619\`
2. Copy the SMS confirmation.
3. Paste the SMS here.`, { parse_mode: 'Markdown' });
        userStates.set(uid, { step: 'DEPOSIT_CONFIRM', data: { amount } });
    }
    else if (state.step === 'DEPOSIT_CONFIRM') {
        // (Simplified logic for now - assume success for demo, in prod use real verification)
        const amount = state.data.amount;
        await prisma.user.update({ where: { telegramId: BigInt(uid) }, data: { balance: { increment: amount } } });
        ctx.reply(`✅ **Deposit Successful!**\n\n+${amount} ETB added.`, Markup.removeKeyboard());
        userStates.delete(uid);
        ctx.reply("Main Menu", dashboardMenu);
    }
    // 2. WITHDRAW FLOW
    else if (state.step === 'WITHDRAW_AMOUNT') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0)
            return ctx.reply("❌ Invalid Amount.");
        userStates.set(uid, { step: 'WITHDRAW_BANK', data: { amount } });
        ctx.reply("Choose Bank:", Markup.keyboard([['Telebirr', 'CBE'], ['❌ Cancel']]).resize());
    }
    else if (state.step === 'WITHDRAW_BANK') {
        userStates.set(uid, { step: 'WITHDRAW_PHONE', data: { ...state.data, bank: text } });
        ctx.reply("Enter Account/Phone Number:", Markup.removeKeyboard()); // Allow typing now
    }
    else if (state.step === 'WITHDRAW_PHONE') {
        ctx.reply(`✅ **Withdrawal Requested!**\n\n${state.data.amount} ETB to ${state.data.bank} (${text})`, Markup.removeKeyboard());
        userStates.delete(uid);
        ctx.reply("Main Menu", dashboardMenu);
    }
});
// --- API ROUTES (Keep your existing API routes here) ---
app.get('/api/user/:tid', async (req, res) => { });
app.post('/api/game/buy-ticket', async (req, res) => { });
// ... etc
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    bot.telegram.setMyCommands(commands);
    bot.launch().catch(e => console.error("Bot failed:", e));
});
process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });
