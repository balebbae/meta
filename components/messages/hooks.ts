'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {Conversation, Message} from '@/lib/messaging-types';
import {chatApi} from './api';

/** Runs `fn` every `ms` while the tab is visible; also fires immediately and whenever the tab becomes visible again. */
export function useVisiblePolling(fn: () => void | Promise<void>, ms: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;
    const tick = async () => {
      if (inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        await fnRef.current();
      } finally {
        inFlight = false;
      }
    };
    const start = () => {
      if (timer) return;
      void tick();
      timer = setInterval(tick, ms);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
    start();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', tick);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', tick);
    };
  }, [ms, enabled]);
}

/** The viewer's conversation list, refreshed every 5s while visible. */
export function useConversations(initial: Conversation[] | null = null, intervalMs = 5000) {
  const [conversations, setConversations] = useState<Conversation[] | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const d = await chatApi.listConversations();
      setConversations(d.conversations);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useVisiblePolling(refresh, intervalMs);
  const patch = useCallback((id: number, fn: (c: Conversation) => Conversation) => {
    setConversations(list => (list ? list.map(c => (c.id === id ? fn(c) : c)) : list));
  }, []);
  return {conversations, setConversations, refresh, patch, error};
}

/** Number of conversations with unread messages (Messenger badge), polled every 5s. */
export function useMessengerUnread(intervalMs = 5000) {
  const [count, setCount] = useState(0);
  useVisiblePolling(async () => {
    try {
      const d = await chatApi.unreadCount();
      setCount(d.unreadCount);
    } catch {
      /* keep the last value */
    }
  }, intervalMs);
  return [count, setCount] as const;
}

export type SendFn = (body: string, imageUrl?: string | null) => Promise<void>;

/**
 * Live thread: loads the latest page, then polls `?after=<lastId>` every 2.5s while the tab is visible.
 * Sends are optimistic (negative temp id, `pending`), replaced by the real row and de-duplicated when polling returns it.
 */
export function useConversationLive(
  id: number | null,
  viewer: {id: number; name: string; avatarUrl: string},
  opts: {intervalMs?: number; onNewFromOthers?: (msgs: Message[]) => void} = {},
) {
  const {intervalMs = 2500} = opts;
  const onNewRef = useRef(opts.onNewFromOthers);
  onNewRef.current = opts.onNewFromOthers;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const lastIdRef = useRef(0);
  const idRef = useRef(id);

  const merge = useCallback((incoming: Message[]) => {
    if (!incoming.length) return;
    setMessages(cur => {
      const seen = new Set(cur.filter(m => m.id > 0).map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      if (!fresh.length) return cur;
      // drop optimistic rows that match a fresh row from the same sender with the same body
      const pendingLeft = cur.filter(m => !(m.pending && fresh.some(f => f.sender?.id === m.sender?.id && f.body === m.body && f.imageUrl === m.imageUrl)));
      const next = [...pendingLeft, ...fresh].sort((a, b) => (a.id > 0 && b.id > 0 ? a.id - b.id : a.id > 0 ? -1 : b.id > 0 ? 1 : a.createdAt.localeCompare(b.createdAt)));
      return next;
    });
    const maxId = Math.max(...incoming.map(m => m.id));
    if (maxId > lastIdRef.current) lastIdRef.current = maxId;
  }, []);

  // initial load whenever the conversation changes
  useEffect(() => {
    idRef.current = id;
    lastIdRef.current = 0;
    setMessages([]);
    setHasMore(false);
    if (id == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    chatApi
      .listMessages(id, {limit: 50})
      .then(d => {
        if (cancelled || idRef.current !== id) return;
        merge(d.messages);
        setHasMore(d.messages.length >= 50);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, merge]);

  useVisiblePolling(
    async () => {
      if (id == null) return;
      try {
        const d = await chatApi.listMessages(id, {after: lastIdRef.current});
        if (idRef.current !== id) return;
        const others = d.messages.filter(m => m.sender?.id !== viewer.id);
        merge(d.messages);
        if (others.length) onNewRef.current?.(others);
      } catch {
        /* retry next tick */
      }
    },
    intervalMs,
    id != null,
  );

  const loadOlder = useCallback(async () => {
    if (id == null) return;
    const oldest = messages.find(m => m.id > 0);
    if (!oldest) return;
    const d = await chatApi.listMessages(id, {before: oldest.id, limit: 50});
    setMessages(cur => {
      const seen = new Set(cur.map(m => m.id));
      return [...d.messages.filter(m => !seen.has(m.id)), ...cur];
    });
    setHasMore(d.messages.length >= 50);
  }, [id, messages]);

  const send: SendFn = useCallback(
    async (body, imageUrl = null) => {
      if (id == null) return;
      const tempId = -Date.now() - Math.floor(Math.random() * 1000);
      const temp: Message = {
        id: tempId,
        conversationId: id,
        sender: {id: viewer.id, name: viewer.name, avatarUrl: viewer.avatarUrl},
        body,
        imageUrl,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages(cur => [...cur, temp]);
      try {
        const d = await chatApi.sendMessage(id, body, imageUrl);
        setMessages(cur => {
          if (cur.some(m => m.id === d.message.id)) return cur.filter(m => m.id !== tempId);
          return cur.map(m => (m.id === tempId ? d.message : m));
        });
        if (d.message.id > lastIdRef.current) lastIdRef.current = d.message.id;
      } catch {
        setMessages(cur => cur.map(m => (m.id === tempId ? {...m, pending: false, failed: true} : m)));
      }
    },
    [id, viewer.id, viewer.name, viewer.avatarUrl],
  );

  const retry = useCallback(
    async (tempId: number) => {
      const m = messages.find(x => x.id === tempId);
      if (!m) return;
      setMessages(cur => cur.filter(x => x.id !== tempId));
      await send(m.body, m.imageUrl);
    },
    [messages, send],
  );

  return {messages, loading, hasMore, loadOlder, send, retry};
}

/** Resizes an image file to at most `max` px on its longest side and returns a JPEG data URL. */
export function fileToDataUrl(file: File, max = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}
