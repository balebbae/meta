'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {Dialog} from '@/components/ui/Dialog';
import {Popover} from '@/components/ui/Popover';
import {Tooltip} from '@/components/ui/Tooltip';
import {
  BookmarkIcon,
  CameraIcon,
  CaretDownSmallIcon,
  CloseIcon,
  CommentIcon,
  EmojiIcon,
  EyeOffIcon,
  FriendsIcon,
  GifIcon,
  GlobeIcon,
  LikeFilledIcon,
  LikeIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  REACTIONS,
  ReactionIcon,
  ShareIcon,
  StickerIcon,
  TrashIcon,
  UnfollowIcon,
} from '@/components/icons';
import {formatCompactTime, formatCount, formatFullDate, formatRelativeTime, pluralize} from '@/lib/format';
import type {Comment, Post, ReactionType, User} from '@/lib/types';
import styles from './PostCard.module.css';

const AUDIENCE_LABEL: Record<Post['audience'], string> = {public: 'Public', friends: 'Friends', only_me: 'Only me'};

export function AudienceIcon({audience, size = 12}: {audience: Post['audience']; size?: number}) {
  if (audience === 'public') return <GlobeIcon size={size} />;
  if (audience === 'friends') return <FriendsIcon active size={size} />;
  return <LockIcon size={size} />;
}

const SEE_MORE_LIMIT = 400;

