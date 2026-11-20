import {useCallback, useEffect, useState} from 'react';

export type Mode = 'light' | 'dark';

function hostMode(): Mode {
  // A host page (or its own theme switch) may stamp data-theme on <html>;
  // otherwise follow the operating system.
  const stamped = document.documentElement.getAttribute('data-theme');
  if (stamped === 'light' || stamped === 'dark') {
    return stamped;
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Light or dark. Follows the host; the toggle overrides it for this visit,
 * until the host changes its theme again.
 */
export function useColorMode(): {mode: Mode; toggle: () => void} {
  const [picked, setPicked] = useState<Mode | null>(null);
  const [host, setHost] = useState<Mode>(hostMode);

  useEffect(() => {
    const update = () => {
      setHost(hostMode());
      setPicked(null);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener('change', update);
    return () => {
      observer.disconnect();
      media?.removeEventListener('change', update);
    };
  }, []);

  const mode = picked ?? host;

  useEffect(() => {
    // Tokens resolve through light-dark(), so the root needs the scheme too:
    // it colors the page behind the app and the native controls.
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const toggle = useCallback(() => {
    setPicked(prev => ((prev ?? hostMode()) === 'dark' ? 'light' : 'dark'));
  }, []);

  return {mode, toggle};
}
