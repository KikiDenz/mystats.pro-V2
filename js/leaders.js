/* --------------------------------------------------
   mystats.pro V2.5 — LEADERS PAGE ENGINE
-------------------------------------------------- */

const PLAYER_GIDS_LDR = {
  "kyle-denzin": 0,
  "levi-denzin": 2091114860,
  "findlay-wendtman": 863688176,
  "jackson-neaves": 699060431,
  "ethan-todd": 450610169,
  "josh-todd": 2116571222,
  "callan-beamish": 430866216,
  "jarren-owen": 1191745424,
  "rhys-ogle": 298458955
};

const PLAYER_SHEET_LDR =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQsO8Qs1fcSc3bth-xMxcjAXOCchbqLYQpObfOQvf8xJdpSkNl3I09OEwuvfWYehtQX5a6LQIeIFdsg/pub?output=csv";

async function fetchCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  return parseCSV(text);
}

function parseCSV(raw) {
  const lines = raw.replace(/\r/g, "").split("\n");
  const headers = lines.shift().split(",");

  return lines
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const cols = line.split(",");
      const row = {};
      headers.forEach((h, i) => (row[h] = cols[i]));
      return row;
    });
}

function getTeamSlug() {
  const url = new URL(window.location.href);
  return url.searchParams.get("team");
}

async function loadTeamsJSON() {
  const res = await fetch("data/teams.json");
  return res.json();
}

async function loadPlayersJSON() {
  const res = await fetch("data/players.json");
  return res.json();
}

async function loadPlayerRowsForTeam(team) {
  const results = [];

  for (const slug of team.roster) {
    const gid = PLAYER_GIDS_LDR[slug];
    if (gid === undefined) continue;

    const url = `${PLAYER_SHEET_LDR}&gid=${gid}`;
    const rows = await fetchCSV(url);
    results.push({ slug, rows });
  }

  return results;
}

function extractSeasonsFromStats(playerStats) {
  const set = new Set();
  playerStats.forEach((p) => {
    p.rows.forEach((r) => {
      if (r.season) set.add(r.season);
    });
  });
  return Array.from(set).sort();
}

function filterRowsBySeasonPhase(rows, season, phase) {
  return rows.filter((r) => {
    const okS = season === "all" || r.season === season;
    const okP = phase === "all" || r.phase === phase;
    return okS && okP;
  });
}

function computeLeaderStats(playerStats, type) {
  const result = {};

  playerStats.forEach((p) => {
    const rows = p.filteredRows || p.rows;
    if (!rows || rows.length === 0) return;

    const total = {
      gp: rows.length,
      pts: 0,
      reb: 0,
      oreb: 0,
      dreb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      to: 0,
      fg_m: 0,
      fg_a: 0,
      tp_m: 0,
      tp_a: 0,
      ft_m: 0,
      ft_a: 0
    };

    rows.forEach((r) => {
      total.pts += Number(r.pts || 0);
      total.reb += Number(r.totrb || 0);
      total.oreb += Number(r.or || 0);
      total.dreb += Number(r.dr || 0);
      total.ast += Number(r.ass || 0);
      total.stl += Number(r.st || 0);
      total.blk += Number(r.bs || 0);
      total.to += Number(r.to || 0);

      total.fg_m += Number(r.fg || 0);
      total.fg_a += Number(r.fga || 0);
      total.tp_m += Number(r["3p"] || 0);
      total.tp_a += Number(r["3pa"] || 0);
      total.ft_m += Number(r.ft || 0);
      total.ft_a += Number(r.fta || 0);
    });

    if (type === "averages") {
      const gp = total.gp || 1;
      result[p.slug] = {
        gp: total.gp,
        pts: (total.pts / gp).toFixed(1),
        reb: (total.reb / gp).toFixed(1),
        oreb: (total.oreb / gp).toFixed(1),
        dreb: (total.dreb / gp).toFixed(1),
        ast: (total.ast / gp).toFixed(1),
        stl: (total.stl / gp).toFixed(1),
        blk: (total.blk / gp).toFixed(1),
        to: (total.to / gp).toFixed(1),
        fg_pct: pct(total.fg_m, total.fg_a),
        tp_pct: pct(total.tp_m, total.tp_a),
        ft_pct: pct(total.ft_m, total.ft_a)
      };
    } else {
      result[p.slug] = {
        gp: total.gp,
        pts: total.pts,
        reb: total.reb,
        oreb: total.oreb,
        dreb: total.dreb,
        ast: total.ast,
        stl: total.stl,
        blk: total.blk,
        to: total.to,
        fg_pct: pct(total.fg_m, total.fg_a),
        tp_pct: pct(total.tp_m, total.tp_a),
        ft_pct: pct(total.ft_m, total.ft_a)
      };
    }
  });

  return result;
}

function pct(made, att) {
  if (!att || att === 0) return 0;
  return ((made / att) * 100).toFixed(1);
}

function renderLeadersTable(statsBySlug, players) {
  const tbody = document.getElementById("leaders-tbody");
  tbody.innerHTML = "";

  Object.keys(statsBySlug).forEach((slug) => {
    const p = players.find((x) => x.slug === slug);
    if (!p) return;

    const s = statsBySlug[slug];
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${s.gp}</td>
      <td>${s.pts}</td>
      <td>${s.reb}</td>
      <td>${s.oreb}</td>
      <td>${s.dreb}</td>
      <td>${s.ast}</td>
      <td>${s.stl}</td>
      <td>${s.blk}</td>
      <td>${s.to}</td>
      <td>${s.fg_pct}%</td>
      <td>${s.tp_pct}%</td>
      <td>${s.ft_pct}%</td>
    `;

    tbody.appendChild(tr);
  });
}

async function initLeadersPage() {
  const slug = getTeamSlug();
  const teams = await loadTeamsJSON();
  const playersMeta = await loadPlayersJSON();

  const team = teams.find((t) => t.slug === slug);
  if (!team) {
    console.error("Team not found:", slug);
    return;
  }

  document.getElementById("leaders-team-name").textContent = team.name;

  // Load stats for all players in roster
  let playerStats = await loadPlayerRowsForTeam(team);

  // Season dropdown
  const seasons = extractSeasonsFromStats(playerStats);
  const seasonFilter = document.getElementById("leaders-season-filter");
  seasonFilter.innerHTML = `<option value="all">All</option>`;
  seasons.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    seasonFilter.appendChild(opt);
  });

  function applyFilters() {
    const season = seasonFilter.value;
    const phase = document.getElementById("leaders-phase-filter").value;
    const type = document.getElementById("leaders-type-filter").value;

    // Apply filters to each player's rows
    playerStats.forEach((p) => {
      p.filteredRows = filterRowsBySeasonPhase(p.rows, season, phase);
    });

    const statsBySlug = computeLeaderStats(playerStats, type);
    renderLeadersTable(statsBySlug, playersMeta);
  }

  seasonFilter.addEventListener("change", applyFilters);
  document
    .getElementById("leaders-phase-filter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("leaders-type-filter")
    .addEventListener("change", applyFilters);

  applyFilters();
}

initLeadersPage();
