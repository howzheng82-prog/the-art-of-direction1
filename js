const $ = s => document.querySelector(s);

// 临时占位曲目（先不加载音频，确保游戏能跑）
const songs = [
  { mark: "🟢", name: "Canon in D", composer: "Johann Pachelbel", bpm: 84 },
  { mark: "🟢", name: "Ode to Joy", composer: "Ludwig van Beethoven", bpm: 92 },
  { mark: "🟡", name: "Eine kleine Nachtmusik", composer: "Wolfgang Amadeus Mozart", bpm: 108 },
  { mark: "🟡", name: "Für Elise", composer: "Ludwig van Beethoven", bpm: 96 },
  { mark: "🟠", name: "Hungarian Dance No. 5", composer: "Johannes Brahms", bpm: 126 },
  { mark: "🔴", name: "William Tell Overture", composer: "Gioachino Rossini", bpm: 144 },
  { mark: "🔴", name: "1812 Overture", composer: "Pyotr Ilyich Tchaikovsky", bpm: 132 }
];

let state = {
  song: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0,
  perfect: 0, good: 0, total: 0, playing: false, paused: false,
  phase: "intro", events: [], eventIndex: 0, start: 0, last: 0
};

// 音频占位（不用真实音频，避免崩溃）
let audio = { currentTime: 0, duration: 60, pause: () => {}, play: () => {}, ended: false };

const scene = $("#scene");
const ctx = scene.getContext("2d");

function show(id) {
  document.querySelectorAll(".screen").forEach(x => x.classList.add("hidden"));
  $("#" + id).classList.remove("hidden");
}

function resize() {
  scene.width = innerWidth * devicePixelRatio;
  scene.height = innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  drawScene();
}
addEventListener("resize", resize);

// 绘制第一人称管乐团
function drawScene() {
  let w = innerWidth, h = innerHeight;
  ctx.clearRect(0, 0, w, h);

  // 背景
  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#283650"); g.addColorStop(1, "#070a12");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // 乐团成员（管乐团合理布局：长笛靠小号，打击乐最后）
  let band = [
    ["🎶", 0.20, 0.55], ["🎺", 0.35, 0.55], ["🎵", 0.50, 0.55], ["🎺", 0.65, 0.55],
    ["📯", 0.25, 0.70], ["🎺", 0.45, 0.70], ["🎺", 0.65, 0.70], ["🥁", 0.50, 0.85]
  ];

  band.forEach(([ins, x, y]) => {
    let px = w * x, py = h * y;
    // 坐着的人（非演奏状态）
    ctx.fillStyle = "#1a2238";
    ctx.beginPath(); ctx.roundRect(px - 20, py - 10, 40, 50, 10); ctx.fill();
    // 头
    ctx.fillStyle = "#d5a58b";
    ctx.beginPath(); ctx.arc(px, py - 20, 14, 0, Math.PI * 2); ctx.fill();
    // 乐器/音符（如果是演奏状态就显示动态）
    ctx.font = "24px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(state.phase === "perform" ? "🎵" : ins, px, py + 10);
  });
}

function feedback(t, bad = false) {
  let f = $("#feedback"); f.textContent = t;
  f.style.color = bad ? "#ff6d78" : "#d9f5ff"; f.style.opacity = 1;
  clearTimeout(feedback.timer);
  feedback.timer = setTimeout(() => f.style.opacity = 0, 450);
}

function addScore(kind) {
  state.total++;
  if (kind === "Miss") { state.misses++; state.combo = 0; feedback("MISS", true); return; }
  state.hits++; state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
  if (kind === "Perfect") { state.perfect++; state.score += 1000; feedback("PERFECT"); }
  else { state.good++; state.score += 700; feedback("GREAT"); }
}

// 生成节拍
function buildEvents() {
  let arr = [], beat = 60 / songs[state.song].bpm;
  for (let t = 3; t < 50; t += beat) {
    arr.push({ t, type: "beat", dir: ["←", "↑", "↓", "→"][arr.length % 4], done: false });
  }
  return arr;
}

function startSong(i) {
  state.song = i;
  state.score = state.combo = state.maxCombo = state.hits = state.misses = state.perfect = state.good = state.total = 0;
  state.eventIndex = 0; state.phase = "intro"; state.playing = true; state.paused = false;
  show("game"); $("#songName").textContent = songs[i].name;
  resize();
  
  // 模拟音频时间
  state.start = performance.now();
  state.events = buildEvents();
  requestAnimationFrame(loop);
}

function spawnEvent(e) {
  if (e.spawned) return; e.spawned = true;
  let p = document.createElement("div"); p.className = "prompt";
  p.dataset.id = state.events.indexOf(e); p.textContent = e.type === "beat" ? e.dir : "●";
  $("#promptLayer").appendChild(p); e.el = p;
}

// 手势滑动判定
let pointerStart = null;
addEventListener("pointerdown", e => { if(!state.playing || state.paused) return; pointerStart = { x: e.clientX, y: e.clientY }; });
addEventListener("pointerup", e => {
  if (!pointerStart || !state.playing || state.paused) return;
  let dx = e.clientX - pointerStart.x, dy = e.clientY - pointerStart.y;
  let dist = Math.abs(dx) + Math.abs(dy);
  if (dist > 30) {
    let dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "←" : "→") : (dy < 0 ? "↑" : "↓");
    // 找到当前最近的未完成事件
    for (let e of state.events) {
      if (!e.done && e.type === "beat") {
        e.done = true;
        addScore(dir === e.dir ? "Perfect" : "Good");
        break; // 一次滑动只判定一次！
      }
    }
  }
  pointerStart = null;
});

function loop(now) {
  if (!state.playing) return;
  if (!state.paused) {
    let elapsed = (now - state.start) / 1000; // 用真实时间模拟
    if (state.phase === "intro" && elapsed > 2) {
      state.phase = "perform"; drawScene();
    }
    if (state.phase === "perfo