// Stylesheet order matters: the design system's reset, then its components,
// then the theme (pulled in by the theme module), then our own sheets.
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import {themeName} from '#theme';
import './charts/charts.css';
import './styles.css';
import {createRoot} from 'react-dom/client';
import {App} from './App';

// Theme tokens are scoped to this attribute; setting it on the root makes them
// available to the page background as well as to the app.
document.documentElement.setAttribute('data-astryx-theme', themeName);

createRoot(document.getElementById('root')!).render(<App />);
