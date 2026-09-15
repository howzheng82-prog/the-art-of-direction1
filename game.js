const $ = s => document.querySelector(s);

// 曲目列表（暂时不加载真实音频，避免白屏）
const songs = [
  { mark: "🟢", name: "Canon in D", composer: "Johann Pachelbel", bpm: 84 },
  { mark: "🟢", name: "Ode to Joy", composer: "Ludwig van Beethoven", bpm: 92 },
  { mark: "🟡", name: "Eine kleine Nachtmusik", composer: "Wolfgang Amadeus Mozart", bpm: 108 },
  { mark: "🟡", name: "Für Elise", composer: "Ludwig van Beethoven", bpm: 96 },
  { mark: "🟠", name: "Hungarian Dance No. 5", composer: "Johannes Brahms", bpm: 126 },
  { mark: "🔴", name: "William Tell Overture", composer: "Gioachino Rossini", bpm: 144 },
  { mark: "🔴", name: "1812 Overture", composer: "Pyotr Ilyich Tchaikovsky", bpm: 132 }
];

let state = { song: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0, perfect: 0, good: 0, total: 0, playing: false, paused: false, phase: "intro", events: [], eventIndex: 0, start: 0 };

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

  // 背景渐变
  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#283650"); g.addColorStop(1, "#070a12");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // 乐团布局（长笛靠小号，打击乐在后）
  let band = [
    ["🎶", 0.20, 0.55], ["🎺", 0.35, 0.55], ["🎵", 0.50, 0.55], ["🎺", 0.65, 0.55],
    ["📯", 0.25, 0.70], ["🎺", 0.45, 0.70], ["🎺", 0.65, 0.70], ["🥁", 0.50, 0.85]
  ];

  band.forEach(([ins, x, y]) => {
    let px = w * x, py = h * y;
    // 身体
    ctx.fillStyle = "#1a2238";
    ctx.beginPath(); ctx.roundRect(px - 20, py - 10, 40, 50, 10); ctx.fill();
    // 头部
    ctx.fillStyle = "#d5a58b";
    ctx.beginPath(); ctx.arc(px, py - 20, 14, 0, Math.PI * 2); ctx.fill();
    // 乐器 / 音符
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

// 手势滑动判定（一次滑动只判定一次）
let pointerStart = null;
addEventListener("pointerdown", e => { if (!state.playing || state.paused) return; pointerStart = { x: e.clientX, y: e.clientY }; });
addEventListener("pointerup", e => {
  if (!pointerStart || !state.playing || state.paused) return;
  let dx = e.clientX - pointerStart.x, dy = e.clientY - pointerStart.y;
  if (Math.abs(dx) + Math.abs(dy) > 30) {
    let dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "←" : "→") : (dy < 0 ? "↑" : "↓");
    for (let ev of state.events) {
      if (!ev.done && ev.type === "beat") {
        ev.done = true;
        addScore(dir === ev.dir ? "Perfect" : "Good");
        break; // 关键：一次手势只判定一次，不能刷分！
      }
    }
  }
  pointerStart = null;
});

function loop(now) {
  if (!state.playing) return;
  if (!state.paused) {
    let elapsed = (now - state.start) / 1000; // 用真实时间模拟音频时间
    if (state.phase === "intro" && elapsed > 2) {
      state.phase = "perform"; drawScene();
    }
    if (state.phase === "perform") {
      while (state.eventIndex < state.events.length && state.events[state.eventIndex].t < elapsed + 1.2) {
        spawnEvent(state.events[state.eventIndex]); state.eventIndex++;
      }
      document.querySelectorAll(".prompt").forEach(p => {
        let e = state.events[+p.dataset.id];
        let d = e.t - elapsed + 1.2;
        p.style.transform = `translate(-50%,-50%) scale(${Math.max(0.25, 1 - d / 1.2)})`;
        p.style.opacity = d < 0 ? "0" : ".95";
        if (d < 0 && !e.done) { e.done = true; addScore("Miss"); }
      });
      if (elapsed > 55) finish();
    }
  }
  $("#score").textContent = state.score;
  $("#combo").textContent = state.combo;
  $("#accuracy").textContent = (state.total ? Math.round((state.hits / state.total) * 100) : 100) + "%";
  requestAnimationFrame(loop);
}

function finish() {
  state.playing = false; show("result");
  let acc = state.total ? Math.round((state.hits / state.total) * 100) : 100;
  $("#reaction").textContent = acc >= 80 ? "🌸🌸🌸🌸🌸" : "🍎🍅🍊🍌";
  $("#resultStats").innerHTML = `<div>Score: ${state.score}</div><div>Accuracy: ${acc}%</div><div>Max Combo: ${state.maxCombo}</div><div>Perfect / Great: ${state.perfect} / ${state.good}</div>`;
}

// 按钮绑定
$("#startBtn").onclick = () => { show("songs"); makeSongs(); };
$("#backMenu").onclick = () => show("menu");
$("#pauseBtn").onclick = () => { state.paused = true; $("#pauseOverlay").classList.remove("hidden"); };
$("#continueBtn").onclick = () => { state.paused = false; $("#pauseOverlay").classList.add("hidden"); };
$("#restartBtn").onclick = () => startSong(state.song);
$("#songMenuBtn").onclick = () => { state.playing = false; show("songs"); $("#pauseOverlay").classList.add("hidden"); };
$("#againBtn").onclick = () => startSong(state.song);
$("#resultMenuBtn").onclick = () => show("songs");

function makeSongs() {
  let list = $("#songList"); list.innerHTML = "";
  songs.forEach((s, i) => {
    let b = document.createElement("button"); b.className = "song";
    b.innerHTML = `<span class="mark">${s.mark}</span><span><b>${s.name}</b><small>${s.composer}</small></span>`;
    b.onclick = () => startSong(i); list.appendChild(b);
  });
}

makeSongs();
resize();