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
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = path.join(__dirname, '../');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// --- 🧠 STATE MANAGEMENT ---
interface UserState {
  step: 'IDLE' | 'DEPOSIT_AMOUNT' | 'DEPOSIT_CONFIRM' | 'WITHDRAW_AMOUNT' | 'WITHDRAW_PHONE';
  data: any;
}
const userStates = new Map<string, UserState>();

// --- 🛡️ DUPLICATE CHECKER ---
const usedTransactionIds = new Set<string>();

interface TransactionRequest {
  id: string;
  userId: string;
  username: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  phone?: string;
  ref?: string;
  sms?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_VERIFIED';
  date: Date;
}
const pendingTransactions: TransactionRequest[] = [];


// --- 🕵️ AUTOMATED SMS PARSER ---
function verifyPaymentSMS(text: string, expectedAmount: number): { valid: boolean; provider?: string; txId?: string; message?: string } {
  const cleanText = text.toLowerCase().replace(/,/g, ''); 
  let detectedAmount = 0;
  let provider = '';
  let txId = '';

  // 1. Telebirr Patterns
  if (cleanText.includes('telebirr') || cleanText.includes('transferred') || cleanText.includes('paid')) {
    const amountMatch = cleanText.match(/(\d+(\.\d+)?)\s*etb/) || cleanText.match(/etb\s*(\d+(\.\d+)?)/);
    const idMatch = cleanText.match(/trans id:?\s*([a-z0-9]+)/i) || cleanText.match(/transaction id:?\s*([a-z0-9]+)/i);
    
    if (amountMatch) detectedAmount = parseFloat(amountMatch[1] || amountMatch[2]);
    if (idMatch) txId = idMatch[1].toUpperCase();
    provider = 'Telebirr';
  }

  // 2. CBE Patterns
  else if (cleanText.includes('cbe') || cleanText.includes('debited') || cleanText.includes('transfer')) {
    const amountMatch = cleanText.match(/etb\s*(\d+(\.\d+)?)/) || cleanText.match(/(\d+(\.\d+)?)\s*etb/);
    const idMatch = cleanText.match(/ref:?\s*([a-z0-9]+)/i);

    if (amountMatch) detectedAmount = parseFloat(amountMatch[1] || amountMatch[2]);
    if (idMatch) txId = idMatch[1].toUpperCase();
    provider = 'CBE';
  }

  // --- VALIDATION STEPS ---
  if (detectedAmount === 0 || !txId) {
    return { valid: false, message: "Could not find Amount or Transaction ID.\nመጠኑን ወይም የግብይት ቁጥሩን (Transaction ID) ማግኘት አልተቻለም።" };
  }

  if (Math.abs(detectedAmount - expectedAmount) > 1) {
    return { valid: false, message: `Amount mismatch! Found ${detectedAmount}, expected ${expectedAmount}.\nየገንዘብ መጠን ልዩነት አለ! የተገኘው ${detectedAmount}፣ የተጠየቀው ${expectedAmount}።` };
  }

  if (usedTransactionIds.has(txId)) {
    return { valid: false, message: "This Transaction ID has already been used!\nይህ የግብይት ቁጥር (Transaction ID) ከዚህ በፊት ጥቅም ላይ ውሏል!" };
  }

  return { valid: true, provider, txId };
}


// --- 🎮 GAME ENGINE ---
let globalGame = { roomId: 'LIVE-1', calledNumbers: [] as number[], currentCall: null as number | null, status: 'running', nextCallTime: Date.now() + 5000 };
setInterval(() => { /* Game Logic */ }, 5000);

// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken || '');
const appUrl = process.env.APP_URL || 'https://your-app.fly.dev';

async function getOrCreateUser(ctx: Context) {
  if (!ctx.from) return null;
  const telegramId = BigInt(ctx.from.id);
  try {
    return await prisma.user.upsert({
      where: { telegramId },
      update: { username: ctx.from.username, firstName: ctx.from.first_name },
      create: { telegramId, username: ctx.from.username, firstName: ctx.from.first_name }
    });
  } catch (e) { return null; }
}

function generateReference() { return crypto.randomBytes(4).toString('hex').toUpperCase(); }

// --- 👮 ADMIN PANEL API ---
app.get('/api/admin/transactions', (req, res) => {
  if (req.query.auth !== 'admin123') return res.status(403).json({ error: "Unauthorized" });
  res.json(pendingTransactions.filter(t => t.status !== 'REJECTED'));
});

