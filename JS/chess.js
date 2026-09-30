const boardEl = document.getElementById("board");
const boardWrap = document.getElementById("boardWrap");
const promoOverlay = document.getElementById("promoOverlay");
const promoRow = document.getElementById("promoRow");
const modalLayer = document.getElementById("modalLayer");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const menuList = document.getElementById("menuList");
const toastEl = document.getElementById("toast");
const statusLine = document.getElementById("statusLine");
const topStatus = document.getElementById("topStatus");
const moveListEl = document.getElementById("moveList");
const evalFill = document.getElementById("evalFill");
const evalScore = document.getElementById("evalScore");
const topName = document.getElementById("topName");
const bottomName = document.getElementById("bottomName");
const topTag = document.getElementById("topTag");
const bottomTag = document.getElementById("bottomTag");
const topClock = document.getElementById("topClock");
const bottomClock = document.getElementById("bottomClock");
const topPlayer = document.getElementById("topPlayer");
const bottomPlayer = document.getElementById("bottomPlayer");
const infoMode = document.getElementById("infoMode");
const infoDiff = document.getElementById("infoDiff");
const infoTurn = document.getElementById("infoTurn");
const infoRoom = document.getElementById("infoRoom");
const btnMenu = document.getElementById("btnMenu");

const GLYPH = {
  K: "♚",
  Q: "♛",
  R: "♜",
  B: "♝",
  N: "♞",
  P: "♟"
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

let game = null;
let cursor = { r: 6, c: 4 };
let selected = null;
let legalTargets = [];
let promoPending = null;
let promoCursor = 0;
let menuItems = [];
let menuCursor = 0;
let toastTimer = null;
let soundOn = true;
let audioCtx = null;
let stockfish = null;
let stockfishReady = false;
let aiThinking = false;
let peer = null;
let conn = null;
let onlineRole = null;
let clockTimer = null;
let pendingRematch = false;

function emptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function cloneBoard(board) {
  return board.map(row => row.map(p => (p ? { ...p } : null)));
}

function pieceAt(pos, r, c) {
  if (r < 0 || r > 7 || c < 0 || c > 7) return null;
  return pos.board[r][c];
}

function other(color) {
  return color === "w" ? "b" : "w";
}

function squareName(r, c) {
  return FILES[c] + (8 - r);
}

function nameToSquare(name) {
  return { c: FILES.indexOf(name[0]), r: 8 - Number(name[1]) };
}

function parseFen(fen) {
  const parts = fen.trim().split(/\s+/);
  const rows = parts[0].split("/");
  const board = emptyBoard();
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of rows[r]) {
      if (ch >= "1" && ch <= "8") {
        c += Number(ch);
      } else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        board[r][c] = { t: ch.toUpperCase(), c: color };
        c += 1;
      }
    }
  }
  return {
    board,
    turn: parts[1] === "b" ? "b" : "w",
    castling: parts[2] || "-",
    ep: parts[3] === "-" ? null : parts[3],
    half: Number(parts[4] || 0),
    full: Number(parts[5] || 1)
  };
}

function toFen(pos) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = "";
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r][c];
      if (!p) {
        empty += 1;
      } else {
        if (empty) {
          row += String(empty);
          empty = 0;
        }
        row += p.c === "w" ? p.t : p.t.toLowerCase();
      }
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  return [
    rows.join("/"),
    pos.turn,
    pos.castling || "-",
    pos.ep || "-",
    String(pos.half),
    String(pos.full)
  ].join(" ");
}

function findKing(pos, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r][c];
      if (p && p.t === "K" && p.c === color) return { r, c };
    }
  }
  return null;
}

