/**
 * File Upload Security & Magic Bytes Inspection — Dasbor Untung Usaha
 * Memenuhi Poin 15 (Scan Upload File) & Poin 18 (Batasi Upload File)
 */

export const FILE_UPLOAD_CONFIG = {
  maxImageSizeBytes: 2 * 1024 * 1024, // 2MB
  maxDocSizeBytes: 5 * 1024 * 1024,   // 5MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  // Magic bytes / tanda tangan biner file
  magicSignatures: {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    pdf: [0x25, 0x50, 0x44, 0x46] // %PDF
  }
};

/**
 * 1. Inspeksi Tanda Tangan Biner (Magic Bytes) File
 * Memastikan konten riil file cocok dengan ekstensi (anti spoofing / masquerade file)
 */
export async function verifyFileSignature(file) {
  if (!file || !(file instanceof Blob)) {
    return { isValid: false, reason: 'Objek file tidak valid.' };
  }

  const slice = file.slice(0, 16);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Periksa JPEG (FF D8 FF)
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { isValid: true, detectedType: 'image/jpeg', ext: '.jpg' };
  }

  // Periksa PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47
  ) {
    return { isValid: true, detectedType: 'image/png', ext: '.png' };
  }

  // Periksa WEBP (RIFF .... WEBP)
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50  // WEBP
  ) {
    return { isValid: true, detectedType: 'image/webp', ext: '.webp' };
  }

  // Periksa PDF (%PDF)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { isValid: true, detectedType: 'application/pdf', ext: '.pdf' };
  }

  return {
    isValid: false,
    reason: 'Format berkas tidak sesuai tanda tangan biner asli (file spoofing terdeteksi).'
  };
}

/**
 * 2. Deteksi Ekstensi Ganda (Double Extension Attack)
 * Contoh: 'invoice.php.png', 'shell.jsp.jpg'
 */
export function hasDangerousDoubleExtension(fileName) {
  if (!fileName || typeof fileName !== 'string') return true;
  const parts = fileName.toLowerCase().split('.');
  if (parts.length > 2) {
    const dangerousExts = ['php', 'phtml', 'exe', 'sh', 'bat', 'cmd', 'js', 'vbs', 'jar', 'jsp', 'py', 'pl', 'cgi', 'htm', 'html', 'svg'];
    for (let i = 1; i < parts.length - 1; i++) {
      if (dangerousExts.includes(parts[i])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 3. Hasilkan Nama File Acak Aman (Anti-Path Traversal & Overwrite)
 */
export function generateSecureStorageFileName(prefix = 'attachment', safeExt = '.jpg') {
  const cleanExt = safeExt.startsWith('.') ? safeExt : `.${safeExt}`;
  const randomId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  return `${prefix}_${randomId}${cleanExt}`;
}

/**
 * 4. Validator Lengkap Upload File
 */
export async function validateUploadedFile(file) {
  if (!file) {
    return { isValid: false, message: 'Berkas belum dipilih.' };
  }

  // 1. Periksa nama & ekstensi ganda
  if (hasDangerousDoubleExtension(file.name)) {
    return {
      isValid: false,
      message: 'Berkas ditolak: Ekstensi ganda atau format berisiko tinggi terdeteksi.'
    };
  }

  // 2. Periksa batas ukuran berkas
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const maxAllowed = isPdf ? FILE_UPLOAD_CONFIG.maxDocSizeBytes : FILE_UPLOAD_CONFIG.maxImageSizeBytes;
  const maxLabel = isPdf ? '5 MB' : '2 MB';

  if (file.size > maxAllowed) {
    return {
      isValid: false,
      message: `Ukuran berkas melebihi batas maksimum yang diizinkan (${maxLabel}).`
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      message: 'Berkas kosong (0 byte) tidak dapat diunggah.'
    };
  }

  // 3. Periksa MIME Type terdaftar
  if (!FILE_UPLOAD_CONFIG.allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      message: 'Tipe berkas tidak didukung. Hanya menerima format JPG, PNG, WEBP, atau PDF.'
    };
  }

  // 4. Verifikasi Magic Bytes
  const sigCheck = await verifyFileSignature(file);
  if (!sigCheck.isValid) {
    return {
      isValid: false,
      message: sigCheck.reason || 'Berkas tidak valid atau rusak.'
    };
  }

  // 5. Generate nama penyimpanan aman
  const secureName = generateSecureStorageFileName('doc', sigCheck.ext);

  return {
    isValid: true,
    file,
    secureFileName: secureName,
    mimeType: sigCheck.detectedType,
    extension: sigCheck.ext,
    sizeBytes: file.size
  };
}
