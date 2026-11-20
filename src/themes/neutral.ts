// The theme is one module: its stylesheet, its font, its built theme object.
// To try another Astryx theme, add a module like this one and build with
// `node build.mjs --theme=<name>`.
import '@astryxdesign/theme-neutral/theme.css';
import './neutral.css';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';

export const theme = neutralTheme;
export const themeName = 'neutral';
