/**
 * Automated Secret Scanner Script — Dasbor Untung Usaha
 * Menjalankan inspeksi repositori untuk mendeteksi potensi kebocoran kunci rahasia (Poin 16)
 * Penggunaan: node scripts/scan-secrets.js
 */

import fs from 'fs';
import path from 'path';

const SUSPICIOUS_PATTERNS = [
  { name: 'Private Key PEM', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g },
  { name: 'Supabase Service Role Key JWT', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/g },
  { name: 'GitHub Personal Access Token', regex: /gh[pous]_[0-9a-zA-Z]{36}/g },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'Database URL with Password', regex: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^\s"']+/g },
  { name: 'Hardcoded Password Assignment', regex: /(?:password|secret|apikey|api_key)\s*[:=]\s*['"][a-zA-Z0-9@#$%^&*!]{8,}['"]/gi }
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'dist-ssr', '.system_generated', 'brain'];
const IGNORE_FILES = ['.env.example', 'package-lock.json', 'scan-secrets.js'];

let totalFilesScanned = 0;
let findings = [];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else {
      if (IGNORE_FILES.includes(entry.name)) continue;

      // Hanya scan file teks umum
      const ext = path.extname(entry.name).toLowerCase();
      if (!['.js', '.html', '.css', '.json', '.md', '.sql', '.env', '.yaml', '.yml'].includes(ext)) {
        continue;
      }

      totalFilesScanned++;
      const content = fs.readFileSync(fullPath, 'utf8');

      // Pengecualian khusus: jika file memuat demo dummy/placeholder yang aman
      for (const pattern of SUSPICIOUS_PATTERNS) {
        let match;
        while ((match = pattern.regex.exec(content)) !== null) {
          const matchedStr = match[0];
          // Abaikan placeholder aman
          if (
            matchedStr.includes('your-project-id') ||
            matchedStr.includes('your-anon-key') ||
            matchedStr.includes('YOUR_') ||
            matchedStr.includes('xyz.supabase.co') ||
            matchedStr.includes('admin_login_rate_limit')
          ) {
            continue;
          }

          // Cari nomor baris
          const linesUpToMatch = content.slice(0, match.index).split('\n');
          const lineNumber = linesUpToMatch.length;

          findings.push({
            rule: pattern.name,
            file: fullPath,
            line: lineNumber,
            preview: matchedStr.slice(0, 40) + '...'
          });
        }
      }
    }
  }
}

console.log('🔍 Memulai pemindaian secret dan kredensial sensitif di workspace...');
const rootDir = process.cwd();
scanDirectory(rootDir);

console.log(`\n📊 Hasil Pemindaian:`);
console.log(`- Total file diperiksa: ${totalFilesScanned}`);

if (findings.length === 0) {
  console.log('✅ AMAN: Tidak ditemukan secret, kunci privat, atau password sensitif ter-hardcode!');
  process.exit(0);
} else {
  console.log(`⚠️ PERINGATAN: Ditemukan ${findings.length} potensi temuan rahasia:\n`);
  findings.forEach((f, idx) => {
    console.log(`${idx + 1}. [${f.rule}]`);
    console.log(`   File : ${f.file}:${f.line}`);
    console.log(`   Cuplikan: ${f.preview}\n`);
  });
  process.exit(1);
}