app.post('/api/admin/action', async (req, res) => {
  if (req.body.auth !== 'admin123') return res.status(403).json({ error: "Unauthorized" });
  
  const { id, action } = req.body;
  const tx = pendingTransactions.find(t => t.id === id);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  tx.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tx.userId) } });
  
  // FIX: Added 'as string' cast to fix Type Error
  if (user && action === 'APPROVE' && (tx.status as string) !== 'AUTO_VERIFIED') { 
    if (tx.type === 'DEPOSIT') {
       await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: tx.amount } } });
       bot.telegram.sendMessage(tx.userId, `✅ **Deposit Approved! / ገቢ ተረጋግጧል!**\n\nYour balance has been credited with **${tx.amount} ETB**.\n**${tx.amount} ብር** ወደ ሂሳብዎ ገብቷል።`, {parse_mode: 'Markdown'});
    } else {
       bot.telegram.sendMessage(tx.userId, `✅ **Withdrawal Approved! / ወጪ ተፈቅዷል!**\n\nWe have sent the money to your phone.\nገንዘቡ ወደ ስልክ ቁጥርዎ ተልኳል።`, {parse_mode: 'Markdown'});
    }
  } else if (user && action === 'REJECT') {
      bot.telegram.sendMessage(tx.userId, `❌ **Transaction Rejected / ተቀባይነት አላገኘም**\n\nPlease contact support if you think this is a mistake.\nይህ ስህተት ነው ብለው ካሰቡ እባክዎ እርዳታ (Support) ያናግሩ።`, {parse_mode: 'Markdown'});
  }
  res.json({ success: true });
});

// --- 🤖 BOT HANDLERS ---
const dashboardMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('Play / ይጫወቱ 🎮', appUrl), Markup.button.callback('Register / ይመዝገቡ 📝', 'register_check')],
  [Markup.button.callback('Check Balance / ሂሳብ 💰', 'balance'), Markup.button.callback('Deposit / ገቢ 💵', 'deposit_start')],
  [Markup.button.callback('Withdraw / ወጪ 🏦', 'withdraw_start')],
  [Markup.button.callback('Support / እርዳታ 📞', 'support'), Markup.button.callback('Instruction / መመሪያ 📖', 'instruction')],
]);
const cancelKeyboard = Markup.keyboard([['❌ Cancel / ሰርዝ']]).resize();

bot.start(async (ctx) => {
    try { await ctx.setChatMenuButton({ type: 'commands' }); } catch (e) {}
    const user = await getOrCreateUser(ctx);
    if (!user || !user.isRegistered) return ctx.reply("👋 Welcome! Please register first.\nእንኳን ደህና መጡ! እባክዎ መጀመሪያ ይመዝገቡ።", Markup.keyboard([[Markup.button.contactRequest('📱 Share Contact / ስልክ ቁጥር ያጋሩ')]]).resize().oneTime());
    ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 Win Bingo Menu", ...dashboardMenu });
});
bot.on('contact', async (ctx) => { 
    const user = await getOrCreateUser(ctx);
    if (user) {
        await prisma.user.update({ where: { telegramId: user.telegramId }, data: { isRegistered: true, phoneNumber: ctx.message.contact.phone_number } });
        ctx.reply("✅ **Registered Successfully! / ምዝገባው ተሳክቷል!**", Markup.removeKeyboard());
        ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 Menu", ...dashboardMenu });
    }
});

// DEPOSIT FLOW
bot.action('deposit_start', (ctx) => {
  ctx.reply("👇 **Choose Method / አማራጭ ይምረጡ:**", Markup.inlineKeyboard([[Markup.button.callback('Manual (Telebirr/CBE) 🏦', 'dep_manual')]]));
});
bot.action('dep_manual', (ctx) => {
  if (!ctx.from) return;
  userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: {} });
  ctx.reply("💵 **Enter Deposit Amount (ETB):**\nማስገባት የሚፈልጉትን የገንዘብ መጠን ይጻፉ:", cancelKeyboard);
});

// WITHDRAW FLOW
bot.action('withdraw_start', (ctx) => {
  if (!ctx.from) return;
  userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
  ctx.reply("🏦 **Enter Withdrawal Amount (ETB):**\nሊያወጡት የሚፈልጉትን መጠን ያስገቡ:", cancelKeyboard);
});