function isAttacked(pos, r, c, byColor) {
  const knight = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1]
  ];
  const king = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
  ];
  const diag = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
  ];
  const orth = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  for (const [dr, dc] of knight) {
    const rr = r + dr;
    const cc = c + dc;
    const p = pieceAt(pos, rr, cc);
    if (p && p.c === byColor && p.t === "N") return true;
  }

  for (const [dr, dc] of king) {
    const rr = r + dr;
    const cc = c + dc;
    const p = pieceAt(pos, rr, cc);
    if (p && p.c === byColor && p.t === "K") return true;
  }

  const pawnDir = byColor === "w" ? 1 : -1;
  for (const dc of [-1, 1]) {
    const p = pieceAt(pos, r + pawnDir, c + dc);
    if (p && p.c === byColor && p.t === "P") return true;
  }

  for (const [dr, dc] of diag) {
    let rr = r + dr;
    let cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = pos.board[rr][cc];
      if (p) {
        if (p.c === byColor && (p.t === "B" || p.t === "Q")) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }

  for (const [dr, dc] of orth) {
    let rr = r + dr;
    let cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = pos.board[rr][cc];
      if (p) {
        if (p.c === byColor && (p.t === "R" || p.t === "Q")) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }

  return false;
}

function inCheck(pos, color) {
  const k = findKing(pos, color);
  if (!k) return false;
  return isAttacked(pos, k.r, k.c, other(color));
}

function pushIfSafe(pos, moves, from, to, extra) {
  const next = applyRaw(pos, { from, to, ...extra });
  if (!inCheck(next, pos.turn)) {
    moves.push({ from, to, ...extra });
  }
}

function generatePseudo(pos) {
  const moves = [];
  const color = pos.turn;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r][c];
      if (!p || p.c !== color) continue;

      if (p.t === "P") {
        const dir = color === "w" ? -1 : 1;
        const start = color === "w" ? 6 : 1;
        const last = color === "w" ? 0 : 7;
        const one = r + dir;

        if (one >= 0 && one < 8 && !pos.board[one][c]) {
          if (one === 0 || one === 7) {
            for (const q of ["q", "r", "b", "n"]) {
              moves.push({ from: { r, c }, to: { r: one, c }, promotion: q });
            }
          } else {
            moves.push({ from: { r, c }, to: { r: one, c } });
            const two = r + dir * 2;
            if (r === start && !pos.board[two][c]) {
              moves.push({ from: { r, c }, to: { r: two, c }, double: true });
            }
          }
        }

        for (const dc of [-1, 1]) {
          const rr = r + dir;
          const cc = c + dc;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const target = pos.board[rr][cc];
          if (target && target.c !== color) {
            if (rr === 0 || rr === 7) {
              for (const q of ["q", "r", "b", "n"]) {
                moves.push({ from: { r, c }, to: { r: rr, c: cc }, promotion: q });
              }
            } else {
              moves.push({ from: { r, c }, to: { r: rr, c: cc } });
            }
          } else if (pos.ep && pos.ep === squareName(rr, cc)) {
            moves.push({ from: { r, c }, to: { r: rr, c: cc }, ep: true });
          }
        }
      }

      if (p.t === "N") {
        const jumps = [
          [-2, -1],
          [-2, 1],
          [-1, -2],
          [-1, 2],
          [1, -2],
          [1, 2],
          [2, -1],
          [2, 1]
        ];
        for (const [dr, dc] of jumps) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const target = pos.board[rr][cc];
          if (!target || target.c !== color) {
            moves.push({ from: { r, c }, to: { r: rr, c: cc } });
          }
        }
      }

      if (p.t === "B" || p.t === "R" || p.t === "Q") {
        const dirs = [];
        if (p.t === "B" || p.t === "Q") {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        if (p.t === "R" || p.t === "Q") {
          dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }
        for (const [dr, dc] of dirs) {
          let rr = r + dr;
          let cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const target = pos.board[rr][cc];
            if (!target) {
              moves.push({ from: { r, c }, to: { r: rr, c: cc } });
            } else {
              if (target.c !== color) moves.push({ from: { r, c }, to: { r: rr, c: cc } });
              break;
            }
            rr += dr;
            cc += dc;
          }
        }
      }

      if (p.t === "K") {
        for (const [dr, dc] of [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1]
        ]) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const target = pos.board[rr][cc];
          if (!target || target.c !== color) {
            moves.push({ from: { r, c }, to: { r: rr, c: cc } });
          }
        }

        const home = color === "w" ? 7 : 0;
        const enemy = other(color);
        if (r === home && c === 4 && !isAttacked(pos, r, 4, enemy)) {
          const kRight = color === "w" ? "K" : "k";
          const qRight = color === "w" ? "Q" : "q";
          if (pos.castling.includes(kRight)) {
            const rook = pos.board[home][7];
            if (
              rook &&
              rook.t === "R" &&
              rook.c === color &&
              !pos.board[home][5] &&
              !pos.board[home][6] &&
              !isAttacked(pos, home, 5, enemy) &&
              !isAttacked(pos, home, 6, enemy)
            ) {
              moves.push({ from: { r, c }, to: { r: home, c: 6 }, castle: "K" });
            }
          }
          if (pos.castling.includes(qRight)) {
            const rook = pos.board[home][0];
            if (
              rook &&
              rook.t === "R" &&
              rook.c === color &&
              !pos.board[home][1] &&
              !pos.board[home][2] &&
              !pos.board[home][3] &&
              !isAttacked(pos, home, 3, enemy) &&
              !isAttacked(pos, home, 2, enemy)
            ) {
              moves.push({ from: { r, c }, to: { r: home, c: 2 }, castle: "Q" });
            }
          }
        }
      }
    }
  }

  return moves;
}

function applyRaw(pos, move) {
  const next = {
    board: cloneBoard(pos.board),
    turn: other(pos.turn),
    castling: pos.castling,
    ep: null,
    half: pos.half + 1,
    full: pos.turn === "b" ? pos.full + 1 : pos.full
  };

  const piece = next.board[move.from.r][move.from.c];
  const captured = next.board[move.to.r][move.to.c];

  if (piece.t === "P" || captured) next.half = 0;

  next.board[move.from.r][move.from.c] = null;

  if (move.ep) {
    const capR = move.from.r;
    next.board[capR][move.to.c] = null;
  }

  next.board[move.to.r][move.to.c] = piece;

  if (move.promotion) {
    next.board[move.to.r][move.to.c] = {
      t: move.promotion.toUpperCase(),
      c: piece.c
    };
  }

  if (move.castle === "K") {
    const home = piece.c === "w" ? 7 : 0;
    next.board[home][5] = next.board[home][7];
    next.board[home][7] = null;
  }

  if (move.castle === "Q") {
    const home = piece.c === "w" ? 7 : 0;
    next.board[home][3] = next.board[home][0];
    next.board[home][0] = null;
  }

  if (piece.t === "K") {
    if (piece.c === "w") next.castling = next.castling.replace(/[KQ]/g, "");
    else next.castling = next.castling.replace(/[kq]/g, "");
  }

  if (piece.t === "R") {
    if (move.from.r === 7 && move.from.c === 0) next.castling = next.castling.replace("Q", "");
    if (move.from.r === 7 && move.from.c === 7) next.castling = next.castling.replace("K", "");
    if (move.from.r === 0 && move.from.c === 0) next.castling = next.castling.replace("q", "");
    if (move.from.r === 0 && move.from.c === 7) next.castling = next.castling.replace("k", "");
  }

  if (captured && captured.t === "R") {
    if (move.to.r === 7 && move.to.c === 0) next.castling = next.castling.replace("Q", "");
    if (move.to.r === 7 && move.to.c === 7) next.castling = next.castling.replace("K", "");
    if (move.to.r === 0 && move.to.c === 0) next.castling = next.castling.replace("q", "");
    if (move.to.r === 0 && move.to.c === 7) next.castling = next.castling.replace("k", "");
  }

  if (piece.t === "P" && Math.abs(move.to.r - move.from.r) === 2) {
    next.ep = squareName((move.from.r + move.to.r) / 2, move.from.c);
  }

  if (!next.castling) next.castling = "-";
  return next;
}

function legalMovesFor(pos) {
  const pseudo = generatePseudo(pos);
  const legal = [];
  for (const move of pseudo) {
    const next = applyRaw(pos, move);
    if (!inCheck(next, pos.turn)) legal.push(move);
  }
  return legal;
}

function legalMovesFrom(pos, r, c) {
  return legalMovesFor(pos).filter(m => m.from.r === r && m.from.c === c);
}

