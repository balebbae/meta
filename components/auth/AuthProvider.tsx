'use client';
import {initSuperTokensFrontend} from '@/lib/supertokens/frontend';

initSuperTokensFrontend();

/** Client boundary that boots the SuperTokens browser SDK (automatic session refresh). */
export function AuthProvider({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
