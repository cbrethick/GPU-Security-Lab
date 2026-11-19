import type { HashAlgorithm } from '../types';
import { md5, toHex } from './md5';

export const webCryptoAvailable = typeof crypto !== 'undefined' && !!crypto.subtle;

export type Normalization = 'none' | 'trim' | 'nfc' | 'lower';

export function normalize(input: string, mode: Normalization): string {
  switch (mode) {
    case 'trim': return input.trim();
    case 'nfc': return input.normalize('NFC');
    case 'lower': return input.toLowerCase();
    default: return input;
  }
}

export async function hashText(text: string, algo: HashAlgorithm): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  return hashBytes(bytes, algo);
}

export async function hashBytes(bytes: Uint8Array, algo: HashAlgorithm): Promise<string> {
  if (algo === 'MD5') return md5(bytes);
  if (!webCryptoAvailable) {
    throw new Error('Web Crypto API is unavailable. Open the app over https:// or http://localhost.');
  }
  const digest = await crypto.subtle.digest(algo, bytes);
  return toHex(new Uint8Array(digest));
}

/** Number of differing bits between two equal-length hex strings (avalanche demo). */
export function bitDifference(hexA: string, hexB: string): { diff: number; total: number } {
  const len = Math.min(hexA.length, hexB.length);
  let diff = 0;
  for (let i = 0; i < len; i++) {
    let x = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    while (x) { diff += x & 1; x >>= 1; }
  }
  return { diff, total: len * 4 };
}

export interface AlgorithmInfo {
  name: HashAlgorithm;
  bits: number;
  status: 'Broken' | 'Legacy / Insecure' | 'Secure';
  tone: 'critical' | 'warning' | 'good';
  useCases: string[];
  limitations: string[];
  source: 'Web Crypto API' | 'JavaScript (educational)';
}

export const ALGORITHMS: AlgorithmInfo[] = [
  {
    name: 'SHA-256', bits: 256, status: 'Secure', tone: 'good', source: 'Web Crypto API',
    useCases: ['File & download integrity checks', 'Digital signatures (with RSA/ECDSA)', 'HMAC-SHA256 message authentication', 'Blockchain / Merkle trees'],
    limitations: ['Designed to be fast — unsuitable alone for password storage', 'No built-in salt', 'Vulnerable to length-extension if misused as a MAC (use HMAC)'],
  },
  {
    name: 'SHA-512', bits: 512, status: 'Secure', tone: 'good', source: 'Web Crypto API',
    useCases: ['Integrity checks needing a larger digest', 'HMAC-SHA512', 'Building block in PBKDF2 / Ed25519'],
    limitations: ['Still a fast hash — not a password hashing function on its own', 'No built-in salt', 'Larger output costs more storage'],
  },
  {
    name: 'SHA-1', bits: 160, status: 'Legacy / Insecure', tone: 'warning', source: 'Web Crypto API',
    useCases: ['Legacy compatibility only (e.g. old Git object IDs)', 'Non-security checksums'],
    limitations: ['Practical collisions demonstrated (SHAttered, 2017)', 'Deprecated by NIST; browsers reject SHA-1 TLS certificates', 'Never use for signatures or passwords'],
  },
  {
    name: 'MD5', bits: 128, status: 'Broken', tone: 'critical', source: 'JavaScript (educational)',
    useCases: ['Non-security checksums for accidental corruption', 'Legacy system analysis in a lab'],
    limitations: ['Cryptographically broken — collisions can be generated in seconds', 'Extremely fast on GPUs', 'Must never be used for passwords, signatures, or certificates'],
  },
];
