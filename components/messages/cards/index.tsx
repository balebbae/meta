'use client';

import type {ComponentType} from 'react';
import type {Conversation, Message} from '@/lib/messaging-types';
import type {MessageKind} from '@/lib/activities/types';
import styles from './cards.module.css';

export type CardProps = {message: Message; viewerId: number; conversation: Conversation};

/**
 * Registry of Messenger card renderers keyed by messages.kind. Feature modules register their card
 * here (Rally invite/game, quest card, Turf recap, proof). Unknown kinds fall back to a plain card
 * showing the preview text so old clients never break.
 */
function FallbackCard({message}: CardProps) {
  return (
    <div className={styles.card} role="group" aria-label="Card">
      <div className={styles.cardBody}>{message.body}</div>
    </div>
  );
}

function SystemCard({message}: CardProps) {
  const text = (message.payload?.text as string | undefined) ?? message.body;
  return <div className={styles.system}>{text}</div>;
}

export const CARD_RENDERERS: Partial<Record<MessageKind, ComponentType<CardProps>>> = {
  system: SystemCard,
};

export function registerCard(kind: MessageKind, component: ComponentType<CardProps>) {
  CARD_RENDERERS[kind] = component;
}

export function MessageCard(props: CardProps) {
  const Renderer = CARD_RENDERERS[props.message.kind] ?? FallbackCard;
  return <Renderer {...props} />;
}
