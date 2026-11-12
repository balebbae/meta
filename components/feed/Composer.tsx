'use client';
import Image from 'next/image';
import {useEffect, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {Dialog} from '@/components/ui/Dialog';
import {Popover} from '@/components/ui/Popover';
import {Tooltip} from '@/components/ui/Tooltip';
import {COMPOSE_EVENT} from '@/components/layout/ComposeFab';
import {
  CaretDownSmallIcon,
  CloseIcon,
  EmojiIcon,
  FeelingIcon,
  GifIcon,
  LiveVideoIcon,
  LocationIcon,
  MoreHorizontalIcon,
  PhotoIcon,
  TagIcon,
  TextBgIcon,
} from '@/components/icons';
import {AudienceIcon} from '@/components/feed/PostCard';
import type {Post, User} from '@/lib/types';
import styles from './feed.module.css';

const AUDIENCE_LABEL: Record<Post['audience'], string> = {public: 'Public', friends: 'Friends', only_me: 'Only me'};
const AUDIENCE_SUB: Record<Post['audience'], string> = {public: 'Anyone on or off Facebook', friends: 'Your friends on Facebook', only_me: 'Only you'};

export function Composer({viewer, onCreated}: {viewer: User; onCreated: (post: Post) => void}) {
  const [open, setOpen] = useState(false);
  const [withPhoto, setWithPhoto] = useState(false);
  const first = viewer.name.split(' ')[0];
  useEffect(() => {
    const onCompose = () => setOpen(true);
    window.addEventListener(COMPOSE_EVENT, onCompose);
    return () => window.removeEventListener(COMPOSE_EVENT, onCompose);
  }, []);
  return (
    <>
      <div className={styles.composer}>
        <div className={styles.composerTop}>
          <Avatar src={viewer.avatarUrl} alt={viewer.name} size={40} />
          <button className={styles.composerPill} onClick={() => setOpen(true)}>
            What&apos;s on your mind, {first}?
          </button>
          <div className={styles.composerIcons}>
            <Tooltip label="Live video">
              <button className={styles.composerIconBtn} onClick={() => setOpen(true)} aria-label="Live video">
                <LiveVideoIcon size={24} />
              </button>
            </Tooltip>
            <Tooltip label="Photo/video">
              <button
                className={styles.composerIconBtn}
                aria-label="Photo/video"
                onClick={() => {
                  setWithPhoto(true);
                  setOpen(true);
                }}>
                <PhotoIcon size={24} />
              </button>
            </Tooltip>
            <Tooltip label="Feeling/activity">
              <button className={styles.composerIconBtn} onClick={() => setOpen(true)} aria-label="Feeling/activity">
                <FeelingIcon size={24} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      <CreatePostDialog
        open={open}
        viewer={viewer}
        startWithPhoto={withPhoto}
        onClose={() => {
          setOpen(false);
          setWithPhoto(false);
        }}
        onCreated={p => {
          setOpen(false);
          setWithPhoto(false);
          onCreated(p);
        }}
      />
    </>
  );
}

export function CreatePostDialog({
  open,
  viewer,
  startWithPhoto,
  onClose,
  onCreated,
}: {
  open: boolean;
  viewer: User;
  startWithPhoto?: boolean;
  onClose: () => void;
  onCreated: (post: Post) => void;
}) {
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<Post['audience']>('friends');
  const [audOpen, setAudOpen] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (open) {
      setText('');
      setImageUrl('');
      setShowPhoto(!!startWithPhoto);
      setPosting(false);
    }
  }, [open, startWithPhoto]);

  const submit = async () => {
    const content = text.trim();
    if (!content || posting) return;
    setPosting(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({content, audience, imageUrl: imageUrl.trim() || null}),
    });
    setPosting(false);
    if (res.ok) {
      const d = (await res.json()) as {post: Post};
      onCreated(d.post);
    }
  };

  const first = viewer.name.split(' ')[0];
  const previewOk = /^https:\/\/(picsum\.photos|fastly\.picsum\.photos|images\.unsplash\.com|i\.pravatar\.cc)\//.test(imageUrl.trim());

  return (
    <Dialog open={open} onClose={onClose} title="Create post">
      <div className={styles.dlgBody}>
        <div className={styles.dlgAuthor}>
          <Avatar src={viewer.avatarUrl} alt={viewer.name} size={40} />
          <div>
            <div className={styles.dlgName}>{viewer.name}</div>
            <div style={{position: 'relative', display: 'inline-block'}}>
              <button className={styles.audiencePill} onClick={() => setAudOpen(v => !v)} aria-haspopup="menu">
                <AudienceIcon audience={audience} /> {AUDIENCE_LABEL[audience]} <CaretDownSmallIcon size={12} />
              </button>
              <Popover open={audOpen} onClose={() => setAudOpen(false)} align="left" width={300}>
                <div className={styles.menu}>
                  {(['public', 'friends', 'only_me'] as const).map(a => (
                    <button
                      key={a}
                      className={styles.menuItem}
                      onClick={() => {
                        setAudience(a);
                        setAudOpen(false);
                      }}>
                      <span className={styles.menuIcon}>
                        <AudienceIcon audience={a} size={20} />
                      </span>
                      <span>
                        <div>{AUDIENCE_LABEL[a]}</div>
                        <div style={{fontSize: 13, fontWeight: 400, color: 'var(--fb-text-secondary)'}}>{AUDIENCE_SUB[a]}</div>
                      </span>
                    </button>
                  ))}
                </div>
              </Popover>
            </div>
          </div>
        </div>
        <textarea
          className={`${styles.dlgTextarea} ${text.length > 85 || showPhoto ? styles.dlgTextareaSmall : ''}`}
          placeholder={`What's on your mind, ${first}?`}
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
          aria-label="Post text"
        />
        <div className={styles.dlgTools}>
          <button aria-label="Text background" style={{display: 'flex'}}>
            <TextBgIcon size={38} />
          </button>
          <button className={styles.dlgEmoji} aria-label="Emoji">
            <EmojiIcon size={24} />
          </button>
        </div>
        {showPhoto && (
          <div className={styles.previewWrap}>
            <div className={styles.imageUrlRow}>
              <input
                className={styles.imageUrlInput}
                placeholder="Paste an image URL (picsum.photos or images.unsplash.com)"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                aria-label="Image URL"
              />
            </div>
            {previewOk && <Image src={imageUrl.trim()} alt="" width={468} height={260} className={styles.previewImg} unoptimized />}
            <button className={styles.previewClose} aria-label="Remove photo" onClick={() => {
              setShowPhoto(false);
              setImageUrl('');
            }}>
              <CloseIcon size={18} />
            </button>
          </div>
        )}
        <div className={styles.addTo}>
          <span className={styles.addToLabel}>Add to your post</span>
          <div className={styles.addToIcons}>
            <button className={styles.addToIcon} aria-label="Photo/video" onClick={() => setShowPhoto(true)}>
              <PhotoIcon size={24} />
            </button>
            <button className={styles.addToIcon} aria-label="Tag people">
              <TagIcon size={24} />
            </button>
            <button className={styles.addToIcon} aria-label="Feeling/activity">
              <FeelingIcon size={24} />
            </button>
            <button className={styles.addToIcon} aria-label="Check in">
              <LocationIcon size={24} />
            </button>
            <button className={styles.addToIcon} aria-label="GIF" style={{color: '#10c29f'}}>
              <GifIcon size={24} />
            </button>
            <button className={styles.addToIcon} aria-label="More" style={{color: 'var(--fb-text-secondary)'}}>
              <MoreHorizontalIcon size={24} />
            </button>
          </div>
        </div>
        <button className={styles.postBtn} disabled={!text.trim() || posting} onClick={submit}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </Dialog>
  );
}
