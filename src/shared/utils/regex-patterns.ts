/**
 * Centralized regular expressions for Data Loss Prevention (DLP) and pattern sanitization.
 */

export const DLP_PATTERNS = {
  // Common credit cards with or without dashes/spaces (Visa, MasterCard, Amex, Discover)
  CREDIT_CARD: /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|6(?:011|5[0-9]{2}))[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b|\b3[47][0-9]{2}[-\s]?[0-9]{6}[-\s]?[0-9]{5}\b/g,

  // US Social Security Numbers
  US_SSN: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,

  // AWS Access Key ID
  AWS_ACCESS_KEY_ID: /\b(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,

  // AWS Secret Access Key (heuristically 40 chars in base64 format after an identifier or context)
  AWS_SECRET_KEY: /(?:aws_secret_access_key|secret_key|aws_secret)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,

  // Authorization Bearer Header
  BEARER_TOKEN: /\bBearer\s+[a-zA-Z0-9\-._~+/]{15,}=*\b/gi,

  // JSON Web Tokens (JWT)
  JWT: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,

  // RSA/OpenSSH/PGP/EC Private Keys
  PRIVATE_KEY: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g,

  // Standard email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,

  // OpenAI / Anthropic / Generic API keys (e.g. sk-...)
  AI_API_KEY: /\b(?:sk-[a-zA-Z0-9]{20,}|anthropic-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36})\b/g,
};
