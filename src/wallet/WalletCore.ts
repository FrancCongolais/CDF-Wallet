/**
 * WalletCore — CDF Wallet
 * 
 * Moteur cryptographique non-custodial pour CDF Wallet :
 * - Génération locale de seed phrase BIP-39 (12 mots) via ethers.js
 * - Dérivation de portefeuille HD EVM selon le standard BIP-44 (m/44'/60'/0'/0/x)
 * - Validation rigoureuse de la phrase mnémonique et des clés privées
 * - Restauration / importation de portefeuille
 * 
 * RÈGLES DE SÉCURITÉ ABSOLUES :
 * - Toutes les clés et phrases mnémoniques sont générées et traitées LOCALEMENT dans le navigateur.
 * - Ne JAMAIS envoyer de clés privées ou mnémoniques à un serveur ou Supabase.
 * - Ne JAMAIS consigner de clés privées ou phrases de récupération dans la console (console.log/warn/error).
 */

import { ethers } from 'ethers';
import { WalletAccount } from '../types';
import { securityManager } from '../security/SecurityManager';

export interface GeneratedWalletData {
  account: WalletAccount;
  mnemonic: string;
  privateKey: string;
}

export interface RestoredWalletData {
  account: WalletAccount;
  mnemonic?: string;
  privateKey: string;
}

export class WalletCore {
  public static readonly DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0/0";

  /**
   * Génère localement un nouveau portefeuille avec une seed phrase BIP-39 de 12 mots
   */
  public static generateWallet(accountName = 'Portefeuille Principal', pathIndex = 0): GeneratedWalletData {
    // Génère une entropie cryptographique aléatoire locale
    const path = `m/44'/60'/0'/0/${pathIndex}`;
    const randomWallet = ethers.HDNodeWallet.createRandom(undefined, path);

    if (!randomWallet.mnemonic) {
      throw new Error('Échec de génération de la phrase de récupération mnémonique');
    }

    const mnemonicPhrase = randomWallet.mnemonic.phrase;
    const address = ethers.getAddress(randomWallet.address); // Checksum EIP-55
    const privateKey = randomWallet.privateKey;

    const account: WalletAccount = {
      address,
      name: accountName,
      pathIndex,
      derivationPath: path,
      createdAt: Date.now(),
    };

    return {
      account,
      mnemonic: mnemonicPhrase,
      privateKey,
    };
  }

  /**
   * Valide une phrase mnémonique BIP-39 (12 ou 24 mots)
   */
  public static validateMnemonic(phrase: string): boolean {
    if (!phrase || typeof phrase !== 'string') return false;
    const cleanPhrase = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
    const words = cleanPhrase.split(' ');
    if (words.length !== 12 && words.length !== 24) {
      return false;
    }
    return ethers.Mnemonic.isValidMnemonic(cleanPhrase);
  }

  /**
   * Restaure un portefeuille à partir d'une seed phrase mnémonique
   */
  public static importFromMnemonic(
    phrase: string,
    accountName = 'Portefeuille Importé',
    pathIndex = 0
  ): RestoredWalletData {
    const cleanPhrase = phrase.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!this.validateMnemonic(cleanPhrase)) {
      throw new Error('Phrase de récupération invalide. Veuillez vérifier vos 12 ou 24 mots.');
    }

    const path = `m/44'/60'/0'/0/${pathIndex}`;
    const hdWallet = ethers.HDNodeWallet.fromPhrase(cleanPhrase, undefined, path);
    const address = ethers.getAddress(hdWallet.address); // Checksum EIP-55

    const account: WalletAccount = {
      address,
      name: accountName,
      pathIndex,
      derivationPath: path,
      createdAt: Date.now(),
    };

    return {
      account,
      mnemonic: cleanPhrase,
      privateKey: hdWallet.privateKey,
    };
  }

  /**
   * Importe un portefeuille à partir d'une clé privée hexadécimale (64 caractères)
   */
  public static importFromPrivateKey(
    privateKey: string,
    accountName = 'Compte Clé Privée'
  ): RestoredWalletData {
    let cleanKey = privateKey.trim();
    if (!cleanKey.startsWith('0x')) {
      cleanKey = `0x${cleanKey}`;
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
      throw new Error('Clé privée invalide. Elle doit comporter 64 caractères hexadécimaux.');
    }

    const wallet = new ethers.Wallet(cleanKey);
    const address = ethers.getAddress(wallet.address);

    const account: WalletAccount = {
      address,
      name: accountName,
      pathIndex: 0,
      derivationPath: 'Clé privée directe (sans dérivation)',
      createdAt: Date.now(),
    };

    return {
      account,
      privateKey: cleanKey,
    };
  }

  /**
   * Crée une instance Signer connectée pour une exécution blockchain réelle
   */
  public static getSigner(privateKey: string, provider: ethers.Provider): ethers.Wallet {
    return new ethers.Wallet(privateKey, provider);
  }
}
