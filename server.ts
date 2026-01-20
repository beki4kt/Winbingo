// server.ts
import express from 'express';
import { Telegraf, Markup, Context } from 'telegraf';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// 1. Import Prisma Client
import { PrismaClient } from '@prisma/client';

dotenv.config();

// Fix for paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Calculate root path to find win.png later
const rootPath = path.join(__dirname, '../');

// 2. Initialize Database and Express
const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8080;

// Setup Telegram Bot
const botToken = process.env.BOT_TOKEN;
if (!botToken) throw new Error("BOT_TOKEN missing");
const bot = new Telegraf(botToken);

const appUrl = process.env.APP_URL || 'https://your-app.fly.dev';

// --- HELPER: Get or Create User in DB ---
async function getOrCreateUser(ctx: Context) {
  if (!ctx.from) return null;
  const telegramId = BigInt(ctx.from.id);

  let user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
      }
    });
    console.log(`🆕 New user created: ${user.telegramId}`);
  }
  return user;
}


// --- KEYBOARDS ---
// The main Inline Keyboard (sent with the image)
const mainMenuInline = Markup.inlineKeyboard([
  [Markup.button.webApp('PLAY BINGO 🎮', appUrl)],
  [Markup.button.callback('Deposit 💵', 'deposit_info'), Markup.button.callback('Withdraw 🏦', 'withdraw_info')],
  [Markup.button.callback('Instructions 📖', 'instruction'), Markup.button.callback('Support 📞', 'support')]
]);

// The Contact Request Keyboard (for registration)
const contactRequestKeyboard = Markup.keyboard([
  [Markup.button.contactRequest('📱 Share Contact Number')]
]).resize().oneTime();


// --- BOT LOGIC ---

// 1. Set the Bottom-Left Menu Commands
bot.telegram.setMyCommands([
  { command: 'start', description: 'Open main menu' },
  { command: 'play', description: 'Start the game' },
  { command: 'register', description: 'Create account (One time)' },
  { command: 'balance', description: 'Check wallet' },
  { command: 'deposit', description: 'Add funds' },
  { command: 'withdrawal', description: 'Cash out' },
  { command: 'transfer', description: 'Send to friend' },
  // { command: 'invite', description: 'Get invite link' }, // Keep menu short
]);

// 2. Handle /start (sends local image + inline menu)
bot.start(async (ctx) => {
  await getOrCreateUser(ctx); // Ensure user exists in DB
  try {
    // Sending a LOCAL file using path.join to find it in root
    await ctx.replyWithPhoto({ source: path.join(rootPath, 'win.png') }, {
      caption: "👋 **Welcome to Win Bingo!**\n\nGet ready to play and win! Select an option below.",
      parse_mode: 'Markdown',
      ...mainMenuInline
    });
  } catch (error) {
    console.error("Failed to load win.png locally:", error);
    ctx.reply("👋 Welcome to Win Bingo! (Image failed to load)", mainMenuInline);
  }
});

// 3. Handle /play
bot.command('play', (ctx) => {
  // We can't open webapp directly from command, so we send a button
  ctx.reply("Click below to start playing!", Markup.inlineKeyboard([
     Markup.button.webApp('🚀 Launch Game', appUrl)
  ]));
});

// 4. Handle /register (The one-time contact logic)
bot.command('register', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;

  if (user.isRegistered) {
    return ctx.reply("✅ You are already registered!");
  }

  await ctx.reply("To register, please click the button below to share your contact information so we can verify your account.", contactRequestKeyboard);
});

// Handle receiving the contact
bot.on('contact', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;

  // Security check: ensure the contact shared belongs to the sender
  if (ctx.message.contact.user_id !== ctx.from.id) {
     return ctx.reply("Please share your own contact.");
  }

  if (user.isRegistered) {
     return ctx.reply("You are already registered!", Markup.removeKeyboard());
  }

  // Update DB marking them as registered
  await prisma.user.update({
    where: { telegramId: user.telegramId },
    data: {
      isRegistered: true,
      phoneNumber: ctx.message.contact.phone_number
    }
  });

  ctx.reply(`🎉 **Registration Successful!**\n\nWelcome, ${ctx.from.first_name}. You can now deposit and play.`,
    { parse_mode: 'Markdown', ...Markup.removeKeyboard() } // Remove the contact button
  );
});


// 5. Handle Database Commands (Balance)
bot.command('balance', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if(!user) return;
  // In the future, this balance will come from actual transactions
  ctx.reply(`💰 **Your Wallet**\n\nCurrent Balance: **${user.balance.toFixed(2)} ETB**`, {parse_mode: 'Markdown'});
});

// 6. Handle Placeholder Commands (Manual processes for now)
bot.command(['deposit', 'withdrawal', 'transfer'], (ctx) => {
  const commandStr = ctx.message.text;
  ctx.reply(`⚙️ The ${commandStr} feature is currently handled manually.\n\nPlease contact /support for assistance.`);
});


// 7. Handle Inline Button Actions & Other commands
bot.action('instruction', (ctx) => ctx.reply('📖 **How to Play:**\nGet 5 in a row horizontally, vertically, or diagonally to win BINGO!', {parse_mode: 'Markdown'}));
bot.command('support', (ctx) => ctx.reply('📞 Need help? Contact our support team at @YourSupportUsername'));
bot.action('support', (ctx) => ctx.reply('📞 Need help? Contact our support team at @YourSupportUsername'));

bot.action(['deposit_info', 'withdraw_info'], (ctx) => {
   ctx.reply("Please use the bot menu commands /deposit or /withdrawal for these actions.");
})


// Global Error Handler
bot.catch((err, ctx) => {
  console.log(`Oops, encountered an error for ${ctx.updateType}`, err);
});


// --- SERVER SETUP ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// API endpoint to get user data for the Mini App (Frontend)
// The frontend will call this to know who is playing
app.get('/api/user', async (req, res) => {
    const telegramIdStr = req.query.id as string;
    if (!telegramIdStr) return res.status(400).json({ error: "Missing ID" });

    try {
        // BigInt handling for Prisma lookup
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramIdStr) }
        });

        if (user) {
            // Convert BigInt to string before sending back to frontend (JSON doesn't like BigInt)
            res.json({ ...user, telegramId: user.telegramId.toString() });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start bot and server together
if (botToken) {
  bot.launch().then(() => {
    console.log('🤖 Bot Started');
    app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
  });
}

// Graceful shutdown for Prisma and Bot
process.once('SIGINT', async () => { bot.stop('SIGINT'); await prisma.$disconnect(); });
process.once('SIGTERM', async () => { bot.stop('SIGTERM'); await prisma.$disconnect(); });