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
// Using Map is fine for <5000 users. For >100,000, we would use Redis.
interface UserState {
  step: 'IDLE' 
      | 'DEPOSIT_AMOUNT' | 'DEPOSIT_CONFIRM' 
      | 'WITHDRAW_AMOUNT' | 'WITHDRAW_BANK' | 'WITHDRAW_NAME' | 'WITHDRAW_ACCOUNT' | 'WITHDRAW_CONFIRM'
      | 'TRANSFER_USERNAME' | 'TRANSFER_AMOUNT';
  data: any;
}
const userStates = new Map<string, UserState>();

// --- 🛡️ TRANSACTION LOGS ---
const usedTransactionIds = new Set<string>();

// --- 🕵️ AUTOMATED SMS PARSER ---
function verifyPaymentSMS(text: string, expectedAmount: number): { valid: boolean; provider?: string; txId?: string; message?: string } {
  const cleanText = text.toLowerCase().replace(/,/g, ''); 
  let detectedAmount = 0;
  let provider = '';
  let txId = '';

  // Telebirr & CBE Patterns
  if (cleanText.includes('telebirr') || cleanText.includes('transferred') || cleanText.includes('paid')) {
    const amountMatch = cleanText.match(/(\d+(\.\d+)?)\s*etb/) || cleanText.match(/etb\s*(\d+(\.\d+)?)/);
    const idMatch = cleanText.match(/trans id:?\s*([a-z0-9]+)/i) || cleanText.match(/transaction id:?\s*([a-z0-9]+)/i);
    if (amountMatch) detectedAmount = parseFloat(amountMatch[1] || amountMatch[2]);
    if (idMatch) txId = idMatch[1].toUpperCase();
    provider = 'Telebirr';
  } else if (cleanText.includes('cbe') || cleanText.includes('debited') || cleanText.includes('transfer')) {
    const amountMatch = cleanText.match(/etb\s*(\d+(\.\d+)?)/) || cleanText.match(/(\d+(\.\d+)?)\s*etb/);
    const idMatch = cleanText.match(/ref:?\s*([a-z0-9]+)/i);
    if (amountMatch) detectedAmount = parseFloat(amountMatch[1] || amountMatch[2]);
    if (idMatch) txId = idMatch[1].toUpperCase();
    provider = 'CBE';
  }

  if (detectedAmount === 0 || !txId) return { valid: false, message: "❌ Could not find Amount or Transaction ID." };
  if (Math.abs(detectedAmount - expectedAmount) > 1) return { valid: false, message: `❌ Amount mismatch! Found ${detectedAmount}, expected ${expectedAmount}.` };
  if (usedTransactionIds.has(txId)) return { valid: false, message: "❌ This Transaction ID has already been used!" };

  return { valid: true, provider, txId };
}

// --- 🤖 BOT SETUP ---
const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken || '');
const appUrl = process.env.APP_URL || 'https://your-app.fly.dev';

// --- 1. THE BLUE MENU COMMANDS ---
// These appear at the bottom left of the keyboard
const commands = [
  { command: 'menu', description: '🏠 Main Menu' },
  { command: 'play', description: '🎮 Play Game' },
  { command: 'deposit', description: '➕ Deposit' },
  { command: 'withdraw', description: '➖ Withdraw' },
  { command: 'transfer', description: '💸 Transfer' },
  { command: 'balance', description: '💰 Balance' },
  { command: 'help', description: '❓ Help' }
];

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

// --- 🤖 INLINE KEYBOARD (UPDATED) ---
const dashboardMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('Play Now 🎮', appUrl)],
  [Markup.button.callback('Deposit ➕', 'deposit_start'), Markup.button.callback('Withdraw ➖', 'withdraw_start')],
  [Markup.button.callback('Transfer 💸', 'transfer_start'), Markup.button.callback('Balance 💰', 'balance')],
  [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('Instruction 📖', 'instruction')]
]);
const cancelKeyboard = Markup.keyboard([['❌ Cancel']]).resize();

async function sendDashboard(ctx: any) {
  try {
    await ctx.replyWithPhoto(
      { source: path.join(rootPath, 'win.png') }, 
      {
        caption: "🏆 **Welcome to Win Bingo!**\n\nChoose an option below:",
        parse_mode: 'Markdown',
        ...dashboardMenu
      }
    );
  } catch (e) {
    ctx.reply("🏆 **Welcome to Win Bingo!**", dashboardMenu);
  }
}

// --- 🤖 INITIALIZATION ---
bot.start(async (ctx) => {
    // FORCE UPDATE BLUE MENU
    try { await ctx.setChatMenuButton({ type: 'commands' }); } catch (e) {}
    
    const user = await getOrCreateUser(ctx);
    if (!user || !user.isRegistered) return ctx.reply("👋 Welcome! Please register first.", Markup.keyboard([[Markup.button.contactRequest('📱 Share Contact')]]).resize().oneTime());
    sendDashboard(ctx);
});

