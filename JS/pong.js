const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const court = document.getElementById("court");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovDesc = document.getElementById("ovDesc");
const ovCode = document.getElementById("ovCode");
const ovList = document.getElementById("ovList");
const ovHint = document.getElementById("ovHint");
const topStatus = document.getElementById("topStatus");
const btnMenu = document.getElementById("btnMenu");
const hintLeft = document.getElementById("hintLeft");
const hintRight = document.getElementById("hintRight");

const W = 800;
const H = 480;
const PW = 12;
const PH = 88;
const PX = 28;
const BS = 12;
const WIN = 11;
const SPEED = 430;
const DIFFS = {
  easy: { speed: 300, err: 70 },
  normal: { speed: 420, err: 34 },
  hard: { speed: 560, err: 12 }
};

let state = "menu";
let mode = "ai";
let diff = "normal";
let role = "host";
let menuOpen = true;
let closable = false;
let escAction = null;
let items = [];
let itemIndex = 0;
let joinMode = false;
let joinCode = "";
let scoreL = 0;
let scoreR = 0;
let leftY = H / 2;
let rightY = H / 2;
let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: 380 };
let serveDir = 1;
let serveTimer = 1.2;
let aiErr = 0;
let keys = {};
let mouse = { on: false, y: H / 2 };
let peer = null;
let conn = null;
let lastTime = 0;
let lastSent = 0;
let overShown = false;
let joinTimer = null;
let netGen = 0;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clampPaddle(y) {
  return clamp(y, PH / 2, H - PH / 2);
}

function toCourtY(e) {
  const rect = canvas.getBoundingClientRect();
  return ((e.clientY - rect.top) / rect.height) * H;
}

function resetRally(dir) {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.speed = 380;
  const a = Math.random() * 0.5 - 0.25;
  ball.vx = Math.cos(a) * ball.speed * dir;
  ball.vy = Math.sin(a) * ball.speed;
}

function launch() {
  resetRally(serveDir);
  state = "play";
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
  keys = {};
  renderList();
}

