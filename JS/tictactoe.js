const cells = Array.prototype.slice.call(document.querySelectorAll(".cell"));
const lineEl = document.getElementById("line");
const xScoreEl = document.getElementById("xScore");
const oScoreEl = document.getElementById("oScore");
const turnLineEl = document.getElementById("turnLine");
const subLineEl = document.getElementById("subLine");
const topStatus = document.getElementById("topStatus");
const btnMenu = document.getElementById("btnMenu");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovDesc = document.getElementById("ovDesc");
const ovCode = document.getElementById("ovCode");
const ovList = document.getElementById("ovList");
const ovHint = document.getElementById("ovHint");

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

let board = ["", "", "", "", "", "", "", "", ""];
let turn = "x";
let mode = "ai";
let diff = "normal";
let role = "host";
let playing = false;
let roundOver = false;
let lastResult = null;
let cursor = 4;
let roundNo = 0;
let scoreX = 0;
let scoreO = 0;
let scoreD = 0;
let menuOpen = false;
let closable = false;
let escAction = null;
let items = [];
let itemIndex = 0;
let joinMode = false;
let joinCode = "";
let aiTimer = null;
let nextTimer = null;
let peer = null;
let conn = null;
let netGen = 0;

function emptyBoard() {
  return ["", "", "", "", "", "", "", "", ""];
}

function emptyCells(b) {
  const spots = [];
  for (let i = 0; i < b.length; i++) {
    if (!b[i]) spots.push(i);
  }
  return spots;
}

function evaluate(b) {
  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i];
    if (b[line[0]] && b[line[0]] === b[line[1]] && b[line[0]] === b[line[2]]) {
      return { w: b[line[0]], line: line };
    }
  }
  if (!emptyCells(b).length) {
    return { w: "draw", line: null };
  }
  return null;
}

