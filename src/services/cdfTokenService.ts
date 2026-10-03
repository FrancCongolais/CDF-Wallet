/**
 * Service spécifique pour le Token CDF — Franc Congolais
 * 
 * Centralise toutes les opérations de lecture et d'interrogation du contrat CDF :
 * - Contrat officiel immuable : 0x18e173fdeb700568a08d1d7049309ae322d27777
 * - Décimales : 18
 * - Symbole officiel : CDF
 * - Nom officiel : Franc Congolais (JAMAIS "FC")
 * - Réseau : BNB Smart Chain
 * 
 * RÈGLE STRICTE :
 * Aucune clé privée ou seed phrase n'est requise ni manipulée par ce service de lecture.
 */

import { ethers } from 'ethers';
import { Network } from '../types';
import { CDF_CONTRACT_ADDRESS, CDF_DECIMALS, CDF_TOKEN_SYMBOL, CDF_TOKEN_NAME } from '../config/tokens';
import { ERC20_BEP20_MINIMAL_ABI } from '../blockchain/abi';
import { securityManager } from '../security/SecurityManager';
import { getRpcEndpointsForNetwork } from '../config/networks';

export interface CdfTokenMetadata {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
}

export class CDFTokenService {
  public readonly contractAddress = CDF_CONTRACT_ADDRESS;
  public readonly decimals = CDF_DECIMALS;
  public readonly symbol = CDF_TOKEN_SYMBOL;
  public readonly name = CDF_TOKEN_NAME;

  /**
   * Lit le solde réel de jetons CDF pour une adresse donnée sur la BNB Smart Chain
   * Appelle la méthode balanceOf(address) du contrat officiel
   */
  public async getBalance(walletAddress: string, network: Network): Promise<{ balance: string; rawBalance: bigint; error?: string }> {
    if (!walletAddress || !securityManager.validateAddress(walletAddress)) {
      return {
        balance: '0.0',
        rawBalance: 0n,
        error: 'Adresse de portefeuille invalide',
      };
    }

    const checksumAddress = ethers.getAddress(walletAddress);
    const rpcList = getRpcEndpointsForNetwork(network);

    let lastError: string | undefined;

    // Tentative sur les RPCs disponibles (avec bascule automatique)
    for (const rpcUrl of rpcList) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
          name: network.name,
          chainId: network.chainId,
        });

        const contract = new ethers.Contract(this.contractAddress, ERC20_BEP20_MINIMAL_ABI, provider);
        const rawBalance: bigint = await contract.balanceOf(checksumAddress);
        const formatted = ethers.formatUnits(rawBalance, this.decimals);

        return {
          balance: formatted,
          rawBalance,
        };
      } catch (err: unknown) {
        lastError = (err as Error)?.message || 'Erreur RPC lors de la lecture du contrat CDF';
        continue;
      }
    }

    return {
      balance: '0.0',
      rawBalance: 0n,
      error: `Impossible de contacter BNB Smart Chain pour le contrat CDF (${lastError?.slice(0, 80)})`,
    };
  }

  /**
   * Récupère les métadonnées vérifiées on-chain du token CDF
   */
  public async getOnChainMetadata(network: Network): Promise<CdfTokenMetadata> {
    const rpcList = getRpcEndpointsForNetwork(network);

    for (const rpcUrl of rpcList) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, {
          name: network.name,
          chainId: network.chainId,
        });
        const contract = new ethers.Contract(this.contractAddress, ERC20_BEP20_MINIMAL_ABI, provider);

        const [onChainName, onChainSymbol, onChainDecimals, onChainTotalSupply] = await Promise.all([
          contract.name().catch(() => this.name),
          contract.symbol().catch(() => this.symbol),
          contract.decimals().catch(() => this.decimals),
          contract.totalSupply().catch(() => 0n),
        ]);

        return {
          contractAddress: this.contractAddress,
          name: onChainName || this.name,
          symbol: onChainSymbol || this.symbol,
          decimals: Number(onChainDecimals) || this.decimals,
          totalSupply: ethers.formatUnits(onChainTotalSupply, Number(onChainDecimals) || this.decimals),
        };
      } catch {
        continue;
      }
    }

    // Valeurs garanties par la configuration officielle
    return {
      contractAddress: this.contractAddress,
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
    };
  }
}

export const cdfTokenService = new CDFTokenService();
