'use client';
import {useEffect, useState} from 'react';
import {AUDIENCE_LABEL, describeAnswer, LEVEL_LABEL} from '@/lib/activities/summary';
import type {Answer, Audience, QuestionType} from '@/lib/activities/types';
import styles from './activities.module.css';

const QUESTIONS: {id: QuestionType; label: string}[] = [
  {id: 'avg_hr_this_week', label: 'Average heart rate this week'},
  {id: 'workouts_this_week', label: 'Workouts this week'},
  {id: 'distance_this_week_km', label: 'Distance this week'},
  {id: 'steps_today', label: 'Steps today'},
  {id: 'sleep_last_night_hours', label: 'Sleep last night'},
  {id: 'completed_move_today', label: 'Completed a move today'},
  {id: 'last_workout', label: 'Last workout'},
];
const AUDS: Audience[] = ['game_participants', 'friends', 'mentor_match', 'public', 'only_me'];

/** §14 live redaction demo: ask your own Muse as a given audience; re-asks whenever policies change (refreshKey). */
export function AnswerPreview({refreshKey = 0, defaultQuestion = 'avg_hr_this_week', defaultAudience = 'game_participants'}: {refreshKey?: number; defaultQuestion?: QuestionType; defaultAudience?: Audience}) {
  const [question, setQuestion] = useState<QuestionType>(defaultQuestion);
  const [audience, setAudience] = useState<Audience>(defaultAudience);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    fetch(`/api/activities/answers/preview?question=${question}&audience=${audience}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!cancelled) setAnswer(j?.answer ?? null);
      })
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [question, audience, refreshKey]);

  return (
    <div>
      <div className={styles.grid2}>
        <div>
          <label className={styles.label} htmlFor="prev-q">
            If someone asked my Muse…
          </label>
          <select id="prev-q" className={styles.select} style={{width: '100%'}} value={question} onChange={e => setQuestion(e.target.value as QuestionType)}>
            {QUESTIONS.map(q => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.label} htmlFor="prev-a">
            …as
          </label>
          <select id="prev-a" className={styles.select} style={{width: '100%'}} value={audience} onChange={e => setAudience(e.target.value as Audience)}>
            {AUDS.map(a => (
              <option key={a} value={a}>
                {AUDIENCE_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.answerBox} aria-live="polite">
        {busy && !answer ? (
          <span className={styles.muted}>Asking…</span>
        ) : answer ? (
          <>
            <div style={{fontWeight: 700}}>{describeAnswer(answer)}</div>
            <div className={styles.small}>
              Level: {LEVEL_LABEL[answer.level]}
              {answer.sourceTrust ? ` · best source: ${answer.sourceTrust.replace('_', ' ')}` : ''} · logged to your audit trail
            </div>
          </>
        ) : (
          <span className={styles.muted}>Could not ask.</span>
        )}
      </div>
    </div>
  );
}