function hasAnyMove(pos) {
  return legalMovesFor(pos).length > 0;
}

function insufficientMaterial(pos) {
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r][c];
      if (p && p.t !== "K") pieces.push(p.t);
    }
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && (pieces[0] === "B" || pieces[0] === "N")) return true;
  if (pieces.every(t => t === "B")) {
    const bishops = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = pos.board[r][c];
        if (p && p.t === "B") bishops.push((r + c) % 2);
      }
    }
    return bishops.every(x => x === bishops[0]);
  }
  return false;
}

function sanFor(pos, move) {
  const piece = pos.board[move.from.r][move.from.c];
  const capture =
    Boolean(pos.board[move.to.r][move.to.c]) || Boolean(move.ep);
  let san = "";

  if (move.castle === "K") san = "O-O";
  else if (move.castle === "Q") san = "O-O-O";
  else if (piece.t === "P") {
    if (capture) san += FILES[move.from.c] + "x";
    san += squareName(move.to.r, move.to.c);
    if (move.promotion) san += "=" + move.promotion.toUpperCase();
  } else {
    san += piece.t;
    const others = legalMovesFor(pos).filter(
      m =>
        m.to.r === move.to.r &&
        m.to.c === move.to.c &&
        m.from.r !== move.from.r &&
        m.from.c !== move.from.c &&
        pos.board[m.from.r][m.from.c].t === piece.t
    );
    if (others.length) {
      const sameFile = others.some(m => m.from.c === move.from.c);
      const sameRank = others.some(m => m.from.r === move.from.r);
      if (!sameFile) san += FILES[move.from.c];
      else if (!sameRank) san += String(8 - move.from.r);
      else san += squareName(move.from.r, move.from.c);
    }
    if (capture) san += "x";
    san += squareName(move.to.r, move.to.c);
  }

  const next = applyRaw(pos, move);
  if (inCheck(next, next.turn)) {
    san += hasAnyMove(next) ? "+" : "#";
  }
  return san;
}

function createGame(fen, mode, humanColor) {
  return {
    pos: parseFen(fen || START_FEN),
    mode: mode || "local",
    humanColor: humanColor || "w",
    difficulty: "MED",
    history: [],
    sans: [],
    lastMove: null,
    status: "playing",
    result: "",
    clocks: { w: null, b: null },
    increment: 0,
    timeBase: null,
    timeInc: 0,
    started: false,
    room: ""
  };
}

function startClocks(seconds, inc) {
  if (seconds == null) return;
  stopClocks();
  game.clocks.w = seconds * 1000;
  game.clocks.b = seconds * 1000;
  game.increment = inc * 1000;
  game.timeBase = seconds;
  game.timeInc = inc;
  game.started = false;
}

function stopClocks() {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

function ensureClockRunning() {
  if (!game || game.clocks.w == null || game.status !== "playing") return;
  if (game.started) return;
  game.started = true;
  let last = Date.now();
  clockTimer = setInterval(() => {
    if (!game || game.status !== "playing" || !game.started) return;
    const now = Date.now();
    const dt = now - last;
    last = now;
    const side = game.pos.turn;
    game.clocks[side] -= dt;
    if (game.clocks[side] <= 0) {
      game.clocks[side] = 0;
      endGame(other(side), "time");
      return;
    }
    renderClocks();
  }, 100);
}

function formatClock(ms) {
  if (ms == null) return "--:--";
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function renderClocks() {
  if (!game) return;
  const top = sideColorOnTop();
  const bottom = other(top);
  topClock.textContent = formatClock(game.clocks[top]);
  bottomClock.textContent = formatClock(game.clocks[bottom]);
  topClock.classList.toggle("low", game.clocks[top] != null && game.clocks[top] < 20000);
  bottomClock.classList.toggle("low", game.clocks[bottom] != null && game.clocks[bottom] < 20000);
}

function sideColorOnTop() {
  if (!game) return "b";
  if (game.mode === "online") return game.humanColor === "w" ? "b" : "w";
  return "b";
}

function viewDr() {
  return sideColorOnTop() === "w" ? 1 : -1;
}

function viewDc() {
  return sideColorOnTop() === "w" ? 1 : -1;
}

function viewTopRow() {
  return sideColorOnTop() === "w" ? 7 : 0;
}

function viewBottomRow() {
  return sideColorOnTop() === "w" ? 0 : 7;
}

function startCursorFor(color) {
  return color === "w" ? { r: 6, c: 4 } : { r: 1, c: 4 };
}

function colorLabel(c) {
  return c === "w" ? "White" : "Black";
}

function renderPlayers() {
  if (!game) return;
  const top = sideColorOnTop();
  const bottom = other(top);
  const names = {};
  names.w = "White";
  names.b = "Black";

  if (game.mode === "ai") {
    names[other(game.humanColor)] = "Computer";
    names[game.humanColor] = "You";
  } else if (game.mode === "online") {
    names[game.humanColor] = "You";
    names[other(game.humanColor)] = "Opponent";
  } else {
    names.w = "Player 1";
    names.b = "Player 2";
  }

  topName.textContent = names[top];
  bottomName.textContent = names[bottom];
  topTag.textContent = colorLabel(top);
  bottomTag.textContent = colorLabel(bottom);
  topClock.textContent = formatClock(game.clocks[top]);
  bottomClock.textContent = formatClock(game.clocks[bottom]);

  const turnTop = game.pos.turn === top;
  topPlayer.classList.toggle("active", game.status === "playing" && turnTop);
  bottomPlayer.classList.toggle("active", game.status === "playing" && !turnTop);
}

function renderInfo() {
  if (!game) {
    infoMode.textContent = "—";
    infoDiff.textContent = "—";
    infoTurn.textContent = "—";
    infoRoom.textContent = "—";
    return;
  }
  const modeMap = { local: "Local", ai: "Computer", online: "Online" };
  infoMode.textContent = modeMap[game.mode] || game.mode;
  infoDiff.textContent = game.mode === "ai" ? game.difficulty : "—";
  infoTurn.textContent = game.status === "playing" ? colorLabel(game.pos.turn) : "Over";
  infoRoom.textContent = game.mode === "online" && game.room ? game.room : "—";
}

function renderMoves() {
  moveListEl.innerHTML = "";
  if (!game || !game.sans.length) return;
  for (let i = 0; i < game.sans.length; i += 2) {
    const row = document.createElement("div");
    row.className = "move-row";
    const no = document.createElement("span");
    no.className = "move-no";
    no.textContent = String(i / 2 + 1) + ".";
    const w = document.createElement("span");
    w.className = "move-cell";
    w.textContent = game.sans[i] || "";
    const b = document.createElement("span");
    b.className = "move-cell";
    b.textContent = game.sans[i + 1] || "";
    if (i === game.sans.length - 1) w.classList.add("current");
    if (i + 1 === game.sans.length - 1) b.classList.add("current");
    row.append(no, w, b);
    moveListEl.append(row);
  }
  moveListEl.scrollTop = moveListEl.scrollHeight;
}

function materialScore(pos) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pos.board[r][c];
      if (!p) continue;
      const v = PIECE_VAL[p.t] || 0;
      score += p.c === "w" ? v : -v;
    }
  }
  return score;
}

