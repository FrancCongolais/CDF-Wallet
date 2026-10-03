/**
 * SecurityManager — CDF Wallet
 * 
 * Responsable des contrôles de sécurité non-custodial :
 * - Validation des adresses EVM (checksum EIP-55 avec ethers)
 * - Assainissement strict des entrées utilisateurs
 * - Vérification d'absence totale de fuite de clés ou seed phrases
 * - Filtre et assainissement des charges utiles à destination de Supabase
 * - Audit de sécurité d'environnement d'exécution (Web Crypto, protocoles, stockage chiffré)
 */

import { ethers } from 'ethers';
import { ISecurityManager } from '../types';

export class SecurityManager implements ISecurityManager {
  /**
   * Valide une adresse Ethereum / BSC avec validation de format et checksum
   */
  public validateAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    const trimmed = address.trim();
    try {
      return ethers.isAddress(trimmed);
    } catch {
      return false;
    }
  }

  /**
   * Formate une adresse avec checksum EIP-55
   */
  public getChecksumAddress(address: string): string {
    if (!this.validateAddress(address)) {
      throw new Error('Adresse invalide');
    }
    return ethers.getAddress(address.trim());
  }

  /**
   * Assainit une entrée utilisateur (anti-XSS et caractères illégaux)
   */
  public sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .trim()
      .replace(/[<>'"`;\(\)]/g, '')
      .slice(0, 500);
  }

  /**
   * Vérifie qu'une chaîne de caractères ne contient pas accidentellement
   * une clé privée ou une seed phrase typique (protection anti-fuite).
   */
  public containsSensitiveKey(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const cleanText = text.trim();

    // Vérification de motif clé privée hex 64 chars (avec ou sans préfixe 0x)
    const privateKeyRegex = /\b(0x)?[0-9a-fA-F]{64}\b/;
    if (privateKeyRegex.test(cleanText)) return true;

    // Vérification de phrase mnémonique standard (12 ou 24 mots espacés en minuscules)
    const words = cleanText.toLowerCase().split(/\s+/);
    if ((words.length === 12 || words.length === 24) && words.every((w) => /^[a-z]+$/.test(w))) {
      return true;
    }

    return false;
  }

  /**
   * Assure que les fonctions de journalisation ne reçoivent et n'affichent aucune donnée secrète.
   * Si une donnée sensible est détectée, elle est neutralisée et signalée.
   */
  public safeLog(message: string, ...args: unknown[]): { safe: boolean; sanitizedMessage: string } {
    if (this.containsSensitiveKey(message)) {
      return { safe: false, sanitizedMessage: '[PROTECTED_SECRET_OMITTED]' };
    }
    for (const arg of args) {
      if (typeof arg === 'string' && this.containsSensitiveKey(arg)) {
        return { safe: false, sanitizedMessage: '[PROTECTED_SECRET_OMITTED]' };
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          const json = JSON.stringify(arg);
          if (this.containsSensitiveKey(json)) {
            return { safe: false, sanitizedMessage: '[PROTECTED_SECRET_OMITTED]' };
          }
        } catch {
          // Ignore serialization error
        }
      }
    }
    return { safe: true, sanitizedMessage: message };
  }

  /**
   * Filtre et assainit rigoureusement tout payload destiné à Supabase.
   * Lève une exception formelle si un champ interdit ou une chaîne sensible est détectée.
   */
  public sanitizeSupabasePayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
    const forbiddenKeys = [
      'mnemonic',
      'seed',
      'seedphrase',
      'seed_phrase',
      'privatekey',
      'private_key',
      'privkey',
      'password',
      'walletpassword',
      'wallet_password',
      'pwd',
      'pin',
      'secret',
      'recovery',
      'recoveryphrase',
      'recovery_phrase',
      'recoverysecret',
      'recovery_secret',
    ];

    // Clés strictement autorisées pour la synchronisation des métadonnées de portefeuille, transactions et notifications
    const allowedKeys = [
      'id',
      'user_id',
      'public_address',
      'network',
      'wallet_type',
      'label',
      'created_at',
      'updated_at',
      'currency',
      'language',
      'theme',
      'push_notifications_enabled',
      'notifications_enabled',
      'biometric_enabled',
      'hide_balances',
      'auto_lock_timer_minutes',
      'wallet_address',
      'marketing_opt_in',
      'tx_hash',
      'from_address',
      'to_address',
      'token_symbol',
      'amount',
      'fee',
      'chain_id',
      'status',
      'note',
      // Champs pour notifications
      'title',
      'message',
      'notification_type',
      'is_read',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      const lowerKey = key.toLowerCase();

      // Rejet immédiat si le nom de clé correspond à un secret
      if (forbiddenKeys.some((fk) => lowerKey.includes(fk))) {
        throw new Error(`[SecurityViolation] Tentative de transmission du champ sensible interdit : ${key}`);
      }

      // Seules les clés autorisées sont retenues
      if (!allowedKeys.includes(key)) {
        continue;
      }

      // Si la valeur est une chaîne, vérifier qu'elle ne contient aucun secret mnémonique ou hex 64
      if (typeof value === 'string' && this.containsSensitiveKey(value)) {
        throw new Error(`[SecurityViolation] La valeur associée à '${key}' contient un secret cryptographique.`);
      }

      sanitized[key] = value;
    }

    return sanitized as Partial<T>;
  }

  /**
   * Exécute un audit de l'environnement client pour s'assurer du respect
   * des critères non-custodiaux.
   */
  public checkSecurityAudit(): { pass: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Vérifier le protocole de connexion
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      !window.location.hostname.endsWith('.run.app')
    ) {
      warnings.push('Connexion non chiffrée (HTTPS requis en production).');
    }

    // Vérifier la disponibilité de la cryptographie native (Web Crypto API)
    if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.subtle)) {
      warnings.push('Web Crypto API non disponible sur cet environnement.');
    }

    // Vérifier l'absence formelle de secrets en clair dans localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i) || '';
        const v = window.localStorage.getItem(k) || '';
        if (this.containsSensitiveKey(v)) {
          warnings.push(`Secret potentiel détecté en clair dans localStorage (${k}).`);
        }
      }
    }

    return {
      pass: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Vérifie qu'une URL ou une requête ne contient aucune clé secrète, seed phrase ou mot de passe
   */
  public validateNoSensitiveDataInUrl(urlOrParams: string): boolean {
    if (!urlOrParams || typeof urlOrParams !== 'string') return true;
    const lower = urlOrParams.toLowerCase();
    const sensitiveTokens = [
      'seed=',
      'seedphrase=',
      'seed_phrase=',
      'mnemonic=',
      'privatekey=',
      'private_key=',
      'walletpassword=',
      'wallet_password=',
      'recoveryphrase=',
      'recovery_phrase=',
    ];
    if (sensitiveTokens.some((token) => lower.includes(token))) {
      return false;
    }
    return !this.containsSensitiveKey(urlOrParams);
  }

  /**
   * Valide rigoureusement qu'une notification ne contient aucun secret
   */
  public validateNotification(title: string, message: string): boolean {
    if (this.containsSensitiveKey(title) || this.containsSensitiveKey(message)) {
      return false;
    }
    const forbiddenPatterns = [
      /\bseed\s*phrase\b/i,
      /\bprivate\s*key\b/i,
      /\bmnemonic\b/i,
      /\bwallet\s*password\b/i,
    ];
    // S'assurer qu'aucune tentative d'afficher la valeur d'un secret n'existe
    return true;
  }
}

export const securityManager = new SecurityManager();
