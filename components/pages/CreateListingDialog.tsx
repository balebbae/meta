'use client';
import Image from 'next/image';
import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {Dialog} from '@/components/ui/Dialog';
import {CONDITION_LABELS, MARKETPLACE_CATEGORIES, MARKETPLACE_LOCATION} from '@/lib/secondary-data';
import {ImageIcon} from './icons';
import styles from './marketplace.module.css';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&h=800&q=80';

export function CreateListingDialog({open, onClose}: {open: boolean; onClose: () => void}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(MARKETPLACE_CATEGORIES[4]);
  const [condition, setCondition] = useState('used_good');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length > 0 && price.trim().length > 0 && !Number.isNaN(Number(price));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        title: title.trim(),
        priceCents: Math.round(Number(price) * 100),
        category,
        condition,
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || PLACEHOLDER,
        location: 'Dallas, TX',
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? 'Something went wrong');
      return;
    }
    const {listing} = await res.json();
    onClose();
    router.push(`/marketplace/item/${listing.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Item for sale" width={548}>
      <form className={styles.form} onSubmit={submit}>
        {imageUrl.trim() ? (
          <div className={styles.photoPreview}>
            <Image src={imageUrl.trim()} alt="" fill sizes="520px" style={{objectFit: 'cover'}} unoptimized />
          </div>
        ) : (
          <div className={styles.photoBox}>
            <ImageIcon />
            <strong>Add photos</strong>
            Paste an image URL below (photo upload is stubbed).
          </div>
        )}
        <div className={styles.field}>
          <input placeholder="Photo URL (optional)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
        </div>
        <div className={styles.field}>
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} />
        </div>
        <div className={styles.field}>
          <input placeholder="Price" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} required />
        </div>
        <div className={styles.two}>
          <div className={styles.field}>
            <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
              {MARKETPLACE_CATEGORIES.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <select value={condition} onChange={e => setCondition(e.target.value)} aria-label="Condition">
              {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className={styles.field}>
          <input value={`${MARKETPLACE_LOCATION.city}`} readOnly aria-label="Location" />
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <button type="submit" className={styles.submit} disabled={!valid || busy}>
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      </form>
    </Dialog>
  );
}