function renderEval() {
  if (!game) {
    evalFill.style.width = "50%";
    evalScore.textContent = "0.0";
    return;
  }
  const raw = materialScore(game.pos);
  const clamped = Math.max(-9, Math.min(9, raw));
  const pct = 50 + (clamped / 9) * 50;
  evalFill.style.width = pct + "%";
  evalScore.textContent = (raw > 0 ? "+" : "") + raw.toFixed(1);
}

function checkSquare() {
  if (!game || game.status !== "playing") return null;
  if (!inCheck(game.pos, game.pos.turn)) return null;
  return findKing(game.pos, game.pos.turn);
}

function buildBoard() {
  boardEl.innerHTML = "";
  const preview = game ? game.pos : parseFen(START_FEN);
  const whiteOnTop = sideColorOnTop() === "w";
  const check = checkSquare();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const r = whiteOnTop ? 7 - i : i;
      const c = whiteOnTop ? 7 - j : j;
      const sq = document.createElement("div");
      sq.className = "sq " + ((r + c) % 2 === 0 ? "light" : "dark");
      sq.dataset.r = String(r);
      sq.dataset.c = String(c);

      if (game && game.lastMove) {
        if (
          (game.lastMove.from.r === r && game.lastMove.from.c === c) ||
          (game.lastMove.to.r === r && game.lastMove.to.c === c)
        ) {
          sq.classList.add("last");
        }
      }

      if (selected && selected.r === r && selected.c === c) {
        sq.classList.add("selected");
      }

      if (cursor.r === r && cursor.c === c) {
        sq.classList.add("cursor");
      }

      if (check && check.r === r && check.c === c) {
        sq.classList.add("check");
      }

      const target = legalTargets.find(m => m.to.r === r && m.to.c === c);
      if (target) {
        const piece = preview.board[r][c];
        const marker = document.createElement("span");
        marker.className = piece || target.ep ? "legal-capture" : "legal-dot";
        sq.append(marker);
      }

      const p = preview.board[r][c];
      if (p) {
        const span = document.createElement("span");
        span.className = "piece " + p.c;
        span.textContent = GLYPH[p.t];
        sq.append(span);
      }

      if (i === 7) {
        const file = document.createElement("span");
        file.className = "coord file";
        file.textContent = FILES[c];
        sq.append(file);
      }
      if (j === 0) {
        const rank = document.createElement("span");
        rank.className = "coord rank";
        rank.textContent = String(8 - r);
        sq.append(rank);
      }

      boardEl.append(sq);
    }
  }
}

function renderAll() {
  buildBoard();
  renderPlayers();
  renderMoves();
  renderEval();
  renderInfo();
  updateStatus();
}

function updateStatus(msg) {
  if (!game) {
    statusLine.textContent = "Pick a mode from the menu";
    topStatus.textContent = "Use arrow keys · Enter to select";
    return;
  }

  if (msg) {
    statusLine.textContent = msg;
    topStatus.textContent = msg;
    return;
  }

  if (game.status !== "playing") {
    statusLine.textContent = game.result;
    topStatus.textContent = game.result;
    return;
  }

  if (aiThinking) {
    statusLine.textContent = "Computer is thinking…";
    topStatus.textContent = "Computer is thinking…";
    return;
  }

  let text = colorLabel(game.pos.turn) + " to move";
  if (inCheck(game.pos, game.pos.turn)) text += " · Check";
  if (game.mode === "local") text += " · Pass the keyboard";
  if (game.mode === "online") {
    text += game.pos.turn === game.humanColor ? " · Your move" : " · Waiting";
  }
  if (game.mode === "ai") {
    text += game.pos.turn === game.humanColor ? " · Your move" : " · Computer";
  }
  statusLine.textContent = text;
  topStatus.textContent = text;
}

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2200);
}

