// js/main.js
import { loadStatsRows, loadGamesIndex, loadPlayersMeta } from './dataLoader.js';

const root = document.getElementById('app-root');

function setView(html) {
  root.innerHTML = html;
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function slugifyPlayerName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function initTabs(scopeId) {
  const scope = document.getElementById(scopeId);
  if (!scope) return;
  const buttons = scope.querySelectorAll('[data-tab-target]');
  const panels = scope.querySelectorAll('[data-tab-panel]');

  function activate(name) {
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabTarget === name);
    });
    panels.forEach(panel => {
      panel.classList.toggle('active', panel.dataset.tabPanel === name);
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => activate(btn.dataset.tabTarget));
  });

  const first = buttons[0];
  if (first) activate(first.dataset.tabTarget);
}

async function renderHome() {
  const [stats, games] = await Promise.all([
    loadStatsRows(),
    loadGamesIndex()
  ]);

  const teamName = 'Pretty good';

  const teamRows = stats.filter(r => r.team === teamName);
  const gamesPlayed = new Set(teamRows.map(r => r.game_id)).size;

  const totalPts = teamRows.reduce((s, r) => s + (r.pts || 0), 0);
  const totalReb = teamRows.reduce((s, r) => s + (r.reb || 0), 0);
  const totalAst = teamRows.reduce((s, r) => s + (r.ast || 0), 0);

  const avgPts = gamesPlayed ? (totalPts / gamesPlayed).toFixed(1) : '-';
  const avgReb = gamesPlayed ? (totalReb / gamesPlayed).toFixed(1) : '-';
  const avgAst = gamesPlayed ? (totalAst / gamesPlayed).toFixed(1) : '-';

  const latestGame = [...games].sort((a, b) => b.date.localeCompare(a.date))[0];

  setView(`
    <section class="section">
      <h2>Season overview – ${teamName}</h2>
      <div class="cards-row">
        <div class="card">
          <h3>Games played</h3>
          <p class="big-number">${gamesPlayed}</p>
        </div>
        <div class="card">
          <h3>Team points / game</h3>
          <p class="big-number">${avgPts}</p>
        </div>
        <div class="card">
          <h3>Rebounds / game</h3>
          <p class="big-number">${avgReb}</p>
        </div>
        <div class="card">
          <h3>Assists / game</h3>
          <p class="big-number">${avgAst}</p>
        </div>
      </div>
    </section>

    ${latestGame ? `
      <section class="section">
        <h2>Latest game</h2>
        <a class="card card-link" href="#/game/${latestGame.game_id}">
          <div class="game-meta">
            <span class="game-date">${formatDate(latestGame.date)}</span>
            <span class="game-teams">
              ${latestGame.away_team}
              <span class="game-score">${latestGame.away_score}</span>
              @
              ${latestGame.home_team}
              <span class="game-score">${latestGame.home_score}</span>
            </span>
          </div>
          <span class="more">View boxscore →</span>
        </a>
      </section>
    ` : ''}
  `);
}

async function renderGamesList() {
  const games = await loadGamesIndex();
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date));

  const rows = sorted.map(g => `
    <tr>
      <td>${formatDate(g.date)}</td>
      <td>${g.away_team}</td>
      <td>${g.home_team}</td>
      <td>${g.away_score} – ${g.home_score}</td>
      <td><a href="#/game/${g.game_id}">Boxscore</a></td>
    </tr>
  `).join('');

  setView(`
    <section class="section">
      <h2>Games</h2>
      <div class="table-wrapper">
        <table class="pg-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Away</th>
              <th>Home</th>
              <th>Final</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5">No games yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `);
}

async function renderBoxscore(gameId) {
  const [stats, games] = await Promise.all([
    loadStatsRows(),
    loadGamesIndex()
  ]);

  const game = games.find(g => g.game_id === gameId);
  if (!game) {
    setView('<section class="section"><p>Game not found.</p></section>');
    return;
  }

  const rows = stats.filter(r => r.game_id === gameId);

  const bodyRows = rows.map(r => `
    <tr>
      <td>
        <a href="#/player/${encodeURIComponent(slugifyPlayerName(r.name))}">
          #${r.jersey} ${r.name}
        </a>
      </td>
      <td>${r.fg_made}-${r.fg_att}</td>
      <td>${r.tp_made}-${r.tp_att}</td>
      <td>${r.ft_made}-${r.ft_att}</td>
      <td>${r.reb}</td>
      <td>${r.ast}</td>
      <td>${r.stl}</td>
      <td>${r.blk}</td>
      <td>${r.to}</td>
      <td>${r.pts}</td>
    </tr>
  `).join('');

  const teamName = rows[0]?.team || 'Our team';

  setView(`
    <section class="section">
      <h2>Boxscore – ${formatDate(game.date)}</h2>
      <div class="game-header">
        <div class="team-line">
          <span>${game.away_team}</span>
          <span class="game-score">${game.away_score}</span>
        </div>
        <div class="team-line">
          <span>${game.home_team}</span>
          <span class="game-score">${game.home_score}</span>
        </div>
      </div>

      <h3>${teamName}</h3>
      <div class="table-wrapper">
        <table class="pg-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>FG</th>
              <th>3PT</th>
              <th>FT</th>
              <th>REB</th>
              <th>AST</th>
              <th>STL</th>
              <th>BLK</th>
              <th>TO</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows || '<tr><td colspan="10">No stats for this game.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `);
}

