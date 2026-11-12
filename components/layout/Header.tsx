import type {User} from '@/lib/types';

/** Feed-UI subagent: replace with the Facebook top bar (logo, search, center tabs, right icon cluster). */
export function Header({user}: {user: User}) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--fb-header-h)',
        background: 'var(--fb-card)',
        boxShadow: 'var(--fb-shadow-card)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
      }}>
      <strong style={{color: 'var(--fb-blue)', fontSize: 28}}>facebook</strong>
      <span className="fb-text-secondary">{user.name}</span>
    </header>
  );
}