function playTone(freq, dur, type, when) {
  if (!soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime + (when || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (err) {}
}

function soundMove() {
  playTone(420, 0.07, "triangle", 0);
}

function soundCapture() {
  playTone(220, 0.1, "square", 0);
  playTone(160, 0.08, "triangle", 0.04);
}

function soundCheck() {
  playTone(660, 0.08, "sine", 0);
  playTone(880, 0.1, "sine", 0.08);
}

function soundEnd() {
  playTone(520, 0.12, "sine", 0);
  playTone(660, 0.12, "sine", 0.12);
  playTone(820, 0.2, "sine", 0.24);
}

function hideModal() {
  modalLayer.classList.add("hidden");
  menuItems = [];
  menuCursor = 0;
}

function openMenu(title, desc, items) {
  modalTitle.textContent = title;
  modalDesc.textContent = desc || "";
  menuList.innerHTML = "";
  menuItems = items;
  menuCursor = 0;
  items.forEach((item, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-item" + (item.danger ? " danger" : "");
    btn.innerHTML =
      item.label +
      (item.sub ? '<span class="sub">' + item.sub + "</span>" : "");
    if (idx === 0) btn.classList.add("focus");
    menuList.append(btn);
  });
  modalLayer.classList.remove("hidden");
}

function moveMenuFocus(delta) {
  if (!menuItems.length) return;
  const nodes = menuList.querySelectorAll(".menu-item");
  nodes[menuCursor].classList.remove("focus");
  menuCursor = (menuCursor + delta + menuItems.length) % menuItems.length;
  nodes[menuCursor].classList.add("focus");
  nodes[menuCursor].scrollIntoView({ block: "nearest" });
}

function activateMenuItem() {
  const item = menuItems[menuCursor];
  if (!item) return;
  if (item.action) item.action();
}

function showMainMenu() {
  openMenu("CHESS", "Keyboard only · mouse and Tab disabled", [
    {
      label: "Local Multiplayer",
      sub: "Two players, one keyboard",
      action: () => startLocal()
    },
    {
      label: "Play Computer",
      sub: "Stockfish · Low / Med / High",
      action: () => showAiSetup()
    },
    {
      label: "Online Multiplayer",
      sub: "PeerJS room codes",
      action: () => showOnlineSetup()
    },
    {
      label: "Sound " + (soundOn ? "On" : "Off"),
      action: () => {
        soundOn = !soundOn;
        showMainMenu();
        toast("Sound " + (soundOn ? "on" : "off"));
      }
    },
    {
      label: "Back to home",
      sub: "YOYO games menu",
      action: () => (location.href = "../index.html")
    }
  ]);
}

function showAiSetup() {
  openMenu("Play Computer", "Pick a strength", [
    { label: "Low", sub: "Beginner · fast replies", action: () => startAi("LOW") },
    { label: "Medium", sub: "Club level", action: () => startAi("MED") },
    { label: "High", sub: "Strong search", action: () => startAi("HIGH") },
    { label: "Back", action: () => showMainMenu() }
  ]);
}

function showTimeSetup(after) {
  openMenu("Time control", "Arrow keys then Enter", [
    { label: "Unlimited", action: () => after(null, 0) },
    { label: "1 + 0 Bullet", action: () => after(1, 0) },
    { label: "3 + 0 Blitz", action: () => after(3, 0) },
    { label: "5 + 0 Blitz", action: () => after(5, 0) },
    { label: "10 + 0 Rapid", action: () => after(10, 0) },
    { label: "15 + 10", action: () => after(15, 10) }
  ]);
}

function showLocalColor() {
  openMenu("Local Multiplayer", "White is always at the bottom", [
    { label: "Start game", sub: "Player 1 = White, Player 2 = Black", action: () => showTimeSetup(startLocalWithTime) },
    { label: "Back", action: () => showMainMenu() }
  ]);
}

function startLocal() {
  showLocalColor();
}

function startLocalWithTime(sec, inc) {
  game = createGame(START_FEN, "local", "w");
  if (sec != null) startClocks(sec, inc);
  selected = null;
  legalTargets = [];
  cursor = startCursorFor("w");
  hideModal();
  renderAll();
  toast("Local game started");
}

function startAi(diff) {
  showTimeSetup((sec, inc) => {
    game = createGame(START_FEN, "ai", "w");
    game.difficulty = diff;
    if (sec != null) startClocks(sec, inc);
    selected = null;
    legalTargets = [];
    cursor = startCursorFor("w");
    hideModal();
    ensureStockfish();
    renderAll();
    toast("Computer · " + diff);
  });
}

function showOnlineSetup() {
  openMenu("Online Multiplayer", "Host creates a room, guest joins the code", [
    { label: "Create room", action: () => showTimeSetup(hostOnline) },
    {
      label: "Join room",
      action: () => {
        modalDesc.textContent = "Enter room code with your keyboard, then press Enter on Join";
        openMenuJoin();
      }
    },
    { label: "Back", action: () => showMainMenu() }
  ]);
}

let joinCode = "";

function openMenuJoin() {
  modalTitle.textContent = "Join room";
  modalDesc.textContent = "Code: " + (joinCode || "_____");
  menuList.innerHTML = "";
  menuItems = [
    {
      label: "Join",
      sub: "Press Enter here after typing the code",
      action: () => {
        if (joinCode.length < 3) {
          toast("Type the room code first");
          return;
        }
        joinRoom(joinCode.toUpperCase());
      }
    },
    { label: "Back", action: () => { joinCode = ""; showOnlineSetup(); } }
  ];
  menuCursor = 0;
  menuItems.forEach((item, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-item";
    btn.innerHTML = item.label + (item.sub ? '<span class="sub">' + item.sub + "</span>" : "");
    if (idx === 0) btn.classList.add("focus");
    menuList.append(btn);
  });
  modalLayer.classList.remove("hidden");
  modalDesc.textContent = "Code: " + (joinCode || "_____");
}

function refreshJoinLabel() {
  if (!modalLayer.classList.contains("hidden") && modalTitle.textContent === "Join room") {
    modalDesc.textContent = "Code: " + (joinCode || "_____");
  }
}

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function destroyPeer() {
  if (conn) {
    try { conn.close(); } catch (err) {}
    conn = null;
  }
  if (peer) {
    try { peer.destroy(); } catch (err) {}
    peer = null;
  }
  onlineRole = null;
}

function hostOnline(sec, inc) {
  destroyPeer();
  const code = makeRoomCode();
  peer = new Peer("yoyo-chess-" + code);
  onlineRole = "host";
  game = createGame(START_FEN, "online", "w");
  game.room = code;
  if (sec != null) startClocks(sec, inc);
  selected = null;
  legalTargets = [];
  cursor = startCursorFor("w");
  renderAll();
  updateStatus("Room code: " + code + " · waiting for guest");

  openMenu("Room code", "Share this code · waiting for guest", [
    { label: "Cancel", sub: "Leave lobby", danger: true, action: () => { destroyPeer(); game = null; renderAll(); showMainMenu(); } }
  ]);

  peer.on("open", () => {
    modalDesc.textContent = "Room code: " + code;
    updateStatus("Room code: " + code + " · waiting for guest");
    renderInfo();
    toast("Room created: " + code);
  });

  peer.on("connection", c => {
    conn = c;
    conn.on("open", () => {
      hideModal();
      conn.send({
        type: "start",
        fen: START_FEN,
        clocks: game.clocks,
        inc: game.increment,
        timeBase: game.timeBase,
        timeInc: game.timeInc
      });
      renderAll();
      toast("Opponent joined");
    });
    wireConnection();
  });

  peer.on("error", err => {
    toast("Peer error: " + (err.type || "failed"));
  });
}

function joinRoom(code) {
  destroyPeer();
  peer = new Peer();
  onlineRole = "guest";
  joinCode = "";
  game = createGame(START_FEN, "online", "b");
  game.room = code;
  selected = null;
  legalTargets = [];
  cursor = startCursorFor("b");
  renderAll();
  updateStatus("Connecting to " + code + "…");

  openMenu("Joining", "Connecting to " + code + "…", [
    { label: "Cancel", danger: true, action: () => { destroyPeer(); game = null; renderAll(); showMainMenu(); } }
  ]);

  peer.on("open", () => {
    conn = peer.connect("yoyo-chess-" + code, { reliable: true });
    conn.on("open", () => {
      hideModal();
      renderAll();
      toast("Connected");
    });
    wireConnection();
  });

  peer.on("error", err => {
    modalDesc.textContent = "Could not join " + code;
    toast("Join failed");
  });
}

function wireConnection() {
  if (!conn) return;
  conn.on("data", handlePeerData);
  conn.on("close", () => {
    if (game && game.mode === "online" && game.status === "playing") {
      endGame(game.humanColor, "opponent left");
    }
  });
}

function handlePeerData(data) {
  if (!data || !game) return;
  if (data.type === "start") {
    game.pos = parseFen(data.fen);
    game.clocks = data.clocks || { w: null, b: null };
    game.increment = data.inc || 0;
    if (data.timeBase != null) game.timeBase = data.timeBase;
    if (data.timeInc != null) game.timeInc = data.timeInc;
    renderAll();
    return;
  }
  if (data.type === "move") {
    const legal = legalMovesFrom(game.pos, data.move.from.r, data.move.from.c);
    const match = legal.find(
      m =>
        m.to.r === data.move.to.r &&
        m.to.c === data.move.to.c &&
        (m.promotion || null) === (data.move.promotion || null)
    );
    if (match) applyMove(match, false);
    return;
  }
  if (data.type === "clocks") {
    if (game.clocks.w != null) {
      game.clocks.w = data.w;
      game.clocks.b = data.b;
      renderClocks();
    }
    return;
  }
  if (data.type === "resign") {
    endGame(game.humanColor, "opponent resigned");
    return;
  }
  if (data.type === "rematch-offer") {
    openMenu("Rematch", "Opponent wants a rematch", [
      { label: "Accept", action: () => { pendingRematch = false; restartOnline(); } },
      { label: "Decline", action: () => { hideModal(); toast("Rematch declined"); } }
    ]);
    return;
  }
}

function restartOnline() {
  const room = game.room;
  const color = game.humanColor;
  const base = game.timeBase;
  const inc = game.timeInc;
  game = createGame(START_FEN, "online", color);
  game.room = room;
  if (base != null) startClocks(base, inc);
  selected = null;
  legalTargets = [];
  cursor = startCursorFor(color);
  hideModal();
  renderAll();
  updateStatus("Rematch · " + colorLabel(other(color)) + " starts");
}

function canHumanMove() {
  if (!game || game.status !== "playing") return false;
  if (aiThinking) return false;
  if (game.mode === "local") return true;
  if (game.mode === "ai") return game.pos.turn === game.humanColor;
  if (game.mode === "online") return game.pos.turn === game.humanColor;
  return false;
}

function applyMove(move, byLocalHuman) {
  const san = sanFor(game.pos, move);
  const captured = Boolean(game.pos.board[move.to.r][move.to.c]) || Boolean(move.ep);
  game.history.push(move);
  game.sans.push(san);
  game.pos = applyRaw(game.pos, move);
  game.lastMove = move;
  selected = null;
  legalTargets = [];

  if (game.clocks.w != null && game.started) {
    const mover = other(game.pos.turn);
    game.clocks[mover] += game.increment;
  }

  ensureClockRunning();

  if (byLocalHuman && game.mode === "online" && conn && conn.open) {
    conn.send({ type: "move", move });
    conn.send({ type: "clocks", w: game.clocks.w, b: game.clocks.b });
  }

  const check = inCheck(game.pos, game.pos.turn);
  const movesLeft = hasAnyMove(game.pos);

  if (!movesLeft) {
    if (check) endGame(other(game.pos.turn), "checkmate");
    else endGame(null, "stalemate");
  } else if (game.pos.half >= 100) {
    endGame(null, "50-move rule");
  } else if (insufficientMaterial(game.pos)) {
    endGame(null, "insufficient material");
  } else if (check) {
    soundCheck();
  } else if (captured) {
    soundCapture();
  } else {
    soundMove();
  }

  renderAll();

  if (game.mode === "ai" && game.status === "playing" && game.pos.turn !== game.humanColor) {
    requestAiMove();
  }
}

function endGame(winner, reason) {
  if (!game || game.status !== "playing") return;
  stopClocks();
  game.status = "over";
  if (winner) {
    game.result = colorLabel(winner) + " won · " + reason;
  } else {
    game.result = "Draw · " + reason;
  }
  aiThinking = false;
  soundEnd();
  renderAll();
  openMenu(
    winner ? colorLabel(winner) + " wins" : "Draw",
    game.result,
    [
      {
        label: "Rematch",
        action: () => {
          if (game.mode === "online") {
            if (conn && conn.open) {
              hideModal();
              conn.send({ type: "rematch-offer" });
              updateStatus("Rematch offered…");
            } else {
              toast("Opponent not connected");
            }
          } else {
            rematchSameMode();
          }
        }
      },
      {
        label: "Main menu",
        action: () => {
          stopClocks();
          destroyPeer();
          game = null;
          hideModal();
          renderAll();
          showMainMenu();
        }
      }
    ]
  );
}

function rematchSameMode() {
  const mode = game.mode;
  const diff = game.difficulty;
  const base = game.timeBase;
  const inc = game.timeInc;
  const humanColor = game.humanColor;
  const room = game.room;
  game = createGame(START_FEN, mode, mode === "local" ? "w" : humanColor);
  game.difficulty = diff;
  if (base != null) startClocks(base, inc);
  if (mode === "online") game.room = room;
  selected = null;
  legalTargets = [];
  cursor = startCursorFor(mode === "local" ? "w" : humanColor);
  hideModal();
  renderAll();
  if (mode === "ai") ensureStockfish();
}

function selectSquare(r, c) {
  if (!canHumanMove()) {
    if (game && game.mode === "online" && game.status === "playing" && !aiThinking) {
      toast("Not your turn");
    }
    return;
  }

  const piece = game.pos.board[r][c];

  if (selected) {
    const matches = legalTargets.filter(m => m.to.r === r && m.to.c === c);
    if (matches.length) {
      if (matches.length > 1 && matches.some(m => m.promotion)) {
        openPromotion(matches);
        return;
      }
      applyMove(matches[0], true);
      return;
    }
    if (selected.r === r && selected.c === c) {
      selected = null;
      legalTargets = [];
      renderAll();
      return;
    }
    if (piece && piece.c === game.pos.turn) {
      selected = { r, c };
      legalTargets = legalMovesFrom(game.pos, r, c);
      playTone(500, 0.04, "sine", 0);
      renderAll();
      return;
    }
    selected = null;
    legalTargets = [];
    renderAll();
    return;
  }

  if (piece && piece.c === game.pos.turn) {
    selected = { r, c };
    legalTargets = legalMovesFrom(game.pos, r, c);
    playTone(500, 0.04, "sine", 0);
    renderAll();
  }
}

function openPromotion(matches) {
  promoPending = matches;
  promoCursor = 0;
  promoRow.innerHTML = "";
  const order = ["q", "r", "b", "n"];
  const sorted = order.map(q => matches.find(m => m.promotion === q)).filter(Boolean);
  promoPending = sorted;
  sorted.forEach((m, idx) => {
    const item = document.createElement("div");
    item.className = "promo-item" + (idx === 0 ? " focus" : "");
    item.textContent = GLYPH[m.promotion.toUpperCase()];
    promoRow.append(item);
  });
  promoOverlay.classList.remove("hidden");
}

function closePromotion() {
  promoOverlay.classList.add("hidden");
  promoPending = null;
  promoCursor = 0;
}

function movePromoFocus(delta) {
  if (!promoPending) return;
  const nodes = promoRow.querySelectorAll(".promo-item");
  nodes[promoCursor].classList.remove("focus");
  promoCursor = (promoCursor + delta + nodes.length) % nodes.length;
  nodes[promoCursor].classList.add("focus");
}

function confirmPromotion() {
  if (!promoPending) return;
  const move = promoPending[promoCursor];
  closePromotion();
  if (move) applyMove(move, true);
}

function ensureStockfish() {
  if (stockfishReady || stockfish) return;
  const sources = [
    "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
    "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js"
  ];
  tryLoad(sources, 0);
}

function tryLoad(sources, idx) {
  if (idx >= sources.length) {
    updateStatus("Stockfish unavailable · using fallback AI");
    return;
  }
  fetch(sources[idx])
    .then(res => {
      if (!res.ok) throw new Error("bad");
      return res.text();
    })
    .then(src => {
      const blob = new Blob([src], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      stockfish = new Worker(url);
      stockfish.onmessage = onStockfishMessage;
      stockfish.onerror = () => {
        stockfish = null;
        tryLoad(sources, idx + 1);
      };
      stockfish.postMessage("uci");
      setTimeout(() => {
        if (!stockfishReady && stockfish) {
          stockfishReady = true;
          stockfish.postMessage("setoption name Hash value 64");
        }
      }, 400);
    })
    .catch(() => tryLoad(sources, idx + 1));
}

function onStockfishMessage(e) {
  const line = typeof e.data === "string" ? e.data : "";
  if (line === "uciok") {
    stockfishReady = true;
    stockfish.postMessage("isready");
    return;
  }
  if (line.startsWith("bestmove")) {
    const parts = line.split(" ");
    const bm = parts[1];
    if (!bm || bm === "(none)") {
      aiThinking = false;
      return;
    }
    const from = nameToSquare(bm.slice(0, 2));
    const to = nameToSquare(bm.slice(2, 4));
    const promo = bm.length > 4 ? bm[4] : null;
    const moves = legalMovesFrom(game.pos, from.r, from.c).filter(
      m => m.to.r === to.r && m.to.c === to.c
    );
    let move = moves.find(m => (m.promotion || null) === promo) || moves[0];
    if (!move) {
      const fallback = legalMovesFor(game.pos);
      move = fallback[Math.floor(Math.random() * fallback.length)];
    }
    aiThinking = false;
    if (move && game && game.status === "playing") applyMove(move, false);
    return;
  }
}

function requestAiMove() {
  if (!game || game.status !== "playing") return;
  aiThinking = true;
  updateStatus();
  renderPlayers();

  const settings = {
    LOW: { skill: 1, depth: 1, movetime: 80 },
    MED: { skill: 8, depth: 4, movetime: 500 },
    HIGH: { skill: 16, depth: 10, movetime: 1200 }
  };
  const cfg = settings[game.difficulty] || settings.MED;

  if (stockfish && stockfishReady) {
    stockfish.postMessage("ucinewgame");
    stockfish.postMessage("position fen " + toFen(game.pos));
    stockfish.postMessage("setoption name Skill Level value " + cfg.skill);
    stockfish.postMessage("go depth " + cfg.depth + " movetime " + cfg.movetime);
    setTimeout(() => {
      if (aiThinking && game && game.status === "playing" && game.pos.turn !== game.humanColor) {
        const moves = legalMovesFor(game.pos);
        if (moves.length) {
          aiThinking = false;
          applyMove(moves[Math.floor(Math.random() * moves.length)], false);
        }
      }
    }, cfg.movetime + 3500);
    return;
  }

  setTimeout(() => {
    if (!game || game.status !== "playing") {
      aiThinking = false;
      return;
    }
    const moves = legalMovesFor(game.pos);
    if (!moves.length) {
      aiThinking = false;
      return;
    }
    const scored = moves.map(m => ({ m, s: scoreFallback(m) }));
    scored.sort((a, b) => b.s - a.s);
    const poolSize =
      game.difficulty === "LOW"
        ? Math.min(scored.length, 8)
        : game.difficulty === "MED"
          ? Math.min(scored.length, 4)
          : 1;
    const pick = scored[Math.floor(Math.random() * poolSize)].m;
    aiThinking = false;
    applyMove(pick, false);
  }, game.difficulty === "HIGH" ? 650 : game.difficulty === "MED" ? 400 : 220);
}

function scoreFallback(move) {
  const victim = game.pos.board[move.to.r][move.to.c];
  let score = victim ? PIECE_VAL[victim.t] * 10 : 0;
  const piece = game.pos.board[move.from.r][move.from.c];
  if (move.promotion) score += PIECE_VAL[move.promotion.toUpperCase()] * 8;
  if (piece.t === "P") score += (piece.c === "w" ? 6 - move.to.r : move.to.r - 1) * 0.5;
  const center = Math.abs(3.5 - move.to.r) + Math.abs(3.5 - move.to.c);
  score += (7 - center) * 0.2;
  if (game.difficulty === "LOW") score += Math.random() * 12;
  if (game.difficulty === "MED") score += Math.random() * 4;
  return score;
}

function openGameMenu() {
  if (!game) {
    showMainMenu();
    return;
  }
  const items = [
    {
      label: "Resume",
      action: () => hideModal()
    },
    {
      label: "Resign",
      danger: true,
      action: () => {
        if (game.status !== "playing") {
          hideModal();
          return;
        }
        if (game.mode === "online" && conn && conn.open) {
          conn.send({ type: "resign" });
        }
        endGame(other(game.humanColor), "resignation");
      }
    },
    {
      label: "Main menu",
      action: () => {
        stopClocks();
        destroyPeer();
        game = null;
        aiThinking = false;
        hideModal();
        renderAll();
        showMainMenu();
      }
    },
    {
      label: "Back to home",
      action: () => (location.href = "../index.html")
    }
  ];
  openMenu("Game menu", game.result || statusLine.textContent, items);
}

function handleBoardKey(key) {
  if (promoPending) {
    if (key === "ArrowLeft" || key === "ArrowUp") movePromoFocus(-1);
    if (key === "ArrowRight" || key === "ArrowDown") movePromoFocus(1);
    if (key === "Enter") confirmPromotion();
    return;
  }

  if (!modalLayer.classList.contains("hidden")) {
    if (key === "ArrowUp") moveMenuFocus(-1);
    if (key === "ArrowDown") moveMenuFocus(1);
    if (key === "Enter") activateMenuItem();
    if (key === "Escape" && game) hideModal();
    return;
  }

  if (!game) return;

  if (key === "ArrowUp") {
    if (cursor.r === viewTopRow() && !selected) {
      openGameMenu();
      return;
    }
    cursor.r = Math.max(0, Math.min(7, cursor.r + viewDr()));
    renderAll();
    return;
  }
  if (key === "ArrowDown") {
    if (cursor.r === viewBottomRow() && selected) {
      selected = null;
      legalTargets = [];
      renderAll();
      return;
    }
    cursor.r = Math.max(0, Math.min(7, cursor.r - viewDr()));
    renderAll();
    return;
  }
  if (key === "ArrowLeft") {
    cursor.c = Math.max(0, Math.min(7, cursor.c + viewDc()));
    renderAll();
    return;
  }
  if (key === "ArrowRight") {
    cursor.c = Math.max(0, Math.min(7, cursor.c - viewDc()));
    renderAll();
    return;
  }
  if (key === "Enter") {
    if (game.status !== "playing") return;
    selectSquare(cursor.r, cursor.c);
  }
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Tab") {
      e.preventDefault();
      return;
    }

    if (isTypingTarget(e.target)) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (modalTitle.textContent === "Join room") activateMenuItem();
      }
      return;
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) {
      e.preventDefault();
    }

    if (!modalLayer.classList.contains("hidden") || promoPending || !game) {
      handleBoardKey(e.key);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      handleBoardKey("Enter");
      return;
    }

    if (e.key.startsWith("Arrow")) {
      handleBoardKey(e.key);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      openGameMenu();
    }
  },
  true
);

