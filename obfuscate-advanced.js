import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import crypto from 'crypto';

// Read the HTML file
const htmlPath = './public/index.html';
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract JavaScript code from the HTML file
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let scriptCode = '';

while ((match = scriptRegex.exec(htmlContent)) !== null) {
  scriptCode += match[1] + '\n';
}

// Generate a random seed for additional obfuscation
const randomSeed = crypto.randomBytes(16).toString('hex');

// Maximum security obfuscation configuration
const obfuscationOptions = {
  // String encryption with maximum security
  stringArray: true,
  stringArrayEncoding: ['base64', 'rc4'],
  stringArrayThreshold: 0.8,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'function',
  rotateStringArray: true,
  shuffleStringArray: true,
  
  // Identifier obfuscation
  identifierNamesGenerator: 'hexadecimal',
  
  // Control flow flattening
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,
  
  // Dead code injection
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 1,
  
  // Debug protection
  debugProtection: true,
  debugProtectionInterval: 4000,
  
  // Self-defending code
  selfDefending: true,
  
  // Disable console output
  disableConsoleOutput: true,
  
  // Domain lock (optional - uncomment and set your domain)
  // domainLock: ['yourdomain.com', 'www.yourdomain.com'],
  
  // Reserved names (keep important function names)
  reservedNames: [
    'verifyPassword', 'startWinnerAnimation', 'openPasswordModal', 'closePasswordModal',
    'handlePasswordKeyPress', 'loadLeaderboard', 'updateTimer', 'updateRollSystem'
  ],
  
  // Reserved strings (keep important strings)
  reservedStrings: [
    '/verify-password', '/leaderboard', '/roll-winner', '/timer', '/roll-info',
    '/previous-leaderboard', '/live-status'
  ],
  
  // Transform object keys
  transformObjectKeys: true,
  
  // Unicode escape sequence
  unicodeEscapeSequence: true,
  
  // Split strings
  splitStrings: true,
  splitStringsChunkLength: 5,
  
  // Compact code
  compact: true,
  
  // Minify
  minify: true,
  
  // Rename globals
  renameGlobals: false,
  
  // Target environment
  target: 'browser',
  
  // Source map (disable for production)
  sourceMap: false,
  sourceMapMode: 'separate',
  
  // Additional transformations
  simplify: true,
  numbersToExpressions: true,
  expressionToConstant: true,
  
  // Advanced options
  calculator: true,
  log: false,
  optionsPreset: 'high-obfuscation',
  
  // Additional security features
  seed: randomSeed
};

console.log('🔒 Starting MAXIMUM SECURITY JavaScript obfuscation...');
console.log(`🔑 Using random seed: ${randomSeed}`);

try {
  // Obfuscate the JavaScript code
  const obfuscatedCode = JavaScriptObfuscator.obfuscate(scriptCode, obfuscationOptions).getObfuscatedCode();
  
  // Add additional security wrapper
  const securityWrapper = `
// Additional security layer
(function(){
  // Anti-debug protection
  setInterval(function(){
    if (window.console && window.console.log) {
      window.console.log = function(){};
    }
    if (window.console && window.console.debug) {
      window.console.debug = function(){};
    }
  }, 1000);
  
  // Anti-tampering protection
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    // Only allow specific endpoints
    const allowedEndpoints = ['/verify-password', '/leaderboard', '/roll-winner', '/timer', '/roll-info', '/previous-leaderboard', '/live-status'];
    const url = args[0];
    if (typeof url === 'string' && !allowedEndpoints.some(endpoint => url.includes(endpoint))) {
      throw new Error('Unauthorized request');
    }
    return originalFetch.apply(this, args);
  };
})();
`;

  // Replace the original script with obfuscated version + security wrapper
  const obfuscatedHtml = htmlContent.replace(
    /<script>[\s\S]*?<\/script>/g,
    `<script>${securityWrapper}${obfuscatedCode}</script>`
  );
  
  // Create backup of original file
  const backupPath = './public/index.backup.html';
  fs.writeFileSync(backupPath, htmlContent);
  console.log(`✅ Backup created: ${backupPath}`);
  
  // Write obfuscated file
  fs.writeFileSync(htmlPath, obfuscatedHtml);
  console.log('✅ MAXIMUM SECURITY JavaScript obfuscation completed!');
  console.log('📁 Original file backed up as index.backup.html');
  console.log('🔒 Your code is now heavily protected with multiple security layers');
  console.log('🛡️  Anti-debug, anti-tampering, and self-defending code enabled');
  
} catch (error) {
  console.error('❌ Obfuscation failed:', error.message);
  process.exit(1);
} 