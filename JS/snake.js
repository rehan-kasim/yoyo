const CELL = 20;
const COLS = 24;
const ROWS = 18;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("scoreEl");
const bestEl = document.getElementById("bestEl");
const turnLine = document.getElementById("turnLine");
const subLine = document.getElementById("subLine");
const topStatus = document.getElementById("topStatus");
const btnMenu = document.getElementById("btnMenu");

const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovDesc = document.getElementById("ovDesc");
const ovList = document.getElementById("ovList");
const ovHint = document.getElementById("ovHint");

const SPEEDS = { slow: 150, normal: 110, fast: 75 };
const DIRS = {
  ArrowUp: { x: 0, y: -1, k: "up" },
  ArrowDown: { x: 0, y: 1, k: "down" },
  ArrowLeft: { x: -1, y: 0, k: "left" },
  ArrowRight: { x: 1, y: 0, k: "right" },
  w: { x: 0, y: -1, k: "up" },
  s: { x: 0, y: 1, k: "down" },
  a: { x: -1, y: 0, k: "left" },
  d: { x: 1, y: 0, k: "right" },
  W: { x: 0, y: -1, k: "up" },
  S: { x: 0, y: 1, k: "down" },
  A: { x: -1, y: 0, k: "left" },
  D: { x: 1, y: 0, k: "right" }
};
const OPP = { up: "down", down: "up", left: "right", right: "left" };

let snake = [];
let dir = { x: 1, y: 0, k: "right" };
let queue = [];
let food = { x: 16, y: 9 };
let score = 0;
let best = Number(localStorage.getItem("yoyosnakebest") || 0);
let speed = localStorage.getItem("yoyosnakespeed") || "normal";
let playing = false;
let dead = false;
let menuOpen = false;
let menuItems = [];
let menuIndex = 0;
let menuClosable = false;
let menuEsc = null;
let acc = 0;
let last = 0;

if (!SPEEDS[speed]) speed = "normal";

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
  setMenu("Snake", "classic · walls kill · speed " + speed, [
    { label: "Play", action: startGame },
    { label: "Change speed", action: speedMenu },
    { label: "Back to home", action: goHome }
  ], "↑↓ move · enter select · esc exit", false, goHome);
}

function speedMenu() {
  setMenu("Speed", "current · " + speed, [
    { label: "Slow", action: function () { setSpeed("slow"); } },
    { label: "Normal", action: function () { setSpeed("normal"); } },
    { label: "Fast", action: function () { setSpeed("fast"); } },
    { label: "Back", action: mainMenu }
  ], "↑↓ move · enter select · esc back", true, mainMenu);
}

function setSpeed(name) {
  speed = name;
  localStorage.setItem("yoyosnakespeed", speed);
  subLine.textContent = "speed " + speed;
  mainMenu();
}

function pauseMenu() {
  setMenu("Paused", "score " + score + " · speed " + speed, [
    { label: "Resume", action: closeMenu },
    { label: "Restart", action: startGame },
    { label: "Main menu", action: mainMenu },
    { label: "Back to home", action: goHome }
  ], "↑↓ move · enter select · esc resume", true, null);
}

function overMenu() {
  setMenu("Game over", "score " + score + " · best " + best, [
    { label: "Play again", action: startGame },
    { label: "Main menu", action: mainMenu },
    { label: "Back to home", action: goHome }
  ], "↑↓ move · enter select · esc main menu", false, mainMenu);
}

function startGame() {
  closeMenu();
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy }
  ];
  dir = { x: 1, y: 0, k: "right" };
  queue = [];
  score = 0;
  dead = false;
  playing = true;
  acc = 0;
  spawnFood();
  updateHud();
  turnLine.textContent = "playing";
  subLine.textContent = "speed " + speed + " · length 3";
  topStatus.textContent = "classic · walls kill";
}

function spawnFood() {
  const free = [];
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      const taken = snake.some(function (s) {
        return s.x === x && s.y === y;
      });
      if (!taken) free.push({ x: x, y: y });
    }
  }
  if (!free.length) {
    gameOver(true);
    return;
  }
  food = free[Math.floor(Math.random() * free.length)];
}

