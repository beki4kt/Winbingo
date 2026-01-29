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
  step: 'IDLE' 
      | 'DEPOSIT_AMOUNT' | 'DEPOSIT_CONFIRM' 
      | 'WITHDRAW_AMOUNT' | 'WITHDRAW_BANK' | 'WITHDRAW_NAME' | 'WITHDRAW_ACCOUNT' | 'WITHDRAW_CONFIRM';
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
  phone?: string; // Used for account number
  bankName?: string;
  accountName?: string;
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

  if (cleanText.includes('telebirr') || cleanText.includes('transferred') || cleanText.includes('paid')) {
    const amountMatch = cleanText.match(/(\d+(\.\d+)?)\s*etb/) || cleanText.match(/etb\s*(\d+(\.\d+)?)/);
    const idMatch = cleanText.match(/trans id:?\s*([a-z0-9]+)/i) || cleanText.match(/transaction id:?\s*([a-z0-9]+)/i);
    
    if (amountMatch) detectedAmount = parseFloat(amountMatch[1] || amountMatch[2]);
    if (idMatch) txId = idMatch[1].toUpperCase();
    provider = 'Telebirr';
  }
  else if (cleanText.includes('cbe') || cleanText.includes('debited') || cleanText.includes('transfer')) {
    const amountMatch = cleanText.match(/etb\s*(\d+(\.\d+)?)/) || cleanText.match(/(\d+(\.\d+)?)\s*etb/);
    const idMatch = cleanText.match(/ref:?\s*([a-z0-9]+)/i);

    if (amountMatch) detectedAmount = parseFloat(amountMatch[1] || amountMatch[2]);
    if (idMatch) txId = idMatch[1].toUpperCase();
    provider = 'CBE';
  }

  if (detectedAmount === 0 || !txId) {
    return { valid: false, message: "❌ Could not find Amount or Transaction ID.\nመጠኑን ወይም የግብይት ቁጥሩን (Transaction ID) ማግኘት አልተቻለም።" };
  }

  if (Math.abs(detectedAmount - expectedAmount) > 1) {
    return { valid: false, message: `❌ Amount mismatch! Found ${detectedAmount}, expected ${expectedAmount}.\nየገንዘብ መጠን ልዩነት አለ! የተገኘው ${detectedAmount}፣ የተጠየቀው ${expectedAmount}።` };
  }

  if (usedTransactionIds.has(txId)) {
    return { valid: false, message: "❌ This Transaction ID has already been used!\nይህ የግብይት ቁጥር (Transaction ID) ከዚህ በፊት ጥቅም ላይ ውሏል!" };
  }

  return { valid: true, provider, txId };
}


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

function generateReference() { return crypto.randomBytes(5).toString('hex').toUpperCase(); }

// --- 👮 ADMIN API ---
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
  
  if (user && action === 'APPROVE' && (tx.status as string) !== 'AUTO_VERIFIED') { 
    if (tx.type === 'DEPOSIT') {
       await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: tx.amount } } });
       bot.telegram.sendMessage(tx.userId, `✅ **Deposit Approved!**\n\nYour balance has been credited with **${tx.amount} ETB**.`, {parse_mode: 'Markdown'});
    } else {
       // For Withdrawals, we assume balance was deducted at request time or now.
       // Let's deduct now to be safe if not done earlier.
       await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: tx.amount } } });
       bot.telegram.sendMessage(tx.userId, `✅ **Withdrawal Sent!**\n\nWe have sent ${tx.amount} ETB to your ${tx.bankName} account.`, {parse_mode: 'Markdown'});
    }
  } else if (user && action === 'REJECT') {
      bot.telegram.sendMessage(tx.userId, `❌ **Transaction Rejected**\n\nContact support if you believe this is an error.`, {parse_mode: 'Markdown'});
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

async function sendDashboard(ctx: any) {
  try {
    await ctx.replyWithPhoto(
      { source: path.join(rootPath, 'win.png') }, 
      {
        caption: "🏆 **Welcome to Win Bingo!**\n\nChoose an option below:\nከታች ካሉት አማራጮች ይምረጡ፡",
        parse_mode: 'Markdown',
        ...dashboardMenu
      }
    );
  } catch (e) {
    ctx.reply("🏆 **Welcome to Win Bingo!**", dashboardMenu);
  }
}

bot.start(async (ctx) => {
    try { await ctx.setChatMenuButton({ type: 'commands' }); } catch (e) {}
    const user = await getOrCreateUser(ctx);
    if (!user || !user.isRegistered) return ctx.reply("👋 Welcome! Please register first.\nእንኳን ደህና መጡ! እባክዎ መጀመሪያ ይመዝገቡ።", Markup.keyboard([[Markup.button.contactRequest('📱 Share Contact / ስልክ ቁጥር ያጋሩ')]]).resize().oneTime());
    sendDashboard(ctx);
});

bot.action('register_check', (ctx) => {
    ctx.reply("✅ **እርስዎ አስቀድመው ተመዝግበዋል!**\n(You are already registered!)", { parse_mode: 'Markdown' });
});

bot.on('contact', async (ctx) => { 
    const user = await getOrCreateUser(ctx);
    if (user) {
        await prisma.user.update({ where: { telegramId: user.telegramId }, data: { isRegistered: true, phoneNumber: ctx.message.contact.phone_number } });
        ctx.reply("✅ **Registered Successfully!**", Markup.removeKeyboard());
        sendDashboard(ctx);
    }
});


// ==========================================
// 💰 DEPOSIT FLOW
// ==========================================
bot.action('deposit_start', (ctx) => {
  ctx.reply("Choose Your Preferred Deposit Method", Markup.inlineKeyboard([
      [Markup.button.callback('Telegram Star ⭐️', 'dep_stars')],
      [Markup.button.callback('Manual 🏦', 'dep_manual')]
  ]));
});

bot.action('dep_manual', (ctx) => {
  if (!ctx.from) return;
  userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: {} });
  ctx.reply("እንዲሞላልዎት የሚፈልጉትን የገንዘብ መጠን ያስገቡ:", cancelKeyboard);
});


