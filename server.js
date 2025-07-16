import express from "express";
import mongoose from "mongoose";
import fetch from "node-fetch";
import cron from "node-cron";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;
const CHANNEL_ID = "1485854";

// Environment variables for security
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "enjayy6969"; // fallback for development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://veryudshop:kH8L2WOAZ20PQEdf@cluster0.gakw8gq.mongodb.net/';

// MongoDB setup
await mongoose.connect(
  MONGODB_URI,
  { useNewUrlParser: true, useUnifiedTopology: true }
);

// Message model
const messageSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  messageCount: { type: Number, default: 0 }
});
const Message = mongoose.model("Message", messageSchema);

// Previous leaderboard model for storing historical data
const previousLeaderboardSchema = new mongoose.Schema({
  entries: [{
    username: { type: String, required: true },
    messageCount: { type: Number, required: true },
    rank: { type: Number, required: true }
  }],
  resetDate: { type: Date, default: Date.now },
  weekNumber: { type: Number, required: true }
});
const PreviousLeaderboard = mongoose.model("PreviousLeaderboard", previousLeaderboardSchema);

// Roll model for storing roll history
const rollSchema = new mongoose.Schema({
  winner: { type: String, required: true },
  prize: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  serverSeed: { type: String, required: true },
  clientSeed: { type: String, required: true },
  nonce: { type: Number, required: true },
  hash: { type: String, required: true }
});
const Roll = mongoose.model("Roll", rollSchema);

// Track last seen message ID
let lastSeenMessageId = null;

// Track user message history for spam detection
const userLastMessages = new Map();

// List of bot usernames to ignore
const IGNORED_USERS = ["BotRix", "KickBot"];

// Roll system variables
let nextRollTime = null;
let rollInterval = null;
let serverSeed = generateServerSeed();
let nonce = 0;

// Generate a random server seed
function generateServerSeed() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Provably fair hash function (SHA-256)
async function sha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex');
}

// Generate roll result using provably fair system
async function generateRoll(serverSeed, clientSeed, nonce) {
  const combined = `${serverSeed}-${clientSeed}-${nonce}`;
  const hash = await sha256(combined);
  return parseInt(hash.substring(0, 8), 16) / Math.pow(2, 32);
}

// Get next roll time (same as leaderboard reset)
function getNextRollTime() {
  return getNextResetDate();
}

// Perform a roll
async function performRoll() {
  try {
    // Get the top 15 users from the leaderboard (by messageCount)
    const topUsers = await Message.find()
      .sort({ messageCount: -1 })
      .limit(15)
      .lean();

    if (topUsers.length === 0) {
      console.log("No users available for roll");
      return;
    }

    // Log the top 15 users with their message counts
    console.log("Top users entered into the roll:");
    topUsers.forEach((u, i) => {
      console.log(`#${i + 1}: ${u.username} (${u.messageCount} messages)`);
    });

    // Generate roll result using provably fair system
    const clientSeed = Date.now().toString();
    const rollResult = await generateRoll(serverSeed, clientSeed, nonce);
    
    // Select winner (0 to topUsers.length-1)
    const winnerIndex = Math.floor(rollResult * topUsers.length);
    const winner = topUsers[winnerIndex];

    // Create roll record
    const roll = new Roll({
      winner: winner.username,
      prize: 10,
      serverSeed: serverSeed,
      clientSeed: clientSeed,
      nonce: nonce,
      hash: await sha256(`${serverSeed}-${clientSeed}-${nonce}`)
    });
    await roll.save();

    console.log(`Roll completed! Winner: ${winner.username}, Prize: $10`);
    
    // Update for next roll
    nonce++;
    nextRollTime = getNextRollTime();
    
  } catch (error) {
    console.error("Error performing roll:", error);
  }
}

// Timer functions
function getNextResetDate() {
  const now = new Date();
  
  // Fixed reset time: July 1st, 2025 at 12:00 AM UTC
  const firstReset = new Date(2025, 6, 1, 0, 0, 0, 0); // July 1st, 2025 at 12:00 AM UTC
  
  // If we haven't reached the first reset yet, use that
  if (now < firstReset) {
    return firstReset;
  }
  
  // After first reset, calculate next reset based on 7-day intervals
  const timeSinceFirstReset = now.getTime() - firstReset.getTime();
  const weeksSinceFirstReset = Math.floor(timeSinceFirstReset / (7 * 24 * 60 * 60 * 1000)) + 1;
  const nextReset = new Date(firstReset.getTime() + (weeksSinceFirstReset * 7 * 24 * 60 * 60 * 1000));
  
  // Adjust for timezone difference (add 2 hours to match your expected time)
  nextReset.setHours(nextReset.getHours() + 2);
  
  return nextReset;
}



