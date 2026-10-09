const crypto = require("crypto");

/**
 * EncryptionService
 * Implements AES-256-GCM authenticated encryption and decryption.
 * Format: aes256gcm:<keyVersion>:<ivHex>:<authTagHex>:<ciphertextHex>
 */
class EncryptionService {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.ivLength = 12; // 96-bit recommended for GCM
    this.currentKeyVersion = "v1";
    this.keys = {
      v1: this._resolveKey(process.env.ENCRYPTION_KEY_V1 || process.env.ENCRYPTION_SECRET || "printz_default_master_encryption_key_2026_aes256_secret"),
    };
  }

  _resolveKey(keyString) {
    if (!keyString) {
      throw new Error("Missing encryption key configuration.");
    }
    // Derive exactly 32 bytes (256 bits) using SHA-256 hash if not already 32 bytes
    return crypto.createHash("sha256").update(String(keyString)).digest();
  }

  /**
   * Encrypt plaintext string into AES-256-GCM formatted string
   * @param {string} text
   * @param {string} [keyVersion='v1']
   * @returns {string}
   */
  encrypt(text, keyVersion = this.currentKeyVersion) {
    if (text === null || text === undefined || text === "") {
      return "";
    }

    const key = this.keys[keyVersion];
    if (!key) {
      throw new Error(`Encryption key version '${keyVersion}' not found.`);
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let ciphertext = cipher.update(String(text), "utf8", "hex");
    ciphertext += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");
    const ivHex = iv.toString("hex");

    return `aes256gcm:${keyVersion}:${ivHex}:${authTag}:${ciphertext}`;
  }

  /**
   * Decrypt AES-256-GCM formatted string back to plaintext
   * @param {string} encryptedText
   * @returns {string}
   */
  decrypt(encryptedText) {
    if (!encryptedText || typeof encryptedText !== "string") {
      return "";
    }

    if (encryptedText.startsWith("aes256gcm:")) {
      const parts = encryptedText.split(":");
      if (parts.length !== 5) {
        throw new Error("Malformed encrypted token structure.");
      }

      const [, keyVersion, ivHex, authTagHex, ciphertextHex] = parts;
      const key = this.keys[keyVersion];
      if (!key) {
        throw new Error(`Decryption key version '${keyVersion}' not registered.`);
      }

      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    }

    // Backward-compatibility fallback: legacy Base64 decoding during migration window
    try {
      return Buffer.from(encryptedText, "base64").toString("utf8");
    } catch {
      return encryptedText;
    }
  }

  /**
   * Masks a bank account or sensitive string, keeping only the last 4 characters visible.
   * @param {string} plainText
   * @returns {string}
   */
  mask(plainText) {
    if (!plainText || typeof plainText !== "string") return "";
    const clean = plainText.trim();
    if (clean.length <= 4) return "•".repeat(clean.length);
    return "•".repeat(clean.length - 4) + clean.slice(-4);
  }
}

module.exports = new EncryptionService();
