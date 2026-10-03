/**
 * TransactionService — CDF Wallet
 * 
 * Service centralisé et réutilisable pour l'exécution sécurisée des transactions sur BNB Smart Chain (BSC) :
 * - Transfert natif de BNB
 * - Transfert BEP-20 de jetons CDF (Franc Congolais) via le contrat officiel :
 *   0x18e173fdeb700568a08d1d7049309ae322d27777 (18 décimales)
 * 
 * RÈGLES DE SÉCURITÉ INVIOLABLES :
 * - Aucune signature automatique. La signature n'intervient qu'après confirmation explicite.
 * - Aucune clé privée ou seed phrase n'est envoyée à Supabase, à un serveur distant, ni loguée.
 * - Le mot de passe local est utilisé pour déchiffrer la clé via SecureStorage.
 * - Protection stricte anti-double soumission (verrouillage atomique en vol).
 * - En mode Démonstration (VITE_DEMO_MODE), aucune clé privée n'est demandée et aucune transaction on-chain n'est signée.
 * - En cas d'échec on-chain, aucun faux succès n'est retourné.
 */

import { ethers } from 'ethers';
import { Network, TokenSymbol, TransactionStatus } from '../types';
import { CDF_CONTRACT_ADDRESS, CDF_DECIMALS } from '../config/tokens';
import { ERC20_BEP20_MINIMAL_ABI } from '../blockchain/abi';
import { blockchainService, GasEstimationResult } from '../blockchain/provider';
import { securityManager } from '../security';
import { secureStorage } from '../security';
import { supabaseService } from './supabase';
import { DEFAULT_PRICES } from '../tokens';

export interface ValidationParams {
  recipient: string;
  amount: string;
  tokenSymbol: TokenSymbol;
  senderTokenBalance: number;
  bnbBalance: number;
  estimatedGasBnb: number;
  network: Network;
  senderAddress?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
  warning?: string | null;
}

export interface GasEstimationParams {
  network: Network;
  tokenSymbol: TokenSymbol;
  recipient?: string;
  amount?: string;
  senderAddress?: string;
}

export interface ExecuteTransactionParams {
  recipient: string;
  amount: string;
  tokenSymbol: TokenSymbol;
  network: Network;
  senderAddress: string;
  isDemoMode: boolean;
  userPassword?: string; // Mot de passe pour déchiffrer si nécessaire
}

export interface TransactionExecutionResult {
  success: boolean;
  hash?: string;
  status: TransactionStatus;
  message: string;
  networkExplorerUrl?: string;
  gasFeeBnb?: string;
}

export class TransactionService {
  // Verrou anti-double soumission pour éviter les double-clics ou envois concurrents
  private inFlightTransactions = new Set<string>();

