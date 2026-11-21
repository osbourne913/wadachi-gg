// The application frame follows Astryx's shell-top-nav template: an AppShell
// with a TopNav (product heading, a handful of section links, controls at the
// end) and the page below it. The entry page and the report share the shell,
// and so do the policy pages, which are served at their own addresses
// (/privacy/, /terms/) and named by <body data-page>.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavHeading, TopNavItem} from '@astryxdesign/core/TopNav';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Moon, Sun} from 'lucide-react';
import {Mark} from './Mark';
import {theme} from '#theme';
import {LANDING_NAV, PAGES, REPORT_NAV, SITE, type PageId} from './site';
import {useColorMode} from './lib/useColorMode';
import {ReadError, readExport} from './lib/readExport';
import {analyze, findFile, looksLikeRiotExport} from './lib/riot/analyze';
import {makeSampleExport} from './lib/riot/sample';
import type {ExportFile, Report} from './lib/riot/types';
import {Landing, type RawExample} from './pages/Landing';
import {ReportPage} from './pages/Report';
import {LegalPage} from './pages/Legal';

type View = {kind: 'landing'} | {kind: 'report'; report: Report} | {kind: 'page'; page: PageId};

/** The page this address serves, from <body data-page>. */
function initialView(): View {
  const page = document.body.dataset.page;
  const known = PAGES.find(p => p.id === page);
  return known ? {kind: 'page', page: known.id} : {kind: 'landing'};
}

const NOT_RIOT = 'Riotのデータ請求ファイルではないようです。Riotから届いたzipをそのまま選んでください。';
const UNREADABLE = 'ファイルを読み込めませんでした。Riotから届いたzipをそのまま選んでください。';

/** The id of the section the reader is in, for the highlighted nav item. */
function useActiveSection(ids: readonly string[], resetKey: string): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-nav-height')) || 64;
      const line = nav + 48;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) {
          current = id;
        }
      }
      // The last section may be too short to reach the line; at the bottom of the page it is the one in view.
      const last = ids[ids.length - 1];
      if (last && scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 4 && document.getElementById(last)) {
        current = last;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(measure);
      }
    };
    measure();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [ids, resetKey]);
  return active;
}

/** Publish the nav bar's height, so in-page jumps and the sticky rail clear it. */
function useNavHeight() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.astryx-app-shell-header');
    if (!header) {
      return;
    }
    const apply = () => {
      document.documentElement.style.setProperty('--app-nav-height', `${Math.round(header.getBoundingClientRect().height)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
}

/** In-page links scroll to their section; the address bar is left alone. */
function useInPageLinks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link) {
        return;
      }
      const id = decodeURIComponent((link.getAttribute('href') ?? '').slice(1));
      event.preventDefault();
      if (!id) {
        window.scrollTo({top: 0});
        return;
      }
      document.getElementById(id)?.scrollIntoView({block: 'start'});
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

/** The first rows of the sample's login file, as they sit in the file. Addresses are left out, as everywhere else. */
function rawExample(files: ExportFile[]): RawExample | null {
  const file = findFile(files, 'riotaccount/atlas_login_event_uc.json');
  if (!file || !Array.isArray(file.data) || file.data.length === 0) {
    return null;
  }
  const shown = 2;
  const rows = (file.data as Record<string, unknown>[])
    .slice(0, shown)
    .map(row => ('ip_address' in row ? {...row, ip_address: '（省略）'} : row));
  const body = JSON.stringify(rows, null, 2).replace(/\n\]$/, ',\n  …\n]');
  return {path: file.path, code: body, rows: file.data.length, shown};
}

export function App() {
  const {mode, toggle} = useColorMode();
  const [view, setView] = useState<View>(initialView);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The synthetic sample feeds the preview on the entry page and the sample report.
  const sampleFiles = useMemo(() => makeSampleExport(), []);
  const sample = useMemo(() => analyze(sampleFiles, {isSample: true}), [sampleFiles]);
  const raw = useMemo(() => rawExample(sampleFiles), [sampleFiles]);

  useNavHeight();
  useInPageLinks();

  const nav = view.kind === 'report' ? REPORT_NAV : view.kind === 'landing' ? LANDING_NAV : [];
  const navIds = useMemo(() => nav.map(n => n.id), [nav]);
  const active = useActiveSection(navIds, view.kind);

  const show = useCallback((next: View) => {
    setView(next);
    requestAnimationFrame(() => window.scrollTo({top: 0, behavior: 'instant'}));
  }, []);

  const handleFiles = useCallback(
    async (files: File | File[]) => {
      setBusy(true);
      setError(null);
      // Unzipping blocks the page for a moment; let the spinner paint first.
      await new Promise(resolve => setTimeout(resolve, 40));
      try {
        const exported = await readExport(files);
        if (!looksLikeRiotExport(exported)) {
          throw new ReadError(NOT_RIOT);
        }
        show({kind: 'report', report: analyze(exported)});
      } catch (e) {
        setError(e instanceof ReadError ? e.message : UNREADABLE);
      } finally {
        setBusy(false);
      }
    },
    [show],
  );

  // A file dropped beside the drop zone would otherwise make the browser open
  // it and leave the page. On the entry page, read it as if it had landed there.
  const onLanding = view.kind === 'landing';
  useEffect(() => {
    const carriesFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const onDragOver = (e: DragEvent) => {
      if (carriesFiles(e)) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (!carriesFiles(e) || e.defaultPrevented) {
        return;
      }
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (onLanding && files.length > 0) {
        void handleFiles(files.length === 1 ? files[0] : files);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFiles, onLanding]);

  return (
    <Theme theme={theme} mode={mode}>
      <AppShell
        variant="wash"
        height="auto"
        contentPadding={0}
        topNav={
          <TopNav
            label={`${SITE.name}のナビゲーション`}
            heading={
              <TopNavHeading
                heading={SITE.name}
                logo={<Mark size={28} />}
                headingHref={view.kind === 'page' ? '/' : '#'}
              />
            }
            centerContent={
              <>
                {nav.map(item => (
                  <TopNavItem key={item.id} label={item.label} href={`#${item.id}`} isSelected={active === item.id} />
                ))}
              </>
            }
            endContent={
              <IconButton
                label={mode === 'dark' ? 'ライトモードにする' : 'ダークモードにする'}
                tooltip={mode === 'dark' ? 'ライトモードにする' : 'ダークモードにする'}
                variant="ghost"
                icon={<Icon icon={mode === 'dark' ? Sun : Moon} size="sm" />}
                onClick={toggle}
              />
            }
          />
        }>
        {view.kind === 'page' ? (
          <LegalPage page={view.page} />
        ) : view.kind === 'report' ? (
          <ReportPage report={view.report} onReset={() => show({kind: 'landing'})} />
        ) : (
          <Landing
            preview={sample}
            raw={raw}
            isBusy={isBusy}
            error={error}
            onFiles={handleFiles}
            onClearError={() => setError(null)}
            onSample={() => show({kind: 'report', report: sample})}
          />
        )}
      </AppShell>
    </Theme>
  );
}