function minimax(b, side, ai, depth) {
  const res = evaluate(b);
  if (res) {
    if (res.w === "draw") return 0;
    return res.w === ai ? 10 - depth : depth - 10;
  }
  const spots = emptyCells(b);
  let best = side === ai ? -Infinity : Infinity;
  for (let i = 0; i < spots.length; i++) {
    b[spots[i]] = side;
    const score = minimax(b, side === "x" ? "o" : "x", ai, depth + 1);
    b[spots[i]] = "";
    best = side === ai ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function bestMove(b) {
  const spots = emptyCells(b);
  let move = spots[0];
  let bestScore = -Infinity;
  for (let i = 0; i < spots.length; i++) {
    const at = spots[i];
    b[at] = "o";
    const score = minimax(b, "x", "o", 1);
    b[at] = "";
    if (score > bestScore) {
      bestScore = score;
      move = at;
    }
  }
  return move;
}

function aiPick() {
  const spots = emptyCells(board);
  const roll = Math.random();
  if (diff === "easy" && roll < 0.85) return spots[Math.floor(Math.random() * spots.length)];
  if (diff === "normal" && roll < 0.5) return spots[Math.floor(Math.random() * spots.length)];
  return bestMove(board);
}

function myMark() {
  if (mode === "ai") return "x";
  if (mode === "online") return role === "host" ? "x" : "o";
  return turn;
}

function clearTimers() {
  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }
  if (nextTimer) {
    clearTimeout(nextTimer);
    nextTimer = null;
  }
}

function showLine(line) {
  const a = cells[line[0]];
  const b = cells[line[2]];
  const x1 = a.offsetLeft + a.offsetWidth / 2;
  const y1 = a.offsetTop + a.offsetHeight / 2;
  const x2 = b.offsetLeft + b.offsetWidth / 2;
  const y2 = b.offsetTop + b.offsetHeight / 2;
  const len = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  lineEl.classList.remove("show");
  lineEl.style.width = "0px";
  lineEl.style.left = x1 + "px";
  lineEl.style.top = y1 - 4 + "px";
  lineEl.style.transform = "rotate(" + angle + "deg)";
  lineEl.classList.add("show");
  void lineEl.offsetWidth;
  lineEl.style.width = len + "px";
}

function hideLine() {
  lineEl.classList.remove("show");
  lineEl.style.width = "0px";
}

function render() {
  for (let i = 0; i < 9; i++) {
    const v = board[i];
    cells[i].innerHTML = v ? '<span class="mk ' + v + '">' + v.toUpperCase() + "</span>" : "";
    cells[i].classList.toggle("cursor", i === cursor && !menuOpen);
    cells[i].classList.toggle("win", !!(roundOver && lastResult && lastResult.line && lastResult.line.indexOf(i) >= 0));
  }
  xScoreEl.textContent = scoreX;
  oScoreEl.textContent = scoreO;
  if (!playing) {
    turnLineEl.textContent = "pick a mode";
    subLineEl.textContent = "x goes first";
    return;
  }
  if (roundOver && lastResult) {
    turnLineEl.textContent = lastResult.w === "draw" ? "draw" : lastResult.w + " wins the round";
  } else {
    turnLineEl.textContent = turn + " to move";
  }
  subLineEl.textContent = "round " + Math.max(roundNo, 1) + " · draws " + scoreD;
}

function setStatus() {
  if (mode === "ai") {
    topStatus.textContent = "vs computer · " + diff;
  } else if (mode === "local") {
    topStatus.textContent = "local · two players";
  } else {
    topStatus.textContent = role === "host" ? "online · you are x" : "online · you are o";
  }
}

function setMenu(title, desc, list, hint, canClose, onEsc) {
  items = list;
  itemIndex = 0;
  closable = !!canClose;
  escAction = onEsc || null;
  menuOpen = true;
  joinMode = false;
  ovTitle.textContent = title;
  ovDesc.textContent = desc || "";
  ovHint.textContent = hint || "up down move · enter choose";
  ovCode.classList.add("hidden");
  overlay.classList.remove("hidden");
  renderList();
}

function renderList() {
  ovList.innerHTML = "";
  items.forEach(function (item, i) {
    const li = document.createElement("li");
    li.textContent = item.label;
    if (i === itemIndex) li.className = "on";
    li.addEventListener("click", function () {
      itemIndex = i;
      renderList();
      pick();
    });
    ovList.appendChild(li);
  });
}

function moveCursor(step) {
  if (!items.length) return;
  itemIndex = (itemIndex + step + items.length) % items.length;
  renderList();
}

function pick() {
  const item = items[itemIndex];
  if (item && item.onSelect) item.onSelect();
}

function closeMenu() {
  overlay.classList.add("hidden");
  menuOpen = false;
  joinMode = false;
  render();
}

function goHome() {
  location.href = "../index.html";
}

function mainMenu() {
  teardownNet();
  clearTimers();
  playing = false;
  mode = "ai";
  roundOver = false;
  lastResult = null;
  scoreX = 0;
  scoreO = 0;
  scoreD = 0;
  roundNo = 0;
  board = emptyBoard();
  turn = "x";
  cursor = 4;
  hideLine();
  render();
  topStatus.textContent = "choose a mode";
  setMenu(
    "tic tac toe",
    "pick a game mode",
    [
      { label: "vs computer", onSelect: diffMenu },
      { label: "local multiplayer", onSelect: function () { startMatch("local"); } },
      { label: "online · peerjs", onSelect: onlineMenu },
      { label: "back to home", onSelect: goHome }
    ],
    "up down move · enter choose · esc quits",
    false,
    null
  );
}

function diffMenu() {
  setMenu(
    "vs computer",
    "choose the computer level",
    [
      { label: "easy", onSelect: function () { startMatch("ai", "easy"); } },
      { label: "normal", onSelect: function () { startMatch("ai", "normal"); } },
      { label: "hard", onSelect: function () { startMatch("ai", "hard"); } },
      { label: "back", onSelect: mainMenu }
    ],
    "up down move · enter choose · esc back",
    false,
    mainMenu
  );
}

function onlineMenu() {
  teardownNet();
  setMenu(
    "online",
    "play over the internet with peerjs",
    [
      { label: "host game", onSelect: hostGame },
      { label: "join game", onSelect: joinMenu },
      { label: "back", onSelect: mainMenu }
    ],
    "up down move · enter choose · esc back",
    false,
    mainMenu
  );
}

function pauseMenu() {
  setMenu(
    "menu",
    topStatus.textContent + " · " + scoreX + " — " + scoreO,
    [
      { label: "resume", onSelect: closeMenu },
      { label: "restart match", onSelect: function () { startMatch(mode, diff); } },
      { label: "main menu", onSelect: mainMenu },
      { label: "back to home", onSelect: goHome }
    ],
    "up down move · enter choose · esc resume",
    true,
    null
  );
}

function startMatch(m, d) {
  mode = m;
  diff = d || "normal";
  scoreX = 0;
  scoreO = 0;
  scoreD = 0;
  roundNo = 0;
  playing = true;
  closeMenu();
  setStatus();
  startRound();
}

function startRound() {
  clearTimers();
  board = emptyBoard();
  turn = "x";
  roundOver = false;
  lastResult = null;
  roundNo++;
  cursor = 4;
  hideLine();
  render();
  broadcast();
}

function applyMove(at) {
  board[at] = turn;
  const res = evaluate(board);
  if (res) {
    finishRound(res);
    return;
  }
  turn = turn === "x" ? "o" : "x";
  render();
  broadcast();
  if (mode === "ai" && turn === "o") scheduleAi();
}

function finishRound(res) {
  roundOver = true;
  lastResult = res;
  if (res.w === "x") scoreX++;
  else if (res.w === "o") scoreO++;
  else scoreD++;
  if (res.line) showLine(res.line);
  render();
  broadcast();
  nextTimer = setTimeout(function () {
    nextTimer = null;
    if (playing) startRound();
  }, 1500);
}

function scheduleAi() {
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = setTimeout(function () {
    aiTimer = null;
    if (menuOpen) {
      scheduleAi();
      return;
    }
    if (roundOver || !playing || turn !== "o") return;
    applyMove(aiPick());
  }, 420);
}

function place(at) {
  if (!playing || menuOpen || roundOver) return;
  if (at < 0 || at > 8 || board[at]) return;
  if (mode === "local") {
    applyMove(at);
    return;
  }
  if (turn !== myMark()) return;
  if (mode === "online" && role === "guest") {
    if (conn && conn.open) conn.send({ k: "m", i: at });
    return;
  }
  applyMove(at);
}

function moveGrid(key) {
  const row = Math.floor(cursor / 3);
  const col = cursor % 3;
  let next = cursor;
  if (key === "ArrowUp" && row > 0) next = cursor - 3;
  if (key === "ArrowDown" && row < 2) next = cursor + 3;
  if (key === "ArrowLeft" && col > 0) next = cursor - 1;
  if (key === "ArrowRight" && col < 2) next = cursor + 1;
  if (next !== cursor) {
    cursor = next;
    render();
  }
}

function snapshot() {
  return {
    k: "b",
    b: board.slice(),
    t: turn,
    over: roundOver,
    res: lastResult ? lastResult.w : "",
    line: lastResult && lastResult.line ? lastResult.line : null,
    sc: [scoreX, scoreO, scoreD],
    rnd: roundNo
  };
}

function broadcast() {
  if (mode === "online" && role === "host" && conn && conn.open) {
    conn.send(snapshot());
  }
}

function applySnap(data) {
  board = data.b.slice();
  turn = data.t;
  roundOver = !!data.over;
  lastResult = data.res ? { w: data.res, line: data.line } : null;
  scoreX = data.sc[0];
  scoreO = data.sc[1];
  scoreD = data.sc[2];
  roundNo = data.rnd;
  hideLine();
  render();
  if (roundOver && lastResult && lastResult.line) showLine(lastResult.line);
}

function teardownNet() {
  netGen++;
  if (conn) {
    try {
      conn.close();
    } catch (err) {}
    conn = null;
  }
  if (peer) {
    try {
      peer.destroy();
    } catch (err) {}
    peer = null;
  }
}

function onDisconnect() {
  teardownNet();
  clearTimers();
  playing = false;
  setMenu(
    "connection lost",
    "the other player left the game",
    [
      { label: "main menu", onSelect: mainMenu },
      { label: "back to home", onSelect: goHome }
    ],
    "enter to choose",
    false,
    mainMenu
  );
}

function wireHost() {
  const gen = netGen;
  conn.on("open", function () {
    if (gen !== netGen) return;
    role = "host";
    mode = "online";
    startMatch("online");
  });
  conn.on("data", function (data) {
    if (gen !== netGen) return;
    if (data.k === "m" && !roundOver && turn === "o" && !board[data.i]) {
      applyMove(data.i);
    }
  });
  conn.on("close", function () {
    if (gen !== netGen) return;
    onDisconnect();
  });
  conn.on("error", function () {
    if (gen !== netGen) return;
    onDisconnect();
  });
}

function wireGuest() {
  const gen = netGen;
  conn.on("open", function () {
    if (gen !== netGen) return;
    role = "guest";
    mode = "online";
    startMatch("online");
  });
  conn.on("data", function (data) {
    if (gen !== netGen) return;
    if (data.k === "b") applySnap(data);
  });
  conn.on("close", function () {
    if (gen !== netGen) return;
    onDisconnect();
  });
  conn.on("error", function () {
    if (gen !== netGen) return;
    onDisconnect();
  });
}

function hostGame(attempt) {
  if (typeof Peer === "undefined") {
    setMenu(
      "online",
      "peerjs did not load, check your internet",
      [{ label: "back", onSelect: onlineMenu }],
      "enter to choose",
      false,
      onlineMenu
    );
    return;
  }
  teardownNet();
  const gen = netGen;
  const tries = attempt || 0;
  const code = String(Math.floor(1000 + Math.random() * 9000));
  peer = new Peer("yoyotictactoe" + code);
  peer.on("open", function () {
    if (gen !== netGen) return;
    setMenu(
      "hosting",
      "share this code with your friend",
      [
        {
          label: "cancel",
          onSelect: function () {
            teardownNet();
            onlineMenu();
          }
        }
      ],
      "waiting for player · esc cancels",
      false,
      function () {
        teardownNet();
        onlineMenu();
      }
    );
    ovCode.textContent = code;
    ovCode.classList.remove("hidden");
    topStatus.textContent = "waiting · code " + code;
  });
  peer.on("connection", function (c) {
    if (gen !== netGen || conn) {
      c.close();
      return;
    }
    conn = c;
    wireHost();
  });
  peer.on("error", function (err) {
    if (gen !== netGen) return;
    const type = err && err.type ? err.type : "error";
    if (type === "unavailable-id" && tries < 3) {
      hostGame(tries + 1);
      return;
    }
    setMenu(
      "online",
      "could not host · " + type,
      [
        { label: "try again", onSelect: function () { hostGame(0); } },
        { label: "back", onSelect: onlineMenu }
      ],
      "enter to choose",
      false,
      onlineMenu
    );
  });
}

function renderCode() {
  ovCode.textContent = joinCode.length ? joinCode.split("").join(" ") : "_ _ _ _";
  ovCode.classList.remove("hidden");
}

function joinMenu() {
  teardownNet();
  joinCode = "";
  setMenu(
    "join game",
    "type the 4 digit code from the host",
    [
      { label: "connect", onSelect: doJoin },
      { label: "back", onSelect: onlineMenu }
    ],
    "0-9 type · backspace delete · enter connect",
    false,
    onlineMenu
  );
  joinMode = true;
  renderCode();
}

function doJoin() {
  if (joinCode.length !== 4) {
    ovDesc.textContent = "enter all 4 digits first";
    return;
  }
  if (typeof Peer === "undefined") {
    ovDesc.textContent = "peerjs did not load, check your internet";
    return;
  }
  teardownNet();
  const gen = netGen;
  const code = joinCode;
  joinMode = false;
  peer = new Peer();
  setMenu("connecting", "looking for code " + code, [{ label: "cancel", onSelect: onlineMenu }], "", false, onlineMenu);
  joinCode = code;
  peer.on("open", function () {
    if (gen !== netGen) return;
    conn = peer.connect("yoyotictactoe" + code, { reliable: true });
    wireGuest();
  });
  peer.on("error", function () {
    if (gen !== netGen) return;
    teardownNet();
    setMenu(
      "online",
      "could not find that code",
      [
        { label: "try again", onSelect: joinMenu },
        { label: "back", onSelect: onlineMenu }
      ],
      "enter to choose",
      false,
      onlineMenu
    );
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    e.preventDefault();
    return;
  }

  if (joinMode) {
    if (e.key.length === 1 && e.key >= "0" && e.key <= "9") {
      if (joinCode.length < 4) joinCode += e.key;
      renderCode();
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace") {
      joinCode = joinCode.slice(0, -1);
      renderCode();
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      doJoin();
      return;
    }
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
      pick();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (closable) closeMenu();
      else if (escAction) escAction();
      else goHome();
    }
    return;
  }

  if (e.key.indexOf("Arrow") === 0) {
    e.preventDefault();
    moveGrid(e.key);
    return;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    place(cursor);
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    if (playing) pauseMenu();
    else mainMenu();
  }
});

cells.forEach(function (cell, i) {
  cell.addEventListener("pointerenter", function () {
    if (menuOpen) return;
    cursor = i;
    render();
  });
  cell.addEventListener("click", function () {
    if (menuOpen || !playing) return;
    cursor = i;
    render();
    place(i);
  });
});

btnMenu.addEventListener("click", function () {
  btnMenu.blur();
  if (menuOpen) {
    if (closable) closeMenu();
    return;
  }
  if (playing) pauseMenu();
  else mainMenu();
});

render();
mainMenu();