menuList.addEventListener("keydown", e => {
  if (e.key === "ArrowUp") moveMenuFocus(-1);
  if (e.key === "ArrowDown") moveMenuFocus(1);
  if (e.key === "Enter") activateMenuItem();
});

document.addEventListener("mousedown", e => e.preventDefault());
document.addEventListener("mouseup", e => e.preventDefault());
document.addEventListener("click", e => e.preventDefault());
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dragstart", e => e.preventDefault());
document.addEventListener("auxclick", e => e.preventDefault());
document.addEventListener("dblclick", e => e.preventDefault());
window.addEventListener("blur", () => {});

btnMenu.addEventListener("click", e => {
  e.preventDefault();
  openGameMenu();
});

document.addEventListener("keydown", e => {
  if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
    if (modalTitle.textContent === "Join room" && !modalLayer.classList.contains("hidden")) {
      if (joinCode.length < 6) {
        joinCode += e.key.toUpperCase();
        refreshJoinLabel();
      }
    }
  }
  if (e.key === "Backspace") {
    if (modalTitle.textContent === "Join room" && !modalLayer.classList.contains("hidden")) {
      joinCode = joinCode.slice(0, -1);
      refreshJoinLabel();
    }
  }
}, true);

function loopStatusClock() {
  if (game && game.clocks.w != null) renderClocks();
  requestAnimationFrame(loopStatusClock);
}

renderAll();
showMainMenu();
loopStatusClock();