export function PostCard({post: initial, viewer}: {post: Post; viewer: User}): React.JSX.Element {
  const [post, setPost] = useState<Post>(initial);
  const [deleted, setDeleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [focusComposer, setFocusComposer] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => setPost(initial), [initial]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const isOwn = post.author.id === viewer.id;

  /* ---- reactions (optimistic) ---- */
  const react = useCallback(
    async (type: ReactionType | null) => {
      const prev = post;
      const next: Post = {
        ...post,
        viewerReaction: type,
        reactionCount: post.reactionCount + (type ? (post.viewerReaction ? 0 : 1) : post.viewerReaction ? -1 : 0),
        topReactions: type && !post.topReactions.includes(type) ? [type, ...post.topReactions].slice(0, 3) : post.topReactions,
      };
      setPost(next);
      try {
        const res = type
          ? await fetch(`/api/posts/${post.id}/reactions`, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({type})})
          : await fetch(`/api/posts/${post.id}/reactions`, {method: 'DELETE'});
        if (!res.ok) throw new Error('failed');
        const data = (await res.json()) as {post: Post};
        if (data.post) setPost(data.post);
      } catch {
        setPost(prev);
      }
    },
    [post],
  );

  const onDelete = async () => {
    setConfirmDelete(false);
    setDeleted(true);
    const res = await fetch(`/api/posts/${post.id}`, {method: 'DELETE'});
    if (!res.ok) setDeleted(false);
  };

  if (deleted) return <></>;

  const longText = post.content.length > SEE_MORE_LIMIT;
  const text = longText && !expanded ? post.content.slice(0, SEE_MORE_LIMIT).trimEnd() + '… ' : post.content;
  const shortNoImage = !post.imageUrl && post.content.length <= 85 && !post.content.includes('\n');
  const reactionLabel = REACTIONS.find(r => r.type === post.viewerReaction)?.label ?? 'Like';
  const reactionColor = REACTIONS.find(r => r.type === post.viewerReaction)?.color;

  return (
    <article className={styles.card} aria-label={`Post by ${post.author.name}`}>
      <header className={styles.header}>
        <Link href={`/profile/${post.author.id}`} className={styles.authorLink}>
          <Avatar src={post.author.avatarUrl} alt={post.author.name} size={40} />
        </Link>
        <div className={styles.meta}>
          <Link href={`/profile/${post.author.id}`} className={styles.name}>
            {post.author.name}
          </Link>
          <div className={styles.sub}>
            <Tooltip label={formatFullDate(post.createdAt)}>
              <a href={`/posts/${post.id}`} onClick={e => e.preventDefault()}>
                {formatRelativeTime(post.createdAt, now)}
              </a>
            </Tooltip>
            <span className={styles.dot}>·</span>
            <Tooltip label={`Shared with ${AUDIENCE_LABEL[post.audience]}`}>
              <span style={{display: 'inline-flex'}}>
                <AudienceIcon audience={post.audience} />
              </span>
            </Tooltip>
          </div>
        </div>
        <div className={styles.headerActions} style={{position: 'relative'}}>
          <button className={styles.iconBtn} aria-label="Actions for this post" onClick={() => setMenuOpen(v => !v)}>
            <MoreHorizontalIcon size={20} />
          </button>
          <button className={styles.iconBtn} aria-label="Hide post" onClick={() => setDeleted(true)}>
            <CloseIcon size={20} />
          </button>
          <Popover open={menuOpen} onClose={() => setMenuOpen(false)} width={344} align="right" offset={0} style={{right: 44, top: 40}}>
            <div className={styles.menu}>
              <MenuItem icon={<BookmarkIcon size={20} />} title="Save post" sub="Add this to your saved items." onClick={() => setMenuOpen(false)} />
              {isOwn && (
                <>
                  <div className={styles.menuDivider} />
                  <MenuItem
                    icon={<PencilIcon size={20} />}
                    title="Edit post"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditOpen(true);
                    }}
                  />
                  <MenuItem
                    icon={<TrashIcon size={20} />}
                    title="Move to trash"
                    sub="Items in your trash are deleted after 30 days."
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                  />
                </>
              )}
              <div className={styles.menuDivider} />
              <MenuItem icon={<EyeOffIcon size={20} />} title="Hide post" sub="See fewer posts like this." onClick={() => setDeleted(true)} />
              {!isOwn && (
                <MenuItem
                  icon={<UnfollowIcon size={20} />}
                  title={`Unfollow ${post.author.name.split(' ')[0]}`}
                  sub="Stop seeing posts but stay friends."
                  onClick={() => setMenuOpen(false)}
                />
              )}
            </div>
          </Popover>
        </div>
      </header>

      <div className={`${styles.content} ${shortNoImage ? styles.contentLarge : ''}`}>
        {text}
        {longText && !expanded && (
          <button className={styles.seeMore} onClick={() => setExpanded(true)}>
            See more
          </button>
        )}
      </div>

      {post.imageUrl && (
        <Image src={post.imageUrl} alt="" width={1200} height={800} sizes="(max-width: 700px) 100vw, 680px" className={styles.image} priority={false} />
      )}

      {(post.reactionCount > 0 || post.commentCount > 0 || post.shareCount > 0) && (
        <div className={styles.summary}>
          <button className={styles.summaryLeft} aria-label={`${post.reactionCount} reactions`}>
            {post.reactionCount > 0 && (
              <>
                <span className={styles.stack}>
                  {(post.topReactions.length ? post.topReactions : ['like']).slice(0, 3).map(t => (
                    <ReactionIcon key={t} type={t as ReactionType} size={18} />
                  ))}
                </span>
                <span className={styles.count}>
                  {post.viewerReaction
                    ? post.reactionCount === 1
                      ? 'You'
                      : `You and ${formatCount(post.reactionCount - 1)} ${post.reactionCount - 1 === 1 ? 'other' : 'others'}`
                    : formatCount(post.reactionCount)}
                </span>
              </>
            )}
          </button>
          <div className={styles.summaryRight}>
            {post.commentCount > 0 && <button onClick={() => setShowComments(true)}>{pluralize(post.commentCount, 'comment')}</button>}
            {post.shareCount > 0 && <button>{pluralize(post.shareCount, 'share')}</button>}
          </div>
        </div>
      )}

      <div className={styles.divider} style={{marginTop: post.reactionCount + post.commentCount + post.shareCount === 0 ? 0 : undefined}} />

      <div className={styles.actions}>
        <LikeButton
          current={post.viewerReaction}
          label={reactionLabel}
          color={reactionColor}
          onToggle={() => react(post.viewerReaction ? null : 'like')}
          onPick={t => react(t)}
        />
        <button
          className={styles.actionBtn}
          onClick={() => {
            setShowComments(true);
            setFocusComposer(n => n + 1);
          }}>
          <CommentIcon size={20} /> Comment
        </button>
        <button className={styles.actionBtn}>
          <ShareIcon size={20} /> Share
        </button>
      </div>

      {showComments && (
        <>
          <div className={styles.divider} />
          <CommentSection
            postId={post.id}
            viewer={viewer}
            postAuthorId={post.author.id}
            total={post.commentCount}
            focusKey={focusComposer}
            onCountChange={d => setPost(p => ({...p, commentCount: Math.max(0, p.commentCount + d)}))}
          />
        </>
      )}

      <EditPostDialog
        open={editOpen}
        post={post}
        viewer={viewer}
        onClose={() => setEditOpen(false)}
        onSaved={p => {
          setPost(p);
          setEditOpen(false);
        }}
      />

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Move to your trash?" width={548}>
        <p className={styles.confirmText}>Items in your trash are deleted after 30 days. You can restore it from your trash before then.</p>
        <div className={styles.confirmActions}>
          <button className={styles.textBtn} onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button className={styles.primaryBtn} onClick={onDelete}>
            Move
          </button>
        </div>
      </Dialog>
    </article>
  );
}