// ==========================================
// 🏦 WITHDRAW FLOW (Matches 114.jpg)
// ==========================================
bot.action('withdraw_start', (ctx) => {
  if (!ctx.from) return;
  userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
  ctx.reply("Please send the amount to withdraw:\nሊያወጡት የሚፈልጉትን መጠን ያስገቡ:", cancelKeyboard);
});


// ==========================================
// 📩 MAIN TEXT HANDLER
// ==========================================
bot.on('text', async (ctx) => {
  if (!ctx.from) return;
  const uid = ctx.from.id.toString();
  const text = ctx.message.text;
  const state = userStates.get(uid);

  // CANCEL BUTTON
  if (text.includes('Cancel') || text.includes('ሰርዝ')) { 
      userStates.delete(uid); 
      return ctx.reply("❌ Cancelled.", Markup.removeKeyboard()).then(() => sendDashboard(ctx)); 
  }

  if (!state) return;

  // ------------------------------------------------
  // 1. DEPOSIT LOGIC
  // ------------------------------------------------
  if (state.step === 'DEPOSIT_AMOUNT') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 5) return ctx.reply("❌ Invalid Amount (Min 5).");
    
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
    const ref = generateReference();
    userStates.set(uid, { step: 'DEPOSIT_CONFIRM', data: { amount, ref } });

    // Payment Details Card (Matches 23.jpg)
    await ctx.reply(
`**Payment details**
\`\`\`
Name:      ${user?.firstName || 'User'}
Phone:     ${user?.phoneNumber || 'N/A'}
Amount:    ${amount} ETB
reference: ${ref}
\`\`\`
ብር ማስገባት የምችሉት ከታች ባሉት አማራጮች ብቻ ነው
1. ከቴሌብር ወደ ኤጀንት ቴሌብር ብቻ
2. ከንግድ ባንክ ወደ ኤጀንት ንግድ ባንክ ብቻ
`, {parse_mode: 'Markdown'});

    // Instructions (Matches 113.jpg)
    await ctx.reply(
`**Pay from telebirr to telebirr only**

የቴሌብር አካውንት
\`0924497619\`

1. ከላይ ባለው የቴሌብር አካውንት **${amount} ብር** ያስገቡ

2. የምትልኩት የገንዘብ መጠን እና እዚህ ላይ እንዲሞላልዎ የምታስገቡት የብር መጠን ተመሳሳይ መሆኑን እርግጠኛ ይሁኑ

3. ብሩን ስትልኩ የከፈላችሁበትን መረጃ የያዘ አጭር የጽሁፍ መልእክት (sms) ከቴሌብር ይደርሳችኋል

4. የደረሳችሁን አጭር የጽሁፍ መልእክት (sms) ሙሉውን ኮፒ (copy) በማድረግ ከታች ባለው የቴሌግራም የጽሁፍ ማስገቢያው ላይ ፔስት (paste) በማድረግ ይላኩት

ማሳሰቢያ: ዲፖዚት ባረጋገጡ ቁጥር በቂ የሚያገናኛቹ ኤጀንቶች ስለሚለያዩ ከላይ ወደሚሰጠቹ የቴሌብር አካውንት ብቻ ብር መላካችሁን እርግጠኛ ይሁኑ።`, 
    {parse_mode: 'Markdown'});
  }

  else if (state.step === 'DEPOSIT_CONFIRM') {
    // SMS Verification
    const verification = verifyPaymentSMS(text, state.data.amount);
    
    if (verification.valid) {
         if(verification.txId) usedTransactionIds.add(verification.txId);
         const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
         if(user) await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: state.data.amount } } });
         
         pendingTransactions.push({
            id: generateReference(), userId: uid, username: ctx.from.username || 'Unknown',
            type: 'DEPOSIT', amount: state.data.amount, ref: state.data.ref, sms: text,
            status: 'AUTO_VERIFIED', date: new Date()
         });

         ctx.reply(`✅ **Deposit Successful!**\n\nYour wallet has been credited with ${state.data.amount} ETB.`, Markup.removeKeyboard());
         userStates.delete(uid);
         setTimeout(() => sendDashboard(ctx), 1500);
    } else {
         // Failed auto-verify -> Pending
         pendingTransactions.push({
            id: generateReference(), userId: uid, username: ctx.from.username || 'Unknown',
            type: 'DEPOSIT', amount: state.data.amount, ref: state.data.ref, sms: text,
            status: 'PENDING', date: new Date()
         });
         ctx.reply(`⚠️ **Verification Pending**\n\n${verification.message}\nRequest sent to admin.`, Markup.removeKeyboard());
         userStates.delete(uid);
    }
  }


  // ------------------------------------------------
  // 2. WITHDRAW LOGIC (Matches 114.jpg)
  // ------------------------------------------------
  else if (state.step === 'WITHDRAW_AMOUNT') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid Amount.");
    
    // Save amount, ask for Bank
    userStates.set(uid, { step: 'WITHDRAW_BANK', data: { amount } });
    
    // Bank Buttons (Matches 114.jpg)
    ctx.reply("Please select a bank to withdraw your money", 
        Markup.keyboard([
            ['Telebirr'],
            ['Bank of Abyssinia', 'Awash Bank'],
            ['Dashin Bank']
        ]).resize()
    );
  }

  else if (state.step === 'WITHDRAW_BANK') {
      const bank = text;
      // Update state with Bank Name, Ask for Name
      const currentData = userStates.get(uid)?.data;
      userStates.set(uid, { step: 'WITHDRAW_NAME', data: { ...currentData, bank } });
      
      ctx.reply(`Please send the account holder's name for ${bank}:`, cancelKeyboard);
  }

  else if (state.step === 'WITHDRAW_NAME') {
      const name = text;
      const currentData = userStates.get(uid)?.data;
      userStates.set(uid, { step: 'WITHDRAW_ACCOUNT', data: { ...currentData, name } });
      
      ctx.reply(`Please send the account number for ${currentData.bank}:`, cancelKeyboard);
  }

  else if (state.step === 'WITHDRAW_ACCOUNT') {
      const accNum = text;
      const d = userStates.get(uid)?.data;
      // Update state, ready to confirm
      userStates.set(uid, { step: 'WITHDRAW_CONFIRM', data: { ...d, accNum } });

      // Confirmation Card (Matches 111.jpg)
      ctx.reply(
`Please confirm withdrawal
\`\`\`
Bank:           ${d.bank}
Account Name:   ${d.name}
Account Number: ${accNum}
Amount:         ${d.amount} ETB
\`\`\``, 
      Markup.inlineKeyboard([
          [Markup.button.callback('✅ Confirm', 'withdraw_yes'), Markup.button.callback('❌ Cancel', 'withdraw_no')]
      ]));
  }
});

