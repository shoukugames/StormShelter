// StormShelter - hand-made SVG icon set (no emoji fonts needed on any system)
// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.
(function (G) {
  const SS = G.SS;
  const st = (d, w = 2.6) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const P = {
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor"/>',
    back: '<path d="M17 4.5v15a1 1 0 0 1-1.5.86l-12-7.5a1 1 0 0 1 0-1.72l12-7.5A1 1 0 0 1 17 4.5z" fill="currentColor"/>',
    check: st('M4.5 12.5l5 5L19.5 6.5', 3.4),
    close: st('M6 6l12 12M18 6L6 18', 3.2),
    pause: '<rect x="5.5" y="4" width="4.5" height="16" rx="1.6" fill="currentColor"/><rect x="14" y="4" width="4.5" height="16" rx="1.6" fill="currentColor"/>',
    undo: st('M9 5L4 10l5 5') + st('M4.5 10H14a6 6 0 0 1 0 12h-3'),
    restart: st('M20 12a8 8 0 1 1-2.6-5.9') + '<path d="M21 3v6h-6z" fill="currentColor"/>',
    plus: st('M12 5v14M5 12h14', 3.4),
    list: st('M5 6h14M5 12h14M5 18h14', 3),
    broom: '<path d="M14.5 2.5l-4 9" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round"/><path d="M6.5 11h9l2 10H4.5z" fill="#f2c14e" stroke="#b5862a" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.5 13.5l-1 6M11 13.5v6M13.5 13.5l1 6" stroke="#b5862a" stroke-width="1.2" stroke-linecap="round"/><rect x="6" y="10" width="10" height="2.5" rx="1" fill="#e04f4f"/>',
    speaker: '<path d="M3.5 9.5h3.5l5-4v13l-5-4H3.5z" fill="currentColor"/>' + st('M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11', 2.2),
    soundOff: '<path d="M3.5 9.5h3.5l5-4v13l-5-4H3.5z" fill="currentColor"/>' + st('M15.5 9.5l5 5M20.5 9.5l-5 5', 2.4),
    music: '<path d="M9 17.5V6l10-2.5V15" fill="none" stroke="#7748c8" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="6.5" cy="17.5" rx="3" ry="2.4" fill="#a678f0"/><ellipse cx="16.5" cy="15" rx="3" ry="2.4" fill="#a678f0"/>',
    musicOff: '<path d="M9 17.5V6l10-2.5V15" fill="none" stroke="#9aa6b6" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="6.5" cy="17.5" rx="3" ry="2.4" fill="#b9c3d0"/><ellipse cx="16.5" cy="15" rx="3" ry="2.4" fill="#b9c3d0"/><path d="M3 3l18 18" stroke="#e04f4f" stroke-width="2.6" stroke-linecap="round"/>',
    soundOn: '<path d="M3.5 9.5h3.5l5-4v13l-5-4H3.5z" fill="#2477c4"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="#43a6f5" stroke-width="2.2" stroke-linecap="round"/>',
    soundMute: '<path d="M3.5 9.5h3.5l5-4v13l-5-4H3.5z" fill="#9aa6b6"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="#e04f4f" stroke-width="2.4" stroke-linecap="round"/>',
    family: '<circle cx="7" cy="6.5" r="3" fill="#ffd9b8"/><circle cx="17" cy="6.5" r="3" fill="#d99a6c"/><circle cx="12" cy="12.5" r="2.4" fill="#f6c9a0"/><path d="M2.5 20a4.5 5 0 0 1 9 0z" fill="#ff7aa8"/><path d="M12.5 20a4.5 5 0 0 1 9 0z" fill="#4fb3ff"/><path d="M8.5 21a3.5 3.5 0 0 1 7 0z" fill="#ffd23f"/>',
    star: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="#ffc61a" stroke="#d99a00" stroke-width="1.4" stroke-linejoin="round"/>',
    starEmpty: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="rgba(255,255,255,.35)" stroke="rgba(0,0,0,.25)" stroke-width="1.4" stroke-linejoin="round"/>',
    fullscreen: st('M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5', 2.6),
    power: st('M12 3v8') + st('M6.5 6.8a8 8 0 1 0 11 0'),
    trash: '<path d="M5 7h14l-1.2 13a1.5 1.5 0 0 1-1.5 1.4H7.7a1.5 1.5 0 0 1-1.5-1.4z" fill="#ff8a8a" stroke="#cc4141" stroke-width="1.5"/><rect x="3.5" y="4.5" width="17" height="3" rx="1.2" fill="#cc4141"/><rect x="9.5" y="2.5" width="5" height="3" rx="1" fill="#cc4141"/><path d="M10 10.5v7M14 10.5v7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
    lock: '<path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="#7c8899" stroke-width="2.6"/><rect x="5" y="10" width="14" height="11" rx="2.5" fill="#f2b632" stroke="#c48a10" stroke-width="1.4"/><circle cx="12" cy="15" r="1.7" fill="#8a5a00"/>',
    save: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="#43a6f5" stroke="#2477c4" stroke-width="1.4"/><rect x="7" y="3.5" width="10" height="6" rx="1" fill="#e8f4ff"/><rect x="13" y="4.8" width="2.2" height="3.4" fill="#2477c4"/><rect x="6.5" y="13" width="11" height="7.5" rx="1" fill="#fff"/>',
    home: '<path d="M3 11.5L12 4l9 7.5" fill="none" stroke="#d23f27" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5V20h13v-9.5L12 5.5z" fill="#ffe7b0" stroke="#8a6224" stroke-width="1.4" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="6" rx="0.8" fill="#9a5f2c"/>',
    wind: '<path d="M3 8h10.5a3 3 0 1 0-3-3M3 12.5h15.5a3 3 0 1 1-3 3M3 17h7" fill="none" stroke="#43a6f5" stroke-width="2.4" stroke-linecap="round"/>',
    gale: '<path d="M6 11a4 4 0 0 1 .5-8 5 5 0 0 1 9.3 1.6A3.3 3.3 0 0 1 17 11z" fill="#dfe8f2" stroke="#8aa0b8" stroke-width="1.3"/><path d="M3 15h12a2.5 2.5 0 1 0-2.5-2.5M3 19h15a2.5 2.5 0 1 1-2.5 2.5" fill="none" stroke="#2fa38a" stroke-width="2.2" stroke-linecap="round"/>',
    thunder: '<path d="M6 13a4.5 4.5 0 0 1 .6-9 5.5 5.5 0 0 1 10.3 1.7A3.7 3.7 0 0 1 17.5 13z" fill="#8a93a3" stroke="#4e5767" stroke-width="1.3"/><path d="M12.5 12l-3 5h3l-2 5.5 5.5-7h-3.2l2-3.5z" fill="#ffd23f" stroke="#d99a00" stroke-width="1" stroke-linejoin="round"/>',
    tornado: '<path d="M2.5 4h19M4.5 8h15M7 12h10M9 16h6M11 20h2.5" fill="none" stroke="#7f8a6c" stroke-width="2.6" stroke-linecap="round"/>',
    hurricane: '<path d="M12 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0" fill="#f26d7d"/><path d="M12 3c-5 0-8 3.5-8 7 3-3 6-3 8-1M12 21c5 0 8-3.5 8-7-3 3-6 3-8 1M3 12c0 5 3.5 8 7 8-3-3-3-6-1-8M21 12c0-5-3.5-8-7-8 3 3 3 6 1 8" fill="none" stroke="#c84556" stroke-width="2.2" stroke-linecap="round"/>',
    umbrella: '<path d="M2.5 12a9.5 8 0 0 1 19 0c-1.6-1.4-3.2-1.4-4.75 0-1.6-1.4-3.2-1.4-4.75 0-1.6-1.4-3.2-1.4-4.75 0-1.6-1.4-3.2-1.4-4.75 0z" fill="#ff6b8b" stroke="#c8405e" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 12v7a2 2 0 0 1-4 0" fill="none" stroke="#4b5d78" stroke-width="2" stroke-linecap="round"/><path d="M5 3l-1 2M19 3l-1 2" stroke="#4fb3ff" stroke-width="1.8" stroke-linecap="round"/>',
    roofFly: '<g transform="rotate(-18 12 10)"><path d="M3 14L12 6l9 8z" fill="#ff7a59" stroke="#8e2a19" stroke-width="1.5" stroke-linejoin="round"/></g><path d="M2 19h6M4 22h8M14 20h7" stroke="#43a6f5" stroke-width="2" stroke-linecap="round"/>',
    brick: '<rect x="2" y="4" width="9.5" height="5" rx="1" fill="#c4533a"/><rect x="12.5" y="4" width="9.5" height="5" rx="1" fill="#b84a33"/><rect x="2" y="10" width="4.5" height="5" rx="1" fill="#cf6044"/><rect x="7.5" y="10" width="9.5" height="5" rx="1" fill="#c4533a"/><rect x="18" y="10" width="4" height="5" rx="1" fill="#a94430"/><rect x="2" y="16" width="9.5" height="5" rx="1" fill="#b84a33"/><rect x="12.5" y="16" width="9.5" height="5" rx="1" fill="#cf6044"/>',
    straw: '<path d="M12 22V9M12 14l-5-6M12 14l5-6M12 11l-3.5-7M12 11l3.5-7M12 10V2" stroke="#d6a93a" stroke-width="2" stroke-linecap="round"/><path d="M9 15h6" stroke="#9b6a2a" stroke-width="2.4" stroke-linecap="round"/>',
    warning: '<path d="M12 2.8L22 20.5H2z" fill="#ffd23f" stroke="#c48a10" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 9v5.5" stroke="#3a2a00" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.4" fill="#3a2a00"/>',
    bolt: '<path d="M13.5 2L5 13.5h6L9.5 22l9.5-12.5h-6.2z" fill="#ffd23f" stroke="#d99a00" stroke-width="1.4" stroke-linejoin="round"/>',
    party: '<path d="M3 21l5-13 8 8z" fill="#ffa53b" stroke="#d9771a" stroke-width="1.3" stroke-linejoin="round"/><circle cx="15" cy="5" r="1.6" fill="#ff6b8b"/><circle cx="20" cy="9" r="1.4" fill="#4fc3f7"/><circle cx="18.5" cy="3" r="1.1" fill="#7ed957"/><path d="M12 7c1-2 0-3 1-4.5M17 12c2-1 3 0 4.5-1" fill="none" stroke="#a678f0" stroke-width="1.6" stroke-linecap="round"/>',
    heart: '<path d="M12 20.5s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9.5c0 6-8 11-8 11z" fill="#ff6b8b" stroke="#c8405e" stroke-width="1.3"/>',
    chart: '<rect x="3" y="13" width="4" height="8" rx="1" fill="#4cc75a"/><rect x="10" y="8" width="4" height="13" rx="1" fill="#43a6f5"/><rect x="17" y="3" width="4" height="18" rx="1" fill="#a678f0"/>',
    puzzle: '<path d="M4 7h4a2.2 2.2 0 1 1 4 0h4v4a2.2 2.2 0 1 1 0 4v4h-4a2.2 2.2 0 1 0-4 0H4v-4a2.2 2.2 0 1 0 0-4z" fill="#ffa53b" stroke="#d9771a" stroke-width="1.3" stroke-linejoin="round"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="#fff" stroke="#43a6f5" stroke-width="2.2"/><path d="M12 7v5l3.5 2" fill="none" stroke="#23324a" stroke-width="2.2" stroke-linecap="round"/>',
    scroll: '<rect x="5" y="3" width="14" height="18" rx="2" fill="#fff6dc" stroke="#c9a45a" stroke-width="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#a7834a" stroke-width="1.6" stroke-linecap="round"/>',
    faceEasy: '<circle cx="12" cy="12" r="9.5" fill="#ffd23f" stroke="#d9a400" stroke-width="1.2"/><circle cx="9" cy="10" r="1.3" fill="#3a2a00"/><circle cx="15" cy="10" r="1.3" fill="#3a2a00"/><path d="M7.5 13.5a4.5 4.5 0 0 0 9 0z" fill="#7a2f3a"/>',
    faceMed: '<circle cx="12" cy="12" r="9.5" fill="#ffd23f" stroke="#d9a400" stroke-width="1.2"/><circle cx="9" cy="10" r="1.3" fill="#3a2a00"/><circle cx="15" cy="10" r="1.3" fill="#3a2a00"/><path d="M8.5 14.5q3.5 2 7 0" fill="none" stroke="#7a2f3a" stroke-width="1.6" stroke-linecap="round"/>',
    faceHard: '<circle cx="12" cy="12" r="9.5" fill="#ff9a5a" stroke="#d9601a" stroke-width="1.2"/><path d="M7 8l3.5 1.5M17 8l-3.5 1.5" stroke="#3a2a00" stroke-width="1.6" stroke-linecap="round"/><circle cx="9.3" cy="11" r="1.3" fill="#3a2a00"/><circle cx="14.7" cy="11" r="1.3" fill="#3a2a00"/><path d="M8.5 16h7" stroke="#7a2f3a" stroke-width="1.8" stroke-linecap="round"/>',
    arrow: '<path d="M3 12h14M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  SS.icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;
  SS.STORM_ICON = { wind: 'wind', gale: 'gale', thunder: 'thunder', tornado: 'tornado', hurricane: 'hurricane' };
  SS.applyIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach((el) => { el.outerHTML = SS.icon(el.dataset.icon, el.className || ''); });
})(window);
