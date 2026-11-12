export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

/**
 * Sends a Web Push notification to every subscription the user has registered.
 * PUSH SUBAGENT: replace this stub with the web-push implementation (VAPID keys from env,
 * subscriptions from the push_subscriptions table). Must never throw to callers.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  void userId;
  void payload;
}