// --- WITHDRAW ACTIONS ---
bot.action('withdraw_yes', async (ctx) => {
    if(!ctx.from) return;
    const uid = ctx.from.id.toString();
    const state = userStates.get(uid);
    if (!state || state.step !== 'WITHDRAW_CONFIRM') return ctx.reply("Session expired.");

    const d = state.data;
    const ref = generateReference();
    
    pendingTransactions.push({
      id: ref,
      userId: uid,
      username: ctx.from.username || 'Unknown',
      type: 'WITHDRAW',
      amount: d.amount,
      bankName: d.bank,
      accountName: d.name,
      phone: d.accNum, // Using phone field for Account Number
      status: 'PENDING',
      date: new Date()
    });

    // Success Message (Matches 111.jpg)
    await ctx.reply(
`Withdrawal request successful
\`\`\`
Bank:           ${d.bank}
Account Name:   ${d.name}
Account Number: ${d.accNum}
Amount:         ${d.amount} ETB
reference:      ${ref}
\`\`\``, {parse_mode: 'Markdown'});

    userStates.delete(uid);
    sendDashboard(ctx);
});

bot.action('withdraw_no', (ctx) => {
    if(!ctx.from) return;
    userStates.delete(ctx.from.id.toString());
    ctx.reply("❌ Withdrawal Cancelled.");
    sendDashboard(ctx);
});


// --- SERVER LAUNCH ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../admin.html')));
app.get('/api/game/sync', (req, res) => res.json({})); // Placeholder for game sync
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    if (botToken) bot.launch().catch(e => console.error("Bot failed:", e));
});

process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });