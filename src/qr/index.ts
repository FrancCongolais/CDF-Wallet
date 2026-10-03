/**
 * Service QR Code pour CDF Wallet
 * Génération de QR code haute résolution et parsing d'adresses/URIs EIP-681
 */

import QRCode from 'qrcode';

export interface QrPaymentData {
  address: string;
  amount?: string;
  token?: string;
  chainId?: number;
}

export class QrService {
  /**
   * Génère une data URL image PNG à partir d'une adresse ou chaîne
   */
  public async generateQrCodeDataUrl(text: string, options?: { width?: number; margin?: number }): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        width: options?.width || 280,
        margin: options?.margin || 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      console.error('Erreur génération QR Code:', err);
      return '';
    }
  }

  /**
   * Formate une URI de paiement crypto standard (EIP-681)
   */
  public formatPaymentUri(data: QrPaymentData): string {
    const { address, amount, token } = data;
    let uri = `ethereum:${address}`;
    const params: string[] = [];

    if (amount) {
      params.push(`value=${encodeURIComponent(amount)}`);
    }
    if (token) {
      params.push(`token=${encodeURIComponent(token)}`);
    }

    if (params.length > 0) {
      uri += `?${params.join('&')}`;
    }
    return uri;
  }

  /**
   * Analyse une chaîne issue d'un scan QR pour extraire l'adresse de destination
   */
  public parseScannedData(raw: string): { address: string; amount?: string; token?: string } {
    const trimmed = raw.trim();
    if (trimmed.startsWith('ethereum:')) {
      const withoutPrefix = trimmed.replace('ethereum:', '');
      const parts = withoutPrefix.split('?');
      const address = parts[0];
      const result: { address: string; amount?: string; token?: string } = { address };

      if (parts[1]) {
        const queryParams = new URLSearchParams(parts[1]);
        const val = queryParams.get('value');
        const tok = queryParams.get('token');
        if (val) result.amount = val;
        if (tok) result.token = tok;
      }
      return result;
    }

    return { address: trimmed };
  }
}

export const qrService = new QrService();
