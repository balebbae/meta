'use client';
import {useEffect, useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Selector} from '@astryxdesign/core/Selector';
import {Spinner} from '@astryxdesign/core/Spinner';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {AUDIENCE_LABEL, describeAnswer, LEVEL_LABEL} from '@/lib/activities/summary';
import type {Answer, Audience, QuestionType} from '@/lib/activities/types';

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
    <VStack gap={3}>
      <Grid columns={{minWidth: 200}} gap={3}>
        <Selector label="If someone asked my Muse…" options={QUESTIONS.map(q => ({value: q.id, label: q.label}))} value={question} onChange={v => setQuestion(v as QuestionType)} />
        <Selector label="…as" options={AUDS.map(a => ({value: a, label: AUDIENCE_LABEL[a]}))} value={audience} onChange={v => setAudience(v as Audience)} />
      </Grid>
      <Card variant="muted" aria-live="polite">
        {busy && !answer ? (
          <Spinner label="Asking…" />
        ) : answer ? (
          <VStack gap={1}>
            <Text weight="bold">{describeAnswer(answer)}</Text>
            <Text type="supporting" color="secondary">
              Level: {LEVEL_LABEL[answer.level]}
              {answer.sourceTrust ? ` · best source: ${answer.sourceTrust.replace('_', ' ')}` : ''} · logged to your audit trail
            </Text>
          </VStack>
        ) : (
          <Text color="secondary">Could not ask.</Text>
        )}
      </Card>
    </VStack>
  );
}
