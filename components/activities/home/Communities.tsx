'use client';

import Link from 'next/link';
import {Sparkles} from 'lucide-react';
import type {DiscoverCard} from '@/lib/activities/discover';
import h from './home.module.css';

/** Groups and clubs worth joining: friends inside, a weekly Rally, or a tag match. */
export function Communities({cards, onOpen, onHide}: {cards: DiscoverCard[]; onOpen: (c: DiscoverCard) => void; onHide: (c: DiscoverCard) => void}) {
  return (
    <div className={h.grid2}>
      {cards.map((c, i) => {
        const friends = /(\d+) friends?/.exec(c.subtitle ?? '')?.[1];
        return (
          <article key={c.id} className={`${h.card} ${h.section}`} style={{'--i': i} as React.CSSProperties}>
            {c.imageUrl && <img className={h.cover} src={c.imageUrl} alt="" loading="lazy" />}
            <div className={h.cardBody}>
              {(friends || c.meta?.rally) && (
                <div className={h.chips}>
                  {friends && <span className={h.chip}>{friends === '1' ? '1 friend is in' : `${friends} friends are in`}</span>}
                  {c.meta?.rally ? <span className={`${h.chip} ${h.chipEmber}`}>Weekly Rally</span> : null}
                </div>
              )}
              <h3 className={h.cardTitle}>{c.title}</h3>
              {c.subtitle && <p className={h.cardSub}>{c.subtitle}</p>}
              <p className={h.why}>
                <Sparkles size={14} />
                <span>{c.why}</span>
              </p>
              <div className={h.cardBtns}>
                <Link className={`${h.pill} ${h.pillSm} ${c.meta?.joined ? h.pillQuiet : h.pillBlue}`} href={c.href ?? '/groups'} onClick={() => onOpen(c)}>
                  {c.cta ?? 'Open'}
                </Link>
                <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillGhost}`} onClick={() => onHide(c)}>
                  Not interested
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
