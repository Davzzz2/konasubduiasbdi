import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';

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

// Powerful obfuscation configuration
const obfuscationOptions = {
  // String encryption
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 1,
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
  // domainLock: ['yourdomain.com'],
  
  // Reserved names (keep important function names)
  reservedNames: ['verifyPassword', 'startWinnerAnimation', 'openPasswordModal', 'closePasswordModal'],
  
  // Reserved strings (keep important strings)
  reservedStrings: ['/verify-password', '/leaderboard', '/roll-winner'],
  
  // Transform object keys
  transformObjectKeys: true,
  
  // Unicode escape sequence
  unicodeEscapeSequence: true,
  
  // Split strings
  splitStrings: true,
  splitStringsChunkLength: 10,
  
  // Compact code
  compact: true,
  
  // Minify
  minify: true,
  
  // Rename globals
  renameGlobals: false, // Keep false to avoid breaking functionality
  
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
  optionsPreset: 'high-obfuscation'
};

console.log('🔒 Starting JavaScript obfuscation...');

try {
  // Obfuscate the JavaScript code
  const obfuscatedCode = JavaScriptObfuscator.obfuscate(scriptCode, obfuscationOptions).getObfuscatedCode();
  
  // Replace the original script with obfuscated version
  const obfuscatedHtml = htmlContent.replace(
    /<script>[\s\S]*?<\/script>/g,
    `<script>${obfuscatedCode}</script>`
  );
  
  // Create backup of original file
  const backupPath = './public/index.backup.html';
  fs.writeFileSync(backupPath, htmlContent);
  console.log(`✅ Backup created: ${backupPath}`);
  
  // Write obfuscated file
  fs.writeFileSync(htmlPath, obfuscatedHtml);
  console.log('✅ JavaScript obfuscation completed successfully!');
  console.log('📁 Original file backed up as index.backup.html');
  console.log('🔒 Your code is now heavily protected against reverse engineering');
  
} catch (error) {
  console.error('❌ Obfuscation failed:', error.message);
  process.exit(1);
} 