// js/dataLoader.js

let statsCache = null;
let gamesCache = null;
let playersMetaCache = null;

export async function loadStatsRows() {
  if (statsCache) return statsCache;
  const res = await fetch('./data/processed/stats_rows.json');
  if (!res.ok) throw new Error('Failed to load stats_rows.json');
  statsCache = await res.json();
  return statsCache;
}

export async function loadGamesIndex() {
  if (gamesCache) return gamesCache;
  const res = await fetch('./data/processed/games_index.json');
  if (!res.ok) throw new Error('Failed to load games_index.json');
  gamesCache = await res.json();
  return gamesCache;
}

export async function loadPlayersMeta() {
  if (playersMetaCache) return playersMetaCache;
  const res = await fetch('./data/players_meta.json');
  if (!res.ok) {
    playersMetaCache = [];
    return playersMetaCache;
  }
  playersMetaCache = await res.json();
  return playersMetaCache;
}
