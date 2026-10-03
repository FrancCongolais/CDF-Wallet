import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppNotification, NotificationType } from '../types';
import { useWallet } from '../wallet/WalletContext';
import { supabaseService } from '../services/supabase';
import { AppStorage } from '../storage';
import { securityManager } from '../security';

export type NotificationFilter = 'all' | NotificationType;

interface NotificationContextValue {
  notifications: AppNotification[];
  filteredNotifications: AppNotification[];
  unreadNotificationsCount: number;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addSecurityNotification: (title: string, message: string) => Promise<void>;
  addTransactionNotification: (details: {
    asset: string;
    amount: string;
    hash?: string;
    isDemo?: boolean;
  }) => Promise<void>;
  clearState: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedAccount, isDemoMode } = useWallet();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const activeUserId = useMemo(() => {
    if (!selectedAccount) return null;
    return selectedAccount.address.toLowerCase();
  }, [selectedAccount]);

  // Vider formellement l'état lors de la déconnexion ou du changement de compte
  const clearState = useCallback(() => {
    setNotifications([]);
    setFilter('all');
  }, []);

  // Calcul dynamique et strict du compteur non lu
  const unreadNotificationsCount = useMemo(() => {
    if (!activeUserId) return 0;
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications, activeUserId]);

  // Charger les notifications de l'utilisateur connecté
  const refreshNotifications = useCallback(async () => {
    if (!activeUserId) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);
    try {
      let loaded = await supabaseService.fetchNotifications(activeUserId);

      // Si aucune notification n'existe encore pour cet utilisateur, initialiser les alertes par défaut
      if (loaded.length === 0) {
        if (isDemoMode) {
          // En mode démonstration : avertissement clair, aucune fausse écriture blockchain
          const demoInit: AppNotification = {
            id: `demo-init-${Date.now()}`,
            user_id: activeUserId,
            title: 'Session Démo Active',
            message: 'MODE DÉMONSTRATION : Portefeuille de test sans écriture sur la blockchain réelle.',
            notification_type: 'security',
            is_read: false,
            created_at: new Date().toISOString(),
          };
          const demoAudit: AppNotification = {
            id: `demo-audit-${Date.now() + 1}`,
            user_id: activeUserId,
            title: 'Audit Cryptographique',
            message: 'Environnement client conforme. Architecture 100% Non-Custodial et souveraine.',
            notification_type: 'system',
            is_read: true,
            created_at: new Date(Date.now() - 3600000).toISOString(),
          };
          loaded = [demoInit, demoAudit];
          AppStorage.saveNotifications(activeUserId, loaded);
        } else {
          // Utilisateur réel : alerte de session sécurisée
          const initialSecurity: AppNotification = {
            id: `sec-init-${Date.now()}`,
            user_id: activeUserId,
            title: 'Portefeuille Connecté',
            message: `Session ouverte pour le compte ${activeUserId.substring(0, 6)}...${activeUserId.substring(activeUserId.length - 4)}. Vos clés privées restent strictement locales.`,
            notification_type: 'security',
            is_read: false,
            created_at: new Date().toISOString(),
          };
          loaded = [initialSecurity];
          AppStorage.saveNotifications(activeUserId, loaded);
        }
      }

      setNotifications(loaded);
    } catch (e) {
      console.warn('[NotificationContext] Erreur de rafraîchissement :', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeUserId, isDemoMode]);

  // Synchronisation stricte au changement de compte ou déconnexion
  useEffect(() => {
    if (!activeUserId) {
      clearState();
      return;
    }
    refreshNotifications();
  }, [activeUserId, refreshNotifications, clearState]);

  // Marquer une notification comme lue
  const markAsRead = useCallback(async (id: string) => {
    if (!activeUserId) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabaseService.markNotificationAsRead(activeUserId, id);
  }, [activeUserId]);

  // Tout marquer comme lu
  const markAllAsRead = useCallback(async () => {
    if (!activeUserId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabaseService.markAllNotificationsAsRead(activeUserId);
  }, [activeUserId]);

  // Supprimer une notification avec protection stricte de l'utilisateur
  const deleteNotification = useCallback(async (id: string) => {
    if (!activeUserId) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabaseService.deleteNotification(activeUserId, id);
  }, [activeUserId]);

  // Ajouter une alerte de sécurité réelle
  const addSecurityNotification = useCallback(async (title: string, message: string) => {
    if (!activeUserId) return;
    if (!securityManager.validateNotification(title, message)) {
      console.warn('[SecurityViolation] Notification rejetée pour motif de confidentialité.');
      return;
    }
    const created = await supabaseService.createNotification({
      user_id: activeUserId,
      title,
      message,
      notification_type: 'security',
      is_read: false,
    });
    if (created) {
      setNotifications((prev) => [created, ...prev]);
    }
  }, [activeUserId]);

  // Ajouter une notification de transaction confirmée (avec stricte absence de secret)
  const addTransactionNotification = useCallback(async ({
    asset,
    amount,
    hash,
    isDemo,
  }: {
    asset: string;
    amount: string;
    hash?: string;
    isDemo?: boolean;
  }) => {
    if (!activeUserId) return;

    const title = isDemo
      ? 'Simulation locale confirmée'
      : 'Transaction confirmée';

    const message = isDemo
      ? `MODE DÉMONSTRATION : Simulation de transfert ${amount} ${asset}. Aucune signature ou écriture on-chain réelle.`
      : `Asset : ${asset} | Montant : ${amount} | Statut : Confirmée${hash ? ` | Hash : ${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}` : ''}`;

    if (!securityManager.validateNotification(title, message)) return;

    const created = await supabaseService.createNotification({
      user_id: activeUserId,
      title,
      message,
      notification_type: 'transaction',
      is_read: false,
    });

    if (created) {
      setNotifications((prev) => [created, ...prev]);
    }
  }, [activeUserId]);

  // Notifications filtrées
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.notification_type === filter);
  }, [notifications, filter]);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    filteredNotifications,
    unreadNotificationsCount,
    filter,
    setFilter,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    addSecurityNotification,
    addTransactionNotification,
    clearState,
  }), [
    notifications,
    filteredNotifications,
    unreadNotificationsCount,
    filter,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    addSecurityNotification,
    addTransactionNotification,
    clearState,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications doit être utilisé à l’intérieur d’un NotificationProvider');
  }
  return ctx;
}
