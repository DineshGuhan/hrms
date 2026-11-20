import { encryptField, decryptField, encryptFields, decryptFields } from './employees.crypto.js';

// The crypto helper reads ENCRYPTION_KEY lazily, so setting it here (before
// the first encrypt call in this suite) is sufficient.
process.env.ENCRYPTION_KEY = 'test-encryption-key-0123456789abcdef0123456789abcdef';

describe('field encryption (AES-256-GCM, FR-EMP-05)', () => {
  it('round-trips encrypt then decrypt to the original value', () => {
    const secret = 'salary-850000';
    const stored = encryptField(secret);
    expect(decryptField(stored)).toBe(secret);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const a = encryptField('same-value');
    const b = encryptField('same-value');
    expect(a.equals(b)).toBe(false);
  });

  it('produces different ciphertexts for different plaintexts', () => {
    expect(encryptField('a').equals(encryptField('b'))).toBe(false);
  });

  it('decryptField returns null for null input', () => {
    expect(decryptField(null)).toBeNull();
  });

  it('encryptFields stores salary, bank details as JSON pair, and national id', () => {
    const stored = encryptFields({
      salary: '850000',
      bank_account: '1234567890',
      bank_name: 'HDFC',
      national_id: 'XXXX1234',
    });
    expect(stored.salary_encrypted).toBeInstanceOf(Buffer);
    expect(stored.bank_details_encrypted).toBeInstanceOf(Buffer);
    expect(stored.national_id_encrypted).toBeInstanceOf(Buffer);
    expect(decryptFields(stored)).toEqual({
      salary: '850000',
      bank_account: '1234567890',
      bank_name: 'HDFC',
      national_id: 'XXXX1234',
    });
  });

  it('encryptFields passes through nulls', () => {
    const stored = encryptFields({});
    expect(stored.salary_encrypted).toBeNull();
    expect(stored.bank_details_encrypted).toBeNull();
    expect(stored.national_id_encrypted).toBeNull();
    expect(decryptFields(stored)).toEqual({
      salary: null,
      bank_account: null,
      bank_name: null,
      national_id: null,
    });
  });

  it('tampered ciphertext fails to decrypt', () => {
    const stored = encryptField('secret');
    stored[stored.length - 1] ^= 0xff;
    expect(() => decryptField(stored)).toThrow();
  });
});
