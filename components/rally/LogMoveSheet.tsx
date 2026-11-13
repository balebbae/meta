'use client';
import {useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Thumbnail} from '@astryxdesign/core/Thumbnail';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {fileToDataUrl, rallyApi, type OkMove} from './api';
import {ClipProof, type ClipPayload} from './ClipProof';

type Dare = {id: string; text: string; bonus: number; needsProof: boolean};

/** Manual log for a move or a dare. Only what the player types leaves this sheet; the server scores it and posts the public card. */
export function LogMoveSheet({questId, open, onClose, dare, levelName, exercises, target, onDone}: {questId: number; open: boolean; onClose: () => void; dare?: Dare | null; levelName?: string; exercises?: string[]; target?: number | null; onDone?: (r: OkMove) => void}) {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [clip, setClip] = useState<ClipPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OkMove | null>(null);

  const close = () => {
    setNote('');
    setAmount(null);
    setImage(null);
    setClip(null);
    setError(null);
    setResult(null);
    onClose();
  };
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = dare ? await rallyApi.dare(questId, dare.id, {image, note}) : await rallyApi.move(questId, clip ? {source: 'clip', note, clip, amount} : {source: image ? 'photo' : 'manual', note, image, amount});
      setResult(r);
      onDone?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log the move');
    } finally {
      setBusy(false);
    }
  };
  const pickPhoto = (files: File | File[] | null) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (file) fileToDataUrl(file).then(setImage).catch(() => setError('Could not read that image'));
  };

  return (
    <Dialog isOpen={open} onOpenChange={o => !o && close()} purpose="form" width={440}>
      <Layout
        header={<DialogHeader title={dare ? 'Do a dare' : 'Log a move'} onOpenChange={() => close()} />}
        content={
          <LayoutContent>
            {result ? (
              <VStack gap={2}>
                <Heading level={2}>
                  {result.critical ? 'CRITICAL ' : ''}−{result.damage} HP
                </Heading>
                <Text>{result.narration}</Text>
                {result.proof && (
                  <Text type="supporting" color="secondary">
                    Proof: {result.proof.status} · {result.proof.verdict}
                  </Text>
                )}
                {!result.museUsed && <Token label="Muse offline · template narration" size="sm" color="gray" />}
              </VStack>
            ) : (
              <VStack gap={4}>
                {dare ? (
                  <Text>
                    {dare.text} <Text weight="bold">+{dare.bonus} bonus</Text>
                    {dare.needsProof && <Text color="secondary"> · photo required</Text>}
                  </Text>
                ) : (
                  <Text>
                    {levelName && <Text weight="bold">{levelName}: </Text>}
                    {exercises?.join(', ') || 'Any workout counts.'}
                    {target != null && <Text color="secondary"> · your target today: {target} (scaled to your recent weeks)</Text>}
                  </Text>
                )}
                {!dare && <NumberInput label="How much did you do?" description="Reps, seconds or minutes" value={amount} onChange={setAmount} min={0} placeholder="e.g. 45" />}
                <TextInput label="Note for the squad" isOptional value={note} onChange={v => setNote(v.slice(0, 120))} placeholder="Done before coffee" />
                {!dare && !image && <ClipProof exercises={exercises} target={target} onChange={setClip} />}
                {!clip &&
                  (image ? (
                    <HStack gap={2} vAlign="center">
                      <Thumbnail src={image} alt="Proof preview" label="Photo proof" onRemove={() => setImage(null)} />
                      <Text type="supporting" color="secondary">
                        Photo proof added (+10% trust)
                      </Text>
                    </HStack>
                  ) : (
                    <FileInput label="Photo proof" description="+10% trust" isOptional={!dare?.needsProof} accept="image/*" value={null} onChange={pickPhoto} />
                  ))}
                {error && <Banner status="error" title={error} />}
              </VStack>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              {result ? (
                <Button label="Done" variant="primary" onClick={close} />
              ) : (
                <>
                  <Button label="Cancel" variant="secondary" onClick={close} />
                  <Button label={dare ? 'Complete dare' : 'Hit the boss'} variant="primary" isLoading={busy} isDisabled={Boolean(dare?.needsProof && !image)} onClick={() => void submit()} />
                </>
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