async function renderTeam(teamParam) {
  const teamName = decodeURIComponent(teamParam);
  const [stats, games] = await Promise.all([
    loadStatsRows(),
    loadGamesIndex()
  ]);

  const teamRows = stats.filter(r => r.team === teamName);
  if (!teamRows.length) {
    setView(`<section class="section"><p>No stats found for ${teamName}.</p></section>`);
    return;
  }

  const players = new Map();
  for (const r of teamRows) {
    const key = `${r.jersey}_${r.name}`;
    if (!players.has(key)) {
      players.set(key, {
        jersey: r.jersey,
        name: r.name,
        games: 0,
        pts: 0,
        reb: 0,
        ast: 0
      });
    }
    const p = players.get(key);
    p.games += 1;
    p.pts += r.pts || 0;
    p.reb += r.reb || 0;
    p.ast += r.ast || 0;
  }

  const leaderboard = Array.from(players.values()).map(p => ({
    ...p,
    pts_avg: p.pts / p.games,
    reb_avg: p.reb / p.games,
    ast_avg: p.ast / p.games
  }));

  leaderboard.sort((a, b) => b.pts_avg - a.pts_avg);

  const leaderRows = leaderboard.map(p => `
    <tr>
      <td>#${p.jersey}</td>
      <td>
        <a href="#/player/${encodeURIComponent(slugifyPlayerName(p.name))}">
          ${p.name}
        </a>
      </td>
      <td>${p.games}</td>
      <td>${p.pts.toFixed(0)}</td>
      <td>${p.pts_avg.toFixed(1)}</td>
      <td>${p.reb_avg.toFixed(1)}</td>
      <td>${p.ast_avg.toFixed(1)}</td>
    </tr>
  `).join('');

  const rosterRows = Array.from(players.values())
    .sort((a, b) => a.jersey - b.jersey)
    .map(p => `
      <tr>
        <td>#${p.jersey}</td>
        <td>
          <a href="#/player/${encodeURIComponent(slugifyPlayerName(p.name))}">
            ${p.name}
          </a>
        </td>
        <td>${p.games}</td>
      </tr>
    `).join('');

  const teamGames = games.filter(g => g.home_team === teamName || g.away_team === teamName)
    .sort((a, b) => b.date.localeCompare(a.date));

  const gameRows = teamGames.map(g => {
    const isHome = g.home_team === teamName;
    const them = isHome ? g.away_team : g.home_team;
    const usScore = isHome ? g.home_score : g.away_score;
    const themScore = isHome ? g.away_score : g.home_score;
    const result = usScore > themScore ? 'W' : (usScore < themScore ? 'L' : 'T');
    return `
      <tr>
        <td>${formatDate(g.date)}</td>
        <td>${isHome ? 'vs' : '@'} ${them}</td>
        <td>${result}</td>
        <td>${usScore}-${themScore}</td>
        <td><a href="#/game/${g.game_id}">Boxscore</a></td>
      </tr>
    `;
  }).join('');

  setView(`
    <section class="section">
      <h2>${teamName}</h2>

      <div id="team-tabs">
        <div class="tab-strip">
          <button class="tab-button" data-tab-target="games">Games</button>
          <button class="tab-button" data-tab-target="roster">Roster</button>
          <button class="tab-button" data-tab-target="leaders">Team leaders</button>
          <button class="tab-button" data-tab-target="records">Team records</button>
        </div>
        <div class="tab-panels">
          <div class="tab-panel" data-tab-panel="games">
            <div class="table-wrapper">
              <table class="pg-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opp</th>
                    <th>Result</th>
                    <th>Score</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${gameRows || '<tr><td colspan="5">No games yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="tab-panel" data-tab-panel="roster">
            <div class="table-wrapper">
              <table class="pg-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>GP</th>
                  </tr>
                </thead>
                <tbody>
                  ${rosterRows}
                </tbody>
              </table>
            </div>
          </div>

          <div class="tab-panel" data-tab-panel="leaders">
            <p class="muted">Leaders shown by points per game for this season. We can add a stat dropdown later.</p>
            <div class="table-wrapper">
              <table class="pg-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>GP</th>
                    <th>PTS/G</th>
                    <th>REB/G</th>
                    <th>AST/G</th>
                  </tr>
                </thead>
                <tbody>
                  ${leaderRows}
                </tbody>
              </table>
            </div>
          </div>

          <div class="tab-panel" data-tab-panel="records">
            <p class="muted">Team records (single-game highs, season totals, etc.) will be computed here from stats_rows.json. For now this is a placeholder.</p>
          </div>
        </div>
      </div>
    </section>
  `);

  initTabs('team-tabs');
}

