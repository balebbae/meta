export async function stravaConnected(): Promise<boolean> {
  const response = await fetch('/api/activities/connections', {cache: 'no-store'});
  if (!response.ok) throw new Error('Could not check Strava connection');
  const data = await response.json() as {connections?: {source: string; status: string}[]};
  return (data.connections ?? []).some(c => c.source === 'strava' && c.status === 'connected');
}
