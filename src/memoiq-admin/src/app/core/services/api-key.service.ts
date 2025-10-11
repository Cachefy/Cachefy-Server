import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService {
  /**
   * Generate a secure random API key in Base64 format
   */
  generateApiKey(): string {
    // Generate 32 random bytes (256 bits) for a strong key
    const keyLength = 32;
    const randomBytes = new Uint8Array(keyLength);

    // Use crypto.getRandomValues for secure random generation
    crypto.getRandomValues(randomBytes);

    // Convert to Base64
    const base64Key = this.arrayBufferToBase64(randomBytes);

    // Add prefix to identify it as a memoiq API key
    return `vtx_${base64Key}`;
  }

  /**
   * Generate a shorter display-friendly key ID
   */
  generateKeyId(): string {
    const idBytes = new Uint8Array(8);
    crypto.getRandomValues(idBytes);
    return this.arrayBufferToBase64(idBytes).substring(0, 12);
  }

  /**
   * Validate if a key follows the expected format
   */
  isValidApiKey(key: string): boolean {
    return key.startsWith('vtx_') && key.length >= 40;
  }

  /**
   * Get a masked version of the API key for display
   */
  maskApiKey(key: string): string {
    if (!key) return '—';
    if (key.length <= 8) return '****';

    const prefix = key.substring(0, 8);
    const suffix = key.substring(key.length - 4);
    return `${prefix}...${suffix}`;
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Generate API key metadata
   */
  generateKeyMetadata() {
    return {
      keyId: this.generateKeyId(),
      generatedAt: new Date().toISOString(),
      algorithm: 'Random-256',
      format: 'Base64-URL-Safe',
    };
  }
}
