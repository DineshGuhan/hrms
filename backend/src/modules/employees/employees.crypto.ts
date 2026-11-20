import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM field encryption (FR-EMP-05).
 * Storage format: 12-byte IV || 16-byte auth tag || ciphertext, as one Buffer.
 */
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function key(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey || envKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set and at least 32 characters');
  }
  // Derive a stable 32-byte key from the configured secret.
  return createHash('sha256').update(envKey).digest();
}

export function encryptField(plaintext: string): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function decryptField(ciphertext: Buffer | null): string | null {
  if (!ciphertext) return null;
  const iv = ciphertext.subarray(0, IV_LENGTH);
  const tag = ciphertext.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = ciphertext.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** Encrypt a set of sensitive fields; null/undefined pass through as null. */
export function encryptFields(fields: {
  salary?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  national_id?: string | null;
}): {
  salary_encrypted: Buffer | null;
  bank_details_encrypted: Buffer | null;
  national_id_encrypted: Buffer | null;
} {
  const bankParts = [fields.bank_account, fields.bank_name].filter((v) => v != null);
  return {
    salary_encrypted: fields.salary ? encryptField(fields.salary) : null,
    bank_details_encrypted: bankParts.length ? encryptField(JSON.stringify(bankParts)) : null,
    national_id_encrypted: fields.national_id ? encryptField(fields.national_id) : null,
  };
}

/** Decrypt the stored sensitive-field columns back into API-facing values. */
export function decryptFields(stored: {
  salary_encrypted: Buffer | null;
  bank_details_encrypted: Buffer | null;
  national_id_encrypted: Buffer | null;
}): { salary: string | null; bank_account: string | null; bank_name: string | null; national_id: string | null } {
  let bank_account: string | null = null;
  let bank_name: string | null = null;
  const bankJson = decryptField(stored.bank_details_encrypted);
  if (bankJson) {
    const parts = JSON.parse(bankJson) as [string | null, string | null];
    bank_account = parts[0] ?? null;
    bank_name = parts[1] ?? null;
  }
  return {
    salary: decryptField(stored.salary_encrypted),
    bank_account,
    bank_name,
    national_id: decryptField(stored.national_id_encrypted),
  };
}
