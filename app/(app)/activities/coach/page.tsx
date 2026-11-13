import {redirect} from 'next/navigation';

/** Coach is a mode of /activities (the switch in its title row), not its own page. */
export default function CoachPage() {
  redirect('/activities?coach=on');
}
