/** The four mini games as plain three scenes. `createGameScene(id, {camera, hero})` gives a group to add and a step to call. */
import type {GameId} from '../games/common';
import {createDashScene} from './dash';
import {createDefenseScene} from './defense';
import {createJoustScene} from './joust';
import {createQuestScene} from './quest';
import type {GameScene, Host} from './stage';

export type {GameScene, Host, Hud} from './stage';
export {createBossFight, type BossFight, type BossFightOpts, type Fighter} from './bossfight';
export const createGameScene = (game: GameId, host: Host): GameScene => ({dash: createDashScene, defense: createDefenseScene, joust: createJoustScene, quest: createQuestScene})[game](host);