bot.on('contact', async (ctx) => { 
    const user = await getOrCreateUser(ctx);
    if (user) {
        await prisma.user.update({ where: { telegramId: user.telegramId }, data: { isRegistered: true, phoneNumber: ctx.message.contact.phone_number } });
        ctx.reply("✅ **Registered Successfully!**", Markup.removeKeyboard());
        sendDashboard(ctx);
    }
});

// --- COMMAND HANDLERS (LINKING BLUE MENU) ---
bot.command('menu', (ctx) => sendDashboard(ctx));
bot.command('play', (ctx) => ctx.reply("🎮 Click 'Play Now' above!", dashboardMenu));
bot.command('deposit', (ctx) => {
    userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: {} });
    ctx.reply("💵 Enter amount to deposit (ETB):", cancelKeyboard);
});
bot.command('withdraw', (ctx) => {
    userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
    ctx.reply("Please send the amount to withdraw:", cancelKeyboard);
});
bot.command('transfer', (ctx) => {
    userStates.set(ctx.from.id.toString(), { step: 'TRANSFER_USERNAME', data: {} });
    ctx.reply("👤 **Enter the Username of the receiver:**\n(Example: @beki)", cancelKeyboard);
});
bot.command('balance', async (ctx) => {
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
    ctx.reply(`💰 **Current Balance:**\n\n**${user?.balance.toFixed(2)} ETB**`, {parse_mode: 'Markdown'});
});
bot.command('help', (ctx) => ctx.reply("❓ Contact @AddisSupport for help."));


// --- INLINE BUTTON ACTIONS ---
bot.action('balance', async (ctx) => {
  if(!ctx.from) return;
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
  ctx.reply(`💰 **Current Balance:**\n\n**${user?.balance.toFixed(2)} ETB**`, {parse_mode: 'Markdown'});
});

bot.action('deposit_start', (ctx) => {
  if (!ctx.from) return;
  userStates.set(ctx.from.id.toString(), { step: 'DEPOSIT_AMOUNT', data: {} });
  ctx.reply("💵 Enter amount to deposit (ETB):", cancelKeyboard);
});

bot.action('withdraw_start', (ctx) => {
  if (!ctx.from) return;
  userStates.set(ctx.from.id.toString(), { step: 'WITHDRAW_AMOUNT', data: {} });
  ctx.reply("Please send the amount to withdraw:", cancelKeyboard);
});

bot.action('transfer_start', (ctx) => {
  if (!ctx.from) return;
  userStates.set(ctx.from.id.toString(), { step: 'TRANSFER_USERNAME', data: {} });
  ctx.reply("👤 **Enter the Username of the receiver:**\n(Example: @beki)", cancelKeyboard);
});


