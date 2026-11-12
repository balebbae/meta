'use client';
import {useRef, useState, type KeyboardEvent} from 'react';
import {CloseIcon} from '@/components/icons';
import {fileToDataUrl} from './hooks';
import {GifSquareIcon, ImageIcon, MicIcon, PlusCircleIcon, SendIcon, StickerSquareIcon, ThumbIcon} from './icons';
import styles from './messages.module.css';

export function Composer({onSend, disabled, autoFocus}: {onSend: (body: string, imageUrl: string | null) => void | Promise<void>; disabled?: boolean; autoFocus?: boolean}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  };
  const submit = () => {
    const body = text.trim();
    if (!body && !image) {
      void onSend('👍', null);
      return;
    }
    void onSend(body, image);
    setText('');
    setImage(null);
    requestAnimationFrame(resize);
    taRef.current?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };
  const pick = async (file?: File | null) => {
    if (!file) return;
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      /* ignore unreadable files */
    }
  };
  const hasContent = Boolean(text.trim() || image);

  return (
    <div>
      {image && (
        <div className={styles.composerAttach}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Attachment preview" />
          <button type="button" className={styles.composerAttachRemove} aria-label="Remove attachment" onClick={() => setImage(null)}>
            <CloseIcon size={12} />
          </button>
        </div>
      )}
      <div className={styles.composer}>
        <div className={styles.composerIcons}>
          <button type="button" className={styles.iconBtn} aria-label="Open more actions" onClick={() => fileRef.current?.click()}>
            <PlusCircleIcon size={20} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Attach a photo" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={20} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Choose a sticker">
            <StickerSquareIcon size={20} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Choose a GIF">
            <GifSquareIcon size={20} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Record a voice clip">
            <MicIcon size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={e => void pick(e.target.files?.[0]).then(() => (e.target.value = ''))} />
        </div>
        <div className={styles.composerInput}>
          <textarea
            ref={taRef}
            rows={1}
            value={text}
            placeholder="Aa"
            aria-label="Message"
            autoFocus={autoFocus}
            disabled={disabled}
            onChange={e => {
              setText(e.target.value);
              resize();
            }}
            onKeyDown={onKey}
            onPaste={e => {
              const f = Array.from(e.clipboardData.files).find(x => x.type.startsWith('image/'));
              if (f) {
                e.preventDefault();
                void pick(f);
              }
            }}
          />
          <button type="button" className={styles.iconBtn} aria-label="Choose an emoji" style={{width: 32, height: 32}}>
            <span style={{fontSize: 18, lineHeight: 1}}>🙂</span>
          </button>
        </div>
        <button type="button" className={styles.iconBtn} aria-label={hasContent ? 'Press Enter to send' : 'Send a like'} onClick={submit} disabled={disabled}>
          {hasContent ? <SendIcon size={20} /> : <ThumbIcon size={22} />}
        </button>
      </div>
    </div>
  );
}
