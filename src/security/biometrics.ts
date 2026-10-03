/**
 * biometrics.ts — CDF Wallet
 * 
 * Gestionnaire réel d'authentification biométrique locale (WebAuthn Platform Authenticator).
 * 
 * RÈGLES DE SÉCURITÉ INVIOLABLES :
 * - Aucune fausse fonction de biométrie : si le matériel ou le navigateur ne supporte pas
 *   les authentificateurs de plateforme (Touch ID, Face ID, Windows Hello, Biométrie Android),
 *   afficher formellement : « Biométrie non disponible sur cet appareil ».
 * - Ne pas inventer de sécurité non implémentée.
 * - Aucun secret biométrique ne quitte l'appareil ni n'est envoyé à Supabase.
 */

export interface BiometricsStatus {
  isSupported: boolean;
  message: string;
  detail: string;
}

export async function checkBiometricsSupport(): Promise<BiometricsStatus> {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      message: 'Biométrie non disponible sur cet appareil',
      detail: 'Environnement hors navigateur ou sans support WebAuthn.',
    };
  }

  // 1. Vérification de la présence de l'API standard WebAuthn
  const hasPublicKeyCredential = Boolean(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );

  if (!hasPublicKeyCredential) {
    return {
      isSupported: false,
      message: 'Biométrie non disponible sur cet appareil',
      detail: "L'API standard WebAuthn (PublicKeyCredential) n'est pas prise en charge par ce navigateur.",
    };
  }

  // 2. Vérification matérielle réelle de l'authentificateur de plateforme
  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (available) {
      return {
        isSupported: true,
        message: 'Biométrie disponible sur cet appareil',
        detail: 'Authentificateur de plateforme détecté (Touch ID, Face ID, Windows Hello ou Biométrie Android).',
      };
    } else {
      return {
        isSupported: false,
        message: 'Biométrie non disponible sur cet appareil',
        detail: "Aucun capteur biométrique de plateforme configuré ou disponible sur cet équipement.",
      };
    }
  } catch (err) {
    return {
      isSupported: false,
      message: 'Biométrie non disponible sur cet appareil',
      detail: (err as Error).message || "Échec de l'interrogation du capteur biométrique.",
    };
  }
}