// TEXT HANDLER
bot.on('text', async (ctx) => {
  if (!ctx.from) return;
  const uid = ctx.from.id.toString();
  const text = ctx.message.text;
  const state = userStates.get(uid);

  if (text.includes('Cancel') || text.includes('ሰርዝ')) { 
      userStates.delete(uid); 
      return ctx.reply("❌ **Cancelled / ተሰርዟል**", Markup.removeKeyboard()).then(() => ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 Menu", ...dashboardMenu })); 
  }

  if (!state) return;

  // --- 1. ASK FOR AMOUNT & INSTRUCT ---
  if (state.step === 'DEPOSIT_AMOUNT') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 5) return ctx.reply("❌ Invalid Amount. Minimum is 5 ETB.\nትክክለኛ ቁጥር ያስገቡ። ቢያንስ 5 ብር።");
    
    const ref = generateReference();
    userStates.set(uid, { step: 'DEPOSIT_CONFIRM', data: { amount, ref } });

    ctx.reply(
`**Deposit Request / የገቢ ጥያቄ**
Amount: **${amount} ETB**

1. Transfer **${amount} ETB** to **0924497619**.
   ወደ **0924497619** **${amount} ብር** ያስተላልፉ።

2. **Copy the full SMS** message you receive from Telebirr/CBE.
   ከቴሌብር ወይም ንግድ ባንክ የሚደርስዎትን **ሙሉ የጽሑፍ መልእክት (SMS)** ኮፒ ያድርጉ።

3. **Paste it here** to verify instantly! 👇
   ወዲያውኑ ለማረጋገጥ መልእክቱን እዚህ ይለጥፉ (Paste)! 👇`, 
    {parse_mode: 'Markdown'});
  }

  // --- 2. VERIFY SMS ---
  else if (state.step === 'DEPOSIT_CONFIRM') {
    const requestedAmount = state.data.amount;
    const verification = verifyPaymentSMS(text, requestedAmount);

    if (verification.valid) {
        // SUCCESS
        if(verification.txId) usedTransactionIds.add(verification.txId);

        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
        if(user) await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: requestedAmount } } });

        pendingTransactions.push({
            id: generateReference(),
            userId: uid,
            username: ctx.from.username || 'Unknown',
            type: 'DEPOSIT',
            amount: requestedAmount,
            ref: state.data.ref,
            sms: text,
            status: 'AUTO_VERIFIED',
            date: new Date()
        });

        ctx.reply(`✅ **Payment Verified! / ክፍያ ተረጋግጧል!**\n\n**${requestedAmount} ETB** has been added to your wallet automatically.\n**${requestedAmount} ብር** ወደ ኪስ ቦርሳዎ በራስ-ሰር ገብቷል።\n\nTransaction ID: \`${verification.txId}\``, {parse_mode: 'Markdown', ...Markup.removeKeyboard()});
        
        userStates.delete(uid);
        setTimeout(() => ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 Menu", ...dashboardMenu }), 1500);

    } else {
        // FAILURE
        pendingTransactions.push({
            id: generateReference(),
            userId: uid,
            username: ctx.from.username || 'Unknown',
            type: 'DEPOSIT',
            amount: requestedAmount,
            ref: state.data.ref,
            sms: text,
            status: 'PENDING',
            date: new Date()
        });

        ctx.reply(`⚠️ **Auto-Verification Failed / በራስ-ሰር ማረጋገጥ አልተቻለም**\n\n${verification.message}\n\nDon't worry! We have sent your request to the Admin for manual approval.\nWait for confirmation.\n\nአይጨነቁ! ጥያቄዎ ለሰው (Admin) ተልኳል፤ በትዕግስት ይጠብቁ።`, Markup.removeKeyboard());
        userStates.delete(uid);
    }
  }

  // --- WITHDRAW LOGIC ---
  else if (state.step === 'WITHDRAW_AMOUNT') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid Amount.");
    
    userStates.set(uid, { step: 'WITHDRAW_PHONE', data: { amount } });
    ctx.reply("📞 **Enter Phone Number:**\nገንዘብዎ የሚላክበትን ስልክ ቁጥር ያስገቡ:", cancelKeyboard);
  }
  else if (state.step === 'WITHDRAW_PHONE') {
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
    ctx.reply("✅ **Withdrawal Requested! / ወጪ ተጠይቋል!**\n\nWe will process it shortly.\nበቅርቡ እናስተናግዳለን።", Markup.removeKeyboard());
    userStates.delete(uid);
    setTimeout(() => ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, { caption: "🏆 Menu", ...dashboardMenu }), 1500);
  }
});

// --- SERVER SETUP ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../admin.html')));
app.get('/api/game/sync', (req, res) => res.json(globalGame));
app.get('/api/user', async (req, res) => { 
  const tid = req.query.id as string;
  if (!tid) return res.status(400).json({ error: "No ID" });
  try {
      const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
      user ? res.json({ ...user, telegramId: user.telegramId.toString() }) : res.status(404).json({ error: "Not found" });
  } catch (e) { res.status(500).json({ error: "Server Error" }); }
});
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    if (botToken) bot.launch().catch(e => console.error("Bot failed:", e));
});

process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });