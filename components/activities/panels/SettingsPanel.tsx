'use client';

import {useState} from 'react';
import {IconBan, IconEyeOff, IconMessageCircle} from '@tabler/icons-react';
import type {listAudit} from '@/lib/activities/answers';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {PolicyMatrix} from '@/lib/activities/policies';
import {sourceLabel} from '@/lib/activities/source-label';
import {AUDIENCE_LABEL, CATEGORY_LABEL, categorySummary, describeAnswer, LEVEL_LABEL, museSummary} from '@/lib/activities/summary';
import {AUDIENCES, CATEGORIES, type Audience, type Category, type ConnectResult, type Platform, type ShareLevel, type UserTag} from '@/lib/activities/types';
import type {HeroPick} from '@/lib/kingdom/cast';
import type {PublicConnection} from '../ConnectorHub';
import {HeroPicker} from '@/components/rally/HeroPicker';
import {ConnectSourcePanel} from '../ConnectSourcePanel';
import {DevicesPanel} from '../DevicesPanel';
import {CATEGORY_ICON} from '../PrivacyMatrix';
import h from '../home/home.module.css';
import {useJson, usePanelNav} from './nav';
import p from './panels.module.css';
import {SourceList} from './SourceList';

const TABS = [
  ['character', 'Character'],
  ['sources', 'Sources'],
  ['privacy', 'Privacy'],
  ['muse', 'Muse'],
] as const;
type Tab = (typeof TABS)[number][0];
const FLASH_KEYS = {source: null, connected: null, imported: null, error: null};
// phone-synced sources and Whoop also show the Devices block (phone sync, Whoop link + sync, raw readings)
const PHONE = new Set(['apple_health', 'health_connect', 'google_health', 'phone_steps', 'whoop']);

/** Settings panel: Sources, Privacy, Muse. Replaces /activities/{muse,privacy,connect}. */
export function SettingsPanel({sp}: {sp: URLSearchParams}) {
  const {update} = usePanelNav();
  const t = sp.get('tab');
  const tab: Tab = t === 'character' || t === 'privacy' || t === 'muse' ? t : 'sources';
  const source = sp.get('source');
  return (
    <div className={p.stack}>
      <div className={p.tabs} role="tablist" aria-label="Settings">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`${h.pill} ${h.pillSm} ${tab === id ? h.pillBlue : h.pillOutline}`} onClick={() => update({tab: id, ...FLASH_KEYS})}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'character' ? <CharacterTab /> : tab === 'sources' ? source ? <SourceDetail source={source} sp={sp} /> : <SourcesTab /> : tab === 'privacy' ? <PrivacyTab /> : <MuseTab />}
    </div>
  );
}

function Loading({error}: {error: string | null}) {
  return error ? <p className={p.error}>{error}</p> : <p className={p.note}>Loading…</p>;
}

function CharacterTab() {
  const {data, error, reload} = useJson<{hero: HeroPick | null}>('/api/activities/profile');
  const [picked, setPicked] = useState<HeroPick | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const current = picked === undefined ? (data?.hero ?? null) : picked;
  if (!data) return <Loading error={error} />;

  async function pick(hero: HeroPick) {
    setPicked(hero);
    setErr(null);
    const res = await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({hero})});
    if (!res.ok) {
      setErr('Could not save your hero');
      reload();
    }
  }

  return (
    <div className={p.stack}>
      <p className={p.note}>Your hero walks with you in Turf and fights beside your squad in Rally.</p>
      <HeroPicker value={current} onChange={hero => void pick(hero)} />
      {err && <p className={p.error}>{err}</p>}
    </div>
  );
}

function SourcesTab() {
  const {data, error, reload} = useJson<{platform: Platform; cards: ConnectorCard[]; connections: PublicConnection[]}>('/api/activities/connections');
  return data ? <SourceList cards={data.cards} connections={data.connections} onChanged={reload} /> : <Loading error={error} />;
}

function SourceDetail({source, sp}: {source: string; sp: URLSearchParams}) {
  const {data, error, reload} = useJson<{card: ConnectorCard; connection: PublicConnection | null; eventCount: number; initialResult: ConnectResult | null}>(`/api/activities/connections?source=${encodeURIComponent(source)}`);
  const err = sp.get('error');
  // set by the OAuth callback when it sends the user back here
  const flash = sp.get('connected') ? `Connected${sp.get('imported') ? ` · ${sp.get('imported')} imported` : ''}` : err ? `Couldn't connect: ${err === 'state' ? 'try again' : err}` : null;
  if (!data) return <Loading error={error} />;
  return (
    <div className={p.stack}>
      <ConnectSourcePanel card={data.card} connection={data.connection} eventCount={data.eventCount} initialResult={data.initialResult} flash={flash} onChanged={reload} />
      {PHONE.has(source) && <DevicesPanel />}
    </div>
  );
}

type AuditRow = Awaited<ReturnType<typeof listAudit>>[number];
const LEVELS: ShareLevel[] = ['exact', 'rounded', 'boolean', 'muse_only', 'none'];
const QUESTION_LABEL: Record<string, string> = {
  workouts_this_week: 'workouts this week', active_days_this_week: 'active days', distance_this_week_km: 'distance this week', completed_move_today: 'moved today', completed_run_3km_today: 'ran 3 km today', steps_today: 'steps today', avg_hr_this_week: 'avg heart rate', sleep_last_night_hours: 'sleep', last_workout: 'last workout',
  runs_2w: 'runs (2 wk)', rides_2w: 'rides (2 wk)', strength_2w: 'strength (2 wk)', yoga_2w: 'yoga (2 wk)', workouts_2w: 'workouts (2 wk)',
  level_4w: 'level', workouts_per_week_4w: 'workouts a week', load_weekly_16w: 'training load', steps_avg_7d: 'avg steps', sleep_avg_7d: 'avg sleep',
};

