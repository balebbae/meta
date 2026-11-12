'use client';
import Image from '@/components/ui/SmartImage';
import {useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {ChevronLeftIcon, ChevronRightIcon, PlusIcon} from '@/components/icons';
import type {Story, User} from '@/lib/types';
import styles from './feed.module.css';

export function Stories({stories, viewer}: {stories: Story[]; viewer: User}) {
  const track = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setScrolled(el.scrollLeft > 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };
  const scrollBy = (dx: number) => track.current?.scrollBy({left: dx});

  return (
    <section className={styles.stories} aria-label="Stories">
      <div className={styles.storiesTrack} ref={track} onScroll={onScroll}>
        <button className={`${styles.story} ${styles.createStory}`} aria-label="Create story">
          <Image src={viewer.avatarUrl} alt="" width={141} height={190} className={styles.createImg} />
          <div className={styles.createBottom}>
            <span className={styles.createPlus}>
              <PlusIcon size={20} />
            </span>
            Create story
          </div>
        </button>
        {stories.map(s => (
          <button key={s.id} className={styles.story} aria-label={`${s.user.name}'s story`}>
            <Image src={s.imageUrl} alt="" width={141} height={250} className={styles.storyImg} sizes="141px" />
            <span className={styles.storyRing}>
              <Avatar src={s.user.avatarUrl} alt="" size={32} />
            </span>
            <span className={styles.storyName}>{s.user.id === viewer.id ? 'Your story' : s.user.name}</span>
          </button>
        ))}
      </div>
      {scrolled && (
        <button className={`${styles.storyArrow} ${styles.storyArrowLeft}`} onClick={() => scrollBy(-300)} aria-label="Previous stories">
          <ChevronLeftIcon size={24} />
        </button>
      )}
      {!atEnd && stories.length > 3 && (
        <button className={`${styles.storyArrow} ${styles.storyArrowRight}`} onClick={() => scrollBy(300)} aria-label="More stories">
          <ChevronRightIcon size={24} />
        </button>
      )}
    </section>
  );
}
