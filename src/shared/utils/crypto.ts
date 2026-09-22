/**
 * Cryptographic utility using standard Web Crypto API (supported in SW, content scripts, and modern test runners).
 */

export async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Pure TypeScript fallback for environments where crypto.subtle is not configured
  return fallbackSha256(input);
}

/**
 * Deterministic fallback hash for edge cases where WebCrypto is stubbed/unavailable in test
 */
function fallbackSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    const idx = i >> 2;
    words[idx] = (words[idx] ?? 0) | (j << ((3 - (i % 4)) * 8));
  }

  const endIdx = ascii[lengthProperty] >> 2;
  words[endIdx] = (words[endIdx] ?? 0) | (0x80 << ((3 - (ascii[lengthProperty] % 4)) * 8));

  const totalWords = (((ascii[lengthProperty] + 8) >> 6) << 4) + 16;
  while (words.length < totalWords) {
    words.push(0);
  }
  words[totalWords - 1] = asciiBitLength;

  for (let block = 0; block < words.length; block += 16) {
    const w = words.slice(block, block + 16);
    const oldHash = [...hash];

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? (w[i] ?? 0) : (((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0);

      const a = hash[0]!;
      const b = hash[1]!;
      const c = hash[2]!;
      const d = hash[3]!;
      const e = hash[4]!;
      const f = hash[5]!;
      const g = hash[6]!;
      const h = hash[7]!;

      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + (k[i] ?? 0) + (w[i] ?? 0)) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      hash = [(temp1 + temp2) | 0, a, b, c, (d + temp1) | 0, e, f, g];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = ((hash[i] ?? 0) + (oldHash[i] ?? 0)) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = ((hash[i] ?? 0) >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}
