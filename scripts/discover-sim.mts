// Offline Discover ranking simulator: current formula vs Thompson bandit (± MMR). Usage: node scripts/discover-sim.mts [users] [sessions]
import {simulate, table} from '../lib/activities/rank-sim.ts';

const [users = 200, sessions = 40] = process.argv.slice(2).map(Number);
console.log(`${users} users x ${sessions} sessions, 6 slots from 20 candidates; regret = expected clicks lost vs. oracle, per user`);
console.log(table(simulate({users, sessions})));
