import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';

const inputPath = './server.js';
const backupPath = './server.backup.js';
const outputPath = './server.js';

// Read the server.js file
const code = fs.readFileSync(inputPath, 'utf8');

// Node.js-safe obfuscation options
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.5,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 1,
  splitStrings: true,
  splitStringsChunkLength: 8,
  unicodeEscapeSequence: true,
  numbersToExpressions: true,
  simplify: true,
  // Node.js only: do NOT use selfDefending, debugProtection, or domainLock
};

console.log('🔒 Starting Node.js server obfuscation...');

try {
  // Backup original file
  fs.copyFileSync(inputPath, backupPath);
  console.log(`✅ Backup created: ${backupPath}`);

  // Obfuscate the code
  const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, obfuscationOptions).getObfuscatedCode();

  // Write obfuscated code back to server.js
  fs.writeFileSync(outputPath, obfuscatedCode);
  console.log('✅ server.js obfuscated successfully!');
  console.log('📁 Original file backed up as server.backup.js');
  console.log('⚠️  Test your server thoroughly after obfuscation!');
} catch (error) {
  console.error('❌ Obfuscation failed:', error.message);
  process.exit(1);
} 