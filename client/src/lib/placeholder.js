/** Local event cover fallback (brand colors, no network request). */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
<rect width="1600" height="900" fill="#2d4a3e"/>
<rect x="0" y="620" width="1600" height="280" fill="#1a1a1a" opacity=".35"/>
<circle cx="1260" cy="250" r="140" fill="#f0c75e" opacity=".9"/>
<text x="120" y="780" font-family="Georgia, serif" font-style="italic" font-size="120" fill="#f7f3eb">UTSAVX</text>
<circle cx="600" cy="752" r="16" fill="#e85d4c"/>
</svg>`;

export const EVENT_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
