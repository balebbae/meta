'use client';

import {useRouter} from 'next/navigation';
import {useEffect, useState, type ReactNode} from 'react';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {SelectableCard} from '@astryxdesign/core/SelectableCard';
import {Spinner} from '@astryxdesign/core/Spinner';
import {StackItem} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {RallyAvatar} from '@/components/rally/Avatar';
import type {StartReel} from '@/app/api/games/start/route';
import {mirrorTitle} from '@/lib/rally/mirror';
import {ROUTES} from '@/lib/rally/swim';

export type ReelGameMode = 'yoga' | 'dance' | 'swim';
type Viewer = {name: string; avatarUrl: string};

const LEAD: Record<ReelGameMode, string> = {
  yoga: 'Pick a yoga Reel. Everyone in the chat holds its poses on camera; best score in 24 h wins.',
  dance: 'Pick a dance Reel. Everyone in the chat hits its moves on camera; best score in 24 h wins.',
  swim: 'Pick a crossing. Every swim anyone logs moves the chat across.',
};
const km = (m: number) => `${(m / 1000).toFixed(1)} km`;

/** Activities → Start a game: Mirror Yoga, Mirror Dance or Castle Crossing in a chat the player picks. */
export function StartReelGame({mode, viewer, chatPicker, chatId, onClose, say}: {mode: ReelGameMode | null; viewer: Viewer; chatPicker: ReactNode; chatId: number | null; onClose: () => void; say: (t: string) => void}) {
  const router = useRouter();
  const [reels, setReels] = useState<StartReel[] | null>(null);
  const [reelId, setReelId] = useState<number | null>(null);
  const [routeId, setRouteId] = useState(ROUTES[0].id);
  const [busy, setBusy] = useState(false);
  const mirror = mode === 'yoga' || mode === 'dance';

  useEffect(() => {
    setReels(null);
    setReelId(null);
    if (mode !== 'yoga' && mode !== 'dance') return;
    let alive = true;
    fetch(`/api/games/start?mode=${mode}`)
      .then(r => (r.ok ? r.json() : {reels: []}))
      .then((d: {reels?: StartReel[]}) => alive && setReels(d.reels ?? []))
      .catch(() => alive && setReels([]));
    return () => {
      alive = false;
    };
  }, [mode]);

  const start = async () => {
    if (!mode) return;
    if (chatId == null) return say('Pick a chat to play in first.');
    if (mirror && reelId == null) return say('Pick a Reel first.');
    setBusy(true);
    try {
      const res = await fetch('/api/games/start', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({game: mode, conversationId: chatId, reelId, routeId})});
      const d = (await res.json().catch(() => ({}))) as {error?: string; conversationId?: number};
      if (!res.ok) return say(d.error ?? 'Could not start the game.');
      onClose();
      router.push(`/messages/${d.conversationId ?? chatId}`);
    } catch {
      say('Could not start the game.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'swim' ? 'Castle Crossing' : mode ? mirrorTitle(mode) : '';
  return (
    <Dialog isOpen={mode != null} onOpenChange={o => !o && onClose()} purpose="form" width={560}>
      <Layout
        header={<DialogHeader title={title} onOpenChange={onClose} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3} vAlign="center">
                <RallyAvatar src={viewer.avatarUrl} name={viewer.name} state={mode === 'swim' ? 'run' : 'idle'} size={64} />
                <StackItem size="fill">
                  <Text color="secondary">{mode ? LEAD[mode] : ''}</Text>
                </StackItem>
              </HStack>
              {chatPicker}
              {mirror &&
                (reels == null ? (
                  <HStack gap={2} vAlign="center">
                    <Spinner size="sm" />
                    <Text color="secondary">Finding Reels…</Text>
                  </HStack>
                ) : reels.length === 0 ? (
                  <EmptyState title={`No ${mode} Reels yet`} description="Post one to Reels and it shows up here." isCompact />
                ) : (
                  <Grid columns={{minWidth: 120}} gap={2}>
                    {reels.map(r => (
                      <SelectableCard key={r.id} label={r.caption || 'Reel'} isSelected={reelId === r.id} onChange={() => setReelId(r.id)} padding={0}>
                        <VStack>
                          <AspectRatio ratio={3 / 4}>{r.posterUrl ? <img src={r.posterUrl} alt="" loading="lazy" style={{objectFit: 'cover'}} /> : <span />}</AspectRatio>
                          <VStack gap={0.5} padding={2}>
                            <Text type="supporting" maxLines={2}>
                              {r.caption || 'Reel'}
                            </Text>
                          </VStack>
                        </VStack>
                      </SelectableCard>
                    ))}
                  </Grid>
                ))}
              {mode === 'swim' && (
                <Grid columns={{minWidth: 200}} gap={2}>
                  {ROUTES.map(r => (
                    <SelectableCard key={r.id} label={r.name} isSelected={routeId === r.id} onChange={() => setRouteId(r.id)}>
                      <VStack gap={0.5}>
                        <Text weight="bold">{r.name}</Text>
                        <Text type="supporting" color="secondary">
                          {r.from} → {r.to} · {km(r.totalM)}
                        </Text>
                      </VStack>
                    </SelectableCard>
                  ))}
                </Grid>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" onClick={onClose} />
              <Button label="Start" variant="primary" isLoading={busy} isDisabled={mirror && reelId == null} onClick={() => void start()} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
