const GIVENS = { easy: 44, normal: 36, hard: 28, evil: 23 };

const board = document.getElementById("board");
const digitsBar = document.getElementById("digits");
const timeEl = document.getElementById("timeEl");
const leftEl = document.getElementById("leftEl");
const diffLine = document.getElementById("diffLine");
const subLine = document.getElementById("subLine");
const topStatus = document.getElementById("topStatus");
const btnMenu = document.getElementById("btnMenu");
const btnErase = document.getElementById("btnErase");
const btnNotes = document.getElementById("btnNotes");
const btnUndo = document.getElementById("btnUndo");
const btnHint = document.getElementById("btnHint");

const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovDesc = document.getElementById("ovDesc");
const ovList = document.getElementById("ovList");
const ovHint = document.getElementById("ovHint");

const MOVES = {
  ArrowUp: -9,
  ArrowDown: 9,
  ArrowLeft: -1,
  ArrowRight: 1,
  w: -9,
  s: 9,
  a: -1,
  d: 1,
  W: -9,
  S: 9,
  A: -1,
  D: 1
};

let solution = [];
let puzzle = [];
let grid = [];
let given = [];
let marks = [];
let cells = [];
let sel = 0;
let notesOn = false;
let mistakes = 0;
let hints = 0;
let seconds = 0;
let playing = false;
let won = false;
let history = [];
let diff = localStorage.getItem("yoyosudokudiff") || "normal";
let menuOpen = false;
let menuItems = [];
let menuIndex = 0;
let menuClosable = false;
let menuEsc = null;

if (!GIVENS[diff]) diff = "normal";

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

function candidatesAt(b, i) {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const used = [false, false, false, false, false, false, false, false, false, false];
  for (let k = 0; k < 9; k++) {
    used[b[r * 9 + k]] = true;
    used[b[k * 9 + c]] = true;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      used[b[(br + dr) * 9 + bc + dc]] = true;
    }
  }
  const out = [];
  for (let n = 1; n <= 9; n++) {
    if (!used[n]) out.push(n);
  }
  return out;
}

function fillFrom(b, idx) {
  if (idx >= 81) return true;
  if (b[idx]) return fillFrom(b, idx + 1);
  const cands = shuffled(candidatesAt(b, idx));
  for (let k = 0; k < cands.length; k++) {
    b[idx] = cands[k];
    if (fillFrom(b, idx + 1)) return true;
    b[idx] = 0;
  }
  return false;
}

function generateSolution() {
  const b = new Array(81).fill(0);
  const starts = [0, 30, 60];
  for (let k = 0; k < starts.length; k++) {
    const base = starts[k];
    const nums = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const spots = [0, 1, 2, 9, 10, 11, 18, 19, 20];
    for (let s = 0; s < spots.length; s++) {
      b[base + spots[s]] = nums[s];
    }
  }
  fillFrom(b, 0);
  return b;
}

function countSolutions(b, limit) {
  let count = 0;

  function rec() {
    let best = -1;
    let bestCands = null;
    for (let i = 0; i < 81; i++) {
      if (b[i]) continue;
      const c = candidatesAt(b, i);
      if (!c.length) return;
      if (!bestCands || c.length < bestCands.length) {
        best = i;
        bestCands = c;
        if (c.length === 1) break;
      }
    }
    if (best === -1) {
      count++;
      return;
    }
    for (let k = 0; k < bestCands.length; k++) {
      b[best] = bestCands[k];
      rec();
      b[best] = 0;
      if (count >= limit) return;
    }
  }

  rec();
  return count;
}

function makePuzzle(sol, target) {
  const b = sol.slice();
  const order = shuffled(Array.from({ length: 81 }, function (_, i) { return i; }));
  let left = 81;
  for (let k = 0; k < order.length; k++) {
    if (left <= target) break;
    const i = order[k];
    const saved = b[i];
    b[i] = 0;
    if (countSolutions(b, 2) === 1) {
      left--;
    } else {
      b[i] = saved;
    }
  }
  return b;
}

function buildCells() {
  board.innerHTML = "";
  cells = [];
  for (let i = 0; i < 81; i++) {
    const div = document.createElement("div");
    const r = Math.floor(i / 9);
    const c = i % 9;
    div.className = "cell";
    if (c % 3 === 2) div.classList.add("br");
    if (r % 3 === 2) div.classList.add("bb");
    if (c === 8) div.classList.add("c8");
    if (r === 8) div.classList.add("r8");
    div.dataset.i = String(i);
    board.appendChild(div);
    cells.push(div);
  }
}

