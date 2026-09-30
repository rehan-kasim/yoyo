const LAYOUTS = {
  easy: { c: 4, r: 4, pairs: 8 },
  normal: { c: 6, r: 4, pairs: 12 },
  hard: { c: 6, r: 6, pairs: 18 }
};

const SYMBOLS = [
  "🍒", "🍓", "🍑", "🍊", "🍋", "🍇",
  "🍉", "🍍", "🥝", "🍏", "🍐", "🍈",
  "🍌", "🫐", "🥥", "🌵", "🍄", "🌻"
];

const board = document.getElementById("board");
const movesEl = document.getElementById("movesEl");
const timeEl = document.getElementById("timeEl");
const diffLine = document.getElementById("diffLine");
const subLine = document.getElementById("subLine");
const topStatus = document.getElementById("topStatus");
const btnMenu = document.getElementById("btnMenu");

const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovDesc = document.getElementById("ovDesc");
const ovList = document.getElementById("ovList");
const ovHint = document.getElementById("ovHint");

const MOVES = {
  ArrowUp: -1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowRight: 1,
  w: -1,
  s: 1,
  a: -1,
  d: 1,
  W: -1,
  S: 1,
  A: -1,
  D: 1
};

let diff = localStorage.getItem("yoyomemorydiff") || "normal";
let layout = LAYOUTS[diff] || LAYOUTS.normal;
let cards = [];
let cells = [];
let open = [];
let sel = 0;
let busy = false;
let moves = 0;
let matches = 0;
let seconds = 0;
let started = false;
let playing = false;
let won = false;
let roundId = 0;
let menuOpen = false;
let menuItems = [];
let menuIndex = 0;
let menuClosable = false;
let menuEsc = null;

if (!LAYOUTS[diff]) diff = "normal";

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function bestKey() {
  return "yoyomemorybest-" + diff;
}

function getBest() {
  return Number(localStorage.getItem(bestKey()) || 0);
}

function newGame(d) {
  diff = d;
  layout = LAYOUTS[diff];
  localStorage.setItem("yoyomemorydiff", diff);
  const syms = shuffled(SYMBOLS).slice(0, layout.pairs);
  const deck = shuffled(syms.concat(syms));
  cards = deck.map(function (s) {
    return { sym: s, up: false, matched: false };
  });
  open = [];
  sel = 0;
  busy = false;
  moves = 0;
  matches = 0;
  seconds = 0;
  started = false;
  won = false;
  playing = true;
  roundId++;
  closeMenu();
  diffLine.textContent = diff;
  topStatus.textContent = "flip and match";
  buildBoard();
  render();
}

function buildBoard() {
  board.innerHTML = "";
  board.style.gridTemplateColumns = "repeat(" + layout.c + ", 1fr)";
  cells = [];
  cards.forEach(function (c, i) {
    const div = document.createElement("div");
    div.className = "card";
    div.dataset.i = String(i);
    div.innerHTML =
      '<div class="inner">' +
      '<div class="face back"></div>' +
      '<div class="face front">' + c.sym + "</div>" +
      "</div>";
    board.appendChild(div);
    cells.push(div);
  });
}

function render() {
  cards.forEach(function (c, i) {
    const cls = ["card"];
    if (c.up || c.matched) cls.push("flipped");
    if (c.matched) cls.push("matched");
    if (i === sel && !c.matched) cls.push("sel");
    cells[i].className = cls.join(" ");
  });
  updateHud();
}

function updateHud() {
  movesEl.textContent = String(moves);
  timeEl.textContent = fmtTime(seconds);
  subLine.textContent = matches + " of " + layout.pairs + " pairs";
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
}

function flip(i) {
  if (!playing || won || menuOpen || busy) return;
  const c = cards[i];
  if (!c || c.up || c.matched) return;
  c.up = true;
  if (!started) {
    started = true;
    topStatus.textContent = "in progress";
  }
  open.push(i);
  render();

  if (open.length < 2) return;

  moves++;
  updateHud();
  const a = open[0];
  const b = open[1];

  if (cards[a].sym === cards[b].sym) {
    cards[a].matched = true;
    cards[b].matched = true;
    matches++;
    open = [];
    render();
    cells[a].classList.add("pop");
    cells[b].classList.add("pop");
    window.setTimeout(function () {
      cells[a].classList.remove("pop");
      cells[b].classList.remove("pop");
    }, 320);
    checkWin();
    return;
  }

  busy = true;
  const id = roundId;
  window.setTimeout(function () {
    if (id !== roundId) return;
    cards[a].up = false;
    cards[b].up = false;
    open = [];
    busy = false;
    render();
  }, 750);
}

