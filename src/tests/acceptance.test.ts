/**
 * Tests Automatisés d'Acceptation — CDF Wallet
 * 
 * Couvre l'ensemble des exigences formelles :
 * A. Tests de configuration
 * B. Tests /settings
 * C. Tests /security
 * D. Tests Supabase
 * E. Tests de régression des routes
 */

import './setupEnv';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Configurations & Tokens
import {
  CDF_CONTRACT_ADDRESS,
  CDF_DECIMALS,
  CDF_TOKEN_SYMBOL,
  OFFICIAL_TOKENS,
  CDF_TREASURY_ADDRESS,
  FEE_CONFIG,
  MIN_AMOUNTS,
  MONTHLY_LIMITS,
  CDF_SUPPORT_EMAIL,
} from '../config/tokens';
import { SUPPORTED_NETWORKS, getRpcEndpointsForNetwork } from '../config/networks';

// Services & Sécurité
import { securityManager } from '../security';
import { secureStorage } from '../security';
import { cdfTokenService } from '../services/cdfTokenService';
import { transactionService } from '../services/transactionService';
import { checkBiometricsSupport } from '../security/biometrics';
import {
  AppStorage,
  ALLOWED_CURRENCIES,
  ALLOWED_LANGUAGES,
  ALLOWED_THEMES,
  ALLOWED_AUTO_LOCK_TIMERS,
  DEFAULT_USER_SETTINGS,
} from '../storage';
import { formatCryptoAmount, formatFiatValue } from '../blockchain/utils';
import { blockchainService } from '../blockchain/provider';

// Pages pour les tests de rendu
import { HomePage } from '../pages/HomePage';
import { WalletPage } from '../pages/WalletPage';
import { SendPage } from '../pages/SendPage';
import { ReceivePage } from '../pages/ReceivePage';
import { ScanPage } from '../pages/ScanPage';
import { ActivityPage } from '../pages/ActivityPage';
import { SwapPage } from '../pages/SwapPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SecurityPage } from '../pages/SecurityPage';
import { AboutPage } from '../pages/AboutPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { MerchantQrPage } from '../pages/MerchantQrPage';
import { DappsPage } from '../pages/DappsPage';
import { NotificationsPage } from '../pages/NotificationsPage';

// Providers wrappers pour le rendu des composants
import { WalletProvider } from '../wallet/WalletContext';
import { ThemeProvider } from '../hooks/useTheme';
import { NotificationProvider } from '../notifications';

export interface TestResult {
  group: string;
  name: string;
  passed: boolean;
  message?: string;
  file?: string;
}

function wrapWithProviders(component: React.ReactElement): React.ReactElement {
  return React.createElement(
    ThemeProvider,
    null,
    React.createElement(
      WalletProvider,
      null,
      React.createElement(NotificationProvider, null, component)
    )
  );
}

