/* --------------------------------------------------
   mystats.pro V2.5 — PLAYER PAGE ENGINE
-------------------------------------------------- */

const PLAYER_GIDS_MAP = {
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

const PLAYER_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQsO8Qs1fcSc3bth-xMxcjAXOCchbqLYQpObfOQvf8xJdpSkNl3I09OEwuvfWYehtQX5a6LQIeIFdsg/pub";

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

function getPlayerSlug() {
  const url = new URL(window.location.href);
  return url.searchParams.get("player");
}

async function loadPlayersJSON() {
  const res = await fetch("data/players.json");
  return res.json();
}

async function loadPlayerStats(slug) {
  const gid = PLAYER_GIDS_MAP[slug];
  if (gid === undefined) return [];

  const url = `${PLAYER_SHEET_URL}&gid=${gid}`;
  return await fetchCSV(url);
}

function extractSeasons(rows) {
  const seasons = [...new Set(rows.map((r) => r.season))].filter((s) => s);
  return seasons.sort();
}

function filterRows(rows, season, phase) {
  return rows.filter((r) => {
    const okSeason = season === "all" || r.season === season;
    const okPhase = phase === "all" || r.phase === phase;
    return okSeason && okPhase;
  });
}

function computeAverages(rows) {
  if (rows.length === 0) return null;

  const sum = {
    gp: rows.length,
    pts: 0,
    reb: 0,
    oreb: 0,
    dreb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    to: 0,
    fg: [],
    tp: [],
    ft: [],
  };

  rows.forEach((r) => {
    sum.pts += Number(r.pts || 0);
    sum.reb += Number(r.totrb || 0);
    sum.oreb += Number(r.or || 0);
    sum.dreb += Number(r.dr || 0);
    sum.ast += Number(r.ass || 0);
    sum.stl += Number(r.st || 0);
    sum.blk += Number(r.bs || 0);
    sum.to += Number(r.to || 0);

    // Track shooting attempts/makes
    if (r.fg && r.fga) sum.fg.push([Number(r.fg), Number(r.fga)]);
    if (r["3p"] && r["3pa"]) sum.tp.push([Number(r["3p"]), Number(r["3pa"])]);
    if (r.ft && r.fta) sum.ft.push([Number(r.ft), Number(r.fta)]);
  });

  const pct = (arr) => {
    const made = arr.reduce((a, b) => a + b[0], 0);
    const att = arr.reduce((a, b) => a + b[1], 0);
    return att === 0 ? 0 : (made / att) * 100;
  };

  return {
    gp: sum.gp,
    pts: (sum.pts / sum.gp).toFixed(1),
    reb: (sum.reb / sum.gp).toFixed(1),
    oreb: (sum.oreb / sum.gp).toFixed(1),
    dreb: (sum.dreb / sum.gp).toFixed(1),
    ast: (sum.ast / sum.gp).toFixed(1),
    stl: (sum.stl / sum.gp).toFixed(1),
    blk: (sum.blk / sum.gp).toFixed(1),
    to: (sum.to / sum.gp).toFixed(1),
    fg: pct(sum.fg).toFixed(1),
    tp: pct(sum.tp).toFixed(1),
    ft: pct(sum.ft).toFixed(1),
  };
}

function renderAverages(avg) {
  const body = document.getElementById("player-averages-body");
  body.innerHTML = "";

  if (!avg) {
    body.innerHTML = "<tr><td colspan='12'>No games this season.</td></tr>";
    return;
  }

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${avg.gp}</td>
    <td>${avg.pts}</td>
    <td>${avg.reb}</td>
    <td>${avg.oreb}</td>
    <td>${avg.dreb}</td>
    <td>${avg.ast}</td>
    <td>${avg.stl}</td>
    <td>${avg.blk}</td>
    <td>${avg.to}</td>
    <td>${avg.fg}%</td>
    <td>${avg.tp}%</td>
    <td>${avg.ft}%</td>
  `;
  body.appendChild(tr);
}

function renderGameLog(rows) {
  const body = document.getElementById("player-games-body");
  body.innerHTML = "";

  rows.forEach((r) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.opponent}</td>
      <td>${r.pts}</td>
      <td>${r.totrb}</td>
      <td>${r.ass}</td>
      <td>${r.st}</td>
      <td>${r.bs}</td>
      <td>${r.to}</td>
      <td>${r.fg}/${r.fga}</td>
      <td>${r["3p"]}/${r["3pa"]}</td>
      <td>${r.ft}/${r.fta}</td>
      <td>${r.phase}</td>
    `;

    tr.addEventListener("click", () => {
      if (r.game_id) {
        window.location.href = `boxscore.html?game_id=${r.game_id}`;
      }
    });

    body.appendChild(tr);
  });
}

// ========== INITIALIZE PAGE ==========

async function initPlayerPage() {
  const slug = getPlayerSlug();
  const players = await loadPlayersJSON();
  const player = players.find((p) => p.slug === slug);

  if (!player) {
    console.error("Player not found:", slug);
    return;
  }

  // Render header
  document.getElementById("player-image").src = player.image;
  document.getElementById("player-name").textContent = player.name;
  document.getElementById("player-meta").textContent = `${player.position} • #${player.number}`;

  // Load stats
  const rows = await loadPlayerStats(slug);

  // Seasons list
  const seasons = extractSeasons(rows);
  const seasonDropdown = document.getElementById("player-season-filter");
  seasonDropdown.innerHTML = `<option value="all">All</option>`;
  seasons.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    seasonDropdown.appendChild(opt);
  });

  function applyFilters() {
    const season = seasonDropdown.value;
    const phase = document.getElementById("player-phase-filter").value;

    const filtered = filterRows(rows, season, phase);
    renderAverages(computeAverages(filtered));
    renderGameLog(filtered);
  }

  seasonDropdown.addEventListener("change", applyFilters);
  document
    .getElementById("player-phase-filter")
    .addEventListener("change", applyFilters);

  applyFilters();
}

initPlayerPage();
