import {GOOGLE_HEALTH, makeOAuthStub} from './oauth-stubs';
/** Google Health (Fit) OAuth stub: active only when GOOGLE_HEALTH_CLIENT_ID/GOOGLE_HEALTH_CLIENT_SECRET are set. */
export const googleHealthConnector = makeOAuthStub(GOOGLE_HEALTH);
