import Link from 'next/link';
import type {Profile} from '@/lib/profile-queries';
import {BriefcaseIcon, CakeIcon, GlobeIcon, GraduationIcon, HeartIcon, HomeIcon, MailIcon, PhoneIcon, PinIcon, PlusIcon, UserIcon} from './icons';
import styles from './profile.module.css';

export type AboutSection = 'overview' | 'work' | 'places' | 'contact' | 'family' | 'details' | 'events';
const SECTIONS: {key: AboutSection; label: string}[] = [
  {key: 'overview', label: 'Intro'},
  {key: 'work', label: 'Work and education'},
  {key: 'places', label: 'Places lived'},
  {key: 'contact', label: 'Contact info'},
  {key: 'family', label: 'Family and relationships'},
  {key: 'details', label: 'Details about you'},
  {key: 'events', label: 'Life events'},
];

function Row({icon, children, sub}: {icon: React.ReactNode; children: React.ReactNode; sub?: string}) {
  return (
    <div className={styles.aboutRow}>
      {icon}
      <div className={styles.aboutRowText}>
        <div>{children}</div>
        {sub && <span className={styles.aboutRowSub}>{sub}</span>}
      </div>
    </div>
  );
}

function AddRow({label, isOwn}: {label: string; isOwn: boolean}) {
  if (!isOwn) return null;
  return (
    <button type="button" className={`${styles.aboutRow} ${styles.aboutAdd}`}>
      <span className={styles.plusCircle}><PlusIcon size={18} /></span>
      <span>{label}</span>
    </button>
  );
}

export function AboutTab({profile, isOwn, section}: {profile: Profile; isOwn: boolean; section: AboutSection}) {
  const {details, user} = profile;
  const base = `/profile/${user.id}?tab=about`;
  const work = details.work && (
    <Row icon={<BriefcaseIcon size={24} />} sub={details.workTitle ? undefined : 'Current'}>
      {details.workTitle ? <>{details.workTitle} at <b>{details.work}</b></> : <>Works at <b>{details.work}</b></>}
    </Row>
  );
  const college = details.education && <Row icon={<GraduationIcon size={24} />} sub="College">Studied at <b>{details.education}</b></Row>;
  const highSchool = details.highSchool && <Row icon={<GraduationIcon size={24} />} sub="High school">Went to <b>{details.highSchool}</b></Row>;
  const city = details.currentCity && <Row icon={<HomeIcon size={24} />} sub="Current city">Lives in <b>{details.currentCity}</b></Row>;
  const hometown = details.hometown && <Row icon={<PinIcon size={24} />} sub="Hometown">From <b>{details.hometown}</b></Row>;
  const relationship = details.relationship && <Row icon={<HeartIcon size={24} />} sub="Relationship">{details.relationship}</Row>;

  return (
    <section className={`${styles.card} ${styles.aboutCard}`} aria-label="About">
      <nav className={styles.aboutMenu}>
        <h2>About</h2>
        {SECTIONS.map(s => (
          <Link key={s.key} href={s.key === 'overview' ? base : `${base}&section=${s.key}`} className={`${styles.aboutMenuItem} ${section === s.key ? styles.aboutMenuActive : ''}`}>
            {s.label}
          </Link>
        ))}
      </nav>
      <div className={styles.aboutContent}>
        {section === 'overview' && (
          <div className={styles.aboutSection}>
            {work}{college}{city}{hometown}{relationship}
            {details.phone && <Row icon={<PhoneIcon size={24} />} sub="Mobile">{details.phone}</Row>}
            <AddRow label="Add a workplace" isOwn={isOwn && !details.work} />
          </div>
        )}
        {section === 'work' && (
          <>
            <div className={styles.aboutSection}><h3>Work</h3>{work}<AddRow label="Add a workplace" isOwn={isOwn} /></div>
            <div className={styles.aboutSection}><h3>College</h3>{college}<AddRow label="Add college" isOwn={isOwn} /></div>
            <div className={styles.aboutSection}><h3>High school</h3>{highSchool}<AddRow label="Add high school" isOwn={isOwn} /></div>
          </>
        )}
        {section === 'places' && (
          <div className={styles.aboutSection}><h3>Places lived</h3>{city}{hometown}<AddRow label="Add city" isOwn={isOwn} /></div>
        )}
        {section === 'contact' && (
          <>
            <div className={styles.aboutSection}>
              <h3>Contact info</h3>
              {details.phone && <Row icon={<PhoneIcon size={24} />} sub="Mobile">{details.phone}</Row>}
              <Row icon={<MailIcon size={24} />} sub="Email">{user.email}</Row>
              <AddRow label="Add a phone number" isOwn={isOwn && !details.phone} />
            </div>
            <div className={styles.aboutSection}>
              <h3>Websites and social links</h3>
              {details.website ? <Row icon={<GlobeIcon size={24} />} sub="Website"><a href={`https://${details.website}`} target="_blank" rel="noreferrer" style={{color: 'var(--fb-blue)'}}>{details.website}</a></Row> : <AddRow label="Add a website" isOwn={isOwn} />}
            </div>
            <div className={styles.aboutSection}>
              <h3>Basic info</h3>
              {details.gender && <Row icon={<UserIcon size={24} />} sub="Gender">{details.gender}</Row>}
              {details.birthday && <Row icon={<CakeIcon size={24} />} sub="Birth date">{details.birthday}</Row>}
              {details.languages && <Row icon={<GlobeIcon size={24} />} sub="Languages">{details.languages}</Row>}
            </div>
          </>
        )}
        {section === 'family' && (
          <>
            <div className={styles.aboutSection}><h3>Relationship</h3>{relationship ?? <AddRow label="Add a relationship status" isOwn={isOwn} />}</div>
            <div className={styles.aboutSection}><h3>Family members</h3><AddRow label="Add a family member" isOwn={isOwn} />{!isOwn && <p className={styles.empty}>No family members to show</p>}</div>
          </>
        )}
        {section === 'details' && (
          <div className={styles.aboutSection}>
            <h3>About {isOwn ? 'you' : user.name.split(' ')[0]}</h3>
            {user.bio ? <Row icon={<UserIcon size={24} />}>{user.bio}</Row> : <AddRow label="Write some details about yourself" isOwn={isOwn} />}
          </div>
        )}
        {section === 'events' && (
          <div className={styles.aboutSection}><h3>Life events</h3><AddRow label="Add a life event" isOwn={isOwn} />{!isOwn && <p className={styles.empty}>No life events to show</p>}</div>
        )}
      </div>
    </section>
  );
}
