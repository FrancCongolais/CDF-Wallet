# CDF Wallet

Portefeuille crypto moderne, professionnel et non-custodial pour **BNB Smart Chain**, intégrant nativement le token **CDF — Franc Congolais**, **BNB** et **USDT**.

## Identité & Spécifications du Projet

- **Nom du projet** : CDF Wallet
- **Token natif** : CDF — Franc Congolais (`CDF`)
- **Contrat officiel CDF (BSC)** : `0x18e173fdeb700568a08d1d7049309ae322d27777`
- **Décimales** : 18
- **Réseaux supportés** : BNB Smart Chain Mainnet (Chain ID 56) & Testnet (Chain ID 97)
- **Devise par défaut** : USD (avec conversion optionnelle)
- **Langue principale** : Français

> **Règle fondamentale** : Le terme « FC » ne doit jamais être utilisé pour désigner le projet ou le token.

## Fonctionnalités Clés (Étape 1)

- Architecture modulaire prête pour le multi-plateforme (Web, Android, iOS).
- Interface mobile-first élégante avec support complet Light / Dark mode.
- Écran d'accueil complet avec solde total consolidé, actions rapides (Envoyer, Recevoir, Acheter, Échanger), liste détaillée des actifs (`BNB`, `CDF — Franc Congolais`, `USDT`) et transactions récentes.
- Navigation complète : Accueil, Portefeuille, Envoyer, Recevoir, Scanner QR, Activité, Swap, DApps, Paramètres, Sécurité, À propos, et Parcours d'Onboarding en 5 étapes.
- Générateur de QR code dynamique pour les adresses de réception et simulateur de scanner de caméra.
- Module de Sécurité dédié (`SecurityManager`, `SecureStorage` abstractions) avec charte non-custodial inviolable.
- Architecture d'intégration Supabase prête pour les données non-sensibles (préférences, profils, notifications).
- Distinction stricte et transparente entre **Données de Démonstration** et **Données Réelles Blockchain**.
- Suite de tests d'intégrité et de vérification d'absence de secrets côté client.

## Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Lancement en développement
npm run dev

# Construction pour production
npm run build
```

## Structure du Répertoire

Consultez [DOCUMENTATION.md](./DOCUMENTATION.md) pour les détails d'architecture et [SECURITY.md](./SECURITY.md) pour les directives de sécurité non-custodial.
