// js/dataLoader.js - simple loader
let cacheStats=null, cacheGames=null, cacheMeta=null;
export async function loadStatsRows(){ if(cacheStats) return cacheStats; try{ const r=await fetch('./data/processed/stats_rows.json'); cacheStats=await r.json(); return cacheStats;}catch(e){ return []; } }
export async function loadGamesIndex(){ if(cacheGames) return cacheGames; try{ const r=await fetch('./data/processed/games_index.json'); cacheGames=await r.json(); return cacheGames;}catch(e){ return []; } }
export async function loadPlayersMeta(){ if(cacheMeta) return cacheMeta; try{ const r=await fetch('./data/players_meta.json'); cacheMeta=await r.json(); return cacheMeta;}catch(e){ return []; } }