async function resetLeaderboard() {
  try {
    // Get current leaderboard before resetting
    const currentLeaderboard = await Message.find()
      .sort({ messageCount: -1 })
      .limit(100)
      .lean();
    
    // Calculate week number based on the 7-day cycle starting from tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstReset = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);
    const now = new Date();
    const timeSinceFirstReset = now.getTime() - firstReset.getTime();
    const weeksSinceFirstReset = Math.floor(timeSinceFirstReset / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    // Save previous leaderboard if there are entries
    if (currentLeaderboard.length > 0) {
      const entries = currentLeaderboard.map((entry, index) => ({
        username: entry.username,
        messageCount: entry.messageCount,
        rank: index + 1
      }));
      
      const previousLeaderboard = new PreviousLeaderboard({
        entries: entries,
        resetDate: new Date(),
        weekNumber: weeksSinceFirstReset
      });
      await previousLeaderboard.save();
      console.log(`Previous leaderboard saved with ${entries.length} entries for week ${weeksSinceFirstReset}`);
    }
    
    // Reset current leaderboard (but keep roll history so latest winner stays visible)
    await Message.deleteMany({});
    // Note: We DON'T clear Roll.deleteMany({}) here - we want to keep the latest winner visible
    lastSeenMessageId = null;
    userLastMessages.clear();
    
    // Reset roll system for next week
    serverSeed = generateServerSeed();
    nonce = 0;
    nextRollTime = getNextRollTime();
    
    console.log(`Leaderboard reset - Week ${weeksSinceFirstReset} completed`);
  } catch (error) {
    console.error("Error resetting leaderboard:", error);
  }
}

// --- Startup leaderboard reset check ---
async function checkAndResetIfOverdue() {
  const now = new Date();
  const nextReset = getNextResetDate();
  // If now is past the next reset, do a reset immediately
  if (now >= nextReset) {
    console.log("⏰ Overdue leaderboard reset detected. Performing immediate reset.");
    await resetLeaderboard();
    await performRoll();
  }
}

// Timer endpoint
app.get("/timer", (req, res) => {
  const nextReset = getNextResetDate();
  const now = new Date();
  const timeLeft = nextReset.getTime() - now.getTime();
  
  console.log(`Current time: ${now.toISOString()}`);
  console.log(`Next reset: ${nextReset.toISOString()}`);
  console.log(`Time left (ms): ${timeLeft}`);
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  console.log(`Timer display: ${days}d ${hours}:${minutes}:${seconds}`);
  
  res.json({
    timeLeft: Math.max(0, timeLeft),
    days,
    hours,
    minutes,
    seconds,
    nextReset: nextReset.toISOString()
  });
});

// Roll system endpoints
app.get("/roll-info", async (req, res) => {
  try {
    const nextReset = getNextResetDate();
    const now = new Date();
    const timeUntilRoll = nextReset.getTime() - now.getTime();
    
    // Get latest roll
    const latestRoll = await Roll.findOne().sort({ timestamp: -1 });
    
    res.json({
      nextRollTime: nextReset.toISOString(),
      timeUntilRoll: Math.max(0, timeUntilRoll),
      latestRoll: latestRoll ? {
        winner: latestRoll.winner,
        prize: latestRoll.prize,
        timestamp: latestRoll.timestamp,
        hash: latestRoll.hash
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/roll-history", async (req, res) => {
  try {
    const rolls = await Roll.find().sort({ timestamp: -1 }).limit(10);
    res.json(rolls.map(roll => ({
      winner: roll.winner,
      prize: roll.prize,
      timestamp: roll.timestamp,
      hash: roll.hash
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current server seed (for transparency)
app.get("/current-seed", (req, res) => {
  res.json({
    serverSeed: serverSeed,
    nextRollTime: nextRollTime ? nextRollTime.toISOString() : null
  });
});

function isSpamMessage(username, content, timestamp) {
  const trimmed = content.trim();
  if (!trimmed) return true;

  // Filter pure emote messages
  if (/^\[emote:\d+:[^\]]+\]$/.test(trimmed)) return true;

  // Filter very short messages
  if (trimmed.length <= 2) return true;

  // Filter excessive CAPS (80%+ caps, min 6 chars)
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 6) {
    const capsCount = (letters.match(/[A-Z]/g) || []).length;
    if (capsCount / letters.length > 0.8) return true;
  }

  // Check against user's last message
  const last = userLastMessages.get(username);
  if (last) {
    if (last.content === trimmed) return true;
    if (similarity(last.content, trimmed) > 0.9) return true;
    if (timestamp - last.timestamp < 1000) return true;
  }

  userLastMessages.set(username, { content: trimmed, timestamp });
  return false;
}

// Simple similarity: Jaccard index on word sets
function similarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  return intersection.size / Math.max(setA.size, setB.size);
}

// Serve leaderboard
app.get("/leaderboard", async (req, res) => {
  const docs = await Message.find()
    .sort({ messageCount: -1 })
    .limit(100)
    .lean();
  res.json(docs.map(d => ({ username: d.username, messageCount: d.messageCount })));
});

// Serve previous leaderboard
app.get("/previous-leaderboard", async (req, res) => {
  try {
    const previousLeaderboard = await PreviousLeaderboard.findOne()
      .sort({ resetDate: -1 })
      .lean();
    
    if (!previousLeaderboard) {
      return res.json({ 
        entries: [], 
        resetDate: null, 
        weekNumber: null,
        message: "No previous leaderboard found" 
      });
    }
    
    res.json({
      entries: previousLeaderboard.entries,
      resetDate: previousLeaderboard.resetDate,
      weekNumber: previousLeaderboard.weekNumber
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve live status
app.get("/live-status", async (req, res) => {
  try {
    const live = await isStreamerLive();
    res.json({ isLive: live });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper to check live status
async function isStreamerLive() {
  try {
    const response = await fetch(`https://kick.com/api/v1/channels/enjayy`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.livestream && data.livestream.is_live;
  } catch (e) {
    console.error("Live check failed:", e.message);
    return false;
  }
}

// Polling loop
async function pollKickMessages() {
  try {
    // Check if timer has hit 0 and trigger reset
    const now = new Date();
    const nextReset = getNextResetDate();
    const timeLeft = nextReset.getTime() - now.getTime();
    
    // If timer has hit 0 or is very close (within 1 second), trigger reset
    if (timeLeft <= 1000 && timeLeft > -60000) { // Within 1 second of reset time, but not more than 1 minute past
      console.log("⏰ Timer hit 0! Triggering automatic leaderboard reset...");
      console.log(`Current time: ${now.toISOString()}`);
      console.log(`Reset time: ${nextReset.toISOString()}`);
      console.log(`Time difference: ${timeLeft}ms`);
      
      await resetLeaderboard();
      return; // Skip message processing this cycle
    }

    const live = await isStreamerLive();
    if (!live) {
      console.log("Streamer is offline — skipping message polling.");
      return;
    }

    const url = `https://kick.com/api/v2/channels/${CHANNEL_ID}/messages`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!resp.ok) {
      console.error("Fetch failed", await resp.text());
      return;
    }

    const json = await resp.json();
    const messages = (json.data?.messages || []).sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    );

    for (const msg of messages) {
      if (lastSeenMessageId === msg.id) break;

      const username = msg.sender?.username;
      const content = msg.content;
      const timestamp = new Date(msg.created_at).getTime();

      if (!username || !content) continue;
      if (IGNORED_USERS.includes(username)) continue;
      if (isSpamMessage(username, content, timestamp)) continue;

      await Message.findOneAndUpdate(
        { username },
        { $inc: { messageCount: 1 } },
        { upsert: true }
      );
    }

    if (messages.length) {
      lastSeenMessageId = messages[messages.length - 1].id;
    }

  } catch (e) {
    console.error("Error in pollKickMessages:", e.message);
  }
}

// Bootstrap lastSeenMessageId
(async () => {
  await checkAndResetIfOverdue();
  
  // One-time message record creation on server start
  try {
    const testUser = await Message.findOne({ username: "ServerStart" });
    if (!testUser) {
      const newMessage = new Message({
        username: "ServerStart",
        messageCount: 1
      });
      await newMessage.save();
      console.log("✅ One-time message record created for ServerStart user");
    } else {
      console.log("ℹ️ ServerStart user already exists, skipping one-time creation");
    }
  } catch (error) {
    console.error("❌ Error creating one-time message record:", error.message);
  }
  
  try {
    const resp = await fetch(
      `https://kick.com/api/v2/channels/${CHANNEL_ID}/messages`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const json = await resp.json();
    const msgs = json.data?.messages || [];
    if (msgs.length) {
      lastSeenMessageId = msgs[msgs.length - 1].id;
    }
  } catch (_) {}
  setInterval(pollKickMessages, 1000);
})();

// Weekly leaderboard reset - FIXED to only run on specific dates
cron.schedule("0 0 * * 0", async () => {
  try {
    const now = new Date();
    const firstReset = new Date(2025, 6, 1, 0, 0, 0, 0); // July 1st, 2025 at 12:00 AM UTC
    
    // Only execute if we're past the first reset date AND it's actually time for a reset
    if (now >= firstReset) {
      // Check if it's actually time for a reset by calculating the next expected reset
      const timeSinceFirstReset = now.getTime() - firstReset.getTime();
      const weeksSinceFirstReset = Math.floor(timeSinceFirstReset / (7 * 24 * 60 * 60 * 1000));
      const expectedNextReset = new Date(firstReset.getTime() + ((weeksSinceFirstReset + 1) * 7 * 24 * 60 * 60 * 1000));
      
      // Only reset if we're within 1 hour of the expected reset time
      const timeDiff = Math.abs(now.getTime() - expectedNextReset.getTime());
      const oneHour = 60 * 60 * 1000;
      
      if (timeDiff <= oneHour) {
        console.log("🔄 EXECUTING WEEKLY LEADERBOARD RESET 🔄");
        console.log(`Current time: ${now.toISOString()}`);
        console.log(`Expected reset: ${expectedNextReset.toISOString()}`);
        await resetLeaderboard();
      } else {
        console.log(`⏰ Not time for reset yet. Current: ${now.toISOString()}, Expected: ${expectedNextReset.toISOString()}`);
      }
    } else {
      console.log(`⏳ First reset hasn't happened yet. Current: ${now.toISOString()}, First reset: ${firstReset.toISOString()}`);
    }
  } catch (error) {
    console.error("❌ Error during weekly reset:", error);
  }
}, {
  timezone: "UTC"
});

// Initialize roll system
(() => {
  nextRollTime = getNextRollTime();
  console.log(`Next roll scheduled for: ${nextRollTime}`);
})();

// Serve frontend
app.use(express.static("public"));

app.use(express.json());

// Password verification endpoint
app.post('/verify-password', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }
  
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Password verified successfully' });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect password' });
  }
});

app.post('/roll-winner', async (req, res) => {
  try {
    const { winner, prize, timestamp } = req.body;
    const roll = new Roll({
      winner,
      prize,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      serverSeed: 'manual',
      clientSeed: 'manual',
      nonce: 0,
      hash: 'manual'
    });
    await roll.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test save leaderboard endpoint
app.post('/test-save-leaderboard', async (req, res) => {
  try {
    // Get current leaderboard before saving
    const currentLeaderboard = await Message.find()
      .sort({ messageCount: -1 })
      .limit(100)
      .lean();
    
    // Calculate week number based on the 7-day cycle starting from tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstReset = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);
    const now = new Date();
    const timeSinceFirstReset = now.getTime() - firstReset.getTime();
    const weeksSinceFirstReset = Math.floor(timeSinceFirstReset / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    // Save current leaderboard as previous
    if (currentLeaderboard.length > 0) {
      const entries = currentLeaderboard.map((entry, index) => ({
        username: entry.username,
        messageCount: entry.messageCount,
        rank: index + 1
      }));
      
      const previousLeaderboard = new PreviousLeaderboard({
        entries: entries,
        resetDate: new Date(),
        weekNumber: weeksSinceFirstReset
      });
      await previousLeaderboard.save();
      
      console.log(`Test save completed: ${entries.length} entries saved for week ${weeksSinceFirstReset}`);
      res.json({ 
        success: true, 
        message: `Test save completed with ${entries.length} entries for week ${weeksSinceFirstReset}`,
        entries: entries.slice(0, 10), // Return top 10 for verification
        weekNumber: weeksSinceFirstReset
      });
    } else {
      res.json({ 
        success: false, 
        message: "No entries to save" 
      });
    }
  } catch (error) {
    console.error("Error in test save:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
