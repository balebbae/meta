import {defineTheme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug} from './astryx-themes';

export const facebookTheme = defineTheme({
  name: 'facebook',
  extends: themes[defaultThemeSlug],
  color: {accent: ['#0866FF', '#2D88FF']},
  radius: {base: 8, multiplier: 1},
});
