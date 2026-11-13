import type {ConnectResult, ConnectorId} from './types.ts';

export async function startConnector(source: ConnectorId): Promise<ConnectResult> {
  const response = await fetch(`/api/connect/${source}/start`, {method: 'POST'});
  if (!response.ok) throw new Error('Could not start this connection. Please try again.');
  const {result} = await response.json() as {result?: ConnectResult};
  if (!result) throw new Error('The connector returned no result. Please try again.');
  return result;
}
