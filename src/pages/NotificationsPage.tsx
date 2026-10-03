import React, { useState } from 'react';
import {
  Bell,
  Shield,
  ArrowLeftRight,
  Info,
  Settings,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Lock,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useNotifications, NotificationFilter } from '../notifications';
import { useWallet } from '../wallet/WalletContext';
import { getTranslations } from '../config/i18n';
import { NotificationType } from '../types';

interface NotificationsPageProps {
  onNavigate: (route: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { selectedAccount, settings, isDemoMode } = useWallet();
  const t = getTranslations(settings.language);
  const tn = t.notifications;

  const {
    filteredNotifications,
    unreadNotificationsCount,
    filter,
    setFilter,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

  // Formatage du temps relatif lisible et convivial
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return tn.justNow;
      if (diffMin < 60) return `Il y a ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      return `Il y a ${diffDays} j`;
    } catch {
      return tn.justNow;
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'security':
        return <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'transaction':
        return <ArrowLeftRight className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case 'system':
        return <Settings className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'security':
        return tn.security;
      case 'transaction':
        return tn.transactions;
      case 'system':
        return tn.system;
      case 'info':
      default:
        return tn.info;
    }
  };

  const filterTabs: { id: NotificationFilter; label: string }[] = [
    { id: 'all', label: tn.all },
    { id: 'transaction', label: tn.transactions },
    { id: 'security', label: tn.security },
    { id: 'system', label: tn.system },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {tn.title}
                </h1>
                {unreadNotificationsCount > 0 && (
                  <span
                    id="unread-notifications-badge"
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white shadow-sm"
                  >
                    {unreadNotificationsCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {tn.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Boutons d'action globaux */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            id="btn-refresh-notifications"
            onClick={() => refreshNotifications()}
            disabled={isLoading}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Rafraîchir les notifications"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              id="btn-mark-all-read"
              onClick={() => markAllAsRead()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{tn.markAllAsRead}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Démonstration : Bannière d'avertissement explicite */}
      {isDemoMode && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <span className="font-bold">{tn.demoBadge} :</span> Les notifications affichées en mode démo sont des alertes locales de simulation. Aucune transaction réelle n’est exécutée sur la blockchain.
          </div>
        </div>
      )}

      {/* Onglets de filtres */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`filter-tab-${tab.id}`}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* État : Non connecté */}
      {!selectedAccount && (
        <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {tn.noNotifications}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {tn.authenticatedOnlyTip}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Accéder au tableau de bord
          </button>
        </div>
      )}

      {/* État : Connecté mais liste vide */}
      {selectedAccount && filteredNotifications.length === 0 && (
        <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Bell className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {tn.noNotifications}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {tn.noNotificationsDesc}
            </p>
          </div>
        </div>
      )}

      {/* Liste des notifications */}
      {selectedAccount && filteredNotifications.length > 0 && (
        <div className="space-y-3" id="notifications-list">
          {filteredNotifications.map((notification) => {
            const isUnread = !notification.is_read;
            const isDeleting = notificationToDelete === notification.id;

            return (
              <div
                key={notification.id}
                id={`notification-item-${notification.id}`}
                className={`relative p-4 rounded-xl border transition-all ${
                  isUnread
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-sm'
                    : 'bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isUnread
                          ? 'bg-blue-100/70 dark:bg-blue-900/50'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {getTypeIcon(notification.notification_type)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {getTypeLabel(notification.notification_type)}
                        </span>

                        {isUnread && (
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}

                        {notification.title.toLowerCase().includes('démo') ||
                        notification.message.includes('DÉMONSTRATION') ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {tn.demoBadge}
                          </span>
                        ) : null}
                      </div>

                      <h4
                        className={`text-sm font-semibold leading-snug ${
                          isUnread
                            ? 'text-slate-950 dark:text-white'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {notification.title}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                        {notification.message}
                      </p>

                      <div className="pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {formatTimeAgo(notification.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Actions unitaires sur la notification */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isUnread && (
                      <button
                        type="button"
                        id={`btn-read-${notification.id}`}
                        onClick={() => markAsRead(notification.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                        title={tn.markAsRead}
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}

                    {isDeleting ? (
                      <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/40 p-1 rounded-lg border border-red-200 dark:border-red-900">
                        <button
                          type="button"
                          onClick={() => {
                            deleteNotification(notification.id);
                            setNotificationToDelete(null);
                          }}
                          className="px-2 py-0.5 text-[11px] font-semibold text-white bg-red-600 rounded hover:bg-red-700"
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotificationToDelete(null)}
                          className="px-1.5 py-0.5 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id={`btn-delete-${notification.id}`}
                        onClick={() => setNotificationToDelete(notification.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title={tn.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