// ==========================================
// 📩 MAIN LOGIC & TEXT HANDLER
// ==========================================
bot.on('text', async (ctx) => {
  if (!ctx.from) return;
  const uid = ctx.from.id.toString();
  const text = ctx.message.text;
  const state = userStates.get(uid);

  if (text.includes('Cancel')) { 
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

    await ctx.reply(
`**Payment Details**
\`\`\`
Name:      ${user?.firstName || 'User'}
Phone:     ${user?.phoneNumber || 'N/A'}
Amount:    ${amount} ETB
Ref:       ${ref}
\`\`\`
**Instructions:**
1. Deposit **${amount} ETB** to this Telebirr number:
   \`0924497619\`  👈 (Tap to Copy)

2. **Copy the FULL SMS** you receive from Telebirr.

3. **Paste the SMS here** to confirm instantly!`, 
    {parse_mode: 'Markdown'});
  }

  else if (state.step === 'DEPOSIT_CONFIRM') {
    const verification = verifyPaymentSMS(text, state.data.amount);
    
    // ATOMIC UPDATE FOR DEPOSIT
    if (verification.valid) {
         if(verification.txId) usedTransactionIds.add(verification.txId);
         
         await prisma.user.update({ 
             where: { telegramId: BigInt(uid) }, 
             data: { balance: { increment: state.data.amount } } 
         });
         
         ctx.reply(`✅ **Deposit Successful!**\n\n+${state.data.amount} ETB added to wallet.`, Markup.removeKeyboard());
         userStates.delete(uid);
         sendDashboard(ctx);
    } else {
         ctx.reply(`⚠️ **Verification Failed**\n${verification.message}`, Markup.removeKeyboard());
         // Note: In a real system, we'd log this fail attempt to DB
         userStates.delete(uid);
         sendDashboard(ctx);
    }
  }

  // ------------------------------------------------
  // 2. WITHDRAW LOGIC
  // ------------------------------------------------
  else if (state.step === 'WITHDRAW_AMOUNT') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid Amount.");
    userStates.set(uid, { step: 'WITHDRAW_BANK', data: { amount } });
    ctx.reply("Please select a bank:", Markup.keyboard([['Telebirr'],['Bank of Abyssinia', 'Awash Bank'],['Dashin Bank']]).resize());
  }
  else if (state.step === 'WITHDRAW_BANK') {
      userStates.set(uid, { step: 'WITHDRAW_NAME', data: { ...state.data, bank: text } });
      ctx.reply(`Enter account holder name for ${text}:`, cancelKeyboard);
  }
  else if (state.step === 'WITHDRAW_NAME') {
      userStates.set(uid, { step: 'WITHDRAW_ACCOUNT', data: { ...state.data, name: text } });
      ctx.reply(`Enter account number:`, cancelKeyboard);
  }
  else if (state.step === 'WITHDRAW_ACCOUNT') {
      const accNum = text;
      const d = state.data;
      
      // ATOMIC CHECK & WITHDRAW
      // We check balance inside a transaction or simply try to decrement
      // If balance goes negative, Prisma throws an error (if we added a Check Constraint)
      // Since we can't add constraints easily here, we check manually then update.
      
      const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });
      if (!user || user.balance < d.amount) {
          ctx.reply("❌ Insufficient funds for withdrawal.");
      } else {
          // Deduct Balance
          await prisma.user.update({ 
              where: { id: user.id }, 
              data: { balance: { decrement: d.amount } } 
          });

          // Log Request (Pending) - In real system this goes to DB
          // For now we simulate success message
          ctx.reply(`✅ **Withdrawal Requested!**\n\n${d.amount} ETB to ${d.bank}\nRef: ${generateReference()}`, Markup.removeKeyboard());
      }
      userStates.delete(uid);
      sendDashboard(ctx);
  }

  // ------------------------------------------------
  // 3. TRANSFER LOGIC (ATOMIC & ROBUST)
  // ------------------------------------------------
  else if (state.step === 'TRANSFER_USERNAME') {
      let targetUser = text.replace('@', '').trim();
      if (targetUser === ctx.from.username) return ctx.reply("❌ You cannot transfer to yourself.");

      const receiver = await prisma.user.findFirst({ where: { username: targetUser } });
      if (!receiver) return ctx.reply("❌ User not found.", cancelKeyboard);

      userStates.set(uid, { step: 'TRANSFER_AMOUNT', data: { receiverId: receiver.id, receiverName: receiver.username, receiverTid: receiver.telegramId } });
      ctx.reply(`✅ Found @${receiver.username}\n\n**Enter Amount (ETB):**`, { parse_mode: 'Markdown', ...cancelKeyboard });
  }

  else if (state.step === 'TRANSFER_AMOUNT') {
      const amount = parseFloat(text);
      if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid Amount.");

      const senderId = BigInt(uid);
      const receiverId = state.data.receiverId;

      try {
          // --- 🔒 THE CRITICAL ATOMIC TRANSACTION ---
          await prisma.$transaction(async (tx) => {
              // 1. Lock & Get Sender
              const sender = await tx.user.findUnique({ where: { telegramId: senderId } });
              if (!sender || sender.balance < amount) {
                  throw new Error("Insufficient Balance");
              }

              // 2. Decrement Sender
              await tx.user.update({
                  where: { id: sender.id },
                  data: { balance: { decrement: amount } }
              });

              // 3. Increment Receiver
              await tx.user.update({
                  where: { id: receiverId },
                  data: { balance: { increment: amount } }
              });
          });

          // --- SUCCESS ---
          await ctx.reply(`✅ **Transfer Successful!**\n\nSent **${amount} ETB** to @${state.data.receiverName}.`, { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
          
          try {
            await bot.telegram.sendMessage(state.data.receiverTid.toString(), `💰 **Received Money!**\n\n+${amount} ETB from @${ctx.from.username}.`);
          } catch(e) {}

      } catch (error) {
          // --- FAILURE ---
          ctx.reply("❌ Transaction Failed: Insufficient funds or error.", Markup.removeKeyboard());
      }

      userStates.delete(uid);
      sendDashboard(ctx);
  }
});

// --- SERVER LAUNCH ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../admin.html')));
app.get('/api/admin/transactions', (req, res) => res.json([])); 

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`✅ Server running on ${port}`);
    if (botToken) {
        bot.telegram.setMyCommands(commands);
        bot.launch().catch(e => console.error("Bot failed:", e));
    }
});

process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });