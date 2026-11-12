import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {BossArt} from '@/components/rally/BossArt';
import {getSessionUser} from '@/lib/auth';
import {listQuestsForUser} from '@/lib/rally/queries';
import s from '@/components/rally/dashboard.module.css';

export const metadata: Metadata = {title: 'Rally | Facebook'};
export const dynamic = 'force-dynamic';

export default async function RallyIndex() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const quests = await listQuestsForUser(user.id);
  return (
    <div className={s.page}>
      <section className={s.card}>
        <h1 className={s.h1}>Rally</h1>
        <p className={s.muted}>Co-op fitness quests with your group chats. Start one from any chat with the Rally star.</p>
      </section>
      {quests.length === 0 && (
        <section className={s.card}>
          <p className={s.muted}>No quests yet. Open a group chat in <Link href="/messages">Messenger</Link> and tap the Rally star.</p>
        </section>
      )}
      {quests.map(q => (
        <Link key={q.id} href={`/activities/games/${q.id}`} className={`${s.card} ${s.listRow}`}>
          <BossArt kind={q.bossKind} imageUrl={q.bossImageUrl} name={q.spec.boss?.name ?? q.title} size={56} down={q.status === 'completed'} />
          <div style={{flex: 1, minWidth: 0}}>
            <div className={s.listTitle}>{q.title}</div>
            <div className={s.muted}>
              {q.template} · {q.status === 'completed' ? 'completed' : `${q.bossHpLeft}/${q.bossHp} HP`}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
