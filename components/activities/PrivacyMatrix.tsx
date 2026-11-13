'use client';
import {useState} from 'react';
import {Footprints, HeartPulse, MapPin, Moon, PersonStanding, Scale, type LucideIcon} from 'lucide-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Collapsible, CollapsibleGroup} from '@astryxdesign/core/Collapsible';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {AUDIENCE_LABEL, CATEGORY_EXAMPLE, CATEGORY_LABEL, LEVEL_HELP, LEVEL_LABEL, categorySummary} from '@/lib/activities/summary';
import type {PolicyMatrix} from '@/lib/activities/policies';
import {AUDIENCES, CATEGORIES, type Audience, type Category, type ShareLevel} from '@/lib/activities/types';

const LEVELS: ShareLevel[] = ['exact', 'rounded', 'boolean', 'muse_only', 'none'];
export const CATEGORY_ICON: Record<Category, LucideIcon> = {workouts: PersonStanding, steps: Footprints, heart: HeartPulse, sleep: Moon, body: Scale, location: MapPin};

/** Category × audience grid with the five levels (§7.2). Saves each change with PUT /api/privacy/policies. */
export function PrivacyMatrix({initial, onChange, compact}: {initial: PolicyMatrix; onChange?: (m: PolicyMatrix) => void; compact?: boolean}) {
  const [matrix, setMatrix] = useState<PolicyMatrix>(initial);
  const [open, setOpen] = useState<string>(compact ? '' : 'heart');
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function update(category: Category, audience: Audience, level: ShareLevel) {
    const next = {...matrix, [category]: {...matrix[category], [audience]: level}};
    setMatrix(next);
    onChange?.(next);
    setSaving(`${category}:${audience}`);
    setErr(null);
    const res = await fetch('/api/privacy/policies', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({category, audience, level})});
    if (!res.ok) setErr((await res.json().catch(() => ({error: 'Save failed'}))).error ?? 'Save failed');
    else onChange?.((await res.json()).policies);
    setSaving(null);
  }

  return (
    <VStack gap={2}>
      <CollapsibleGroup type="single" value={open} onChange={v => setOpen(String(v ?? ''))} hasDividers>
        {CATEGORIES.map(c => (
          <Collapsible
            key={c}
            value={c}
            trigger={
              <HStack gap={3} vAlign="center">
                <Icon icon={CATEGORY_ICON[c]} size="md" color="accent" />
                <VStack gap={0.5}>
                  <Text weight="bold">{CATEGORY_LABEL[c]}</Text>
                  <Text type="supporting" color="secondary">
                    {categorySummary(matrix, c)}
                  </Text>
                </VStack>
              </HStack>
            }>
            <VStack gap={3} paddingBlock={2}>
              <Text type="supporting" color="secondary">
                {CATEGORY_EXAMPLE[c]}
              </Text>
              <Grid columns={{minWidth: 200}} gap={3}>
                {AUDIENCES.map(a => {
                  const owner = a === 'only_me';
                  return (
                    <Selector
                      key={a}
                      label={AUDIENCE_LABEL[a]}
                      description={owner ? 'You always see exact, or don’t import it' : undefined}
                      options={(owner ? (['exact', 'none'] as ShareLevel[]) : LEVELS).map(l => ({value: l, label: owner && l === 'none' ? 'Not imported' : LEVEL_LABEL[l]}))}
                      value={matrix[c][a]}
                      isLoading={saving === `${c}:${a}`}
                      onChange={l => void update(c, a, l as ShareLevel)}
                    />
                  );
                })}
              </Grid>
              <Text type="supporting" color="secondary">
                {LEVELS.map(l => `${LEVEL_LABEL[l]}: ${LEVEL_HELP[l]}`).join(' · ')}
              </Text>
            </VStack>
          </Collapsible>
        ))}
      </CollapsibleGroup>
      {err && <Banner status="error" title={err} />}
    </VStack>
  );
}
