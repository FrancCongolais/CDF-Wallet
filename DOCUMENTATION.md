# Documentation Technique — CDF Wallet

## 1. Vue d'ensemble

**CDF Wallet** est une application de portefeuille crypto décentralisée, non-custodiale et multiplateforme.
Elle est optimisée pour l'écosystème **BNB Smart Chain** et intègre nativement le token **CDF — Franc Congolais** ainsi que **BNB** et **USDT**.

## 2. Token CDF — Franc Congolais

- **Nom officiel de l'application** : `CDF Wallet`
- **Nom du token** : `CDF — Franc Congolais`
- **Symbole** : `CDF`
- **Règle absolue** : La dénomination « FC » ne doit jamais être employée pour désigner le projet ou le token.
- **Adresse de contrat BSC** : `0x18e173fdeb700568a08d1d7049309ae322d27777`
- **Décimales** : `18`
- **Réseau** : BNB Smart Chain (Chain ID Mainnet: `56`, Testnet: `97`)

## 3. Architecture Modulaire

Le projet suit une organisation progressive conforme aux exigences de scalabilité :

```
src/
├── blockchain/      # Gestionnaires EVM, clients RPC, ABI standard ERC-20 / BEP-20
├── config/          # Source unique de vérité pour les réseaux et tokens (tokens.ts, networks.ts)
├── security/        # SecurityManager, SecureStorage, sanitizers, validation des adresses
├── storage/         # Interfaces de persistance sécurisée et locale
├── tokens/          # Définition des actifs (BNB, CDF, USDT), formats, calculs de valeurs
├── wallet/          # État du portefeuille, interfaces de dérivation, sessions
├── services/        # Intégrations externes (architecture Supabase non-sensible, provider démo vs réel)
├── qr/              # Générateur et scanner de codes QR pour adresses et paiements
├── types/           # Déclarations TypeScript strictes (Asset, Token, Transaction, Network...)
├── hooks/           # Hooks React personnalisés (useWallet, useNetwork, useTheme, etc.)
├── components/      # Composants UI modulaires réutilisables
├── layouts/         # Layouts responsives (Mobile bottom bar, Desktop header/sidebar)
└── pages/           # Pages de navigation (/ , /wallet, /send, /receive, /scan, etc.)

apps/                # Préparation multi-plateforme
├── web/
├── android/
└── ios/

packages/            # Modules partagés futurs (Monorepo readiness)
├── wallet-core/
├── blockchain/
├── security/
├── tokens/
└── shared/
```

## 4. Politique de Sécurité & Non-Custodialité

1. **Clés privées** : Dérivées et stockées exclusivement sur le terminal de l'utilisateur (via SecureStorage chiffré).
2. **Supabase** : Strictement cantonné aux données non-sensibles (préférences de langue, devise, métadonnées publiques, notifications opt-in). Supabase n'a jamais connaissance des clés ou de la seed phrase.
3. **Séparation Démo / Réel** : Aucune fausse transaction n'est maquillée en transaction blockchain réelle. Les transactions simulées sont estampillées "Mode démonstration".

## 5. Prochaines Évolutions

Module suivant prioritaire :
- **CDF Wallet Core** : Génération de mnémonique sécurisée (BIP-39), dérivation d'adresses (BIP-44 m/44'/60'/0'/0/0), signature locale sécurisée et stockage chiffré via mot de passe / biométrie.
