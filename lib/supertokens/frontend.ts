'use client';
import SuperTokens from 'supertokens-web-js';
import EmailPassword from 'supertokens-web-js/recipe/emailpassword';
import Session from 'supertokens-web-js/recipe/session';
import {getAppInfo} from '@/lib/supertokens/appInfo';

let initialised = false;

/** Initialises the browser SDK once (session refresh interceptors + email/password calls). */
export function initSuperTokensFrontend() {
  if (initialised || typeof window === 'undefined') return;
  SuperTokens.init({
    appInfo: getAppInfo(window.location.origin),
    recipeList: [Session.init({tokenTransferMethod: 'cookie'}), EmailPassword.init()],
  });
  initialised = true;
}

export {EmailPassword, Session};