function renderList() {
  ovList.innerHTML = "";
  items.forEach(function (item, i) {
    const li = document.createElement("li");
    li.textContent = item.label;
    if (i === itemIndex) {
      li.className = "on";
    }
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
  if (item && item.onSelect) {
    item.onSelect();
  }
}

function closeMenu() {
  overlay.classList.add("hidden");
  menuOpen = false;
  joinMode = false;
  keys = {};
  mouse.on = false;
}

function goIndex() {
  location.href = "../index.html";
}

function setStatus() {
  if (mode === "ai") {
    topStatus.textContent = "1 player · vs ai · " + diff;
    hintLeft.textContent = "you — w/s, arrows or mouse";
    hintRight.textContent = "ai — " + diff;
  } else if (mode === "local") {
    topStatus.textContent = "2 players · same keyboard";
    hintLeft.textContent = "p1 — w / s";
    hintRight.textContent = "p2 — up / down";
  } else {
    topStatus.textContent = role === "host" ? "online · you are left" : "online · you are right";
    hintLeft.textContent = "w/s, arrows or mouse";
    hintRight.textContent = "first to " + WIN;
  }
}

function mainMenu() {
  teardownNet();
  state = "menu";
  mode = "ai";
  scoreL = 0;
  scoreR = 0;
  leftY = H / 2;
  rightY = H / 2;
  overShown = false;
  resetRally(Math.random() < 0.5 ? -1 : 1);
  topStatus.textContent = "choose a mode";
  hintLeft.textContent = "w / s — left paddle";
  hintRight.textContent = "up / down — right paddle";
  setMenu(
    "PING PONG",
    "pick a game mode",
    [
      { label: "1 player  ·  vs ai", onSelect: diffMenu },
      { label: "2 players  ·  local", onSelect: function () { startMatch("local"); } },
      { label: "online  ·  peerjs", onSelect: onlineMenu },
      { label: "back to home", onSelect: goIndex }
    ],
    "up down move · enter choose · esc quits",
    false,
    null
  );
}

function diffMenu() {
  setMenu(
    "1 PLAYER",
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
    "ONLINE",
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

function startMatch(m, d) {
  mode = m;
  diff = d || "normal";
  role = m === "online" ? role : "host";
  scoreL = 0;
  scoreR = 0;
  leftY = H / 2;
  rightY = H / 2;
  serveDir = Math.random() < 0.5 ? -1 : 1;
  serveTimer = 1.2;
  aiErr = 0;
  ball.x = W / 2;
  ball.y = H / 2;
  ball.vx = 0;
  ball.vy = 0;
  state = "serve";
  overShown = false;
  closeMenu();
  setStatus();
}

function pauseMenu() {
  if (state !== "play" && state !== "serve") return;
  setMenu(
    "PAUSED",
    scoreL + " — " + scoreR,
    [
      { label: "resume", onSelect: closeMenu },
      { label: "restart", onSelect: function () { startMatch(mode, diff); } },
      { label: "main menu", onSelect: mainMenu },
      { label: "back to home", onSelect: goIndex }
    ],
    "up down move · enter choose · esc resume",
    true
  );
}

function winnerName(side) {
  if (mode === "local") return side === "left" ? "player 1" : "player 2";
  if (mode === "ai") return side === "left" ? "you" : "the computer";
  const mine = role === "host" ? "left" : "right";
  return side === mine ? "you" : "opponent";
}

function showOver() {
  const side = scoreL > scoreR ? "left" : "right";
  const name = winnerName(side);
  const title = name === "you" ? "you win" : name + " wins";
  const its = [
    { label: "play again", onSelect: again },
    { label: "main menu", onSelect: mainMenu },
    { label: "back to home", onSelect: goIndex }
  ];
  setMenu(title, scoreL + " — " + scoreR, its, "enter to choose", false, mainMenu);
  if (mode === "online" && role === "guest") {
    overShown = true;
  }
}

function again() {
  if (mode === "online" && role === "guest") {
    if (conn && conn.open) {
      conn.send({ k: "again" });
      ovDesc.textContent = "waiting for the host ...";
    }
    return;
  }
  resetMatch();
}

function resetMatch() {
  scoreL = 0;
  scoreR = 0;
  leftY = H / 2;
  rightY = H / 2;
  serveDir = Math.random() < 0.5 ? -1 : 1;
  serveTimer = 1.2;
  aiErr = 0;
  ball.x = W / 2;
  ball.y = H / 2;
  ball.vx = 0;
  ball.vy = 0;
  state = "serve";
  overShown = false;
  closeMenu();
}

function point(scorer) {
  if (scorer === "left") {
    scoreL++;
  } else {
    scoreR++;
  }
  if (scoreL >= WIN || scoreR >= WIN) {
    ball.vx = 0;
    ball.vy = 0;
    state = "over";
    showOver();
    return;
  }
  serveDir = scorer === "left" ? 1 : -1;
  state = "serve";
  serveTimer = 1.1;
  ball.x = W / 2;
  ball.y = H / 2;
  ball.vx = 0;
  ball.vy = 0;
  aiErr = (Math.random() * 2 - 1) * DIFFS[diff].err;
}

function bounce(paddleY, dir) {
  const rel = clamp((ball.y - paddleY) / (PH / 2), -1, 1);
  const a = rel * 1;
  ball.speed = Math.min(ball.speed + 24, 760);
  ball.vx = Math.cos(a) * ball.speed * dir;
  ball.vy = Math.sin(a) * ball.speed;
}

function stepBall(h, attract) {
  ball.x += ball.vx * h;
  ball.y += ball.vy * h;

  if (ball.y < BS / 2 && ball.vy < 0) {
    ball.y = BS / 2;
    ball.vy = -ball.vy;
  }
  if (ball.y > H - BS / 2 && ball.vy > 0) {
    ball.y = H - BS / 2;
    ball.vy = -ball.vy;
  }

  if (ball.vx < 0 && ball.x - BS / 2 <= PX + PW && ball.x + BS / 2 >= PX) {
    if (ball.y + BS / 2 >= leftY - PH / 2 && ball.y - BS / 2 <= leftY + PH / 2) {
      ball.x = PX + PW + BS / 2;
      bounce(leftY, 1);
    }
  }
  if (ball.vx > 0 && ball.x + BS / 2 >= W - PX - PW && ball.x - BS / 2 <= W - PX) {
    if (ball.y + BS / 2 >= rightY - PH / 2 && ball.y - BS / 2 <= rightY + PH / 2) {
      ball.x = W - PX - PW - BS / 2;
      bounce(rightY, -1);
    }
  }

  if (ball.x < -BS) {
    if (attract) {
      resetRally(1);
    } else if (state === "play") {
      point("right");
    }
  } else if (ball.x > W + BS) {
    if (attract) {
      resetRally(-1);
    } else if (state === "play") {
      point("left");
    }
  }
}

function moveBall(dt, attract) {
  const maxStep = Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) * dt;
  let steps = Math.max(1, Math.ceil(maxStep / 6));
  if (steps > 12) steps = 12;
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    if (!attract && state !== "play") break;
    stepBall(h, attract);
  }
}

function keyDir() {
  let d = 0;
  if (keys.ArrowUp || keys.w || keys.W) d -= 1;
  if (keys.ArrowDown || keys.s || keys.S) d += 1;
  return d;
}

function localDir(leftSide) {
  let d = 0;
  if (leftSide) {
    if (keys.w || keys.W) d -= 1;
    if (keys.s || keys.S) d += 1;
  } else {
    if (keys.ArrowUp) d -= 1;
    if (keys.ArrowDown) d += 1;
  }
  return d;
}

function mySide() {
  if (mode === "local") return null;
  if (mode === "online") return role === "host" ? "left" : "right";
  return "left";
}

function updatePaddles(dt) {
  if (mode === "local") {
    leftY = clampPaddle(leftY + localDir(true) * SPEED * dt);
    rightY = clampPaddle(rightY + localDir(false) * SPEED * dt);
    return;
  }
  const mine = mySide();
  const d = keyDir();
  if (mine === "left") {
    leftY = mouse.on ? clampPaddle(mouse.y) : clampPaddle(leftY + d * SPEED * dt);
  } else {
    rightY = mouse.on ? clampPaddle(mouse.y) : clampPaddle(rightY + d * SPEED * dt);
  }
}

function aiUpdate(dt) {
  const d = DIFFS[diff];
  let target = H / 2;
  if (ball.vx > 0) {
    target = ball.y + aiErr;
  } else {
    target = H / 2 + aiErr * 0.5;
  }
  const dy = clampPaddle(target) - rightY;
  const step = clamp(dy, -d.speed * dt, d.speed * dt);
  rightY = clampPaddle(rightY + step);
}

function attract(dt) {
  const slow = 260 * dt;
  leftY = clampPaddle(leftY + clamp(ball.y - leftY, -slow, slow));
  rightY = clampPaddle(rightY + clamp(ball.y - rightY, -slow, slow));
  moveBall(dt, true);
}

function simulating() {
  return mode !== "online" || role === "host";
}

function update(dt) {
  if (state === "menu") {
    attract(dt);
    return;
  }
  if (menuOpen) return;

  updatePaddles(dt);
  if (mode === "ai") {
    aiUpdate(dt);
  }

  if (simulating()) {
    if (state === "serve") {
      serveTimer -= dt;
      ball.x = W / 2;
      ball.y = H / 2;
      if (serveTimer <= 0) launch();
    } else if (state === "play") {
      moveBall(dt, false);
    }
  }

  if (mode === "online" && conn && conn.open) {
    if (role === "host") {
      conn.send({
        k: "s",
        l: leftY,
        bx: ball.x,
        by: ball.y,
        sl: scoreL,
        sr: scoreR,
        st: state,
        tm: serveTimer
      });
    } else if (Math.abs(rightY - lastSent) > 0.4) {
      lastSent = rightY;
      conn.send({ k: "p", y: rightY });
    }
  }
}

function draw() {
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (let y = 18; y < H - 14; y += 34) {
    ctx.fillRect(W / 2 - 2, y, 4, 18);
  }

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = 'bold 76px "Courier New", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(String(scoreL), W * 0.25, 28);
  ctx.fillText(String(scoreR), W * 0.75, 28);

  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.65)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(PX, leftY - PH / 2, PW, PH);
  ctx.fillRect(W - PX - PW, rightY - PH / 2, PW, PH);
  ctx.fillRect(ball.x - BS / 2, ball.y - BS / 2, BS, BS);
  ctx.restore();
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function teardownNet() {
  netGen++;
  if (joinTimer) {
    clearTimeout(joinTimer);
    joinTimer = null;
  }
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
  if (state === "menu" || !mode) return;
  teardownNet();
  state = "offline";
  setMenu(
    "connection lost",
    "the other player left the game",
    [
      { label: "main menu", onSelect: mainMenu },
      { label: "back to home", onSelect: goIndex }
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
    if (data.k === "p") {
      rightY = clampPaddle(data.y);
    } else if (data.k === "again" && state === "over") {
      resetMatch();
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
    if (joinTimer) {
      clearTimeout(joinTimer);
      joinTimer = null;
    }
    role = "guest";
    mode = "online";
    lastSent = H / 2;
    startMatch("online");
  });
  conn.on("data", function (data) {
    if (gen !== netGen) return;
    if (data.k !== "s") return;
    if (menuOpen && state !== "over") return;
    if (data.st !== "over" && overShown) {
      overShown = false;
      if (menuOpen) closeMenu();
    }
    leftY = data.l;
    ball.x = data.bx;
    ball.y = data.by;
    scoreL = data.sl;
    scoreR = data.sr;
    serveTimer = data.tm;
    const wasOver = state === "over";
    state = data.st;
    if (state === "over" && !wasOver) {
      showOver();
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
  peer = new Peer("yoyopong" + code);
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
    if (gen !== netGen) {
      c.close();
      return;
    }
    if (conn) {
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
  joinMode = true;
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
    conn = peer.connect("yoyopong" + code, { reliable: true });
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
  joinTimer = setTimeout(function () {
    if (gen !== netGen) return;
    if (!conn || !conn.open) {
      teardownNet();
      setMenu(
        "online",
        "nobody answered that code",
        [
          { label: "try again", onSelect: joinMenu },
          { label: "back", onSelect: onlineMenu }
        ],
        "enter to choose",
        false,
        onlineMenu
      );
    }
  }, 9000);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    e.preventDefault();
    return;
  }

  if (joinMode) {
    if (e.key >= "0" && e.key <= "9" && e.key.length === 1) {
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
      else goIndex();
    }
    return;
  }

  keys[e.key] = true;
  if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
    e.preventDefault();
    mouse.on = false;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    pauseMenu();
  }
});

document.addEventListener("keyup", function (e) {
  keys[e.key] = false;
});

window.addEventListener("blur", function () {
  keys = {};
});

court.addEventListener("pointermove", function (e) {
  if (menuOpen || !mySide()) return;
  mouse.y = clampPaddle(toCourtY(e));
  mouse.on = true;
});

court.addEventListener("pointerleave", function () {
  mouse.on = false;
});

court.addEventListener("pointerdown", function (e) {
  if (menuOpen || !mySide()) return;
  mouse.y = clampPaddle(toCourtY(e));
  mouse.on = true;
  if (state === "serve") {
    serveTimer = Math.min(serveTimer, 0.2);
  }
});

btnMenu.addEventListener("click", function () {
  btnMenu.blur();
  if (menuOpen) {
    if (closable) closeMenu();
    return;
  }
  if (state === "play" || state === "serve") pauseMenu();
  else mainMenu();
});

resetRally(1);
requestAnimationFrame(function (now) {
  lastTime = now;
  requestAnimationFrame(loop);
});
mainMenu();
