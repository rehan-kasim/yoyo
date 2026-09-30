const boardEl = document.getElementById("board");
const keyboardEl = document.getElementById("keyboard");
const toastEl = document.getElementById("toast");
const streakChip = document.getElementById("streakChip");
const lenChip = document.getElementById("lenChip");
const modalLayer = document.getElementById("modalLayer");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const menuList = document.getElementById("menuList");

const ANSWER_POOL = {
  3: "act age air ant art ash ask ate awe axe bad bag ban bar bat bed bee bet big bit box boy bud bug bus but cab can cap car cat cod cog cop cry cub cup cut day den dew dig dim din dog dry ear eat eel egg end era eve eye fan far fat fed fee few fig fin fir fit fix fly fog for fox fry fun gap gas gel gem get gnu god gum gun gut guy gym had ham hat hay hem hen her hew hid him hip his hit hot hue hug hum ice ink ion its jaw jet job joy key kid kin kit lap law lay led leg let lid lie lip log lot low mad man map mat may met mix mob mod mop mud mug net new nod nor not now nut oak oar oat odd off oil old one opt our out owe owl pan par pat paw pea pen pet pie pig pin pit pod pop pot pro pry pub pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod rot row rub rug run sad sag sap sat saw say sea see set shy sin sip sir sit six sky sly sob son sow soy spa spy sty sub sun tab tad tag tan tap tar tax tea ten the tin tip toe ton too top tot toy try tub tug two use van vat vet vow wad wag war was wax way web wet who why wig win wit woe wok won woo wow wry yak yam yap yes yet you zip zoo".split(/\s+/),
  4: "able acid acre aged also area army away baby back bake bald ball band bank bare bark barn base bath bead beak bean bear beat been beer bell belt bend best bird bite blue boat body boil bold bomb bond bone book boom boot born both bowl brag bulk burn bush busy cake calm came camp card care cart case cash cast cave cell chap chat chip city clay clip club coal coat code cold come cook cool cope copy core cost crew crop crown cube dark data date dawn days dead deal dear debt deck deep deer desk dial diet dirt dish does done door dose down draw drop drug drum duck dull dust duty each earn ease east easy edge else even ever face fact fair fall farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish five flat flow food foot form four free frog full game gate gave gear gift girl give glad goal goes gold golf gone good grab gray grew grow guitar half hall hand hang hard harm hate have head hear heat held help here hero high hill hire hold hole holy home hope hour idea into iron item jazz join jump just keep kept kick kind king knee know lack lady lake land lane last late lead left less life lift like line link lion list live long look lord loss love luck made mail main make male many mask meal mean meat meet menu mere milk mind mine miss mode mood moon more most move much name near neat neck need nest news next nice nine node none noon norm nose note okay once only open oral over pace pack page pain pair pale palm park part pass past path peak pick pink plan play plot plus poem pool poor port pose pull pure push race rail rain rank rare rate read real rest rice rich ride ring rise risk road rock role roll roof room rose rule safe sail sale salt same sand save seal seat seed seek seem seen self sell send shop shot show side sign sing sink site size skin slip slow snow soft soil sold sole song soon sore sort soul spot star stay step stop such suit sure swim tail take tale talk tall team tear tell tend term test text than that them then they thin this thus time tiny tone tool tour town tree trip true turn type unit upon user vary vast view vote wait wake walk wall want warm wash wave ways weak wear week well went were west what when wide wife wild will wind wine wing wish wood word wore work yard year your zone".split(/\s+/),
  5: "about above abuse actor acute admit adopt after again agent agree ahead alarm album alert alien align alike alive allow alone along alter among anger angle angry apart apple apply arena argue arise armor aroma array arrow aside asset atlas avoid awake award aware awful bacon badge baker basic basis batch beach beast begin being below bench berry birth black blade blame blank blast blaze bleak blend bless blind block bloom board bonus boost bound brain brand brave bread break breed brick bride brief bring broad broke brown brush build bunch burst buyer cabin cable candy cargo carry catch cause chain chair chalk champ chant chaos charm chase cheap check cheek cheer chess chest chief child chill china choir choke chord chose chunk cider cigar civil claim clash class clear clerk click climb clock clone close cloth cloud clown coach coast color comet coral couch count court cover crack craft crane crash crazy cream crisp cross crowd crown crush curve cycle daily dance death debut delay delta depth diary dirty doubt dozen draft drama drawn dream dress drift drill drink drive droit drunk dryer eager eagle early earth eight elite empty enemy enjoy enter equal error event every exact exile exist extra faint fairy faith false fancy fatal fault feast fence ferry fetch fever fjord field fifth fifty fight final first flame flash fleet flesh float flock floor flour fluid flush focus force forge forth forum found frame frank fraud fresh front frost fruit fully funny ghost giant given glass globe glory going grace grade grain grand grant grape graph grasp grass great green greet grief group grove grown guard guess guest guide guilt habit happy harsh heart heavy hence horse hotel house human humor hurry ideal image imply index inner input issue ivory joint judge juice knife knock known label labor large laser later laugh layer learn least leave legal lemon level light limit lingo liver local logic loose lower loyal lucky lunch magic major manor maple march match maybe mayor media mercy merge merit metal meter midst might minor minus model money month moral motor mount mouse mouth movie music naive nerve never night noble noise north noted novel nurse occur ocean offer often olive onion opera orbit order organ other ought outer owner oxide paint panel panic paper party pasta patch pause peace peach pearl penny phase phone photo piano piece pilot pitch pizza place plaid plain plane plant plate plead plumb point portal portion post pound press price pride prime print prior prize proof proud prove punch pupil queen query quest queue quick quiet quilt quota quote radar radio raise rally ranch range rapid ratio reach ready realm rebel refer reign relax reply rider ridge rifle right rigid risen rival river roast robin robot rocky roman rough round route royal sadly saint salad sauce scale scene scope score sense serve seven shade shaft shake shall shame shape share shark sharp sheep sheer sheet shelf shell shift shine shirt shoot shore short shout sight silly since sixty skull slate slave sleep slope small smart smell smile smoke snake solar solid solve sorry sound south space spare spark speak speed spell spend spice spike spine spite split spoke sport spray squad staff stage stake stall stand stare start state steal steam steel steep steer stick stiff stock stone stood store storm story strip stuck study stuff style sugar suite sunny super surge swamp swear sweep sweet swept swift swing sword swore sworn syrup table taste teach teeth theft their theme there these thick thief thing think third those three threw throw thumb tiger tight tired toast today token tooth topic total touch tough towel tower track trade trail train trait trash treat trend trial tribe trick tried troop truck truly trust truth tumor twice twist ultra uncle under union unite unity until upper upset usage usual valid value valve video vigor viral virus visit vital vivid vocal voice wager waist watch water weary weave weigh weird whale wheat wheel where which while white whole whose widow width witch woman world worry worse worst worth would wound wrath write wrong wrote yacht yield young youth zebra".split(/\s+/),
  6: "absorb accent accept access accuse across acting action active actual advice advise affair afford afraid agency agenda almost always amount animal annual answer anyone anyway appeal appear apple arcade arise around array author autumn bakery ballsy banana banner barely basket battle beacon became become before behind belief belong berry better between beyond bishop bitter blanket bleed blend blind blood bloom board boost borrow bottle bounce brain branch brand brave bread break breed brick bridge bright broken bronze brooch browse brutal bubble bucket buddy budget buffet bundle bureau burst cabin cable cactus camera campus canoe carbon career carpet carrot cartoon castle casual cattle caught ceiling cellar cement census cheek chess chief chicken choice choose chorus chosen church circle circus clause client closed closet clover coffee collar colony column combat comedy common copper corner cosmic cotton county couple course cousin create credit crisis critic crossed crowd cruel crush custom cycle daily dance dealer debate debris decide deep degree delete demand denial depend deputy desert design desire detail detect device dialect diary differ dinner direct dismay distant doctor dollar domain donate double dough dozen dragon drama drawer driven driver during easily eating edition editor effect effort eighth either elbow elder elect elite email empty ended engage engine enough entire escape estate ethics evening events exact exams excess exile exist extra fabled factory faculty failure famous father feather feature february federal feeling female fencer fever fewer fiber figure filter finish fiscal flavor flesh flight floating floor flour flower fluid flying follow force forest forget formal format former fossil foster fought fourth french frozen future gadget galaxy garage garden garlic gather gender gentle geology german getting giant given glass global going golden govern grade grain grand grant graph grasp grass great green ground growth guard guess guest guide guild guilt habit handle happen hardly hazard health heard heart heavy helmet hidden higher hiking hiring holder honest hoping horse hospital hunter hurdle ideal impact income indeed injury inner input insect inside insist intact intake invite island issue itself jacket jungle junior kidney kitten halfway knight lack ladies ladder landed larger lasting latter launch lawyer leader league leather leaving lecture legend length lesser lesson letter lights likely limit liquid listen little living lobby locate longer lottery loyal lumber lunch making manner maple marble market marry master matter mature maybe meaning measure medium meeting member memory mental mentor merely method middle might migrate mineral minimal minute mirror mobile modern modest module moment monkey moral mother motion motor mount mouse mouth moving muscle museum mutual myself narrow nation native nature nearly needle nickel night noise normal notice notion novel number object observe obtain occupy ocean octave office officer online operate opinion orange orbit order organ origin outer output oxygen packet paddle parent particle party patent people pepper period permit person phrase picky picture pigeon pirate planet plated player please plenty pocket poetry police policy polish poorer popular portion poster potato pottery powder praise prayer pretty prevent primary printer prison profit prompt proper proved public pudding punish purple puzzle quarry quarter queen quest queue radius random rapid ratio reason recall recent record reduce reform refuse region regret relate remote render repair repeat report rescue resort result retail retain return ribbon riding rising ritual robust rocket rotate routine rubber runner saddle safety salary sample savage scheme school science screen search season second secret sector secure select senior sensor sequel serial server settle severe shadow shaken shall shape share sharp sheet shelf shell shift shine shirt shock shoot shore short show shut sided siege sight silent silver simple simply singer single sister sketch sleep slice slide slope small smart smoke smooth snake socket solar solid solve sorrow sound source south space spare spark speak special speech spirit spoken sponsor spread spring square stable stadium staff stage stain stair stake stamp stand star start state stay steak steal steam steel stereo stick still stock stone stood store storm story stove strain street stress strike string strong studio stupid submit subtle sudden suffer summer summit sunset supply surely surgery survey switch symbol system tablet tackle tactic talent target tavern temple tender tennis terror thank theft their theme there these thick thief thing think third those three threw throw thumb thunder ticket tighten timber timer tissue title tokens tongue toward tower trace track trade trail train treat trend trial tribe trick tried troop truck truly trust tumor turning twice typical unable unique unless unlike unusual update urgent useful usual velvet vendor verify vertex victim victory village vintage violet violin virtue visible vision visual volume voyage waiting walking wander wanted warning warrant warrior washed water weekly weight weird welcome welfare western whereas whether which while white whole whose window winner winter wisdom within without witness wonder wooden worker world worry worse worst worth wounded wrench writer yellow".split(/\s+/)
};

