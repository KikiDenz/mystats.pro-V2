
import { loadStatsRows, loadGamesIndex, loadPlayersMeta } from './dataLoader.js';

const root = document.getElementById('app-root');

function setView(html) { root.innerHTML = html; }

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }); }
  catch(e){ return d; }
}
function slug(name){ return name.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''); }

function initTabs(scopeId, defaultName){
  const scope = document.getElementById(scopeId);
  if(!scope) return;
  const buttons = scope.querySelectorAll('[data-tab-target]');
  const panels = scope.querySelectorAll('[data-tab-panel]');
  function activate(name){
    buttons.forEach(b=>b.classList.toggle('active', b.dataset.tabTarget===name));
    panels.forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===name));
  }
  buttons.forEach(b=>b.addEventListener('click', ()=>activate(b.dataset.tabTarget)));
  const choose = defaultName || (buttons[0] && buttons[0].dataset.tabTarget);
  if(choose) activate(choose);
}

export async function renderHome(){
  const [stats, games] = await Promise.all([loadStatsRows(), loadGamesIndex()]);
  const teams = new Map();
  stats.forEach(r=>{
    if(!teams.has(r.team)) teams.set(r.team, new Map());
    const tm = teams.get(r.team);
    const key = r.jersey + '_' + r.name;
    if(!tm.has(key)) tm.set(key, { jersey:r.jersey, name:r.name, games:0, pts:0 });
    const p = tm.get(key);
    p.games += 1; p.pts += r.pts || 0;
  });
  // include teams from games index
  (games||[]).forEach(g=>{ if(g.home_team) teams.set(g.home_team, teams.get(g.home_team)||new Map()); if(g.away_team) teams.set(g.away_team, teams.get(g.away_team)||new Map()); });

  let teamHtml = '';
  for(const [teamName, pm] of teams.entries()){
    const players = Array.from(pm.values());
    players.forEach(p=>p.ppg = p.games? (p.pts/p.games):0);
    players.sort((a,b)=>b.ppg - a.ppg);
    const top = players.slice(0,3).map(p=> '<div class="mini-player"><strong>#'+p.jersey+'</strong> '+p.name+' <span class="muted">'+p.ppg.toFixed(1)+' PPG</span></div>' ).join('');
    const roster = players.map(p=> '<li><a href="#/player/'+encodeURIComponent(slug(p.name))+'">#'+p.jersey+' '+p.name+'</a></li>').join('');
    teamHtml += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3>'+teamName+'</h3><a class="chip" href="#/team/'+encodeURIComponent(teamName)+'">Open</a></div><div>'+ (top||'<span class="muted">No players</span>') +'</div><details><summary class="muted">Roster ('+players.length+')</summary><ul class="muted">'+(roster||'<li class="muted">No players</li>')+'</ul></details></div>';
  }

  const gamesHtml = (games||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(g=> '<tr><td>'+fmtDate(g.date)+'</td><td>'+g.away_team+' @ '+g.home_team+'</td><td>'+ (g.home_score||'')+' - '+(g.away_score||'') +'</td><td><a href="#/game/'+g.game_id+'">Boxscore</a></td></tr>' ).join('');
  setView('<section class="section"><h2>Teams</h2><div class="cards-row">'+teamHtml+'</div></section><section class="section"><h2>Recent games</h2><div class="table-wrapper"><table class="pg-table"><thead><tr><th>Date</th><th>Matchup</th><th>Score</th><th></th></tr></thead><tbody>'+(gamesHtml||'<tr><td colspan="4" class="muted">No games yet</td></tr>')+'</tbody></table></div></section>');
}

async function renderGames(){
  const games = await loadGamesIndex();
  const rows = (games||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(g=> '<tr><td>'+fmtDate(g.date)+'</td><td>'+g.away_team+'</td><td>'+g.home_team+'</td><td>'+ (g.away_score||'')+' – '+(g.home_score||'') +'</td><td><a href="#/game/'+g.game_id+'">Boxscore</a></td></tr>' ).join('');
  setView('<section class="section"><h2>Games</h2><div class="table-wrapper"><table class="pg-table"><thead><tr><th>Date</th><th>Away</th><th>Home</th><th>Final</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="5">No games yet.</td></tr>')+'</tbody></table></div></section>');
}

async function renderTeam(teamEncoded){
  const team = decodeURIComponent(teamEncoded);
  const [stats, games] = await Promise.all([loadStatsRows(), loadGamesIndex()]);
  const teamRows = (stats||[]).filter(r=> r.team === team);
  const players = {};
  teamRows.forEach(r=>{ const key = r.jersey + '_' + r.name; if(!players[key]) players[key] = { jersey:r.jersey, name:r.name, games:0, pts:0, reb:0, ast:0 }; players[key].games+=1; players[key].pts += r.pts||0; players[key].reb+=r.reb||0; players[key].ast+=r.ast||0; });
  const playerArr = Object.values(players).sort((a,b)=>a.jersey - b.jersey);
  const roster = playerArr.map(p=> '<tr><td>#'+p.jersey+'</td><td><a href="#/player/'+encodeURIComponent(slug(p.name))+'">'+p.name+'</a></td><td>'+p.games+'</td></tr>').join('') || '<tr><td colspan="3" class="muted">No roster entries yet</td></tr>';
  const leader = playerArr.map(p=> ({ name:p.name, pts_avg: p.games? p.pts/p.games:0, reb_avg:p.games? p.reb/p.games:0, ast_avg:p.games? p.ast/p.games:0, games:p.games, pts:p.pts})).sort((a,b)=>b.pts_avg - a.pts_avg);
  const leaderRows = leader.map((p,i)=> '<tr><td>'+(i+1)+'</td><td><a href="#/player/'+encodeURIComponent(slug(p.name))+'">'+p.name+'</a></td><td>'+p.games+'</td><td>'+Math.round(p.pts)+'</td><td>'+p.pts_avg.toFixed(1)+'</td><td>'+p.reb_avg.toFixed(1)+'</td><td>'+p.ast_avg.toFixed(1)+'</td></tr>').join('') || '<tr><td colspan="7" class="muted">No leader data</td></tr>';
  const teamGames = (games||[]).filter(g=> g.home_team===team || g.away_team===team).sort((a,b)=>b.date.localeCompare(a.date));
  const gameRows = teamGames.map(g=> { const isHome = g.home_team===team; const them = isHome? g.away_team: g.home_team; const us = isHome? g.home_score: g.away_score; const themScore = isHome? g.away_score: g.home_score; const res = us>themScore? 'W' : (us<themScore? 'L':'T'); return '<tr><td>'+fmtDate(g.date)+'</td><td>'+ (isHome? 'vs':'@') +' '+them+'</td><td>'+res+'</td><td>'+us+'-'+themScore+'</td><td><a href="#/game/'+g.game_id+'">Boxscore</a></td></tr>'; }).join('') || '<tr><td colspan="5" class="muted">No games yet</td></tr>';

  setView('<section class="section"><h2>'+team+'</h2><div id="team-tabs"><div class="tab-strip"><button class="tab-button" data-tab-target="roster">Roster</button><button class="tab-button" data-tab-target="games">Games</button><button class="tab-button" data-tab-target="leaders">Team leaders</button><button class="tab-button" data-tab-target="records">Team records</button></div><div class="tab-panels"><div class="tab-panel" data-tab-panel="roster"><div class="table-wrapper"><table class="pg-table"><thead><tr><th>#</th><th>Player</th><th>GP</th></tr></thead><tbody>'+roster+'</tbody></table></div></div><div class="tab-panel" data-tab-panel="games"><div class="table-wrapper"><table class="pg-table"><thead><tr><th>Date</th><th>Opp</th><th>Result</th><th>Score</th><th></th></tr></thead><tbody>'+gameRows+'</tbody></table></div></div><div class="tab-panel" data-tab-panel="leaders"><div class="table-wrapper"><table class="pg-table"><thead><tr><th>#</th><th>Player</th><th>GP</th><th>PTS</th><th>PTS/G</th><th>REB/G</th><th>AST/G</th></tr></thead><tbody>'+leaderRows+'</tbody></table></div></div><div class="tab-panel" data-tab-panel="records"><p class="muted">Team records will appear here.</p></div></div></div></section>');
  initTabs('team-tabs','roster');
}

async function renderPlayer(slugName){
  const slugDecoded = decodeURIComponent(slugName);
  const stats = await loadStatsRows();
  const rows = (stats||[]).filter(r=> r.name && r.name.toLowerCase().replace(/\s+/g,'-')===slugDecoded);
  if(!rows.length){ setView('<section class="section"><p>Player not found.</p></section>'); return; }
  const name = rows[0].name;
  const gamesSet = new Set(rows.map(r=> r.game_id));
  const gp = gamesSet.size;
  let pts=0,reb=0,ast=0;
  rows.forEach(r=>{ pts+= r.pts||0; reb+= r.reb||0; ast+= r.ast||0; });
  const ppg = gp? (pts/gp).toFixed(1):'-';
  setView('<section class="section"><h2>'+name+'</h2><div class="cards-row"><div class="card"><h3>Career games</h3><p class="big-number">'+gp+'</p></div><div class="card"><h3>Points / game</h3><p class="big-number">'+ppg+'</p></div></div><div class="section" id="player-tabs"><div class="tab-strip"><button class="tab-button" data-tab-target="overview">Overview</button><button class="tab-button" data-tab-target="stats">Stats</button><button class="tab-button" data-tab-target="games">Games</button><button class="tab-button" data-tab-target="records">Records</button><button class="tab-button" data-tab-target="bio">Bio</button></div><div class="tab-panels"><div class="tab-panel" data-tab-panel="overview"><p class="muted">Career averages</p></div><div class="tab-panel" data-tab-panel="stats"><p class="muted">Per-team stats (coming)</p></div><div class="tab-panel" data-tab-panel="games"><div class="table-wrapper"><table class="pg-table"><thead><tr><th>Date</th><th>Matchup</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead><tbody>'+(rows.map(r=> '<tr><td>'+fmtDate(r.date)+'</td><td>'+r.team+' vs '+(r.opponent||'')+'</td><td>'+ (r.pts||0) +'</td><td>'+(r.reb||0)+'</td><td>'+(r.ast||0)+'</td></tr>').join(''))+'</tbody></table></div></div><div class="tab-panel" data-tab-panel="records"><p class="muted">Player records (coming)</p></div><div class="tab-panel" data-tab-panel="bio"><p class="muted">Bio data (coming)</p></div></div></div></section>');
  initTabs('player-tabs','overview');
}

function getParts(){ const hash = window.location.hash||'#/'; const cleaned = hash.replace(/^#\//,''); if(!cleaned) return ['']; return cleaned.split('/'); }

async function router(){
  setView('<section class="section"><p>Loading...</p></section>');
  const parts = getParts();
  try{
    if(parts[0]===''||parts[0]===undefined){ await renderHome(); return; }
    if(parts[0]==='games'){ await renderGames(); return; }
    if(parts[0]==='game' && parts[1]){ // simple fallback to boxscore view using game id
      // we don't implement separate boxscore function in this simplified version
      window.location.hash = '#/games';
      return;
    }
    if(parts[0]==='team' && parts[1]){ await renderTeam(parts.slice(1).join('/')); return; }
    if(parts[0]==='player' && parts[1]){ await renderPlayer(parts.slice(1).join('/')); return; }
    setView('<section class="section"><p>Page not found.</p></section>');
  }catch(e){ console.error(e); setView('<section class="section"><p>Error loading view</p></section>'); }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
