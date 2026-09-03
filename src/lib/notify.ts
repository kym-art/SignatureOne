/**
 * Signature One — Notifications navigateur (API Notification).
 * Utilisées de façon très minimale pour :
 *  - informer les vendeurs d'une nouvelle commande,
 *  - prévenir un client quand sa commande est prête.
 *
 * La permission est demandée de manière non intrusive (au premier besoin).
 * Si elle est refusée ou indisponible, la fonction `notify` ne fait rien
 * (les notifications à l'écran type toast/son continuent de fonctionner).
 */

function hasNotificationAPI(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function requestNotificationPermission(): void {
  if (!hasNotificationAPI()) return;
  if (Notification.permission === 'default') {
    try {
      Notification.requestPermission().catch(() => {
        /* refusé — on ignore silencieusement */
      });
    } catch {
      /* ignore */
    }
  }
}

export function notify(title: string, body: string): void {
  if (!hasNotificationAPI()) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body });
    } catch {
      /* ignore */
    }
  }
}