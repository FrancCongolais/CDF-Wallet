# Politique de Sécurité — CDF Wallet

## 1. Principes Fondamentaux Non-Custodial

CDF Wallet est conçu dès sa genèse selon des principes stricts de souveraineté financière :

- **Non-Custodial absolu** : L'utilisateur est l'unique détenteur de ses clés privées et de sa phrase mnémonique (seed phrase).
- **Zéro transmission de secrets** : Aucune phrase mnémonique, clé privée, ou code PIN en clair n'est jamais envoyé vers un serveur, une API externe, ou une base de données cloud (y compris Supabase).
- **Zéro journalisation sensible** : Aucun journal applicatif (console.log, Sentry, télémétrie) ne doit jamais intercepter ou afficher une clé privée ou une seed phrase.
- **Séparation cryptographique** : Les signatures de transactions sont générées exclusivement côté client (localement).

## 2. Invariants de Sécurité

1. **Interdiction de stockage distant de clés** : Tout stockage externe ou hébergé en nuage (Supabase, Firebase, S3, API REST) est strictement réservé aux données publiques ou préférences utilisateur (langue, devise d'affichage, contacts publics).
2. **Pas de clés en dur** : Aucun token sensible ni clé secrète n'est commité dans le dépôt Git ou le frontend.
3. **Validation rigoureuse des adresses** : Utilisation d'implémentations testées (`ethers.isAddress` avec checksum EIP-55) avant toute préparation de transaction.
4. **Contrat CDF unique et vérifié** :
   - Contrat officiel : `0x18e173fdeb700568a08d1d7049309ae322d27777`
   - Décimales : 18
   - Réseau : BNB Smart Chain (Chain ID: 56 Mainnet / 97 Testnet)

## 3. Architecture des Composants de Sécurité

- `SecurityManager` : Vérifie la politique de sécurité, la validation des entrées utilisateur, le verrouillage de session après inactivité et l'intégrité de l'environnement d'exécution.
- `SecureStorage` : Interface abstraite pour le stockage chiffré des clés (Keychain iOS, Keystore Android, Web Crypto API avec PBKDF2/AES-GCM sur Web).

## 4. Signalement d'une Vulnérabilité

Si vous identifiez une faille de sécurité ou une faiblesse potentielle dans l'architecture de CDF Wallet, merci d'écrire directement à l'équipe responsable sans divulgation publique préalable.
