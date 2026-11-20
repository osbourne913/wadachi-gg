// Every champion as an icon, like a collection book. Champions with skins are
// lit and carry the count; the rest are greyed out.

import {TipLayer, useTip} from './tip';

export interface DexEntry {
  id: number;
  name: string;
  image: string | undefined;
  count: number;
}

interface Props {
  entries: DexEntry[];
  ariaLabel: string;
  /** Fixed icon size in px. Without it the icons share the width. */
  size?: number;
}

export function ChampionDex({entries, ariaLabel, size}: Props) {
  const {rootRef, tip, bind} = useTip();
  return (
    <div className="viz" ref={rootRef}>
      <div
        className="viz-dex"
        role="img"
        aria-label={ariaLabel}
        style={size ? {gridTemplateColumns: `repeat(auto-fill, ${size}px)`} : undefined}>
        {entries.map(e => (
          <span
            key={e.id}
            {...bind(String(e.id), e.count > 0 ? `${e.count}件` : 'なし', e.name)}
            className="viz-dex-cell"
            data-owned={e.count > 0}
            data-active={tip?.id === String(e.id)}
            style={{backgroundImage: e.image ? `url(${e.image})` : undefined}}>
            {e.count > 0 ? <span className="viz-dex-badge">{e.count}</span> : null}
          </span>
        ))}
      </div>
      <TipLayer tip={tip} />
    </div>
  );
}
