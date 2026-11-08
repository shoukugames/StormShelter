// StormShelter - shared game data (materials, pieces, storms, difficulty)
// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.
(function (G) {
  const SS = G.SS || (G.SS = {});
  SS.VERSION = '0.1.0';
  SS.BUILD_TIME = 99;          // seconds of construction time
  SS.SURVIVE_TIME = 5;         // seconds the shelter must survive at full force
  SS.RAMP_TIME = 1.6;          // seconds of storm build-up before the 5 s count
  SS.WORLD_W = 25.6;           // metres of simulated world (wind rays span this)
  SS.SCALE = 60;               // px per metre
  SS.CAM_X0 = 12.8 - 640 / 60; // world x at the left screen edge
  SS.GROUND_Y = 560;           // screen y of ground surface (logical px)
  SS.BUILD_MIN_X = 2.4;
  SS.BUILD_MAX_X = 23.2;
  SS.BUILD_MAX_Y = 7.0;

  // density in kg/m^2, glue = weld strength (N) multiplier, hp unused
  SS.MATERIALS = {
    straw: { name: 'Straw', density: 0.35, friction: 0.8, glue: 9,   color: '#e9c44b', dark: '#b58f1f' },
    wood:  { name: 'Wood',  density: 0.7,  friction: 0.7, glue: 30,  color: '#b9773a', dark: '#7a4a1e' },
    brick: { name: 'Brick', density: 2.2,  friction: 0.8, glue: 90,  color: '#c4533a', dark: '#7e2c1d' },
    stone: { name: 'Stone', density: 3.2,  friction: 0.9, glue: 170, color: '#8d96a3', dark: '#4f5864' }
  };
  SS.MATERIAL_ORDER = ['straw', 'wood', 'brick', 'stone'];

  // Piece shapes, vertices in metres around the body origin (centroid)
  const box = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  SS.PIECES = {
    block:  { name: 'Block',      w: 0.8, h: 0.8, verts: box(0.8, 0.8) },
    post:   { name: 'Post',       w: 0.4, h: 1.6, verts: box(0.4, 1.6) },
    plank:  { name: 'Plank',      w: 2.4, h: 0.3, verts: box(2.4, 0.3) },
    beam:   { name: 'Long Plank', w: 4.0, h: 0.3, verts: box(4.0, 0.3) },
    roof:   { name: 'Roof',       w: 1.6, h: 0.9, verts: [[-0.8, -0.3], [0.8, -0.3], [0, 0.6]] }
  };
  SS.PIECE_ORDER = ['block', 'post', 'plank', 'beam', 'roof'];

  SS.KID = { w: 0.5, h: 0.9, density: 1.1, friction: 0.55 };
  SS.KID_LOOKS = [
    { name: 'Mia',  skin: '#f6c9a0', hair: '#5a3220', shirt: '#ff7aa8', pants: '#5866d6', style: 'pigtails' },
    { name: 'Leo',  skin: '#d99a6c', hair: '#1d1a1a', shirt: '#4fb3ff', pants: '#3a4a5e', style: 'spiky' },
    { name: 'Ava',  skin: '#8d5a3b', hair: '#2a1710', shirt: '#7ed957', pants: '#a45ad6', style: 'puffs' },
    { name: 'Sam',  skin: '#ffd9b8', hair: '#e8a33a', shirt: '#ffb547', pants: '#2e7d6b', style: 'cap' }
  ];

  // Storm categories. q = wind pressure (N per metre of exposed height).
  SS.STORMS = [
    { id: 'wind',      name: 'High Winds',   from: 1,  to: 12,  lift: 0.0,  flip: 0,   gust: 0.15, sky: ['#7aa7d8', '#c3d9ee'] },
    { id: 'gale',      name: 'Gale',         from: 13, to: 32,  lift: 0.05, flip: 0,   gust: 0.22, sky: ['#5f7f9f', '#a5b8c9'] },
    { id: 'thunder',   name: 'Thunderstorm', from: 33, to: 54,  lift: 0.10, flip: 0,   gust: 0.28, sky: ['#3c4a5c', '#77879a'] },
    { id: 'tornado',   name: 'Tornado',      from: 55, to: 76,  lift: 0.22, flip: 1.3, gust: 0.25, sky: ['#3e4636', '#7f8a6c'] },
    { id: 'hurricane', name: 'Hurricane',    from: 77, to: 100, lift: 0.18, flip: 0,   gust: 0.35, sky: ['#28303d', '#5a6475'] }
  ];
  SS.stormFor = (n) => SS.STORMS.find((s) => n >= s.from && n <= s.to) || SS.STORMS[SS.STORMS.length - 1];

  SS.DIFFICULTY = {
    easy:   { name: 'Easy',   wind: 0.75, glue: 1.4,  extras: 1.0 },
    medium: { name: 'Medium', wind: 1.0,  glue: 1.0,  extras: 0.6 },
    hard:   { name: 'Hard',   wind: 1.25, glue: 0.85, extras: 0.3 }
  };

  // Things a player can get wrong (shown in the For Parents section)
  SS.MISTAKES = {
    noShelter: { label: 'Did not build a shelter', tip: 'Encourage building walls and a roof around the kids before pressing Done.' },
    noWall:    { label: 'Left the kids open to the wind', tip: 'Walls should stand on the side the wind blows from (the arrow shows the direction).' },
    noRoof:    { label: 'Forgot the roof', tip: 'When it rains, the kids need something on top of them. Lay a plank across two walls.' },
    roofBlew:  { label: 'Roof blew away', tip: 'Rest the roof on walls on both sides, and use heavier materials on top.' },
    wallFell:  { label: 'Walls fell over', tip: 'Walls with a wide base (blocks) stand better than tall thin ones. Heavy bricks and stone are stronger.' },
    weak:      { label: 'Used weak materials', tip: 'Straw is light and breaks easily. Talk about which materials are strong (wood, brick, stone).' },
    floating:  { label: 'Pieces not touching', tip: 'Pieces only stick together when they touch. Stack pieces carefully on top of each other.' }
  };
})(typeof window !== 'undefined' ? window : globalThis);
