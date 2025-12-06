/* --------------------------------------------------
   mystats.pro V2.5 — GAMES PAGE ENGINE
-------------------------------------------------- */

const TEAM_GIDS_MAP = {
  "pretty-good": 0,
  "chuckers-chuckers": 26509490
};

const GAMES_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7JWjsx4iztJtf6PTOR6_adf9pdbtFlgIN8aX2_3QynveLtg427bYcDOOzIFpxEoNaMFYwaIFj12T/pub";

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

async function loadGames(slug) {
  const gid = TEAM_GIDS_MAP[slug];
  if (gid === undefined) return [];

  const url = `${sheetUrl}?gid=${gid}&single=true&output=csv`;
  return fetchCSV(url);
}

function extractSeasons(games) {
  const seasons = [...new Set(games.map((g) => g.season))].filter((s) => s);
  return seasons.sort();
}

function filterGames(games, season, phase) {
  return games.filter((g) => {
    const okS = season === "all" || g.season === season;
    const okP = phase === "all" || g.phase === phase;
    return okS && okP;
  });
}

function renderGamesTable(games) {
  const tbody = document.getElementById("games-tbody");
  tbody.innerHTML = "";

  games.forEach((g) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${g.date}</td>
      <td>${g.opponent}</td>
      <td>${g.result}</td>
      <td>${g.score_team} - ${g.score_opponent}</td>
      <td>${g.season}</td>
    `;

    tr.addEventListener("click", () => {
      if (g.game_id) {
        window.location.href = `boxscore.html?game_id=${g.game_id}`;
      }
    });

    tbody.appendChild(tr);
  });
}

async function initGamesPage() {
  const slug = getTeamSlug();
  const teams = await loadTeamsJSON();
  const team = teams.find((t) => t.slug === slug);

  if (!team) {
    console.error("Team not found:", slug);
    return;
  }

  // Header
  document.getElementById("games-team-name").textContent = team.name;

  // Load games
  const games = await loadGames(slug);

  // Season dropdown
  const seasonFilter = document.getElementById("games-season-filter");
  const seasons = extractSeasons(games);
  seasonFilter.innerHTML = `<option value="all">All</option>`;
  seasons.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    seasonFilter.appendChild(opt);
  });

  function applyFilters() {
    const season = seasonFilter.value;
    const phase = document.getElementById("games-phase-filter").value;

    const filtered = filterGames(games, season, phase);
    renderGamesTable(filtered);
  }

  seasonFilter.addEventListener("change", applyFilters);
  document
    .getElementById("games-phase-filter")
    .addEventListener("change", applyFilters);

  applyFilters();
}

initGamesPage();
