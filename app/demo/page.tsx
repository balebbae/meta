import type {Metadata} from 'next';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';

export const metadata: Metadata = {title: 'Try Activities | Facebook'};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://meta-tau-two.vercel.app';

/** Presenter page: judges scan the QR and sign in to the seeded demo account on their own phones. */
export default function DemoPage() {
  const target = `${APP_URL}/auth?demo=judge`;
  // shortcut: QR comes from a public image API, swap for a local generator if the demo must work offline.
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(target)}`;
  return (
    <VStack gap={4} padding={6} hAlign="center">
      <Card>
        <VStack gap={3} hAlign="center">
          <Heading level={1}>Try Facebook Activities on your phone</Heading>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code for ${target}`} width={360} height={360} />
          <Text>{target}</Text>
          <Text weight="bold">Email: judge@demo.com · Password: judge123</Text>
          <Text color="secondary">You land in Jordan&apos;s account: the Weekend Run Club chat, the Taco Trail Troll boss fight and the Katy Trail turf game are already live.</Text>
        </VStack>
      </Card>
    </VStack>
  );
}
