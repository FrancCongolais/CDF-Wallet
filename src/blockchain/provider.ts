/**
 * Service Blockchain Centralisé pour BNB Smart Chain (BSC)
 * 
 * Assure la lecture réelle et résiliente de la blockchain :
 * - Prise en compte prioritaire de VITE_BSC_MAINNET_RPC et VITE_BSC_TESTNET_RPC
 * - Nœuds RPC de secours avec bascule automatique
 * - Vérification de l'état de connexion au réseau (Connecté, Chargement, Erreur)
 * - Mesure de latence RPC et numéro du dernier bloc
 * - Lecture réelle du solde BNB natif
 * - Intégration du service de lecture du contrat officiel CDF (balanceOf)
 * 
 * RÈGLES DE SÉCURITÉ :
 * - Aucune clé privée hardcodée.
 * - Aucune transaction réelle n'est diffusée à cette étape de lecture.
 * - Aucune transaction fictive n'est présentée comme réelle.
 * - Aucune transmission de seed phrase ou de secret cryptographique.
 */

import { ethers } from 'ethers';
import { Network, TokenSymbol } from '../types';
import { securityManager } from '../security/SecurityManager';
import { getRpcEndpointsForNetwork } from '../config/networks';
import { cdfTokenService } from '../services/cdfTokenService';

export type BlockchainConnectionState = 'idle' | 'loading' | 'connected' | 'error';

export interface NetworkHealthCheckResult {
  state: BlockchainConnectionState;
  isConnected: boolean;
  blockNumber?: number;
  latencyMs?: number;
  activeRpc?: string;
  error?: string;
}

export interface GasEstimationResult {
  gasLimit: bigint;
  gasPriceGwei: string;
  gasFeeBnb: string;
  gasFeeUsd: number;
}

export class BlockchainService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  /**
   * Obtient ou instancie un provider JSON-RPC pour le réseau spécifié
   */
  public getProvider(network: Network, specificRpcUrl?: string): ethers.JsonRpcProvider {
    const url = specificRpcUrl || network.rpcUrl;
    const key = `${network.chainId}-${url}`;
    if (!this.providers.has(key)) {
      const provider = new ethers.JsonRpcProvider(url, {
        name: network.name,
        chainId: network.chainId,
      });
      this.providers.set(key, provider);
    }
    return this.providers.get(key)!;
  }

  /**
   * Vérifie la connexion réelle au réseau BNB Smart Chain (Health Check)
   * Retourne l'état de la connexion, le dernier bloc et la latence
   */
  public async checkNetworkConnection(network: Network): Promise<NetworkHealthCheckResult> {
    const rpcList = getRpcEndpointsForNetwork(network);
    let lastError: string | undefined;

    for (const rpcUrl of rpcList) {
      const startTime = Date.now();
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
          name: network.name,
          chainId: network.chainId,
        });

        // Effectue une requête légère de bloc pour vérifier la vivacité du réseau
        const blockNumber = await provider.getBlockNumber();
        const latencyMs = Date.now() - startTime;

        return {
          state: 'connected',
          isConnected: true,
          blockNumber,
          latencyMs,
          activeRpc: rpcUrl,
        };
      } catch (err: unknown) {
        lastError = (err as Error)?.message || 'Nœud RPC indisponible';
        continue;
      }
    }

    return {
      state: 'error',
      isConnected: false,
      error: lastError || 'Tous les nœuds RPC BNB Smart Chain sont actuellement inaccessibles.',
    };
  }

  /**
   * Récupère le solde réel de BNB natif d'une adresse de portefeuille
   */
  public async getNativeBalance(
    address: string,
    network: Network
  ): Promise<{ balance: string; rawBalance: bigint; error?: string }> {
    if (!address || !securityManager.validateAddress(address)) {
      return {
        balance: '0.0',
        rawBalance: 0n,
        error: 'Adresse de portefeuille invalide',
      };
    }

    const checksumAddress = ethers.getAddress(address);
    const rpcList = getRpcEndpointsForNetwork(network);
    let lastError: string | undefined;

    for (const rpcUrl of rpcList) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
          name: network.name,
          chainId: network.chainId,
        });
        const rawBalance = await provider.getBalance(checksumAddress);
        const formatted = ethers.formatEther(rawBalance);

        return {
          balance: formatted,
          rawBalance,
        };
      } catch (err: unknown) {
        lastError = (err as Error)?.message || 'Erreur RPC lors de la lecture BNB';
        continue;
      }
    }

    return {
      balance: '0.0',
      rawBalance: 0n,
      error: `Impossible de récupérer le solde BNB (${lastError?.slice(0, 80)})`,
    };
  }

  /**
   * Lit le solde réel de jetons CDF via le service spécifique du contrat CDF
   */
  public async getCdfBalance(address: string, network: Network) {
    return cdfTokenService.getBalance(address, network);
  }

  /**
   * Lit le solde d'un contrat BEP-20 générique (ex: USDT)
   */
  public async getTokenBalance(
    contractAddress: string,
    walletAddress: string,
    network: Network,
    decimals = 18
  ): Promise<string> {
    if (!contractAddress || !walletAddress || !securityManager.validateAddress(walletAddress)) {
      return '0';
    }

    const provider = this.getProvider(network);
    const minErc20Abi = ['function balanceOf(address owner) view returns (uint256)'];
    const contract = new ethers.Contract(contractAddress, minErc20Abi, provider);
    const rawBalance = await contract.balanceOf(walletAddress);
    return ethers.formatUnits(rawBalance, decimals);
  }

  /**
   * Récupère le prix du gas en temps réel sur la BNB Smart Chain (en Gwei)
   */
  public async getGasPrice(network: Network): Promise<string> {
    const rpcList = getRpcEndpointsForNetwork(network);
    for (const rpcUrl of rpcList) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
          name: network.name,
          chainId: network.chainId,
        });
        const feeData = await provider.getFeeData();
        if (feeData.gasPrice) {
          return ethers.formatUnits(feeData.gasPrice, 'gwei');
        }
      } catch {
        continue;
      }
    }
    return '3.0'; // Standard moyen BSC
  }

  /**
   * Estime le coût en gas pour un transfert (BNB ou Token BEP-20)
   */
  public async estimateGasDetails(
    network: Network,
    isToken: boolean,
    bnbUsdPrice = 590.25
  ): Promise<GasEstimationResult> {
    const gasPriceGwei = await this.getGasPrice(network);
    const gasPriceWei = ethers.parseUnits(gasPriceGwei, 'gwei');

    // Transfert BNB natif standard = 21,000 gas | Transfert BEP-20 (ex: CDF) = ~60,000 gas
    const gasLimit = isToken ? 65000n : 21000n;
    const totalFeeWei = gasLimit * gasPriceWei;
    const gasFeeBnb = ethers.formatEther(totalFeeWei);
    const gasFeeUsd = parseFloat(gasFeeBnb) * bnbUsdPrice;

    return {
      gasLimit,
      gasPriceGwei,
      gasFeeBnb,
      gasFeeUsd,
    };
  }
}

export const blockchainService = new BlockchainService();
