'use client';
import {Ban, EyeOff, MessageCircle} from 'lucide-react';
import {Icon} from '@astryxdesign/core/Icon';
import {List, ListItem} from '@astryxdesign/core/List';
import type {MuseSummary} from '@/lib/activities/summary';

/** Icons stay in a client component. Passing them from the Muse server page makes the Ban icon fail to render and the whole page 500. */
export function MusePolicyList({summary}: {summary: MuseSummary}) {
  return (
    <List density="compact">
      {summary.shares.map(s => (
        <ListItem key={`share:${s}`} startContent={<Icon icon={MessageCircle} size="sm" color="accent" />} label={s} />
      ))}
      {summary.secrets.map(s => (
        <ListItem key={`secret:${s}`} startContent={<Icon icon={EyeOff} size="sm" color="secondary" />} label={s} />
      ))}
      <ListItem startContent={<Icon icon={Ban} size="sm" color="secondary" />} label={summary.nobody} />
    </List>
  );
}