async function renderPlayer(playerSlug) {
  const [stats, playersMeta] = await Promise.all([
    loadStatsRows(),
    loadPlayersMeta()
  ]);
  const targetSlug = decodeURIComponent(playerSlug);

  const playerRows = stats.filter(r => slugifyPlayerName(r.name) === targetSlug);
  if (!playerRows.length) {
    setView('<section class="section"><p>Player not found.</p></section>');
    return;
  }

  const displayName = playerRows[0].name;

  const meta = playersMeta.find(p => p.slug === targetSlug);

  const careerGames = new Set(playerRows.map(r => r.game_id)).size;
  let careerPts = 0, careerReb = 0, careerAst = 0, careerStl = 0, careerBlk = 0;
  for (const r of playerRows) {
    careerPts += r.pts || 0;
    careerReb += r.reb || 0;
    careerAst += r.ast || 0;
    careerStl += r.stl || 0;
    careerBlk += r.blk || 0;
  }
  const careerPtsAvg = careerGames ? (careerPts / careerGames).toFixed(1) : '-';
  const careerRebAvg = careerGames ? (careerReb / careerGames).toFixed(1) : '-';
  const careerAstAvg = careerGames ? (careerAst / careerGames).toFixed(1) : '-';

  const perTeam = new Map();
  for (const r of playerRows) {
    const t = r.team;
    if (!perTeam.has(t)) {
      perTeam.set(t, {
        team: t,
        games: 0,
        pts: 0,
        reb: 0,
        ast: 0
      });
    }
    const pt = perTeam.get(t);
    pt.games += 1;
    pt.pts += r.pts || 0;
    pt.reb += r.reb || 0;
    pt.ast += r.ast || 0;
  }
  const perTeamRows = Array.from(perTeam.values()).map(t => ({
    ...t,
    pts_avg: t.pts / t.games,
    reb_avg: t.reb / t.games,
    ast_avg: t.ast / t.games
  })).sort((a, b) => b.games - a.games);

  const perTeamHtml = perTeamRows.map(t => `
    <tr>
      <td>${t.team}</td>
      <td>${t.games}</td>
      <td>${t.pts.toFixed(0)}</td>
      <td>${t.pts_avg.toFixed(1)}</td>
      <td>${t.reb_avg.toFixed(1)}</td>
      <td>${t.ast_avg.toFixed(1)}</td>
    </tr>
  `).join('');

  const logs = [...playerRows].sort((a, b) => b.date.localeCompare(a.date));
  const logRows = logs.map(r => `
    <tr>
      <td>${formatDate(r.date)}</td>
      <td>${r.team} vs ${r.opponent}</td>
      <td>${r.pts}</td>
      <td>${r.reb}</td>
      <td>${r.ast}</td>
      <td>${r.stl}</td>
      <td>${r.blk}</td>
    </tr>
  `).join('');

  let maxPts = null, maxReb = null, maxAst = null;
  for (const r of playerRows) {
    if (maxPts === null || r.pts > maxPts.pts) maxPts = { pts: r.pts, date: r.date, opp: r.opponent };
    if (maxReb === null || r.reb > maxReb.reb) maxReb = { reb: r.reb, date: r.date, opp: r.opponent };
    if (maxAst === null || r.ast > maxAst.ast) maxAst = { ast: r.ast, date: r.date, opp: r.opponent };
  }

  const bioLines = meta ? `
    <div class="cards-row">
      <div class="card">
        <h3>Basics</h3>
        <p class="muted">Number</p>
        <p>#${meta.number ?? '–'}</p>
        <p class="muted">Position</p>
        <p>${meta.position ?? '–'}</p>
      </div>
      <div class="card">
        <p class="muted">Height</p>
        <p>${meta.height_cm ? meta.height_cm + ' cm' : '–'}</p>
        <p class="muted">Weight</p>
        <p>${meta.weight_kg ? meta.weight_kg + ' kg' : '–'}</p>
      </div>
      <div class="card">
        <p class="muted">Teams</p>
        <p>${(meta.teams || []).join(', ') || '–'}</p>
      </div>
    </div>
    <section class="section">
      <h3>Summary</h3>
      <p>${meta.bio || 'No bio yet.'}</p>
    </section>
  ` : '<p class="muted">No bio data yet. We can add this later via players_meta.json.</p>';

  setView(`
    <section class="section">
      <h2>${displayName}</h2>

      <div class="cards-row">
        <div class="card">
          <h3>Career games</h3>
          <p class="big-number">${careerGames}</p>
        </div>
        <div class="card">
          <h3>Points / game</h3>
          <p class="big-number">${careerPtsAvg}</p>
        </div>
        <div class="card">
          <h3>Rebounds / game</h3>
          <p class="big-number">${careerRebAvg}</p>
        </div>
        <div class="card">
          <h3>Assists / game</h3>
          <p class="big-number">${careerAstAvg}</p>
        </div>
      </div>

      <div class="section" id="player-tabs">
        <div class="tab-strip">
          <button class="tab-button" data-tab-target="overview">Overview</button>
          <button class="tab-button" data-tab-target="stats">Stats</button>
          <button class="tab-button" data-tab-target="games">Games</button>
          <button class="tab-button" data-tab-target="records">Records held</button>
          <button class="tab-button" data-tab-target="bio">Bio</button>
        </div>
        <div class="tab-panels">
          <div class="tab-panel" data-tab-panel="overview">
            <p class="muted">Career per-game numbers across all teams.</p>
            <div class="table-wrapper">
              <table class="pg-table">
                <thead>
                  <tr>
                    <th>Team(s)</th>
                    <th>GP</th>
                    <th>PTS/G</th>
                    <th>REB/G</th>
                    <th>AST/G</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${Array.from(perTeam.keys()).join(', ')}</td>
                    <td>${careerGames}</td>
                    <td>${careerPtsAvg}</td>
                    <td>${careerRebAvg}</td>
                    <td>${careerAstAvg}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="tab-panel" data-tab-panel="stats">
            <p class="muted">Per-team breakdown (career so far).</p>
            <div class="table-wrapper">
              <table class="pg-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>GP</th>
                    <th>PTS</th>
                    <th>PTS/G</th>
                    <th>REB/G</th>
                    <th>AST/G</th>
                  </tr>
                </thead>
                <tbody>
                  ${perTeamHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div class="tab-panel" data-tab-panel="games">
            <div class="table-wrapper">
              <table class="pg-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Matchup</th>
                    <th>PTS</th>
                    <th>REB</th>
                    <th>AST</th>
                    <th>STL</th>
                    <th>BLK</th>
                  </tr>
                </thead>
                <tbody>
                  ${logRows || '<tr><td colspan="7">No games yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="tab-panel" data-tab-panel="records">
            <p class="muted">Simple single-game highs for now; we can expand this later.</p>
            <div class="cards-row">
              <div class="card">
                <h3>Career high – points</h3>
                <p class="big-number">${maxPts?.pts ?? '-'}</p>
                <p class="muted">${maxPts ? formatDate(maxPts.date) + ' vs ' + maxPts.opp : ''}</p>
              </div>
              <div class="card">
                <h3>Career high – rebounds</h3>
                <p class="big-number">${maxReb?.reb ?? '-'}</p>
                <p class="muted">${maxReb ? formatDate(maxReb.date) + ' vs ' + maxReb.opp : ''}</p>
              </div>
              <div class="card">
                <h3>Career high – assists</h3>
                <p class="big-number">${maxAst?.ast ?? '-'}</p>
                <p class="muted">${maxAst ? formatDate(maxAst.date) + ' vs ' + maxAst.opp : ''}</p>
              </div>
            </div>
          </div>

          <div class="tab-panel" data-tab-panel="bio">
            ${bioLines}
          </div>
        </div>
      </div>
    </section>
  `);

  initTabs('player-tabs');
}

function getRouteParts() {
  const hash = window.location.hash || '#/';
  const cleaned = hash.replace(/^#\//, '');
  if (!cleaned) return [''];
  return cleaned.split('/');
}

async function handleRoute() {
  setView('<section class="section"><p>Loading...</p></section>');

  const parts = getRouteParts();

  try {
    if (parts[0] === '' || parts[0] === undefined) {
      await renderHome();
      return;
    }
    if (parts[0] === 'games') {
      await renderGamesList();
      return;
    }
    if (parts[0] === 'game' && parts[1]) {
      await renderBoxscore(parts.slice(1).join('/'));
      return;
    }
    if (parts[0] === 'team' && parts[1]) {
      await renderTeam(parts.slice(1).join('/'));
      return;
    }
    if (parts[0] === 'player' && parts[1]) {
      await renderPlayer(parts.slice(1).join('/'));
      return;
    }
    setView('<section class="section"><p>Page not found.</p></section>');
  } catch (err) {
    console.error(err);
    setView('<section class="section"><p>Something went wrong loading this view.</p></section>');
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', handleRoute);
