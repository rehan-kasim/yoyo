const SIZE = 4;
const boardEl = document.getElementById("board");
const gridEl = document.getElementById("grid");
const tilesEl = document.getElementById("tiles");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const scoreAddEl = document.getElementById("scoreAdd");
const overlayEl = document.getElementById("overlay");
const overlayTextEl = document.getElementById("overlayText");
const overlayListEl = document.getElementById("overlayList");
const newGameBtn = document.getElementById("newGame");

let grid = [];
let score = 0;
let best = loadBest();
let busy = false;
let won = false;
let menuOpen = false;
let menuItems = [];
let menuIndex = 0;
let menuClosable = false;
let menuEsc = null;
let dragStart = null;

function emptyGrid() {
  const rows = [];
  for (let r = 0; r < SIZE; r++) {
    rows.push([null, null, null, null]);
  }
  return rows;
}

function loadBest() {
  try {
    return parseInt(localStorage.getItem("yoyo2048best"), 10) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem("yoyo2048best", String(best));
  } catch (err) {
    return;
  }
}

function buildCells() {
  gridEl.innerHTML = "";
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    gridEl.appendChild(cell);
  }
}

function tileClass(value) {
  if (value > 2048) {
    return "tile-super";
  }
  return "tile-" + value;
}

function lenClass(value) {
  const len = String(value).length;
  if (len >= 5) return "len5";
  if (len >= 4) return "len4";
  if (len >= 3) return "len3";
  return "len2";
}

function applyLook(tile) {
  let extra = "";
  if (tile.value >= 128) {
    extra = " big";
  }
  tile.el.className = "tile " + tileClass(tile.value) + " " + lenClass(tile.value) + extra;
  tile.el.textContent = tile.value;
}

function placeTile(el, r, c) {
  el.style.setProperty("--r", r);
  el.style.setProperty("--c", c);
}

function createTile(r, c, value) {
  const el = document.createElement("div");
  placeTile(el, r, c);
  tilesEl.appendChild(el);
  const tile = { value: value, r: r, c: c, el: el, merged: false };
  applyLook(tile);
  return tile;
}

function addRandomTile() {
  const free = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) {
        free.push({ r: r, c: c });
      }
    }
  }
  if (!free.length) {
    return;
  }
  const spot = free[Math.floor(Math.random() * free.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const tile = createTile(spot.r, spot.c, value);
  grid[spot.r][spot.c] = tile;
  tile.el.classList.add("tile-new");
  setTimeout(function () {
    tile.el.classList.remove("tile-new");
  }, 240);
}

function updateScore(gained) {
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
    saveBest();
  }
  if (gained) {
    scoreAddEl.textContent = "+" + gained;
    scoreAddEl.classList.remove("show");
    void scoreAddEl.offsetWidth;
    scoreAddEl.classList.add("show");
  }
}

function newGame() {
  grid = emptyGrid();
  score = 0;
  won = false;
  busy = false;
  tilesEl.innerHTML = "";
  closeMenu();
  updateScore(0);
  addRandomTile();
  addRandomTile();
}

function getLines(dir) {
  const lines = [];
  for (let i = 0; i < SIZE; i++) {
    const line = [];
    for (let j = 0; j < SIZE; j++) {
      if (dir === "left") line.push({ r: i, c: j });
      if (dir === "right") line.push({ r: i, c: SIZE - 1 - j });
      if (dir === "up") line.push({ r: j, c: i });
      if (dir === "down") line.push({ r: SIZE - 1 - j, c: i });
    }
    lines.push(line);
  }
  return lines;
}

function move(dir) {
  if (busy || menuOpen) {
    return;
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c]) {
        grid[r][c].merged = false;
      }
    }
  }

  const lines = getLines(dir);
  const next = emptyGrid();
  const merges = [];
  const before = score;
  let moved = false;

  lines.forEach(function (line) {
    const stack = [];
    line.forEach(function (pos) {
      const tile = grid[pos.r][pos.c];
      if (tile) {
        stack.push(tile);
      }
    });

    const kept = [];
    stack.forEach(function (tile) {
      const last = kept[kept.length - 1];
      if (last && last.value === tile.value && !last.merged) {
        last.value *= 2;
        last.merged = true;
        score += last.value;
        merges.push({ from: tile, to: last });
        moved = true;
      } else {
        kept.push(tile);
      }
    });

    kept.forEach(function (tile, i) {
      const pos = line[i];
      if (tile.r !== pos.r || tile.c !== pos.c) {
        moved = true;
      }
      tile.r = pos.r;
      tile.c = pos.c;
      placeTile(tile.el, tile.r, tile.c);
      next[pos.r][pos.c] = tile;
    });
  });

  if (!moved) {
    return;
  }

  grid = next;
  merges.forEach(function (pair) {
    placeTile(pair.from.el, pair.to.r, pair.to.c);
  });

  busy = true;
  setTimeout(function () {
    merges.forEach(function (pair) {
      pair.from.el.remove();
      applyLook(pair.to);
      pair.to.el.classList.add("tile-merged");
      setTimeout(function () {
        pair.to.el.classList.remove("tile-merged");
      }, 240);
    });
    addRandomTile();
    updateScore(score - before);
    busy = false;
    checkState();
  }, 120);
}

