'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {HStack} from '@astryxdesign/core/HStack';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';

const EXAMPLES = ['Compete in a HYROX in March', 'Run my first 5K', 'Half marathon this spring', 'Do 10 pull-ups in a row'];

export function GoalComposer() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text})});
      const d = (await res.json().catch(() => ({}))) as {goal?: {id: number}; error?: string};
      if (!res.ok || !d.goal) throw new Error(d.error ?? 'Could not build the roadmap. Try again.');
      router.push(`/activities/goals/${d.goal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the roadmap.');
      setBusy(false);
    }
  };

  return (
    <Card aria-busy={busy}>
      <VStack gap={3}>
        <TextArea
          label="What are you training for?"
          description="Say it like you would to a friend. Your Muse builds a week-by-week roadmap from where you are now."
          value={text}
          onChange={setText}
          placeholder="I want to compete in a HYROX in March"
          maxLength={300}
          rows={3}
          isDisabled={busy}
        />
        <HStack gap={1.5} wrap="wrap" aria-label="Examples">
          {EXAMPLES.map(x => (
            <Token key={x} label={x} size="sm" isDisabled={busy} onClick={() => setText(x)} />
          ))}
        </HStack>
        <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
          <Text type="supporting" color="secondary">
            Planning help, not medical advice.
          </Text>
          <Button label={busy ? 'Planning your weeks…' : 'Build my roadmap'} variant="primary" isLoading={busy} isDisabled={text.trim().length < 3} onClick={() => void submit()} />
        </HStack>
        {error && <Banner status="error" title={error} />}
      </VStack>
    </Card>
  );
}
