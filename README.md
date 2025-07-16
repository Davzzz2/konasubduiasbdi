# Kick Leaderboard

A real-time leaderboard system for Kick.com chat activity with weekly rewards and roll system.

## Security Setup

### Environment Variables

For security, the following environment variables should be set in Render.com:

1. **ADMIN_PASSWORD** - Password for admin access to roll winner functionality
2. **MONGODB_URI** - MongoDB connection string

### Production (Render.com)

Set these environment variables in your Render.com dashboard:

1. Go to your service dashboard
2. Navigate to "Environment" tab
3. Add the following environment variables:
   - `ADMIN_PASSWORD` = your secure password
   - `MONGODB_URI` = your MongoDB connection string

### Code Obfuscation (Maximum Security)

To protect your JavaScript code from reverse engineering, use the obfuscation scripts:

#### Standard Obfuscation
```bash
npm run obfuscate
```

#### Maximum Security Obfuscation (Recommended)
```bash
npm run obfuscate-max
```

**Features of Maximum Security Obfuscation:**
- 🔒 String encryption with multiple algorithms (Base64 + RC4)
- 🔒 Control flow flattening
- 🔒 Dead code injection
- 🔒 Debug protection
- 🔒 Self-defending code
- 🔒 Anti-tampering protection
- 🔒 Console output disabled
- 🔒 Random seed generation
- 🔒 Identifier obfuscation
- 🔒 String splitting and rotation

**After obfuscation:**
- Original file is backed up as `index.backup.html`
- Obfuscated code is nearly impossible to reverse engineer
- All functionality remains intact
- Multiple security layers protect against tampering

### Security Notes

- The admin password is no longer hardcoded in the frontend
- Password verification is now handled server-side
- Environment variables are used for sensitive configuration
- The MongoDB connection string should also be moved to environment variables in production
- **Obfuscation adds multiple layers of protection against reverse engineering**

## Installation

```bash
npm install
npm start
```

## Features

- Real-time chat message tracking
- Weekly leaderboard with prizes
- Roll system for random winner selection
- Previous leaderboard history
- Live stream status detection
- Spam protection
- Responsive design
- **Maximum security obfuscation available** 