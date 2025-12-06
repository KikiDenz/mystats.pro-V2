// js/player.js

import {
  toNum,
  fmtNumber,
  fmtPct,
  parseCsv,
  getYearAndSeasonLabel,
} from "./app.js";

function log(...args) {
  console.log("[player]", ...args);
}

// ---------- small helpers ----------

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

async function loadCsv(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load CSV ${path}`);
  const text = await res.text();
  return parseCsv(text);
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return "";
}

function seasonWeight(label) {
  if (!label) return 0;
  const parts = label.split(" ");
  if (parts.length < 2) return 0;
  const year = parseInt(parts[0], 10) || 0;
  const season = parts[1];
  const orderMap = { Summer: 1, Autumn: 2, Winter: 3, Spring: 4 };
  const ord = orderMap[season] || 0;
  return year * 10 + ord;
}

// ---------- build game objects for one player ----------

function buildGameRecords(playerId, playerName, rows) {
  const games = [];

  for (const row of rows) {
    const dateStr = pick(row, "date", "gamedate");
    const opponent = pick(row, "opponent", "opp");
    const result = pick(row, "result");

    const seasonOverride = pick(row, "season", "seasonlabel");
    const { year, seasonLabel: inferredSeason } = getYearAndSeasonLabel(
      dateStr
    );
    const seasonLabel = seasonOverride || inferredSeason;

    const phaseRaw = (pick(row, "phase", "playoff", "playoffs") || "")
      .toString()
      .toLowerCase();
    let phase = "regular";
    if (["p", "y", "yes", "true", "playoff", "playoffs"].includes(phaseRaw)) {
      phase = "playoffs";
    }

    const min = toNum(pick(row, "min", "mins", "minutes"));

    const fgMade = toNum(pick(row, "fgm", "fg", "fieldgoalsmade"));
    const fgAtt = toNum(pick(row, "fga", "fieldgoalsattempted"));

    const threeMade = toNum(pick(row, "3pm", "3p", "threemade"));
    const threeAtt = toNum(pick(row, "3pa", "threeatt", "3ptattempts"));

    const ftMade = toNum(pick(row, "ftm", "ft", "freethrowsmade"));
    const ftAtt = toNum(pick(row, "fta", "freethrowsattempted"));

    const oreb = toNum(pick(row, "or", "oreb", "offreb", "offensiverebounds"));
    const dreb = toNum(pick(row, "dr", "dreb", "defreb", "defensiverebounds"));

    let reb = toNum(pick(row, "totrb", "trb", "reb", "reboundstotal"));
    if (!reb && (oreb || dreb)) reb = oreb + dreb;

    const ast = toNum(pick(row, "ast", "ass", "assists"));
    const stl = toNum(pick(row, "stl", "st", "steals"));
    const blk = toNum(pick(row, "blk", "bs", "blocks"));
    const tov = toNum(pick(row, "to", "tov", "turnovers"));
    const pts = toNum(pick(row, "pts", "points"));

    games.push({
      playerId,
      playerName,
      date: dateStr,
      opponent,
      result,
      seasonLabel,
      year,
      phase,
      min,
      pts,
      reb,
      oreb,
      dreb,
      ast,
      stl,
      blk,
      tov,
      fgMade,
      fgAtt,
      threeMade,
      threeAtt,
      ftMade,
      ftAtt,
    });
  }

  return games;
}

// ---------- filtering & season helpers ----------

function getSeasonOptions(games) {
  const labels = new Set();
  for (const g of games) {
    if (g.seasonLabel) labels.add(g.seasonLabel);
  }
  const arr = Array.from(labels);
  arr.sort((a, b) => seasonWeight(a) - seasonWeight(b));
  return arr;
}

function filterGamesBySeason(games, seasonLabel) {
  if (!seasonLabel || seasonLabel === "all") return games;
  return games.filter((g) => g.seasonLabel === seasonLabel);
}

function filterGamesByMode(games, mode) {
  if (mode === "regular") {
    return games.filter((g) => g.phase === "regular");
  }
  if (mode === "playoffs") {
    return games.filter((g) => g.phase === "playoffs");
  }
  return games;
}

// ---------- rendering ----------

function renderSeasonSelect(selectEl, seasonOptions) {
  if (!selectEl) return;
  selectEl.innerHTML =
    `<option value="all">All seasons</option>` +
    seasonOptions.map((label) => `<option value="${label}">${label}</option>`).join(
      ""
    );
}

function computeSeasonLine(label, games) {
  if (!games.length) {
    return {
      label,
      gp: 0,
      min: 0,
      pts: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      fgPct: "—",
      threePct: "—",
      ftPct: "—",
    };
  }

  const agg = {
    gp: 0,
    min: 0,
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    fgMade: 0,
    fgAtt: 0,
    threeMade: 0,
    threeAtt: 0,
    ftMade: 0,
    ftAtt: 0,
  };

  for (const g of games) {
    agg.gp += 1;
    agg.min += g.min;
    agg.pts += g.pts;
    agg.reb += g.reb;
    agg.ast += g.ast;
    agg.stl += g.stl;
    agg.blk += g.blk;
    agg.fgMade += g.fgMade;
    agg.fgAtt += g.fgAtt;
    agg.threeMade += g.threeMade;
    agg.threeAtt += g.threeAtt;
    agg.ftMade += g.ftMade;
    agg.ftAtt += g.ftAtt;
  }

  const gp = agg.gp || 1;

  return {
    label,
    gp: agg.gp,
    min: agg.min / gp,
    pts: agg.pts / gp,
    reb: agg.reb / gp,
    ast: agg.ast / gp,
    stl: agg.stl / gp,
    blk: agg.blk / gp,
    fgPct: fmtPct(agg.fgMade, agg.fgAtt),
    threePct: fmtPct(agg.threeMade, agg.threeAtt),
    ftPct: fmtPct(agg.ftMade, agg.ftAtt),
  };
}

function renderSeasonAverages(tbody, seasonLabel, games) {
  if (!tbody) return;
  const line = computeSeasonLine(
    seasonLabel === "all" ? "All seasons" : seasonLabel,
    games
  );

  tbody.innerHTML = `
    <tr>
      <td>${line.label}</td>
      <td>${line.gp}</td>
      <td>${fmtNumber(line.min, 1)}</td>
      <td>${fmtNumber(line.pts, 1)}</td>
      <td>${fmtNumber(line.reb, 1)}</td>
      <td>${fmtNumber(line.ast, 1)}</td>
      <td>${fmtNumber(line.stl, 1)}</td>
      <td>${fmtNumber(line.blk, 1)}</td>
      <td>${line.fgPct}</td>
      <td>${line.threePct}</td>
      <td>${line.ftPct}</td>
    </tr>
  `;
}

function renderGameLog(tbody, games) {
  if (!tbody) return;

  const sorted = [...games].sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);
    return da - db;
  });

  tbody.innerHTML = sorted
    .map((g) => {
      const phaseLabel = g.phase === "playoffs" ? "Playoffs" : "Regular";
      const fgLine = g.fgAtt ? `${g.fgMade}-${g.fgAtt}` : "";
      const threeLine = g.threeAtt ? `${g.threeMade}-${g.threeAtt}` : "";
      const ftLine = g.ftAtt ? `${g.ftMade}-${g.ftAtt}` : "";

      return `
        <tr>
          <td>${g.date || ""}</td>
          <td>${g.seasonLabel || ""}</td>
          <td>${phaseLabel}</td>
          <td>${g.opponent || ""}</td>
          <td>${g.result || ""}</td>
          <td>${g.min || ""}</td>
          <td>${g.pts || ""}</td>
          <td>${g.reb || ""}</td>
          <td>${g.ast || ""}</td>
          <td>${g.stl || ""}</td>
          <td>${g.blk || ""}</td>
          <td>${fgLine}</td>
          <td>${threeLine}</td>
          <td>${ftLine}</td>
        </tr>
      `;
    })
    .join("");
}

// ---------- main init ----------

async function initPlayerPage() {
  const playerId = getQueryParam("player");
  log("initPlayerPage, playerId =", playerId);

  if (!playerId) {
    log("No ?player= in URL; aborting.");
    return;
  }

  const seasonSelect = document.getElementById("player-season-select");
  const averagesBody = document.querySelector(
    "#player-averages-table tbody"
  );
  const logBody = document.querySelector("#player-gamelog-table tbody");
  const modeButtons = document.querySelectorAll("[data-player-mode]");

  const players = await loadJSON("data/players.json");
  const player = players[playerId];

  log("Loaded players.json, found player:", player);

  if (!player) {
    if (averagesBody) {
      averagesBody.innerHTML =
        "<tr><td colspan='11'>Player not found.</td></tr>";
    }
    return;
  }

  const csvPath = player.csv || player.csvUrl;
  log("CSV path for player:", csvPath);

  if (!csvPath) {
    log("No CSV configured for player, giving up.");
    return;
  }

  let rows = [];
  try {
    rows = await loadCsv(csvPath);
    log("Loaded CSV rows:", rows.length);
  } catch (err) {
    console.error("Error loading CSV for player", playerId, err);
  }

  const allGames = buildGameRecords(playerId, player.name, rows);
  log("Built game records:", allGames.length);

  const seasonOptions = getSeasonOptions(allGames);
  log("Season options:", seasonOptions);

  renderSeasonSelect(seasonSelect, seasonOptions);

  let currentSeason = "all";
  let currentMode = "regular";

  function refresh() {
    let filtered = filterGamesBySeason(allGames, currentSeason);
    filtered = filterGamesByMode(filtered, currentMode);

    log("Refresh -> season:", currentSeason, "mode:", currentMode, "games:", filtered.length);

    renderSeasonAverages(averagesBody, currentSeason, filtered);
    renderGameLog(logBody, filtered);
  }

  if (seasonSelect) {
    seasonSelect.addEventListener("change", () => {
      currentSeason = seasonSelect.value || "all";
      refresh();
    });
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.playerMode;
      if (!mode) return;

      currentMode = mode;

      modeButtons.forEach((b) =>
        b.classList.toggle(
          "segmented-control__button--active",
          b === btn
        )
      );

      refresh();
    });
  });

  refresh();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPlayerPage);
} else {
  initPlayerPage();
}