function queueDir(k) {
  const next = DIRS[k];
  if (!next) return;
  const base = queue.length ? queue[queue.length - 1] : dir;
  if (next.k === base.k || next.k === OPP[base.k]) return;
  if (queue.length < 2) queue.push(next);
}

function keyDir(key) {
  return DIRS[key] || null;
}

function tick() {
  if (queue.length) dir = queue.shift();
  const head = snake[0];
  const nx = head.x + dir.x;
  const ny = head.y + dir.y;

  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
    gameOver(false);
    return;
  }

  const hitSelf = snake.some(function (s, i) {
    return i < snake.length - 1 && s.x === nx && s.y === ny;
  });
  if (hitSelf) {
    gameOver(false);
    return;
  }

  snake.unshift({ x: nx, y: ny });

  if (nx === food.x && ny === food.y) {
    score += 10;
    if (score > best) {
      best = score;
      localStorage.setItem("yoyosnakebest", String(best));
    }
    spawnFood();
    updateHud();
    subLine.textContent = "speed " + speed + " · length " + snake.length;
  } else {
    snake.pop();
  }
}

function gameOver(full) {
  playing = false;
  dead = true;
  turnLine.textContent = full ? "you win" : "dead";
  topStatus.textContent = full ? "board cleared" : "game over";
  updateHud();
  if (full) {
    setMenu("You win", "score " + score + " · board cleared", [
      { label: "Play again", action: startGame },
      { label: "Main menu", action: mainMenu },
      { label: "Back to home", action: goHome }
    ], "↑↓ move · enter select · esc main menu", false, mainMenu);
  } else {
    overMenu();
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function loop(now) {
  if (!last) last = now;
  const dt = Math.min(now - last, 120);
  last = now;

  if (playing && !menuOpen) {
    acc += dt;
    while (acc >= SPEEDS[speed]) {
      acc -= SPEEDS[speed];
      tick();
      if (!playing) break;
    }
  }

  draw();
  requestAnimationFrame(loop);
}

function draw() {
  ctx.fillStyle = "#07090a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, canvas.height);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(canvas.width, y * CELL + 0.5);
    ctx.stroke();
  }

  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  ctx.fillStyle = "#ff5147";
  ctx.beginPath();
  ctx.arc(fx, fy, CELL * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.arc(fx - 3, fy - 3, 2, 0, Math.PI * 2);
  ctx.fill();

  snake.forEach(function (s, i) {
    ctx.fillStyle = i === 0 ? "#9dffb0" : dead ? "#1f7d3c" : "#3ad46e";
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });

  if (snake.length) {
    const h = snake[0];
    ctx.fillStyle = "#06120a";
    const cx = h.x * CELL + CELL / 2;
    const cy = h.y * CELL + CELL / 2;
    const ox = dir.x * 4;
    const oy = dir.y * 4;
    ctx.fillRect(cx + ox - 4, cy + oy - 4, 3, 3);
    ctx.fillRect(cx + ox + 1, cy + oy - 4, 3, 3);
  }
}

function onPointer(e) {
  if (!playing || menuOpen) return;
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const h = snake[0];
  const hx = h.x * CELL + CELL / 2;
  const hy = h.y * CELL + CELL / 2;
  const dx = px - hx;
  const dy = py - hy;
  const deadzone = CELL * 1.4;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) >= deadzone) queueDir(dx > 0 ? "ArrowRight" : "ArrowLeft");
  } else if (Math.abs(dy) >= deadzone) {
    queueDir(dy > 0 ? "ArrowDown" : "ArrowUp");
  }
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

  const next = keyDir(e.key);
  if (next) {
    e.preventDefault();
    queueDir(e.key);
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    if (playing) pauseMenu();
    else mainMenu();
  }
});

canvas.addEventListener("pointermove", onPointer);
canvas.addEventListener("pointerdown", onPointer);

btnMenu.addEventListener("click", function (e) {
  e.currentTarget.blur();
  if (menuOpen) return;
  if (playing) pauseMenu();
  else mainMenu();
});

scoreEl.textContent = "0";
bestEl.textContent = String(best);
subLine.textContent = "speed " + speed;
updateHud();
mainMenu();
requestAnimationFrame(loop);
