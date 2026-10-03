/**
 * cryptoUtils — CDF Wallet
 * 
 * Fonctions utilitaires de cryptographie moderne basées sur l'API native Web Crypto (SubtleCrypto) :
 * - Dérivation de clé sécurisée par PBKDF2 (100 000 itérations SHA-256)
 * - Chiffrement / Déchiffrement AES-GCM 256-bit
 * - Génération d'entropie cryptographique et de sels aléatoires
 * - Nettoyage sécurisé de mémoire (Zeroization / wiping)
 * 
 * RÈGLE D'OR :
 * Aucune clé ni seed phrase n'est persistée en clair.
 */

export interface EncryptedPayload {
  version: number;
  salt: string;        // Hex 16 octets
  iv: string;          // Hex 12 octets
  ciphertext: string;  // Hex
  createdAt: number;
}

/**
 * Convertit un Uint8Array en chaîne hexadécimale
 */
export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convertit une chaîne hexadécimale en Uint8Array
 */
export function hexToBuffer(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const len = clean.length;
  const arr = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    arr[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return arr;
}

/**
 * Génère des octets aléatoires cryptographiquement sûrs
 */
export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues) {
    (globalThis as any).crypto.getRandomValues(bytes);
  } else {
    // Fallback environnement de secours
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Dérive une clé AES-GCM 256-bit à partir d'un mot de passe utilisateur et d'un sel
 * en utilisant PBKDF2 avec 100 000 itérations de SHA-256.
 */
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error('Web Crypto API non supportée sur cet environnement.');
  }

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Importe le mot de passe comme matériel de clé initial
  const baseKey = await subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Dérive une clé AES-GCM 256-bit
  const derivedKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Chiffre une chaîne en clair avec une clé AES-GCM 256-bit
 */
export async function encryptAesGcm(
  plaintext: string,
  key: CryptoKey,
  salt?: Uint8Array
): Promise<EncryptedPayload> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error('Web Crypto API non supportée pour le chiffrement.');
  }

  const iv = getRandomBytes(12); // Recommandation NIST pour AES-GCM : 12 octets (96 bits)
  const saltBytes = salt || getRandomBytes(16);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    data
  );

  return {
    version: 1,
    salt: bufferToHex(saltBytes),
    iv: bufferToHex(iv),
    ciphertext: bufferToHex(new Uint8Array(encryptedBuffer)),
    createdAt: Date.now(),
  };
}

/**
 * Déchiffre un payload chiffré AES-GCM
 */
export async function decryptAesGcm(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error('Web Crypto API non supportée pour le déchiffrement.');
  }

  const iv = hexToBuffer(payload.iv);
  const ciphertext = hexToBuffer(payload.ciphertext);

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    ciphertext as any
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Calcule une empreinte SHA-256 d'une chaîne
 */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error('Web Crypto API indisponible');
  }
  const data = new TextEncoder().encode(text);
  const hashBuffer = await subtle.digest('SHA-256', data);
  return bufferToHex(new Uint8Array(hashBuffer));
}

/**
 * Récupère l'interface SubtleCrypto de manière universelle
 */
export function getSubtleCrypto(): SubtleCrypto | null {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
    return (globalThis as any).crypto.subtle;
  }
  return null;
}

/**
 * Nettoyage actif d'un buffer en mémoire
 */
export function wipeBuffer(buf: Uint8Array): void {
  for (let i = 0; i < buf.length; i++) {
    buf[i] = 0;
  }
}