export async function runAllAcceptanceTests(): Promise<{
  results: TestResult[];
  groupStatus: Record<string, boolean>;
}> {
  const results: TestResult[] = [];

  const record = (group: string, name: string, passed: boolean, message?: string, file?: string) => {
    results.push({ group, name, passed, message, file });
  };

  // ==========================================
  // A. TESTS DE CONFIGURATION
  // ==========================================
  const groupConfig = 'Configuration';

  // A.1 VITE_DEMO_MODE est lu correctement
  try {
    const isDemo = AppStorage.isDemoModeActive();
    record(groupConfig, 'Lecture correcte du mode démonstration (VITE_DEMO_MODE)', typeof isDemo === 'boolean', undefined, 'src/storage/index.ts');
  } catch (err: any) {
    record(groupConfig, 'Lecture correcte du mode démonstration (VITE_DEMO_MODE)', false, err?.message, 'src/storage/index.ts');
  }

  // A.2 Contrat CDF officiel exact : 0x18e173fdeb700568a08d1d7049309ae322d27777
  const expectedContract = '0x18e173fdeb700568a08d1d7049309ae322d27777';
  const cdfMatches = CDF_CONTRACT_ADDRESS.toLowerCase() === expectedContract.toLowerCase();
  const cdfChecksumValid = securityManager.validateAddress(CDF_CONTRACT_ADDRESS);
  record(
    groupConfig,
    'Contrat CDF officiel immuable (0x18e173fdeb700568a08d1d7049309ae322d27777)',
    cdfMatches && cdfChecksumValid,
    `Adresse configurée: ${CDF_CONTRACT_ADDRESS}`,
    'src/config/tokens.ts'
  );

  // A.3 BSC Mainnet utilise Chain ID 56
  const mainnetChainIdValid = SUPPORTED_NETWORKS.bscMainnet?.chainId === 56;
  record(groupConfig, 'Réseau BSC Mainnet utilise Chain ID 56', mainnetChainIdValid, `Chain ID: ${SUPPORTED_NETWORKS.bscMainnet?.chainId}`, 'src/config/networks.ts');

  // A.4 BSC Testnet utilise Chain ID 97
  const testnetChainIdValid = SUPPORTED_NETWORKS.bscTestnet?.chainId === 97;
  record(groupConfig, 'Réseau BSC Testnet utilise Chain ID 97', testnetChainIdValid, `Chain ID: ${SUPPORTED_NETWORKS.bscTestnet?.chainId}`, 'src/config/networks.ts');

  // A.5 Aucun ancien symbole FC n'est utilisé comme symbole du token. Le symbole doit être CDF.
  const tokenSymbolMatches = CDF_TOKEN_SYMBOL === 'CDF' && OFFICIAL_TOKENS.CDF?.symbol === 'CDF';
  const tokensJson = JSON.stringify(OFFICIAL_TOKENS);
  const noForbiddenFcSymbol = !tokensJson.includes('"symbol":"FC"') && !tokensJson.includes('"FC"');
  record(
    groupConfig,
    'Symbole officiel strictement CDF (aucun ancien symbole FC)',
    tokenSymbolMatches && noForbiddenFcSymbol,
    `Symbole configuré: ${CDF_TOKEN_SYMBOL}`,
    'src/config/tokens.ts'
  );

  // A.6 Adresse publique officielle de trésorerie / créateur : 0x0E9dBe33a4fb33Fc9e6595A154538D721965401b
  const expectedTreasury = '0x0E9dBe33a4fb33Fc9e6595A154538D721965401b';
  const treasuryMatches = CDF_TREASURY_ADDRESS.toLowerCase() === expectedTreasury.toLowerCase();
  record(
    groupConfig,
    'Trésorerie officielle et adresse administrateur (0x0E9...401b)',
    treasuryMatches,
    `Trésorerie: ${CDF_TREASURY_ADDRESS}`,
    'src/config/tokens.ts'
  );

  // A.7 Grille des frais validée (2 % envoi/QR, 3 % achat/vente, 3 % swap CDF, 2 % swap autre)
  const feeValid =
    FEE_CONFIG.sendFeePercent === 0.02 &&
    FEE_CONFIG.qrPaymentFeePercent === 0.02 &&
    FEE_CONFIG.buySellCdfFeePercent === 0.03 &&
    FEE_CONFIG.swapWithCdfFeePercent === 0.03 &&
    FEE_CONFIG.swapWithoutCdfFeePercent === 0.02;
  record(
    groupConfig,
    'Règles de frais validées (2 % envoi/QR, 3 % achat/vente CDF, 3 % swap CDF, 2 % autre)',
    feeValid,
    `Frais envoi: ${FEE_CONFIG.sendFeePercent * 100}% | Frais achat/vente: ${FEE_CONFIG.buySellCdfFeePercent * 100}%`,
    'src/config/tokens.ts'
  );

  // A.8 Montants minimaux validés (10 $ dépôt, 15 $ Visa, 8 $ mobile money)
  const minAmountsValid =
    MIN_AMOUNTS.initialDepositMinUsd === 10 &&
    MIN_AMOUNTS.initialDepositVisaMinUsd === 15 &&
    MIN_AMOUNTS.mobileMoneyBuyMinUsd === 8 &&
    MIN_AMOUNTS.visaBuyMinUsd === 15;
  record(
    groupConfig,
    'Montants minimaux conformes (10 $ dépôt initial, 8 $ mobile money, 15 $ Visa)',
    minAmountsValid,
    `Dépôt initial min: ${MIN_AMOUNTS.initialDepositMinUsd}$ | Mobile Money min: ${MIN_AMOUNTS.mobileMoneyBuyMinUsd}$`,
    'src/config/tokens.ts'
  );

  // A.9 Plafonds mensuels (500 $ sans KYC / 200 000 $ avec KYC)
  const limitsValid = MONTHLY_LIMITS.unverifiedUsd === 500 && MONTHLY_LIMITS.verifiedUsd === 200000;
  record(
    groupConfig,
    'Limites mensuelles validées (500 $ non-vérifié / 200 000 $ vérifié)',
    limitsValid,
    `Sans KYC: ${MONTHLY_LIMITS.unverifiedUsd}$ | Avec KYC: ${MONTHLY_LIMITS.verifiedUsd}$`,
    'src/config/tokens.ts'
  );

  // A.10 Support email officiel franc.congolais.fc@gmail.com
  const supportEmailValid = CDF_SUPPORT_EMAIL === 'franc.congolais.fc@gmail.com';
  record(
    groupConfig,
    'Support officiel conforme (franc.congolais.fc@gmail.com)',
    supportEmailValid,
    `Email: ${CDF_SUPPORT_EMAIL}`,
    'src/config/tokens.ts'
  );

  // ==========================================
  // DEMO MODE
  // ==========================================
  const groupDemo = 'Demo mode';

  // Demo.1 En mode VITE_DEMO_MODE=true, aucune fonction d’envoi réel n’est appelée
  try {
    const txResult = await transactionService.executeTransaction({
      recipient: '0x18e173fdeb700568a08d1d7049309ae322d27777',
      amount: '10',
      tokenSymbol: 'CDF',
      network: SUPPORTED_NETWORKS.bscMainnet,
      senderAddress: '0x18e173fdeb700568a08d1d7049309ae322d27777',
      isDemoMode: true,
    });

    const isBlocked = txResult.success === false && txResult.status === 'failed' && txResult.message.includes('Démonstration');
    record(
      groupDemo,
      'Blocage strict et absolu de toute transaction on-chain en mode démo',
      isBlocked,
      `Réponse transactionService: ${txResult.message}`,
      'src/services/transactionService.ts'
    );
  } catch (err: any) {
    record(groupDemo, 'Blocage strict et absolu de toute transaction on-chain en mode démo', false, err?.message, 'src/services/transactionService.ts');
  }

  // Demo.2 Basculement et persistance de l'état démo
  try {
    AppStorage.setDemoMode(true);
    const active = AppStorage.isDemoModeActive();
    record(groupDemo, 'Persistance et basculement du mode démonstration', active === true, undefined, 'src/storage/index.ts');
  } catch (err: any) {
    record(groupDemo, 'Persistance et basculement du mode démonstration', false, err?.message, 'src/storage/index.ts');
  }

  // ==========================================
  // CDF CONTRACT
  // ==========================================
  const groupCdf = 'CDF contract';
  const cdfServiceAddressValid = cdfTokenService.contractAddress.toLowerCase() === expectedContract.toLowerCase();
  const cdfServiceDecimalsValid = cdfTokenService.decimals === 18 && CDF_DECIMALS === 18;
  const cdfServiceNameValid = cdfTokenService.name === 'Franc Congolais' && cdfTokenService.symbol === 'CDF';

  record(
    groupCdf,
    'Conformité du service dédié cdfTokenService (Contrat 0x18e...7777, 18 décimales)',
    cdfServiceAddressValid && cdfServiceDecimalsValid && cdfServiceNameValid,
    `Adresse: ${cdfTokenService.contractAddress} | Décimales: ${cdfTokenService.decimals}`,
    'src/services/cdfTokenService.ts'
  );

  // ==========================================
  // NETWORK CONFIG
  // ==========================================
  const groupNetwork = 'Network configuration';
  const mainnetRpcs = getRpcEndpointsForNetwork(SUPPORTED_NETWORKS.bscMainnet);
  const testnetRpcs = getRpcEndpointsForNetwork(SUPPORTED_NETWORKS.bscTestnet);
  const hasRpcFallbacks = mainnetRpcs.length > 0 && testnetRpcs.length > 0;
  const hasBlockchainServiceFns = typeof blockchainService.checkNetworkConnection === 'function' && typeof blockchainService.getProvider === 'function';

  record(
    groupNetwork,
    'Configuration des RPCs et connectivité BNB Smart Chain',
    hasRpcFallbacks && hasBlockchainServiceFns,
    `RPCs Mainnet: ${mainnetRpcs.length} | RPCs Testnet: ${testnetRpcs.length}`,
    'src/config/networks.ts'
  );

  // ==========================================
  // B. TESTS /settings
  // ==========================================
  const groupSettings = '/settings';

  // B.1 La page /settings se rend sans exception
  try {
    const markup = renderToStaticMarkup(wrapWithProviders(React.createElement(SettingsPage, { onNavigate: () => {} })));
    record(groupSettings, 'Rendu sans exception de la page /settings', typeof markup === 'string' && markup.length > 0, undefined, 'src/pages/SettingsPage.tsx');
  } catch (err: any) {
    record(groupSettings, 'Rendu sans exception de la page /settings', false, err?.message, 'src/pages/SettingsPage.tsx');
  }

  // B.2 Valeurs autorisées pour language sont uniquement fr et en
  const languageValid = ALLOWED_LANGUAGES.length === 2 && ALLOWED_LANGUAGES.includes('fr') && ALLOWED_LANGUAGES.includes('en');
  record(groupSettings, 'Valeurs autorisées pour language uniquement fr et en', languageValid, `Valeurs: ${ALLOWED_LANGUAGES.join(', ')}`, 'src/storage/index.ts');

  // B.3 Valeurs autorisées pour theme sont uniquement light, dark, system
  const themeValid = ALLOWED_THEMES.length === 3 && ALLOWED_THEMES.includes('light') && ALLOWED_THEMES.includes('dark') && ALLOWED_THEMES.includes('system');
  record(groupSettings, 'Valeurs autorisées pour theme uniquement light, dark, system', themeValid, `Valeurs: ${ALLOWED_THEMES.join(', ')}`, 'src/storage/index.ts');

  // B.4 Valeurs autorisées pour currency sont uniquement USD, CDF, EUR
  const currencyValid = ALLOWED_CURRENCIES.length === 3 && ALLOWED_CURRENCIES.includes('USD') && ALLOWED_CURRENCIES.includes('CDF') && ALLOWED_CURRENCIES.includes('EUR');
  record(groupSettings, 'Valeurs autorisées pour currency uniquement USD, CDF, EUR', currencyValid, `Valeurs: ${ALLOWED_CURRENCIES.join(', ')}`, 'src/storage/index.ts');

  // B.5 Le changement de chaque préférence met correctement à jour l’état de l’application
  // B.6 Les préférences sont correctement sérialisées/désérialisées si un stockage local est utilisé
  try {
    AppStorage.saveSettings({
      currency: 'CDF',
      language: 'en',
      theme: 'light',
      notificationsEnabled: false,
      hideBalances: true,
      security: {
        autoLockTimerMinutes: 15,
        biometricsEnabled: false,
        requirePinForTransfers: true,
        analyticsEnabled: false,
      },
      customRpcEndpoints: {},
    });

    const read = AppStorage.getSettings();
    const updateSuccess =
      read.currency === 'CDF' &&
      read.language === 'en' &&
      read.theme === 'light' &&
      read.notificationsEnabled === false &&
      read.hideBalances === true &&
      read.security.autoLockTimerMinutes === 15;

    record(groupSettings, 'Sérialisation/désérialisation et mise à jour effective des préférences', updateSuccess, undefined, 'src/storage/index.ts');
  } catch (err: any) {
    record(groupSettings, 'Sérialisation/désérialisation et mise à jour effective des préférences', false, err?.message, 'src/storage/index.ts');
  }

  // B.7 Le mode confidentialité masque les montants lorsqu’il est activé
  // B.8 Le mode confidentialité réaffiche les montants lorsqu’il est désactivé
  const maskedCrypto = formatCryptoAmount('125000', 4, true);
  const unmaskedCrypto = formatCryptoAmount('125000', 4, false);
  const maskedFiat = formatFiatValue(250.5, 'USD', true);
  const unmaskedFiat = formatFiatValue(250.5, 'USD', false);

  const privacyCheck = maskedCrypto === '••••••' && unmaskedCrypto !== '••••••' && maskedFiat === '••••••••' && unmaskedFiat !== '••••••••';
  record(
    groupSettings,
    'Mode confidentialité masque (••••••) et réaffiche fidèlement les montants',
    privacyCheck,
    `Masqué: ${maskedCrypto} / ${maskedFiat} | Visible: ${unmaskedCrypto} / ${unmaskedFiat}`,
    'src/blockchain/utils.ts'
  );

  // B.9 Les valeurs invalides ne sont pas enregistrées
  try {
    AppStorage.saveSettings({
      ...DEFAULT_USER_SETTINGS,
      currency: 'INVALID_CURRENCY' as any,
      language: 'INVALID_LANG' as any,
      theme: 'INVALID_THEME' as any,
      security: {
        ...DEFAULT_USER_SETTINGS.security,
        autoLockTimerMinutes: 999 as any,
      },
    });

    const sanitized = AppStorage.getSettings();
    const invalidRejected =
      sanitized.currency === DEFAULT_USER_SETTINGS.currency &&
      sanitized.language === DEFAULT_USER_SETTINGS.language &&
      sanitized.theme === DEFAULT_USER_SETTINGS.theme &&
      sanitized.security.autoLockTimerMinutes === DEFAULT_USER_SETTINGS.security.autoLockTimerMinutes;

    record(
      groupSettings,
      'Rejet et assainissement des valeurs de préférences invalides',
      invalidRejected,
      `Valeurs assainies: ${sanitized.currency}, ${sanitized.language}, ${sanitized.theme}, ${sanitized.security.autoLockTimerMinutes}m`,
      'src/storage/index.ts'
    );
  } catch (err: any) {
    record(groupSettings, 'Rejet et assainissement des valeurs de préférences invalides', false, err?.message, 'src/storage/index.ts');
  }

  // B.10 Le bouton de verrouillage déclenche le mécanisme de verrouillage existant
  try {
    secureStorage.lock();
    const isLocked = !secureStorage.isUnlocked();
    record(groupSettings, 'Déclenchement effectif du verrouillage du portefeuille', isLocked, undefined, 'src/security/SecureStorage.ts');
  } catch (err: any) {
    record(groupSettings, 'Déclenchement effectif du verrouillage du portefeuille', false, err?.message, 'src/security/SecureStorage.ts');
  }

  // ==========================================
  // C. TESTS /security
  // ==========================================
  const groupSecurity = '/security';

  // C.1 La page /security se rend sans exception
  try {
    const markup = renderToStaticMarkup(wrapWithProviders(React.createElement(SecurityPage, { onNavigate: () => {} })));
    record(groupSecurity, 'Rendu sans exception de la page /security', typeof markup === 'string' && markup.length > 0, undefined, 'src/pages/SecurityPage.tsx');
  } catch (err: any) {
    record(groupSecurity, 'Rendu sans exception de la page /security', false, err?.message, 'src/pages/SecurityPage.tsx');
  }

  // C.2 Lorsque l’API biométrique n’est pas disponible, l’application indique que la biométrie n’est pas disponible
  // C.3 L’application ne prétend jamais que la biométrie est active sans support réel
  try {
    const bioStatus = await checkBiometricsSupport();
    const bioAccurate = bioStatus.isSupported === false && bioStatus.message.includes('Biométrie non disponible sur cet appareil');
    record(
      groupSecurity,
      'Vérification matérielle biométrique stricte (aucune prétention de support sans capteur réel)',
      bioAccurate,
      `Message: ${bioStatus.message}`,
      'src/security/biometrics.ts'
    );
  } catch (err: any) {
    record(groupSecurity, 'Vérification matérielle biométrique stricte', false, err?.message, 'src/security/biometrics.ts');
  }

  // C.4 Le verrouillage du portefeuille modifie réellement l’état de verrouillage
  try {
    secureStorage.lock();
    const lockedState = secureStorage.isUnlocked();
    const privateKeyBlocked = await secureStorage.getWalletPrivateKey('0x18e173fdeb700568a08d1d7049309ae322d27777');
    record(
      groupSecurity,
      'Le verrouillage désactive réellement les clés de signature en mémoire',
      lockedState === false && privateKeyBlocked === null,
      undefined,
      'src/security/SecureStorage.ts'
    );
  } catch (err: any) {
    record(groupSecurity, 'Le verrouillage désactive réellement les clés de signature en mémoire', false, err?.message, 'src/security/SecureStorage.ts');
  }

  // ==========================================
  // SECRET PROTECTION
  // ==========================================
  const groupSecret = 'Secret protection';

  // S.1 Les fonctions de journalisation ne reçoivent aucune donnée secrète
  const sampleFakeMnemonic = 'apple banana cherry dragon elephant falcon giraffe hunter iguana jaguar kangaroo leopard';
  const sampleFakePrivKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const logMnemonicCheck = securityManager.safeLog('Essai log avec mnemonic', sampleFakeMnemonic);
  const logPrivKeyCheck = securityManager.safeLog('Essai log avec private key', { key: sampleFakePrivKey });
  const logCleanCheck = securityManager.safeLog('Essai log sans secret', 'Informations publiques');

  const loggingIsSafe = !logMnemonicCheck.safe && !logPrivKeyCheck.safe && logCleanCheck.safe;
  record(
    groupSecret,
    'Filtrage et neutralisation des secrets dans la journalisation applicative',
    loggingIsSafe,
    undefined,
    'src/security/SecurityManager.ts'
  );

  // S.2 Absence totale de données secrètes dans le stockage local
  const audit = securityManager.checkSecurityAudit();
  record(groupSecret, 'Audit de stockage local (zéro clé privée ni seed phrase non chiffrée)', audit.pass, audit.warnings.join('; '), 'src/security/SecurityManager.ts');

  // ==========================================
  // D. TESTS SUPABASE
  // ==========================================
  const groupSupabase = 'Supabase safety';

  // D.1 Seuls les champs non sensibles de user_settings sont transmis
  try {
    const safePayload = {
      language: 'fr',
      theme: 'dark',
      currency: 'USD',
      notifications_enabled: true,
      biometric_enabled: false,
      hide_balances: false,
    };

    const sanitized = securityManager.sanitizeSupabasePayload(safePayload as any);
    const hasOnlyAllowed =
      sanitized.language === 'fr' &&
      sanitized.theme === 'dark' &&
      sanitized.currency === 'USD' &&
      sanitized.notifications_enabled === true &&
      sanitized.biometric_enabled === false;

    record(
      groupSupabase,
      'Seuls les champs non-sensibles de user_settings sont autorisés vers Supabase',
      hasOnlyAllowed,
      undefined,
      'src/security/SecurityManager.ts'
    );
  } catch (err: any) {
    record(groupSupabase, 'Seuls les champs non-sensibles de user_settings sont autorisés vers Supabase', false, err?.message, 'src/security/SecurityManager.ts');
  }

  // D.2 Vérifier explicitement que les champs sensibles ne peuvent pas être transmis
  const sensitiveKeysToTest = [
    'seed',
    'seed_phrase',
    'mnemonic',
    'private_key',
    'privateKey',
    'password',
    'wallet_password',
    'secret',
  ];

  let allSensitiveKeysBlocked = true;
  const sensitiveFailures: string[] = [];

  for (const sKey of sensitiveKeysToTest) {
    try {
      securityManager.sanitizeSupabasePayload({
        currency: 'USD',
        [sKey]: 'mock-fake-test-secret-value',
      } as any);
      // Si aucune exception n'est levée, le test a échoué
      allSensitiveKeysBlocked = false;
      sensitiveFailures.push(sKey);
    } catch {
      // Rejet attendu et conforme
    }
  }

  record(
    groupSupabase,
    'Interdiction formelle et blocage des champs sensibles (seed, mnemonic, private_key, password, secret...)',
    allSensitiveKeysBlocked,
    sensitiveFailures.length > 0 ? `Champs non bloqués : ${sensitiveFailures.join(', ')}` : 'Tous les champs sensibles testés ont été rejetés avec succès.',
    'src/security/SecurityManager.ts'
  );

  // ==========================================
  // E. TESTS DE RÉGRESSION DES ROUTES
  // ==========================================
  const groupRoutes = 'Route regression';

  const routesToTest: Array<{ path: string; component: React.ReactElement }> = [
    { path: '/', component: React.createElement(HomePage, { onNavigate: () => {} }) },
    { path: '/wallet', component: React.createElement(WalletPage, { onNavigate: () => {} }) },
    { path: '/send', component: React.createElement(SendPage, { onNavigate: () => {} }) },
    { path: '/receive', component: React.createElement(ReceivePage, { onNavigate: () => {} }) },
    { path: '/scan', component: React.createElement(ScanPage, { onNavigate: () => {} }) },
    { path: '/activity', component: React.createElement(ActivityPage) },
    { path: '/swap', component: React.createElement(SwapPage) },
    { path: '/my-qr', component: React.createElement(MerchantQrPage, { onNavigate: () => {} }) },
    { path: '/dapps', component: React.createElement(DappsPage) },
    { path: '/notifications', component: React.createElement(NotificationsPage, { onNavigate: () => {} }) },
    { path: '/settings', component: React.createElement(SettingsPage, { onNavigate: () => {} }) },
    { path: '/security', component: React.createElement(SecurityPage, { onNavigate: () => {} }) },
    { path: '/about', component: React.createElement(AboutPage) },
    { path: '/onboarding', component: React.createElement(OnboardingPage, { onNavigate: () => {} }) },
  ];

  let allRoutesRendered = true;
  const routeErrors: string[] = [];

  for (const { path, component } of routesToTest) {
    try {
      const html = renderToStaticMarkup(wrapWithProviders(component));
      if (!html || html.length === 0) {
        allRoutesRendered = false;
        routeErrors.push(`${path} (rendu vide)`);
      }
    } catch (err: any) {
      allRoutesRendered = false;
      routeErrors.push(`${path} (${err?.message || 'exception'})`);
    }
  }

  record(
    groupRoutes,
    `Disponibilité et rendu sans exception des ${routesToTest.length} routes obligatoires`,
    allRoutesRendered,
    routeErrors.length > 0 ? `Erreurs sur routes : ${routeErrors.join('; ')}` : `${routesToTest.length}/${routesToTest.length} routes rendues avec succès`,
    'src/App.tsx'
  );

  // Calcul du statut de chaque groupe
  const groupStatus: Record<string, boolean> = {};
  for (const r of results) {
    if (groupStatus[r.group] === undefined) {
      groupStatus[r.group] = true;
    }
    if (!r.passed) {
      groupStatus[r.group] = false;
    }
  }

  return { results, groupStatus };
}
