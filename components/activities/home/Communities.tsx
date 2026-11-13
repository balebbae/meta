'use client';

import Link from 'next/link';
import {IconChevronRight, IconEyeOff, IconTrophy, IconUserPlus, IconUsers} from '@tabler/icons-react';
import {InfoTip} from '@astryxdesign/core/InfoTip';
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
                  {friends && (
                    <span className={h.chip} title={friends === '1' ? '1 friend is in' : `${friends} friends are in`}>
                      <IconUsers size={12} aria-hidden /> {friends}
                      <span className={h.srOnly}>{friends === '1' ? 'friend is in' : 'friends are in'}</span>
                    </span>
                  )}
                  {c.meta?.rally ? (
                    <span className={h.chip} title="Runs a weekly Rally">
                      <IconTrophy size={12} aria-hidden /> Rally
                    </span>
                  ) : null}
                </div>
              )}
              <div className={h.titleLine}>
                <h3 className={h.cardTitle}>{c.title}</h3>
                {c.why && <InfoTip content={c.why} label="Why you see this" size="xsm" />}
              </div>
              {c.subtitle && <p className={h.cardSub}>{c.subtitle}</p>}
              <div className={h.cardBtns}>
                <Link className={`${h.pill} ${h.pillSm} ${c.meta?.joined ? h.pillQuiet : h.pillBlue}`} href={c.href ?? '/groups'} onClick={() => onOpen(c)}>
                  {/join/i.test(c.cta ?? '') ? (
                    <>
                      <IconUserPlus size={16} aria-hidden /> Join
                    </>
                  ) : (
                    <>
                      Open <IconChevronRight size={16} aria-hidden />
                    </>
                  )}
                </Link>
                <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillIcon} ${h.pillGhost}`} aria-label="Not interested" title="Not interested" onClick={() => onHide(c)}>
                  <IconEyeOff size={16} aria-hidden />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