  /**
   * Valide rigoureusement les paramètres de transaction avant toute demande de confirmation
   */
  public validateTransferParams(params: ValidationParams): ValidationResult {
    const {
      recipient,
      amount,
      tokenSymbol,
      senderTokenBalance,
      bnbBalance,
      estimatedGasBnb,
      network,
      senderAddress,
    } = params;

    // 1. Validation de l'adresse destinataire
    if (!recipient || !recipient.trim()) {
      return { isValid: false, error: 'Veuillez saisir une adresse de destination.' };
    }

    const cleanRecipient = recipient.trim();
    if (!securityManager.validateAddress(cleanRecipient)) {
      return {
        isValid: false,
        error: 'Adresse EVM invalide (doit commencer par 0x et comporter 40 caractères hexadécimaux).',
      };
    }

    let warning: string | null = null;
    if (senderAddress && cleanRecipient.toLowerCase() === senderAddress.toLowerCase()) {
      warning = 'Attention : vous envoyez des fonds vers votre propre adresse de portefeuille.';
    }

    // 2. Validation du montant
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: 'Le montant saisi doit être supérieur à zéro.' };
    }

    // 3. Validation de la chaîne / réseau
    if (network.chainId !== 56 && network.chainId !== 97) {
      return {
        isValid: false,
        error: `Réseau non supporté pour les transactions BSC (Chain ID reçu : ${network.chainId}).`,
      };
    }

    // 4. Vérification du solde de l'actif envoyé
    if (numAmount > senderTokenBalance) {
      return {
        isValid: false,
        error: `Solde insuffisant en ${tokenSymbol}. Vous disposez de ${senderTokenBalance} ${tokenSymbol}.`,
      };
    }

    // 5. Vérification du solde BNB pour les frais de gas
    const minGasBnb = estimatedGasBnb > 0 ? estimatedGasBnb : 0.00075;

    if (tokenSymbol === 'BNB') {
      const totalBnbRequired = numAmount + minGasBnb;
      if (totalBnbRequired > bnbBalance) {
        return {
          isValid: false,
          error: `Solde BNB insuffisant pour payer le montant ET les frais de réseau BSC. Requis : ~${totalBnbRequired.toFixed(5)} BNB (votre solde : ${bnbBalance.toFixed(5)} BNB).`,
        };
      }
    } else {
      // Pour CDF (ou autre BEP-20) : vérifier impérativement la réserve de BNB pour le gas BSC
      if (bnbBalance < minGasBnb) {
        return {
          isValid: false,
          error: `Solde BNB insuffisant pour payer les frais de gas sur BNB Smart Chain. Vous devez détenir au moins ~${minGasBnb.toFixed(5)} BNB pour exécuter le transfert ${tokenSymbol} (votre solde : ${bnbBalance.toFixed(5)} BNB).`,
        };
      }
    }

    // 6. Vérification anti-double soumission
    const lockKey = `${senderAddress || 'unknown'}-${cleanRecipient.toLowerCase()}-${amount}-${tokenSymbol}`;
    if (this.inFlightTransactions.has(lockKey)) {
      return {
        isValid: false,
        error: 'Une transaction identique est actuellement en cours de traitement. Veuillez patienter.',
      };
    }

    return { isValid: true, error: null, warning };
  }

  /**
   * Estime le coût en gas pour un transfert (BNB ou Token CDF sur BSC)
   */
  public async estimateGas(params: GasEstimationParams): Promise<GasEstimationResult> {
    const { network, tokenSymbol, recipient, amount, senderAddress } = params;
    const isToken = tokenSymbol !== 'BNB';
    const bnbPrice = DEFAULT_PRICES.BNB.usdPrice;

    try {
      const provider = blockchainService.getProvider(network);
      const feeData = await provider.getFeeData();
      const gasPriceWei = feeData.gasPrice || ethers.parseUnits('3.0', 'gwei');
      const gasPriceGwei = ethers.formatUnits(gasPriceWei, 'gwei');

      let gasLimit = isToken ? 65000n : 21000n;

      // Tentative de simulation RPC si les paramètres sont complets
      if (recipient && amount && securityManager.validateAddress(recipient)) {
        try {
          if (!isToken) {
            const parsedVal = ethers.parseEther(amount);
            const est = await provider.estimateGas({
              to: ethers.getAddress(recipient.trim()),
              value: parsedVal,
              from: senderAddress ? ethers.getAddress(senderAddress) : undefined,
            });
            // Marge de sécurité 15%
            gasLimit = (est * 115n) / 100n;
          } else if (tokenSymbol === 'CDF') {
            const contract = new ethers.Contract(CDF_CONTRACT_ADDRESS, ERC20_BEP20_MINIMAL_ABI, provider);
            const parsedVal = ethers.parseUnits(amount, CDF_DECIMALS);
            const est = await contract.transfer.estimateGas(
              ethers.getAddress(recipient.trim()),
              parsedVal,
              { from: senderAddress ? ethers.getAddress(senderAddress) : undefined }
            );
            gasLimit = (est * 120n) / 100n;
          }
        } catch {
          // Si l'estimation dynamique échoue (par exemple solde insuffisant lors du calcul), repli sur les valeurs standards
          gasLimit = isToken ? 65000n : 21000n;
        }
      }

      const totalFeeWei = gasLimit * gasPriceWei;
      const gasFeeBnb = ethers.formatEther(totalFeeWei);
      const gasFeeUsd = parseFloat(gasFeeBnb) * bnbPrice;

      return {
        gasLimit,
        gasPriceGwei,
        gasFeeBnb,
        gasFeeUsd,
      };
    } catch {
      // Repli par défaut en cas d'indisponibilité temporaire RPC
      return blockchainService.estimateGasDetails(network, isToken, bnbPrice);
    }
  }

  /**
   * Exécute et diffuse une transaction réellement signée de manière non-custodiale
   */
  public async executeSend(params: ExecuteTransactionParams): Promise<TransactionExecutionResult> {
    return this.executeTransaction(params);
  }

  /**
   * Méthode standard pour l'exécution d'une transaction avec vérification stricte du mode démo
   */
  public async executeTransaction(params: ExecuteTransactionParams): Promise<TransactionExecutionResult> {
    const {
      recipient,
      amount,
      tokenSymbol,
      network,
      senderAddress,
      isDemoMode,
      userPassword,
    } = params;

    // Protection Démo stricte
    if (isDemoMode) {
      return {
        success: false,
        status: 'failed',
        message: 'Mode Démonstration actif : l’envoi réel sur la blockchain est désactivé. Aucune signature on-chain n’a été exécutée.',
      };
    }

    const cleanRecipient = recipient.trim();
    if (!securityManager.validateAddress(cleanRecipient)) {
      return {
        success: false,
        status: 'failed',
        message: 'Adresse destinataire invalide.',
      };
    }

    const checksumRecipient = ethers.getAddress(cleanRecipient);
    const lockKey = `${senderAddress.toLowerCase()}-${checksumRecipient.toLowerCase()}-${amount}-${tokenSymbol}`;

    // Vérification de verrou anti-double soumission
    if (this.inFlightTransactions.has(lockKey)) {
      return {
        success: false,
        status: 'failed',
        message: 'Une transaction identique est déjà en cours de transmission.',
      };
    }

    this.inFlightTransactions.add(lockKey);

    try {
      // 1. Déverrouillage sécurisé si un mot de passe a été fourni et requis
      if (userPassword) {
        const isUnlocked = await secureStorage.unlock(userPassword);
        if (!isUnlocked) {
          return {
            success: false,
            status: 'failed',
            message: 'Mot de passe incorrect. Impossible de déverrouiller les clés de signature.',
          };
        }
      }

      // 2. Récupération locale et éphémère de la clé privée depuis SecureStorage
      let privateKey = await secureStorage.getWalletPrivateKey(senderAddress);
      if (!privateKey) {
        return {
          success: false,
          status: 'failed',
          message: 'Portefeuille verrouillé ou clé privée introuvable. Veuillez déverrouiller votre portefeuille avec votre mot de passe.',
        };
      }

      // 3. Initialisation éphémère du signataire
      const provider = blockchainService.getProvider(network);
      const wallet = new ethers.Wallet(privateKey, provider);

      // 4. Nettoyage immédiat de la référence locale de la clé brute
      privateKey = '';

      let txHash = '';
      let gasFeeEstimated = '0.00075';

      // 5. Exécution de la transaction selon l'actif
      if (tokenSymbol === 'BNB') {
        // --- TRANSACTION NATIVE BNB ---
        const parsedValue = ethers.parseEther(amount);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits('3.0', 'gwei');
        const gasLimit = 21000n;
        gasFeeEstimated = ethers.formatEther(gasLimit * gasPrice);

        const tx = await wallet.sendTransaction({
          to: checksumRecipient,
          value: parsedValue,
          gasLimit,
          gasPrice,
        });

        txHash = tx.hash;
      } else if (tokenSymbol === 'CDF') {
        // --- TRANSACTION BEP-20 DU CONTRAT OFFICIEL CDF ---
        // Contrat : 0x18e173fdeb700568a08d1d7049309ae322d27777 (18 décimales)
        const cdfContract = new ethers.Contract(CDF_CONTRACT_ADDRESS, ERC20_BEP20_MINIMAL_ABI, wallet);
        const parsedTokens = ethers.parseUnits(amount, CDF_DECIMALS);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits('3.0', 'gwei');
        const gasLimit = 65000n;
        gasFeeEstimated = ethers.formatEther(gasLimit * gasPrice);

        const tx = await cdfContract.transfer(checksumRecipient, parsedTokens, {
          gasLimit,
          gasPrice,
        });

        txHash = tx.hash;
      } else {
        throw new Error(`Actif non supporté : ${tokenSymbol}`);
      }

      // 6. Enregistrement des métadonnées NON-SENSIBLES dans Supabase
      try {
        await supabaseService.syncTransactionMetadata({
          user_id: 'local-user',
          tx_hash: txHash,
          from_address: senderAddress,
          to_address: checksumRecipient,
          token_symbol: tokenSymbol,
          amount,
          network: network.name,
          chain_id: network.chainId,
          status: 'pending',
          fee: gasFeeEstimated,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[SupabaseSync] Non-bloquant :', err);
      }

      return {
        success: true,
        hash: txHash,
        status: 'pending',
        message: `Transaction diffusée avec succès sur le réseau ${network.name}. En attente de confirmation...`,
        networkExplorerUrl: `${network.blockExplorerUrl}/tx/${txHash}`,
        gasFeeBnb: gasFeeEstimated,
      };
    } catch (err: unknown) {
      const errorMessage = this.parseBlockchainError(err);
      return {
        success: false,
        status: 'failed',
        message: errorMessage,
      };
    } finally {
      this.inFlightTransactions.delete(lockKey);
    }
  }

  /**
   * Attend la confirmation d'une transaction sur la BNB Smart Chain
   */
  public async waitForConfirmation(
    txHash: string,
    network: Network,
    timeoutMs = 60000
  ): Promise<{ confirmed: boolean; blockNumber?: number; error?: string }> {
    try {
      const provider = blockchainService.getProvider(network);
      const receipt = await provider.waitForTransaction(txHash, 1, timeoutMs);

      if (!receipt) {
        return { confirmed: false, error: 'Délai d’attente dépassé pour la confirmation on-chain.' };
      }

      if (receipt.status === 1) {
        return { confirmed: true, blockNumber: receipt.blockNumber };
      } else {
        return { confirmed: false, error: 'La transaction a été rejetée ou a échoué on-chain.' };
      }
    } catch (err: unknown) {
      return { confirmed: false, error: (err as Error)?.message || 'Erreur de confirmation on-chain.' };
    }
  }

  /**
   * Traduit les erreurs RPC / EVM en messages compréhensibles en français
   */
  private parseBlockchainError(error: unknown): string {
    if (!error) return 'Une erreur inconnue est survenue lors de la transaction.';
    const str = String(error);
    const message = (error as { message?: string })?.message || str;

    if (message.includes('insufficient funds') || message.includes('INSUFFICIENT_FUNDS')) {
      return 'Fonds insuffisants pour couvrir le montant envoyé et les frais de gas BNB sur BNB Smart Chain.';
    }
    if (message.includes('gas required exceeds allowance') || message.includes('out of gas')) {
      return 'Limite de gas insuffisante pour exécuter le contrat.';
    }
    if (message.includes('user rejected') || message.includes('ACTION_REJECTED')) {
      return 'La transaction a été annulée par l’utilisateur.';
    }
    if (message.includes('nonce too low') || message.includes('NONCE_EXPIRED')) {
      return 'Erreur de synchronisation du nonce. Veuillez rafraîchir et réessayer.';
    }
    if (message.includes('CALL_EXCEPTION')) {
      return 'Échec lors de l’appel du contrat. Vérifiez votre solde et l’adresse destinataire.';
    }
    if (message.includes('NETWORK_ERROR') || message.includes('timeout')) {
      return 'Délai dépassé ou indisponibilité du nœud RPC BNB Smart Chain. Vos fonds sont préservés.';
    }

    return `Erreur lors de la transaction : ${message.slice(0, 120)}`;
  }
}

export const transactionService = new TransactionService();