const WORD_SOURCES = [
  "https://cdn.jsdelivr.net/gh/dwyl/english-words@master/words_alpha.txt",
  "https://cdn.jsdelivr.net/gh/first20hours/google-10000-english@master/google-10000-english-no-swears.txt"
];

const ROWS = 6;
const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "back"]
];

let colCount = 5;
let answer = "";
let guesses = [];
let current = "";
let state = "playing";
let toastTimer = null;
let animating = false;
let keyCursor = { row: 0, col: 0 };
let boardCursor = 0;
let menuItems = [];
let menuCursor = 0;
let keyState = {};
let streak = 0;
let focusMode = "board";
let wordsLoading = false;
let wordsReady = false;
let validByLen = { 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set() };

function answerPool(len) {
  return ANSWER_POOL[len] || ANSWER_POOL[5];
}

function validFor(len) {
  const set = new Set(answerPool(len));
  if (validByLen[len]) validByLen[len].forEach(w => set.add(w));
  return set;
}

function isAllowed(word) {
  return validFor(colCount).has(word);
}

function parseWordFile(text) {
  return text.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(w => /^[a-z]+$/.test(w));
}

function loadWordLists() {
  if (wordsLoading || wordsReady) return;
  wordsLoading = true;
  const loads = WORD_SOURCES.map(src =>
    fetch(src).then(res => {
      if (!res.ok) throw new Error("bad");
      return res.text();
    })
  );
  Promise.allSettled(loads).then(results => {
    results.forEach(result => {
      if (result.status !== "fulfilled") return;
      parseWordFile(result.value).forEach(word => {
        const n = word.length;
        if (validByLen[n]) validByLen[n].add(word);
      });
    });
    wordsReady = true;
    wordsLoading = false;
    if (state === "playing") renderBoard();
  }).catch(() => {
    wordsLoading = false;
    wordsReady = false;
  });
}

