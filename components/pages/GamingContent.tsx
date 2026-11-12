'use client';
import Image from 'next/image';
import {useRef, useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import type {Game} from '@/lib/secondary-data';
import {SectionHead} from './SecondaryLayout';
import {ChevronLeftIcon, ChevronRightIcon, PlayIcon} from './icons';
import styles from './gaming.module.css';

export function GamingContent({games}: {games: Game[]}) {
  const [playing, setPlaying] = useState<Game | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({left: dir * 332, behavior: 'smooth'});
  const instant = games.filter(g => g.instant);
  return (
    <div className={styles.wrap}>
      <section>
        <SectionHead title="Suggested Live Now" link="/gaming?tab=browse" />
        <div className={styles.carousel}>
          <button type="button" className={styles.arrowLeft} onClick={() => scroll(-1)} aria-label="Previous">
            <ChevronLeftIcon />
          </button>
          <div className={styles.track} ref={track}>
            {games.map(g => (
              <article key={g.id} className={styles.hero}>
                <div className={styles.heroImg}>
                  <Image src={g.cover} alt="" fill sizes="320px" />
                </div>
                <div className={styles.heroBody}>
                  <div className={styles.heroText}>
                    <div className={styles.name}>{g.name}</div>
                    <div className={styles.meta}>{g.players}</div>
                  </div>
                  <button type="button" className={styles.play} onClick={() => setPlaying(g)}>
                    <PlayIcon size={14} />
                    Play
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button type="button" className={styles.arrowRight} onClick={() => scroll(1)} aria-label="Next">
            <ChevronRightIcon />
          </button>
        </div>
      </section>
      <section>
        <SectionHead title="New and Rising Games" link="/gaming?tab=browse" />
        <div className={styles.grid}>
          {instant.map(g => (
            <article key={g.id} className={styles.tile}>
              <div className={styles.tileImg}>
                <Image src={g.cover} alt="" fill sizes="72px" />
              </div>
              <div className={styles.heroText}>
                <div className={styles.name}>{g.name}</div>
                <div className={styles.meta}>{g.publisher}</div>
                {g.tag && <span className={styles.tag}>{g.tag}</span>}
              </div>
              <button type="button" className={styles.playSoft} onClick={() => setPlaying(g)}>
                Play
              </button>
            </article>
          ))}
        </div>
      </section>
      <Dialog open={!!playing} onClose={() => setPlaying(null)} title={playing?.name ?? 'Game'} width={600}>
        {playing && (
          <div className={styles.dialogBody}>
            <div className={styles.dialogImg}>
              <Image src={playing.cover} alt="" fill sizes="600px" />
            </div>
            <div>
              <div className={styles.name}>Loading {playing.name}…</div>
              <div className={styles.meta}>
                {playing.publisher} · {playing.players}
              </div>
            </div>
            <div className={styles.loading}>
              <div />
            </div>
            <div className={styles.meta}>This is a demo. Games don&apos;t actually launch in this clone.</div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