function askerLabel(a: string): string {
  if (a.startsWith('preview')) return 'You';
  const [kind, id] = a.split(':');
  const names: Record<string, string> = {turf: 'Turf', quest: 'Rally', rally: 'Rally', mentor: 'Mentors', ahead: 'Mentors', discover: 'Discover', game: 'Game'};
  return `${names[kind] ?? kind}${id ? ` #${id}` : ''}`;
}

function PrivacyTab() {
  const pol = useJson<{policies: PolicyMatrix}>('/api/privacy/policies');
  const aud = useJson<{audit: AuditRow[]}>('/api/privacy/audit?limit=40');
  const [edited, setEdited] = useState<PolicyMatrix | null>(null);
  const [openCat, setOpenCat] = useState<Category | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const m = edited ?? pol.data?.policies ?? null;
  if (!m) return <Loading error={pol.error} />;

  async function set(c: Category, a: Audience, level: ShareLevel) {
    setEdited({...m!, [c]: {...m![c], [a]: level}});
    setErr(null);
    const res = await fetch('/api/privacy/policies', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({category: c, audience: a, level})});
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(j.error ?? 'Save failed');
    setEdited(j.policies);
    pol.reload();
  }

  return (
    <div className={p.stack}>
      <ul className={p.list}>
        {CATEGORIES.map(c => {
          const Icon = CATEGORY_ICON[c];
          const open = openCat === c;
          return (
            <li key={c} className={`${p.row} ${open ? p.open : ''}`}>
              <button type="button" className={p.rowMain} aria-expanded={open} onClick={() => setOpenCat(open ? null : c)}>
                <Icon size={22} aria-hidden />
                <span className={p.rowText}>
                  <strong>{CATEGORY_LABEL[c]}</strong>
                  <small>{categorySummary(m, c)}</small>
                </span>
              </button>
              {open && (
                <div className={p.levels}>
                  {AUDIENCES.map(a => {
                    const owner = a === 'only_me';
                    return (
                      <div key={a}>
                        <span>{AUDIENCE_LABEL[a]}</span>
                        <div className={p.pills} role="radiogroup" aria-label={`${CATEGORY_LABEL[c]}: ${AUDIENCE_LABEL[a]}`}>
                          {(owner ? (['exact', 'none'] as ShareLevel[]) : LEVELS).map(l => (
                            <button key={l} type="button" role="radio" aria-checked={m[c][a] === l} className={`${h.pill} ${h.pillSm} ${m[c][a] === l ? h.pillBlue : h.pillOutline}`} onClick={() => void set(c, a, l)}>
                              {owner && l === 'none' ? 'Off' : LEVEL_LABEL[l]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {err && <p className={p.error}>{err}</p>}
      <p className={p.label}>Who asked</p>
      {!aud.data ? (
        <Loading error={aud.error} />
      ) : aud.data.audit.length === 0 ? (
        <p className={p.note}>No one yet.</p>
      ) : (
        <ul className={p.list}>
          {aud.data.audit.map(r => (
            <li key={r.id} className={p.row}>
              <span className={p.rowText}>
                <strong>
                  {askerLabel(r.asker)} <span className={p.metric}>{QUESTION_LABEL[r.question] ?? r.question}</span>
                </strong>
                <small>
                  {r.answer ? describeAnswer(r.answer) : '—'} · {AUDIENCE_LABEL[r.audience] ?? r.audience} · {new Date(r.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                </small>
              </span>
              <span className={`${p.badge} ${r.level === 'exact' ? p.ember : r.level === 'none' ? '' : p.blue}`}>{LEVEL_LABEL[r.level]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MuseTab() {
  const {update} = usePanelNav();
  const {data, error} = useJson<{tags: UserTag[]; policies: PolicyMatrix; connections: PublicConnection[]}>('/api/activities/profile');
  if (!data) return <Loading error={error} />;
  const summary = museSummary(data.policies, {sources: data.connections.filter(c => c.status === 'connected').map(c => sourceLabel(c.source)), tags: data.tags.map(t => t.tag)});
  return (
    <div className={p.stack}>
      <p className={p.label}>Shares</p>
      <ul className={p.lines}>
        {summary.shares.map(s => (
          <li key={`s:${s}`}>
            <IconMessageCircle size={18} aria-hidden />
            {s}
          </li>
        ))}
        {summary.secrets.map(s => (
          <li key={`k:${s}`}>
            <IconEyeOff size={18} aria-hidden />
            {s}
          </li>
        ))}
        <li>
          <IconBan size={18} aria-hidden />
          {summary.nobody}
        </li>
      </ul>
      <button type="button" className={p.textBtn} onClick={() => update({tab: 'privacy'})}>
        Edit sharing
      </button>
      {data.tags.length > 0 && (
        <>
          <p className={p.label}>Knows</p>
          <div className={p.pills}>
            {data.tags.map(t => (
              <span key={`${t.kind}:${t.tag}`} className={`${p.badge} ${t.visibility === 'muse_only' ? p.purple : p.blue}`} title={t.visibility === 'muse_only' ? 'Muse only, never shown' : `Shown to ${t.visibility}`}>
                {t.tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
