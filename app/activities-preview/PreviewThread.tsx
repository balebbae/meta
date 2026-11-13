import {MessageCard} from '@/components/messages/cards';
import * as fx from './fixtures';

/** One of each challenge card, stacked like a squad chat. */
export function PreviewThread() {
  return (
    <div style={{display: 'grid', gap: 12, justifyItems: 'start'}}>
      {fx.thread.map(m => (
        <MessageCard key={m.id} message={m} viewerId={fx.user.id} conversation={fx.squad} />
      ))}
    </div>
  );
}