function checkWin() {
  if (matches < layout.pairs) return;
  won = true;
  playing = false;
  busy = false;
  topStatus.textContent = "board cleared";
  diffLine.textContent = "cleared";
  const oldBest = getBest();
  const record = !oldBest || moves < oldBest;
  if (record) {
    localStorage.setItem(bestKey(), String(moves));
  }
  render();
  const best = getBest();
  setMenu(
    "Cleared",
    moves + " moves · " + fmtTime(seconds) + " · best " + best + (record ? " · new record" : ""),
    [
      { label: "Play again", action: function () { newGame(diff); } },
      { label: "Change difficulty", action: diffMenu },
      { label: "Back to home", action: goHome }
    ],
    "↑↓ move · enter select · esc main menu",
    false,
    mainMenu
  );
}

function moveCursor(key) {
  const step = MOVES[key];
  if (step === undefined) return;
  let next = sel;
  if (key === "ArrowLeft" || key === "a" || key === "A") {
    if (sel % layout.c === 0) return;
    next = sel - 1;
  } else if (key === "ArrowRight" || key === "d" || key === "D") {
    if (sel % layout.c === layout.c - 1) return;
    next = sel + 1;
  } else if (key === "ArrowUp" || key === "w" || key === "W") {
    if (sel - layout.c < 0) return;
    next = sel - layout.c;
  } else {
    if (sel + layout.c >= cards.length) return;
    next = sel + layout.c;
  }
  sel = next;
  render();
}

function setMenu(title, desc, items, hint, closable, onEsc) {
  menuItems = items;
  menuIndex = 0;
  menuClosable = !!closable;
  menuEsc = onEsc || null;
  menuOpen = true;
  ovTitle.textContent = title;
  ovDesc.textContent = desc;
  ovHint.textContent = hint || "↑↓ move · enter select · esc back";
  buildMenuList();
  renderMenu();
  overlay.classList.remove("hidden");
}

function buildMenuList() {
  ovList.innerHTML = "";
  menuItems.forEach(function (item, i) {
    const li = document.createElement("li");
    li.textContent = item.label;
    li.addEventListener("mouseenter", function () {
      menuIndex = i;
      renderMenu();
    });
    li.addEventListener("click", function () {
      menuIndex = i;
      renderMenu();
      pickMenu();
    });
    ovList.appendChild(li);
  });
}

function renderMenu() {
  for (let i = 0; i < ovList.children.length; i++) {
    ovList.children[i].className = i === menuIndex ? "on" : "";
  }
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
  overlay.classList.add("hidden");
  menuOpen = false;
}

function goHome() {
  location.href = "../index.html";
}

function mainMenu() {
  playing = false;
  const best = getBest();
  setMenu(
    "Memory",
    "flip two cards · match the pair · difficulty " + diff + (best ? " · best " + best + " moves" : ""),
    [
      { label: "Play", action: function () { newGame(diff); } },
      { label: "Change difficulty", action: diffMenu },
      { label: "Back to home", action: goHome }
    ],
    "↑↓ move · enter select · esc exit",
    false,
    goHome
  );
}

function diffMenu() {
  setMenu("Difficulty", "pick a board · game starts right away", [
    { label: "Easy · 4x4", action: function () { newGame("easy"); } },
    { label: "Normal · 6x4", action: function () { newGame("normal"); } },
    { label: "Hard · 6x6", action: function () { newGame("hard"); } },
    { label: "Back", action: mainMenu }
  ], "↑↓ move · enter select · esc back", true, mainMenu);
}

function pauseMenu() {
  setMenu("Paused", "difficulty " + diff + " · " + moves + " moves · " + matches + " pairs", [
    { label: "Resume", action: closeMenu },
    { label: "New game", action: function () { newGame(diff); } },
    { label: "Main menu", action: mainMenu },
    { label: "Back to home", action: goHome }
  ], "↑↓ move · enter select · esc resume", true, null);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    e.preventDefault();
    return;
  }

  if (menuOpen) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveMenu(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveMenu(1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pickMenu();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (menuClosable) {
        if (menuEsc) menuEsc();
        else closeMenu();
      } else if (menuEsc) {
        menuEsc();
      } else {
        goHome();
      }
    }
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    if (playing) pauseMenu();
    else mainMenu();
    return;
  }

  if (MOVES[e.key] !== undefined) {
    e.preventDefault();
    moveCursor(e.key);
    return;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    flip(sel);
  }
});

board.addEventListener("click", function (e) {
  const card = e.target.closest(".card");
  if (!card || menuOpen) return;
  sel = Number(card.dataset.i);
  flip(sel);
});

btnMenu.addEventListener("click", function (e) {
  e.currentTarget.blur();
  if (menuOpen) return;
  if (playing) pauseMenu();
  else mainMenu();
});

setInterval(function () {
  if (playing && started && !won && !menuOpen) {
    seconds++;
    updateHud();
  }
}, 1000);

render();
mainMenu();
