export type TelegramEventType = 'wallet_connected' | 'transaction_sent' | 'user_feedback';

const baseUrl = (import.meta as any).env?.VITE_TELEGRAM_SERVER_URL || 'http://localhost:3001';

export async function notify(eventType: TelegramEventType, payload: any) {
  // Match charity site's behavior: show a toast when transaction is sent
  try {
    if (eventType === 'transaction_sent') {
      const { toast } = await import('@/hooks/use-toast');
      toast({ title: 'Transaction sent', description: 'Waiting for confirmation…' });
    }
    // Intentionally skip network calls to Telegram to mirror charity repo
    return;
  } catch (e) {
    // Silently ignore toast errors to avoid user disruption
    return;
  }
}