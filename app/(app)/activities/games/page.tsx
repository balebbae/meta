import {redirect} from 'next/navigation';

/** Old URL: active and finished quests are the "Your games" section of /activities. Quest dashboards stay at /activities/games/[id]. */
export default function RallyIndex() {
  redirect('/activities#games');
}
