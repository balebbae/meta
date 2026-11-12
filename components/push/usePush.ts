'use client';
import {useCallback, useEffect, useState} from 'react';
import {currentStatus, disablePush, enablePush, sendTestPush, type PushStatus} from './push-client';

export function usePush() {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    currentStatus().then(setStatus).catch(() => setStatus('unsupported'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const next = await enablePush();
      setStatus(next);
      return next;
    } catch (err) {
      console.warn('[push] enable failed', err);
      refresh();
      return 'unsupported' as PushStatus;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      setStatus(await disablePush());
    } finally {
      setBusy(false);
    }
  }, []);

  return {status, busy, enable, disable, refresh, sendTest: sendTestPush};
}