function pickAnswer() {
  const pool = answerPool(colCount);
  const key = "wordle-answer-" + colCount;
  const dayKey = "wordle-day-" + colCount;
  const saved = localStorage.getItem(key);
  const day = localStorage.getItem(dayKey);
  const today = new Date().toISOString().slice(0, 10);
  if (saved && day === today && pool.includes(saved)) return saved;
  const word = pool[Math.floor(Math.random() * pool.length)];
  localStorage.setItem(key, word);
  localStorage.setItem(dayKey, today);
  return word;
}

function streakKey() {
  return "wordle-streak-" + colCount;
}

function loadStreak() {
  streak = Number(localStorage.getItem(streakKey()) || 0);
  streakChip.textContent = String(streak);
}

function saveStreak(win) {
  streak = win ? streak + 1 : 0;
  localStorage.setItem(streakKey(), String(streak));
  streakChip.textContent = String(streak);
}

function updateLenChip() {
  lenChip.textContent = String(colCount);
}

function buildBoard() {
  boardEl.style.setProperty("--cols", String(colCount));
  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < colCount; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.r = String(r);
      tile.dataset.c = String(c);
      boardEl.append(tile);
    }
  }
}

function buildKeyboard() {
  keyboardEl.innerHTML = "";
  KEY_ROWS.forEach((keys, ri) => {
    const rowEl = document.createElement("div");
    rowEl.className = "krow";
    keys.forEach((key, ci) => {
      const el = document.createElement("div");
      el.className = "key";
      if (key === "enter") {
        el.classList.add("wide");
        el.dataset.key = "enter";
        el.textContent = "Enter";
      } else if (key === "back") {
        el.classList.add("wide");
        el.dataset.key = "back";
        el.textContent = "⌫";
      } else {
        el.dataset.key = key;
        el.textContent = key;
      }
      el.dataset.row = String(ri);
      el.dataset.col = String(ci);
      rowEl.append(el);
    });
    keyboardEl.append(rowEl);
  });
}

