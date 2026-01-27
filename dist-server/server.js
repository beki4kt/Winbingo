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
import crypto from 'crypto';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = path.join(__dirname, '../');
const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8080;
app.use(express.json()); // Enable JSON body parsing for Admin API
app.use(cors());
const userStates = new Map();
// --- 🎮 GAME ENGINE ---
// ... (Game engine logic remains the same, keeping it concise for this snippet) ...
let globalGame = { roomId: 'LIVE-1', calledNumbers: [], currentCall: null, status: 'running', nextCallTime: Date.now() + 5000 };
setInterval(() => { }, 5000); // (Simplified for readability)
// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN;
if (!botToken)
    console.error("❌ BOT_TOKEN is missing!");
const bot = new Telegraf(botToken || '');
const appUrl = process.env.APP_URL || 'https://your-app.fly.dev';
async function getOrCreateUser(ctx) {
    if (!ctx.from)
        return null;
    const telegramId = BigInt(ctx.from.id);
    try {
        return await prisma.user.upsert({
            where: { telegramId },
            update: { username: ctx.from.username, firstName: ctx.from.first_name },
            create: { telegramId, username: ctx.from.username, firstName: ctx.from.first_name }
        });
    }
    catch (e) {
        return null;
    }
}
function generateReference() { return crypto.randomBytes(4).toString('hex').toUpperCase(); }
const pendingTransactions = [];
// API: Get All Pending
app.get('/api/admin/transactions', (req, res) => {
    // Simple Password Check (Add ?auth=admin123 to URL)
    if (req.query.auth !== 'admin123')
        return res.status(403).json({ error: "Unauthorized" });
    res.json(pendingTransactions.filter(t => t.status === 'PENDING'));
});
// API: Approve/Reject
app.post('/api/admin/action', async (req, res) => {
    if (req.body.auth !== 'admin123')
        return res.status(403).json({ error: "Unauthorized" });
    const { id, action } = req.body;
    const tx = pendingTransactions.find(t => t.id === id);
    if (!tx)
        return res.status(404).json({ error: "Transaction not found" });
    tx.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tx.userId) } });
    if (user) {
        try {
            if (action === 'APPROVE') {
                // Update Balance
                if (tx.type === 'DEPOSIT') {
                    await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: tx.amount } } });
                    bot.telegram.sendMessage(tx.userId, `✅ **Deposit Approved!**\n\nYour balance has been credited with ${tx.amount} ETB.`, { parse_mode: 'Markdown' });
                }
                else {
                    // Withdrawal balance was already deducted (optionally), or deduc NOW if you prefer.
                    // For safety, usually deduct immediately upon request, or lock funds. 
                    // Here assuming we deduct now:
                    await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: tx.amount } } });
                    bot.telegram.sendMessage(tx.userId, `✅ **Withdrawal Processed!**\n\nWe have sent ${tx.amount} ETB to ${tx.phone}.`, { parse_mode: 'Markdown' });
                }
            }
            else {
                // Reject
                bot.telegram.sendMessage(tx.userId, `❌ **Transaction Rejected**\n\nYour ${tx.type.toLowerCase()} request for ${tx.amount} ETB was rejected. Contact support.`, { parse_mode: 'Markdown' });
            }
        }
        catch (e) {
            console.error("Transact Error", e);
        }
    }
    res.json({ success: true });
});
// --- 🤖 BOT HANDLERS (Updated to push to Admin List) ---
const dashboardMenu = Markup.inlineKeyboard([
    [Markup.button.webApp('Play / ይጫወቱ 🎮', appUrl), Markup.button.callback('Register / ይመዝገቡ 📝', 'register_check')],
    [Markup.button.callback('Check Balance / ሂሳብ 💰', 'balance'), Markup.button.callback('Deposit / ገቢ 💵', 'deposit_start')],
    [Markup.button.callback('Withdraw / ወጪ 🏦', 'withdraw_start')],
    [Markup.button.callback('Support / እርዳታ 📞', 'support'), Markup.button.callback('Instruction / መመሪያ 📖', 'instruction')],
]);
const cancelKeyboard = Markup.keyboard([['❌ Cancel / ሰርዝ']]).resize();
// ... (Start, Contact, Menu handlers same as before) ...
bot.start(async (ctx) => {
    try {
        await ctx.setChatMenuButton({ type: 'commands' });
    }
    catch (e) { }
    const user = await getOrCreateUser(ctx);
    if (!user || !user.isRegistered)
        return ctx.reply("Please register first.", Markup.keyboard([[Markup.button.contactRequest('📱 Share Contact')]]).resize().oneTime());
    ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 Win Bingo Menu", ...dashboardMenu });
});
bot.on('contact', async (ctx) => { });
// --- DEPOSIT FLOW ---
bot.action('deposit_start', (ctx) => {
    ctx.reply("Choose Method:", Markup.inlineKeyboard([[Markup.button.callback('Manual (Telebirr/CBE)', 'dep_manual')]]));
});
bot.action('dep_manual', (ctx) => {
    if (!ctx.from)
        return;
    userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: {} });
    ctx.reply("Enter Amount (ETB):", cancelKeyboard);
});
// --- WITHDRAW FLOW ---
bot.action('withdraw_start', (ctx) => {
    if (!ctx.from)
        return;
    userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
    ctx.reply("Enter Amount to Withdraw:", cancelKeyboard);
});
// --- TEXT HANDLER ---
bot.on('text', async (ctx) => {
    if (!ctx.from)
        return;
    const uid = ctx.from.id.toString();
    const text = ctx.message.text;
    const state = userStates.get(uid);
    if (text.includes('Cancel')) {
        userStates.delete(uid);
        return ctx.reply("Cancelled", Markup.removeKeyboard());
    }
    if (!state)
        return;
    // DEPOSIT STEPS
    if (state.step === 'DEPOSIT_AMOUNT') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 5)
            return ctx.reply("Invalid Amount.");
        const ref = generateReference();
        userStates.set(uid, { step: 'DEPOSIT_CONFIRM', data: { amount, ref } });
        // Show Instructions
        ctx.reply(`**Deposit Request**\nAmount: ${amount}\nRef: ${ref}\n\n1. Transfer ${amount} to 0924497619\n2. **Paste the SMS here** to confirm.`, { parse_mode: 'Markdown' });
    }
    else if (state.step === 'DEPOSIT_CONFIRM') {
        // SAVE TO PENDING LIST
        pendingTransactions.push({
            id: generateReference(),
            userId: uid,
            username: ctx.from.username || 'Unknown',
            type: 'DEPOSIT',
            amount: state.data.amount,
            ref: state.data.ref,
            sms: text, // The user pasted SMS
            status: 'PENDING',
            date: new Date()
        });
        ctx.reply("✅ **Request Sent to Admin!**\nWait for approval.", Markup.removeKeyboard());
        userStates.delete(uid);
    }
    // WITHDRAW STEPS
    else if (state.step === 'WITHDRAW_AMOUNT') {
        const amount = parseFloat(text);
        userStates.set(uid, { step: 'WITHDRAW_PHONE', data: { amount } });
        ctx.reply("Enter Phone Number:", cancelKeyboard);
    }
    else if (state.step === 'WITHDRAW_PHONE') {
        // SAVE TO PENDING LIST
        pendingTransactions.push({
            id: generateReference(),
            userId: uid,
            username: ctx.from.username || 'Unknown',
            type: 'WITHDRAW',
            amount: state.data.amount,
            phone: text,
            status: 'PENDING',
            date: new Date()
        });
        ctx.reply("✅ **Withdrawal Requested!**\nWait for approval.", Markup.removeKeyboard());
        userStates.delete(uid);
    }
});
// --- SERVER SETUP ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
// ADMIN PANEL ROUTE (Serve the HTML file)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin.html'));
});
// Existing APIs
app.get('/api/game/sync', (req, res) => res.json(globalGame));
app.get('/api/user', async (req, res) => { });
bot.launch();
app.listen(port, () => console.log(`🚀 Server running on ${port}`));
