import {makeOAuthStub, OURA} from './oauth-stubs';
/** Oura OAuth stub: real authorize/token round-trip only when OURA_CLIENT_ID/OURA_CLIENT_SECRET are set. */
export const ouraConnector = makeOAuthStub(OURA);