function MenuItem({icon, title, sub, onClick}: {icon: React.ReactNode; title: string; sub?: string; onClick: () => void}) {
  return (
    <button className={styles.menuItem} onClick={onClick}>
      <span className={styles.menuIcon}>{icon}</span>
      <span className={styles.menuText}>
        <span className={styles.menuTitle}>{title}</span>
        {sub && <span className={styles.menuSub}>{sub}</span>}
      </span>
    </button>
  );
}

/* ---------- Like button with hover reaction picker ---------- */
function LikeButton({
  current,
  label,
  color,
  onToggle,
  onPick,
}: {
  current: ReactionType | null;
  label: string;
  color?: string;
  onToggle: () => void;
  onPick: (t: ReactionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    enterTimer.current = setTimeout(() => setOpen(true), 700);
  };
  const onLeave = () => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    leaveTimer.current = setTimeout(() => setOpen(false), 500);
  };
  useEffect(
    () => () => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );

  return (
    <div className={styles.likeWrap} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className={`${styles.actionBtn} ${current ? styles.actionActive : ''}`}
        style={current && color ? {color} : undefined}
        onClick={() => {
          setOpen(false);
          onToggle();
        }}
        aria-pressed={!!current}>
        {current ? current === 'like' ? <LikeFilledIcon size={20} /> : <ReactionIcon type={current} size={20} /> : <LikeIcon size={20} />}
        {label}
      </button>
      {open && (
        <div className={styles.picker} role="menu" aria-label="Reactions">
          {REACTIONS.map(r => (
            <button
              key={r.type}
              className={styles.pickerBtn}
              aria-label={r.label}
              onClick={() => {
                setOpen(false);
                onPick(r.type);
              }}>
              <span className={styles.pickerLabel}>{r.label}</span>
              <ReactionIcon type={r.type} size={39} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Comments ---------- */
function CommentSection({
  postId,
  viewer,
  postAuthorId,
  total,
  focusKey,
  onCountChange,
}: {
  postId: number;
  viewer: User;
  postAuthorId: number;
  total: number;
  focusKey: number;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(3);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/posts/${postId}/comments`)
      .then(r => r.json())
      .then((d: {comments: Comment[]}) => alive && setComments(d.comments))
      .catch(() => alive && setComments([]));
    return () => {
      alive = false;
    };
  }, [postId]);

  useEffect(() => {
    if (focusKey > 0) inputRef.current?.focus();
  }, [focusKey]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content) return;
    const temp: Comment = {
      id: -Date.now(),
      postId,
      author: {id: viewer.id, name: viewer.name, avatarUrl: viewer.avatarUrl},
      content,
      createdAt: new Date().toISOString(),
    };
    setComments(c => [...(c ?? []), temp]);
    setVisible(v => v + 1);
    setText('');
    onCountChange(1);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({content}),
      });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as {comment: Comment};
      setComments(c => (c ?? []).map(x => (x.id === temp.id ? d.comment : x)));
    } catch {
      setComments(c => (c ?? []).filter(x => x.id !== temp.id));
      onCountChange(-1);
    }
  };

  const remove = async (c: Comment) => {
    setComments(list => (list ?? []).filter(x => x.id !== c.id));
    onCountChange(-1);
    const res = await fetch(`/api/posts/${postId}/comments/${c.id}`, {method: 'DELETE'});
    if (!res.ok) {
      setComments(list => [...(list ?? []), c].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      onCountChange(1);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const list = comments ?? [];
  const hidden = Math.max(0, list.length - visible);
  const shown = list.slice(hidden);

  return (
    <div className={styles.comments}>
      {total > 1 && (
        <div className={styles.commentFilter}>
          <button className={styles.filterBtn}>
            Most relevant <CaretDownSmallIcon size={16} />
          </button>
        </div>
      )}
      {hidden > 0 && (
        <button className={styles.viewMore} onClick={() => setVisible(list.length)}>
          View {hidden === 1 ? '1 more comment' : `${hidden} more comments`}
        </button>
      )}
      {comments === null && total > 0 && <div className={styles.viewMore} style={{opacity: 0.6}}>Loading comments…</div>}
      {shown.map(c => (
        <div key={c.id} className={styles.comment}>
          <Link href={`/profile/${c.author.id}`}>
            <Avatar src={c.author.avatarUrl} alt={c.author.name} size={32} />
          </Link>
          <div className={styles.commentBody}>
            <div className={styles.bubbleRow}>
              <div className={styles.bubble}>
                <Link href={`/profile/${c.author.id}`} className={styles.bubbleName}>
                  {c.author.name}
                </Link>
                <span className={styles.bubbleText}>{c.content}</span>
              </div>
              {(c.author.id === viewer.id || postAuthorId === viewer.id) && (
                <button className={styles.commentMore} aria-label="Delete comment" onClick={() => remove(c)} title="Delete">
                  <MoreHorizontalIcon size={16} />
                </button>
              )}
            </div>
            <div className={styles.commentMeta}>
              <span>{formatCompactTime(c.createdAt)}</span>
              <button>Like</button>
              <button>Reply</button>
            </div>
          </div>
        </div>
      ))}
      <form className={styles.composer} onSubmit={submit}>
        <Avatar src={viewer.avatarUrl} alt={viewer.name} size={32} />
        <div className={styles.inputWrap}>
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder="Write a comment…"
            rows={1}
            value={text}
            onChange={e => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(160, e.target.scrollHeight)}px`;
            }}
            onKeyDown={onKey}
            aria-label="Write a comment"
          />
          <div className={styles.inputIcons}>
            <div className={styles.inputIconGroup}>
              <button type="button" className={styles.inputIcon} aria-label="Insert an emoji">
                <EmojiIcon size={16} />
              </button>
              <button type="button" className={styles.inputIcon} aria-label="Attach a photo or video">
                <CameraIcon size={16} />
              </button>
              <button type="button" className={styles.inputIcon} aria-label="Comment with a GIF">
                <GifIcon size={16} />
              </button>
              <button type="button" className={styles.inputIcon} aria-label="Comment with a sticker">
                <StickerIcon size={16} />
              </button>
            </div>
            <button type="submit" className={styles.sendBtn} disabled={!text.trim()} aria-label="Comment">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3.4 20.4l17.4-7.5a1 1 0 000-1.8L3.4 3.6a1 1 0 00-1.4 1.1L3.5 11l9 1-9 1-1.5 6.3a1 1 0 001.4 1.1z" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------- Edit post ---------- */
function EditPostDialog({open, post, viewer, onClose, onSaved}: {open: boolean; post: Post; viewer: User; onClose: () => void; onSaved: (p: Post) => void}) {
  const [content, setContent] = useState(post.content);
  const [audience, setAudience] = useState<Post['audience']>(post.audience);
  const [audOpen, setAudOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setContent(post.content);
      setAudience(post.audience);
    }
  }, [open, post]);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({content, audience}),
    });
    setSaving(false);
    if (res.ok) {
      const d = (await res.json()) as {post: Post};
      onSaved(d.post);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Edit post">
      <div className={styles.dialogBody}>
        <div className={styles.authorRow}>
          <Avatar src={viewer.avatarUrl} alt={viewer.name} size={40} />
          <div>
            <div style={{fontSize: 15, fontWeight: 600}}>{viewer.name}</div>
            <div style={{position: 'relative', display: 'inline-block'}}>
              <button className={styles.audiencePill} onClick={() => setAudOpen(v => !v)}>
                <AudienceIcon audience={audience} /> {AUDIENCE_LABEL[audience]} <CaretDownSmallIcon size={12} />
              </button>
              <Popover open={audOpen} onClose={() => setAudOpen(false)} align="left" width={240}>
                <div className={styles.audienceMenu}>
                  {(['public', 'friends', 'only_me'] as const).map(a => (
                    <MenuItem
                      key={a}
                      icon={<AudienceIcon audience={a} size={20} />}
                      title={AUDIENCE_LABEL[a]}
                      onClick={() => {
                        setAudience(a);
                        setAudOpen(false);
                      }}
                    />
                  ))}
                </div>
              </Popover>
            </div>
          </div>
        </div>
        <textarea
          className={`${styles.editArea} ${content.length <= 85 && !post.imageUrl ? styles.editAreaLarge : ''}`}
          value={content}
          onChange={e => setContent(e.target.value)}
          aria-label="Post text"
          autoFocus
        />
        {post.imageUrl && <Image src={post.imageUrl} alt="" width={468} height={312} style={{width: '100%', height: 'auto', borderRadius: 8}} />}
      </div>
      <div style={{padding: '0 16px 16px'}}>
        <button className={styles.saveBtn} disabled={!content.trim() || saving} onClick={save}>
          Save
        </button>
      </div>
    </Dialog>
  );
}