function buildPad() {
  digitsBar.innerHTML = "";
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pnum";
    btn.dataset.n = String(n);
    btn.innerHTML = n + "<i></i>";
    btn.addEventListener("click", function (e) {
      e.currentTarget.blur();
      place(Number(btn.dataset.n));
    });
    digitsBar.appendChild(btn);
  }
}

function newGame(d) {
  diff = d;
  localStorage.setItem("yoyosudokudiff", diff);
  solution = generateSolution();
  puzzle = makePuzzle(solution, GIVENS[diff]);
  grid = puzzle.slice();
  given = puzzle.map(function (v) { return v !== 0; });
  marks = new Array(81).fill(0);
  mistakes = 0;
  hints = 0;
  seconds = 0;
  history = [];
  notesOn = false;
  won = false;
  playing = true;
  btnNotes.classList.remove("on");
  btnNotes.textContent = "notes off";
  sel = grid.findIndex(function (v) { return v === 0; });
  if (sel < 0) sel = 0;
  closeMenu();
  diffLine.textContent = diff;
  topStatus.textContent = "classic · 9x9";
  render();
}

function sameBox(i, j) {
  return Math.floor(i / 27) === Math.floor(j / 27) && Math.floor((i % 9) / 3) === Math.floor((j % 9) / 3);
}

function isPeer(i, j) {
  if (i === j) return false;
  return Math.floor(i / 9) === Math.floor(j / 9) || i % 9 === j % 9 || sameBox(i, j);
}

function render() {
  const sv = grid[sel];
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const cls = ["cell"];
    const r = Math.floor(i / 9);
    const c = i % 9;
    if (c % 3 === 2) cls.push("br");
    if (r % 3 === 2) cls.push("bb");
    if (c === 8) cls.push("c8");
    if (r === 8) cls.push("r8");

    if (given[i]) {
      cls.push("given");
    } else if (grid[i]) {
      cls.push("val");
      if (grid[i] !== solution[i]) cls.push("wrong");
    }
    if (sv && grid[i] === sv && i !== sel) cls.push("same");
    if (isPeer(sel, i)) cls.push("peer");
    if (i === sel) cls.push("sel");

    cell.className = cls.join(" ");

    if (grid[i]) {
      cell.textContent = String(grid[i]);
    } else if (marks[i]) {
      let html = '<div class="notes">';
      for (let n = 1; n <= 9; n++) {
        html += "<span>" + (marks[i] & (1 << (n - 1)) ? n : "") + "</span>";
      }
      html += "</div>";
      cell.innerHTML = html;
    } else {
      cell.textContent = "";
    }
  }
  updatePad();
  updateHud();
}

function updatePad() {
  const btns = digitsBar.querySelectorAll(".pnum");
  btns.forEach(function (btn) {
    const n = Number(btn.dataset.n);
    let used = 0;
    for (let i = 0; i < 81; i++) {
      if (grid[i] === n) used++;
    }
    const rest = 9 - used;
    btn.querySelector("i").textContent = String(rest);
    btn.classList.toggle("off", rest === 0);
  });
}

function updateHud() {
  timeEl.textContent = fmtTime(seconds);
  let empty = 0;
  for (let i = 0; i < 81; i++) {
    if (!grid[i]) empty++;
  }
  leftEl.textContent = String(empty);
  let line = mistakes + (mistakes === 1 ? " mistake" : " mistakes");
  if (hints) line += " · " + hints + (hints === 1 ? " hint" : " hints");
  subLine.textContent = line;
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
}

function snapshot(i) {
  history.push({ i: i, v: grid[i], m: marks[i], bad: mistakes });
  if (history.length > 200) history.shift();
}

function clearPeerMarks(i, n) {
  for (let j = 0; j < 81; j++) {
    if (isPeer(i, j)) marks[j] &= ~(1 << (n - 1));
  }
}

function place(n) {
  if (!playing || won || menuOpen) return;
  if (given[sel]) return;
  if (notesOn && !grid[sel]) {
    snapshot(sel);
    marks[sel] ^= 1 << (n - 1);
    render();
    return;
  }
  if (grid[sel] === n) return;
  snapshot(sel);
  grid[sel] = n;
  marks[sel] = 0;
  if (n !== solution[sel]) {
    mistakes++;
  } else {
    clearPeerMarks(sel, n);
  }
  render();
  checkWin();
}

function erase() {
  if (!playing || won || menuOpen) return;
  if (given[sel]) return;
  if (!grid[sel] && !marks[sel]) return;
  snapshot(sel);
  grid[sel] = 0;
  marks[sel] = 0;
  render();
}

