// The site's mark: a W drawn as a pair of wheel tracks (wadachi). Same drawing as public/favicon.svg.

export function Mark({size = 20}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{display: 'block', borderRadius: size * 0.22}}>
      <rect width="64" height="64" rx="14" fill="#16181d" />
      <path d="M10 14l8 30 7-22 7 22 7-22 7 22 8-30" fill="none" stroke="#3b8bff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".45" />
      <path d="M10 22l8 30 7-22 7 22 7-22 7 22 8-30" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