function highestTile() {
  let high = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] && grid[r][c].value > high) {
        high = grid[r][c].value;
      }
    }
  }
  return high;
}

function movesAvailable() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tile = grid[r][c];
      if (!tile) {
        return true;
      }
      const right = c + 1 < SIZE ? grid[r][c + 1] : null;
      const down = r + 1 < SIZE ? grid[r + 1][c] : null;
      if (right && right.value === tile.value) return true;
      if (down && down.value === tile.value) return true;
    }
  }
  return false;
}

function setMenu(title, list, canClose, onEsc) {
  menuItems = list;
  menuIndex = 0;
  menuClosable = !!canClose;
  menuEsc = onEsc || null;
  menuOpen = true;
  overlayTextEl.textContent = title;
  overlayEl.classList.toggle("win", title === "You win!");
  renderMenu();
  overlayEl.classList.remove("hidden");
}

function renderMenu() {
  overlayListEl.innerHTML = "";
  menuItems.forEach(function (item, i) {
    const li = document.createElement("li");
    li.textContent = item.label;
    if (i === menuIndex) li.className = "on";
    li.addEventListener("click", function () {
      menuIndex = i;
      renderMenu();
      pickMenu();
    });
    overlayListEl.appendChild(li);
  });
}

function moveMenu(step) {
  if (!menuItems.length) return;
  menuIndex = (menuIndex + step + menuItems.length) % menuItems.length;
  renderMenu();
}

function pickMenu() {
  const item = menuItems[menuIndex];
  if (item && item.action) item.action();
}

function closeMenu() {
  overlayEl.classList.add("hidden");
  menuOpen = false;
}

function goHome() {
  location.href = "../index.html";
}

function showEndMenu(result) {
  if (result === "win") {
    setMenu("You win!", [
      { label: "Keep going", action: keepGoing },
      { label: "Try again", action: newGame },
      { label: "Back to home", action: goHome }
    ], false, goHome);
    return;
  }
  setMenu("Game over!", [
    { label: "Try again", action: newGame },
    { label: "Back to home", action: goHome }
  ], false, goHome);
}

function checkState() {
  if (!won && highestTile() >= 2048) {
    won = true;
    showEndMenu("win");
    return;
  }
  if (!movesAvailable()) {
    showEndMenu("lose");
  }
}

function keepGoing() {
  closeMenu();
  if (!movesAvailable()) {
    showEndMenu("lose");
  }
}

function pauseMenu() {
  setMenu("Menu", [
    { label: "Resume", action: closeMenu },
    { label: "New game", action: newGame },
    { label: "Back to home", action: goHome }
  ], true, null);
}

const KEY_DIRS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right"
};

document.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    e.preventDefault();
    return;
  }

  if (menuOpen) {
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveMenu(-1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      moveMenu(1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pickMenu();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (menuClosable) closeMenu();
      else if (menuEsc) menuEsc();
    }
    return;
  }

  const dir = KEY_DIRS[e.key];
  if (dir) {
    e.preventDefault();
    move(dir);
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    pauseMenu();
  }
});

boardEl.addEventListener("pointerdown", function (e) {
  dragStart = { x: e.clientX, y: e.clientY };
  if (boardEl.setPointerCapture) {
    boardEl.setPointerCapture(e.pointerId);
  }
});

boardEl.addEventListener("pointerup", function (e) {
  if (!dragStart) {
    return;
  }
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  dragStart = null;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
    return;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? "right" : "left");
  } else {
    move(dy > 0 ? "down" : "up");
  }
});

boardEl.addEventListener("pointercancel", function () {
  dragStart = null;
});

newGameBtn.addEventListener("click", function (e) {
  e.currentTarget.blur();
  newGame();
});

buildCells();
bestEl.textContent = best;
newGame();