function undo() {
  if (!playing || won || menuOpen) return;
  const h = history.pop();
  if (!h) return;
  grid[h.i] = h.v;
  marks[h.i] = h.m;
  mistakes = h.bad;
  sel = h.i;
  render();
}

function useHint() {
  if (!playing || won || menuOpen) return;
  let i = sel;
  if (grid[i] === solution[i]) {
    i = -1;
    for (let k = 0; k < 81; k++) {
      if (grid[k] !== solution[k]) {
        i = k;
        break;
      }
    }
  }
  if (i < 0) return;
  snapshot(i);
  grid[i] = solution[i];
  marks[i] = 0;
  hints++;
  clearPeerMarks(i, solution[i]);
  sel = i;
  render();
  checkWin();
}

function checkWin() {
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== solution[i]) return;
  }
  won = true;
  playing = false;
  diffLine.textContent = "solved";
  topStatus.textContent = "puzzle complete";
  render();
  setMenu("Solved", "time " + fmtTime(seconds) + " · " + mistakes + " mistakes · " + hints + " hints", [
    { label: "Play again", action: function () { newGame(diff); } },
    { label: "Change difficulty", action: diffMenu },
    { label: "Back to home", action: goHome }
  ], "↑↓ move · enter select · esc main menu", false, mainMenu);
}

function selectCell(i) {
  if (i < 0 || i > 80) return;
  sel = i;
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

function moveCursor(step) {
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
  setMenu("Sudoku", "classic · 9x9 · difficulty " + diff, [
    { label: "Play", action: function () { newGame(diff); } },
    { label: "Change difficulty", action: diffMenu },
    { label: "Back to home", action: goHome }
  ], "↑↓ move · enter select · esc exit", false, goHome);
}

function diffMenu() {
  setMenu("Difficulty", "pick a level · game starts right away", [
    { label: "Easy · 44 clues", action: function () { newGame("easy"); } },
    { label: "Normal · 36 clues", action: function () { newGame("normal"); } },
    { label: "Hard · 28 clues", action: function () { newGame("hard"); } },
    { label: "Evil · 23 clues", action: function () { newGame("evil"); } },
    { label: "Back", action: mainMenu }
  ], "↑↓ move · enter select · esc back", true, mainMenu);
}

function pauseMenu() {
  setMenu("Paused", "difficulty " + diff + " · " + fmtTime(seconds) + " · " + mistakes + " mistakes", [
    { label: "Resume", action: closeMenu },
    { label: "New game", action: function () { newGame(diff); } },
    { label: "Main menu", action: mainMenu },
    { label: "Back to home", action: goHome }
  ], "↑↓ move · enter select · esc resume", true, null);
}

function toggleNotes() {
  notesOn = !notesOn;
  btnNotes.classList.toggle("on", notesOn);
  btnNotes.textContent = notesOn ? "notes on" : "notes off";
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    e.preventDefault();
    return;
  }

  if (menuOpen) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveCursor(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveCursor(1);
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

  const step = MOVES[e.key];
  if (step !== undefined) {
    e.preventDefault();
    const next = sel + step;
    if (step === -1 && sel % 9 === 0) return;
    if (step === 1 && sel % 9 === 8) return;
    if (next < 0 || next > 80) return;
    selectCell(next);
    return;
  }

  if (/^[1-9]$/.test(e.key)) {
    e.preventDefault();
    place(Number(e.key));
    return;
  }

  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
    e.preventDefault();
    erase();
    return;
  }

  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    toggleNotes();
    return;
  }

  if (e.key === "z" || e.key === "Z") {
    e.preventDefault();
    undo();
    return;
  }
});

board.addEventListener("click", function (e) {
  const cell = e.target.closest(".cell");
  if (!cell || menuOpen) return;
  selectCell(Number(cell.dataset.i));
});

btnMenu.addEventListener("click", function (e) {
  e.currentTarget.blur();
  if (menuOpen) return;
  if (playing) pauseMenu();
  else mainMenu();
});

btnErase.addEventListener("click", function (e) {
  e.currentTarget.blur();
  erase();
});

btnNotes.addEventListener("click", function (e) {
  e.currentTarget.blur();
  if (!playing || menuOpen) return;
  toggleNotes();
});

btnUndo.addEventListener("click", function (e) {
  e.currentTarget.blur();
  undo();
});

btnHint.addEventListener("click", function (e) {
  e.currentTarget.blur();
  useHint();
});

setInterval(function () {
  if (playing && !won && !menuOpen) {
    seconds++;
    updateHud();
  }
}, 1000);

buildCells();
buildPad();
render();
mainMenu();
