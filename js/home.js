import { } from "./app.js";

async function loadJSON(path) {
    const res = await fetch(path);
    return await res.json();
}

function createTeamCard(id, team) {
    return `
    <a class="card" href="team.html?team=${id}">
        <div class="card__media">
            <img src="assets/${team.logo}" alt="${team.name}">
        </div>
        <div class="card__body">
            <div class="card__title">${team.name}</div>
            <div class="card__meta">${team.league}</div>
        </div>
    </a>
    `;
}

function createPlayerCard(id, player) {
    return `
    <a class="card" href="player.html?player=${id}">
        <div class="card__media">
            <img src="assets/${player.image}" alt="${player.name}">
        </div>
        <div class="card__body">
            <div class="card__title">${player.name}</div>
            <div class="card__meta">#${player.number} · ${player.position}</div>
        </div>
    </a>
    `;
}

async function initHomePage() {
    const teamsGrid = document.getElementById("teams-grid");
    const playersGrid = document.getElementById("players-grid");

    const teams = await loadJSON("data/teams.json");
    const players = await loadJSON("data/players.json");

    // Render teams
    teamsGrid.innerHTML = Object.entries(teams)
        .map(([id, team]) => createTeamCard(id, team))
        .join("");

    // Render players
    playersGrid.innerHTML = Object.entries(players)
        .map(([id, player]) => createPlayerCard(id, player))
        .join("");
}

initHomePage();