function tileAt(r, c) {
  return boardEl.querySelector('.tile[data-r="' + r + '"][data-c="' + c + '"]');
}

function currentRow() {
  return guesses.length;
}

function gradeGuess(word, ans) {
  const n = word.length;
  const result = Array(n).fill("absent");
  const used = Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (word[i] === ans[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < n; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < n; j++) {
      if (!used[j] && word[i] === ans[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

function updateKeyStates(word) {
  const grades = gradeGuess(word, answer);
  const rank = { absent: 1, present: 2, correct: 3 };
  for (let i = 0; i < word.length; i++) {
    const k = word[i];
    const g = grades[i];
    if (!keyState[k] || rank[g] > rank[keyState[k]]) keyState[k] = g;
  }
}

function renderBoard() {
  boardEl.querySelectorAll(".tile").forEach(t => {
    t.textContent = "";
    t.className = "tile";
  });

  guesses.forEach((word, r) => {
    const grades = gradeGuess(word, answer);
    for (let c = 0; c < colCount; c++) {
      const tile = tileAt(r, c);
      if (!tile) continue;
      tile.textContent = word[c] || "";
      tile.classList.add("filled", grades[c] || "absent");
    }
  });

  if (state === "playing" && currentRow() < ROWS && !animating) {
    const r = currentRow();
    for (let c = 0; c < current.length; c++) {
      const tile = tileAt(r, c);
      if (!tile) continue;
      tile.textContent = current[c];
      tile.classList.add("filled");
    }
    const col = Math.min(boardCursor, colCount - 1);
    const focus = tileAt(r, col);
    if (focus) focus.classList.add("cursor");
  }
}

function renderKeyboard() {
  keyboardEl.querySelectorAll(".key").forEach(el => {
    el.classList.remove("kcursor");
    const key = el.dataset.key;
    el.classList.remove("correct", "present", "absent");
    if (keyState[key]) el.classList.add(keyState[key]);
    if (focusMode !== "keys") return;
    const r = Number(el.dataset.row);
    const c = Number(el.dataset.col);
    if (r === keyCursor.row && c === keyCursor.col) el.classList.add("kcursor");
  });
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 1600);
}

function shakeRow(r) {
  for (let c = 0; c < colCount; c++) {
    const tile = tileAt(r, c);
    if (!tile) continue;
    tile.classList.remove("shake");
    void tile.offsetWidth;
    tile.classList.add("shake");
  }
}

function bounceRow(r) {
  for (let c = 0; c < colCount; c++) {
    const tile = tileAt(r, c);
    if (!tile) continue;
    tile.classList.remove("bounce");
    void tile.offsetWidth;
    tile.classList.add("bounce");
  }
}

function flipRow(r, word, done) {
  const grades = gradeGuess(word, answer);
  let count = 0;
  for (let c = 0; c < colCount; c++) {
    const tile = tileAt(r, c);
    if (!tile) continue;
    tile.classList.add("flip");
    setTimeout(() => {
      tile.classList.remove("flip");
      tile.classList.add("filled", grades[c]);
      count += 1;
      if (count === colCount && done) done();
    }, 280 + c * 300);
  }
}

function typeLetter(ch) {
  if (state !== "playing" || animating) return;
  if (current.length >= colCount) {
    shakeRow(currentRow());
    return;
  }
  current += ch;
  boardCursor = current.length;
  if (boardCursor >= colCount) boardCursor = colCount - 1;
  renderBoard();
  const tile = tileAt(currentRow(), current.length - 1);
  if (tile) {
    tile.classList.remove("pop");
    void tile.offsetWidth;
    tile.classList.add("pop");
  }
}

function backspace() {
  if (state !== "playing" || animating) return;
  if (!current.length) {
    shakeRow(currentRow());
    return;
  }
  current = current.slice(0, -1);
  boardCursor = current.length;
  if (boardCursor >= colCount) boardCursor = colCount - 1;
  renderBoard();
}

function praise(n) {
  if (n === 1) return "Genius";
  if (n === 2) return "Magnificent";
  if (n === 3) return "Impressive";
  if (n === 4) return "Splendid";
  if (n === 5) return "Great";
  return "Phew";
}

function submitGuess() {
  if (state !== "playing" || animating) return;
  const row = currentRow();

  if (current.length < colCount) {
    showToast("Not enough letters");
    shakeRow(row);
    return;
  }

  if (!isAllowed(current)) {
    showToast(wordsLoading ? "Loading dictionary…" : "Not in word list");
    shakeRow(row);
    return;
  }

  const guess = current;
  animating = true;
  guesses.push(guess);
  current = "";
  boardCursor = 0;
  focusMode = "board";
  renderBoard();

  flipRow(row, guess, () => {
    updateKeyStates(guess);
    renderKeyboard();
    animating = false;

    if (guess === answer) {
      state = "won";
      bounceRow(row);
      saveStreak(true);
      showToast(praise(guesses.length));
      renderBoard();
      setTimeout(() => showEndMenu(true), 1400);
      return;
    }

    if (guesses.length >= ROWS) {
      state = "lost";
      saveStreak(false);
      showToast(answer.toUpperCase());
      renderBoard();
      setTimeout(() => showEndMenu(false), 1100);
      return;
    }

    renderBoard();
  });
}

function openMenu(title, desc, items) {
  modalTitle.textContent = title;
  modalDesc.textContent = desc;
  menuList.innerHTML = "";
  menuItems = items;
  menuCursor = 0;
  items.forEach((item, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-item";
    btn.innerHTML = item.label + (item.sub ? '<span class="sub">' + item.sub + "</span>" : "");
    if (idx === 0) btn.classList.add("focus");
    menuList.append(btn);
  });
  modalLayer.classList.remove("hidden");
}

function hideMenu() {
  modalLayer.classList.add("hidden");
  menuItems = [];
}

function moveMenuFocus(delta) {
  if (!menuItems.length) return;
  const nodes = menuList.querySelectorAll(".menu-item");
  nodes[menuCursor].classList.remove("focus");
  menuCursor = (menuCursor + delta + menuItems.length) % menuItems.length;
  nodes[menuCursor].classList.add("focus");
  nodes[menuCursor].scrollIntoView({ block: "nearest" });
}

function activateMenu() {
  const item = menuItems[menuCursor];
  if (item && item.action) item.action();
}

function showLengthMenu(isStart) {
  const poolNote = wordsReady
    ? "Huge CDN dictionary ready · answers curated per length"
    : wordsLoading
      ? "Loading big word list…"
      : "Pick how long the word should be";
  openMenu("Word length", poolNote, [
    { label: "3 letters", sub: "Short and fast", action: () => startLength(3) },
    { label: "4 letters", sub: "Quick round", action: () => startLength(4) },
    { label: "5 letters", sub: "Classic Wordle", action: () => startLength(5) },
    { label: "6 letters", sub: "Longer puzzle", action: () => startLength(6) },
    ...(isStart
      ? []
      : [{ label: "Close", action: () => hideMenu() }])
  ]);
}

function showEndMenu(won) {
  const desc = won
    ? colCount + "-letter · solved in " + guesses.length + " · streak " + streak
    : colCount + "-letter · was " + answer.toUpperCase() + " · streak " + streak;
  openMenu(won ? "Nice" : "Wordle", desc, [
    { label: "Play again", sub: "New " + colCount + "-letter word", action: () => resetGame() },
    { label: "Change length", sub: "3 / 4 / 5 / 6 letters", action: () => showLengthMenu(false) },
    { label: "Show board", sub: "Close this panel", action: () => hideMenu() }
  ]);
}

function openMidMenu() {
  if (animating) return;
  openMenu("Wordle", "Length " + colCount + " · " + (wordsReady ? "dictionary loaded" : wordsLoading ? "loading words…" : "local words only"), [
    { label: "Change length", sub: "Restart with 3 / 4 / 5 / 6", action: () => showLengthMenu(false) },
    { label: "Restart this length", sub: "New " + colCount + "-letter word", action: () => resetGame() },
    { label: "Resume", action: () => hideMenu() },
    { label: "Back to home", sub: "YOYO games menu", action: () => (location.href = "../index.html") }
  ]);
}

function startLength(n) {
  colCount = n;
  localStorage.setItem("wordle-len", String(n));
  updateLenChip();
  loadStreak();
  resetGame();
}

function resetGame() {
  localStorage.removeItem("wordle-answer-" + colCount);
  localStorage.removeItem("wordle-day-" + colCount);
  answer = pickAnswer();
  guesses = [];
  current = "";
  state = "playing";
  keyState = {};
  boardCursor = 0;
  keyCursor = { row: 0, col: 0 };
  focusMode = "board";
  animating = false;
  hideMenu();
  buildBoard();
  buildKeyboard();
  renderBoard();
  renderKeyboard();
  updateLenChip();
  loadStreak();
}

function moveBoardCursor(dc) {
  if (state !== "playing" || animating) return;
  boardCursor = Math.max(0, Math.min(colCount - 1, boardCursor + dc));
  renderBoard();
}

function moveKeyCursor(dr, dc) {
  if (dr !== 0) {
    let nr = keyCursor.row + dr;
    if (nr < 0) nr = 0;
    if (nr >= KEY_ROWS.length) nr = KEY_ROWS.length - 1;
    const target = KEY_ROWS[nr];
    const nc = Math.min(keyCursor.col, target.length - 1);
    keyCursor = { row: nr, col: nc };
  } else if (dc !== 0) {
    const row = KEY_ROWS[keyCursor.row];
    let nc = keyCursor.col + dc;
    if (nc < 0) nc = 0;
    if (nc >= row.length) nc = row.length - 1;
    keyCursor = { row: keyCursor.row, col: nc };
  }
  renderKeyboard();
}

function pressVirtualKey() {
  const key = KEY_ROWS[keyCursor.row][keyCursor.col];
  if (key === "enter") submitGuess();
  else if (key === "back") backspace();
  else typeLetter(key);
}

function handleKeyDown(e) {
  if (e.key === "Tab") {
    e.preventDefault();
    return;
  }

  const menuOpen = !modalLayer.classList.contains("hidden");
  if (menuOpen) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveMenuFocus(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveMenuFocus(1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      activateMenu();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      hideMenu();
      return;
    }
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    openMidMenu();
    return;
  }

  if (e.key === "Enter") {
    e.preventDefault();
    if (state !== "playing") return;
    if (focusMode === "keys") pressVirtualKey();
    else submitGuess();
    return;
  }

  if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();
    backspace();
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (focusMode === "board") {
      focusMode = "keys";
      keyCursor = { row: 0, col: 0 };
      renderBoard();
      renderKeyboard();
    } else if (keyCursor.row === 0) {
      openMidMenu();
    } else {
      moveKeyCursor(-1, 0);
    }
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (focusMode === "keys") {
      if (keyCursor.row >= KEY_ROWS.length - 1) {
        focusMode = "board";
        renderKeyboard();
        renderBoard();
      } else {
        moveKeyCursor(1, 0);
      }
    }
    return;
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    if (focusMode === "board") moveBoardCursor(-1);
    else moveKeyCursor(0, -1);
    return;
  }

  if (e.key === "ArrowRight") {
    e.preventDefault();
    if (focusMode === "board") moveBoardCursor(1);
    else moveKeyCursor(0, 1);
    return;
  }

  if (/^[a-zA-Z]$/.test(e.key)) {
    e.preventDefault();
    focusMode = "board";
    typeLetter(e.key.toLowerCase());
    renderKeyboard();
  }
}

document.addEventListener("keydown", handleKeyDown, true);
document.addEventListener("mousedown", e => e.preventDefault());
document.addEventListener("mouseup", e => e.preventDefault());
document.addEventListener("click", e => e.preventDefault());
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dragstart", e => e.preventDefault());
document.addEventListener("dblclick", e => e.preventDefault());

function init() {
  const savedLen = Number(localStorage.getItem("wordle-len") || 5);
  colCount = [3, 4, 5, 6].includes(savedLen) ? savedLen : 5;
  updateLenChip();
  answer = pickAnswer();
  buildBoard();
  buildKeyboard();
  renderBoard();
  renderKeyboard();
  loadStreak();
  loadWordLists();
  showLengthMenu(true);
}

init();
