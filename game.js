const $ = s => document.querySelector(s);

// 歌曲列表（带星星和颜色）
const songs = [
  { mark: "★", name: "Canon in D", composer: "Johann Pachelbel", bpm: 84, stars: 1, color: "#80cfa0" },
  { mark: "★★", name: "Ode to Joy", composer: "Ludwig van Beethoven", bpm: 92, stars: 2, color: "#f0d060" },
  { mark: "★★", name: "Eine kleine Nachtmusik", composer: "Wolfgang Amadeus Mozart", bpm: 108, stars: 2, color: "#f0d060" },
  { mark: "★★★", name: "Für Elise", composer: "Ludwig van Beethoven", bpm: 96, stars: 3, color: "#f0a050" },
  { mark: "★★★★", name: "Hungarian Dance No. 5", composer: "Johannes Brahms", bpm: 126, stars: 4, color: "#f07070" },
  { mark: "★★★★★", name: "William Tell Overture", composer: "Gioachino Rossini", bpm: 144, stars: 5, color: "#f05050" },
  { mark: "★★★★★", name: "1812 Overture", composer: "Pyotr Ilyich Tchaikovsky", bpm: 132, stars: 5, color: "#f05050" }
];

let state = { song: 0, playing: false, paused: false, phase: "intro", events: [], eventIndex: 0, start: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0, perfect: 0, good: 0, total: 0 };

function show(id) {
  document.querySelectorAll(".screen").forEach(x => x.classList.add("hidden"));
  $("#" + id).classList.remove("hidden");
}

/* =========================================================
   0. 加载流程
   ========================================================= */
const loadingSteps = ["Preparing the stage...", "Tuning the orchestra...", "Preparing the score...", "Almost ready...", "Ready."];

function runLoadingScreen() {
  let step = 0, progress = 0;
  const bar = $("#loadingBar"), text = $("#loadingText");
  const interval = setInterval(() => {
    progress += 25;
    if (progress > 100) progress = 100;
    bar.style.width = progress + "%";
    text.textContent = loadingSteps[step];
    step++;
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => show("menu"), 1000);
    }
  }, 600);
}

/* =========================================================
   1. 界面切换与主菜单
   ========================================================= */
$("#startBtn").onclick = () => { show("songs"); makeSongs(); };
$("#backMenu").onclick = () => show("menu");
$("#creditsBtn").onclick = () => alert("这只是一个测试版，先把界面跑通！");

function makeSongs() {
  let list = $("#songList"); list.innerHTML = "";
  songs.forEach((s, i) => {
    let b = document.createElement("button"); b.className = "song";
    b.innerHTML = `<span class="stars" style="color:${s.color}">${s.mark}</span><span><b>${s.name}</b><small>${s.composer}</small></span>`;
    b.onclick = () => goToPrep(i); list.appendChild(b);
  });
}

/* =========================================================
   2. 准备界面
   ========================================================= */
function goToPrep(index) {
  state.song = index;
  $("#prepTitle").textContent = songs[index].name.toUpperCase();
  $("#prepComposer").textContent = songs[index].composer;
  show("prep");
  setTimeout(() => startSong(index), 3000);
}

/* =========================================================
   3. 游戏核心逻辑（2.5D + 三轨下落箭头）
   ========================================================= */
const scene = $("#scene");
const ctx = scene.getContext("2d");

function resize() {
  scene.width = innerWidth * devicePixelRatio;
  scene.height = innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  drawScene();
}
addEventListener("resize", resize);

const band = [
  { id: 0, inst: "🎶", x: 0.2, z: 0.5, noteTimer: 0 }, { id: 1, inst: "🎵", x: 0.4, z: 0.5, noteTimer: 0 }, { id: 2, inst: "🎷", x: 0.6, z: 0.5, noteTimer: 0 }, { id: 3, inst: "🎶", x: 0.8, z: 0.5, noteTimer: 0 },
  { id: 4, inst: "🎺", x: 0.25, z: 1.5, noteTimer: 0 }, { id: 5, inst: "🎺", x: 0.45, z: 1.5, noteTimer: 0 }, { id: 6, inst: "📯", x: 0.65, z: 1.5, noteTimer: 0 }, { id: 7, inst: "🎺", x: 0.85, z: 1.5, noteTimer: 0 },
  { id: 8, inst: "🥁", x: 0.35, z: 2.5, noteTimer: 0 }, { id: 9, inst: "🎺", x: 0.55, z: 2.5, noteTimer: 0 }, { id: 10, inst: "🥁", x: 0.75, z: 2.5, noteTimer: 0 }
];

// 🌟 全新的画观众席函数
function drawAudience() {
  let w = innerWidth, h = innerHeight;
  ctx.fillStyle = "#0a0f1a"; // 昏暗的观众席背景
  ctx.fillRect(0, 0, w, h);
  
  // 画一排排的观众轮廓
  ctx.fillStyle = "#1b2542";
  for (let row = 0; row < 6; row++) {
    let y = h * 0.3 + row * (h * 0.12);
    for (let col = 0; col < 20; col++) {
      let x = (col * (w / 20)) + (w / 40);
      ctx.beginPath();
      ctx.arc(x, y, 10 + row * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 10 - row, y + 10, 20 + row * 2, 20);
    }
  }
  
  // 指挥台边缘
  ctx.fillStyle = "#05070e";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.2, h * 0.8);
  ctx.lineTo(w * 0.8, h * 0.8);
  ctx.lineTo(w, h);
  ctx.fill();
}

function drawScene() {
  let w = innerWidth, h = innerHeight;
  ctx.clearRect(0, 0, w, h);
  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a2238"); g.addColorStop(0.5, "#283650"); g.addColorStop(1, "#070a12");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#05070e";
  ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w * 0.2, h * 0.85); ctx.lineTo(w * 0.8, h * 0.85); ctx.lineTo(w, h); ctx.fill();

  const horizonY = h * 0.45, floorY = h * 0.95, centerX = w / 2;
  band.sort((a, b) => b.z - a.z);

  band.forEach((member) => {
    let scale = 1 / (1 + member.z * 0.4);
    let screenY = horizonY + (floorY - horizonY) * scale;
    let screenX = centerX + (member.x * w - centerX) * scale;
    let bodyW = 40 * scale, bodyH = (state.phase === "perform" ? 50 : 30) * scale;

    ctx.fillStyle = "#1a2238";
    if (ctx.roundRect) ctx.roundRect(screenX - bodyW / 2, screenY - 10 * scale, bodyW, bodyH, 8 * scale);
    else ctx.rect(screenX - bodyW / 2, screenY - 10 * scale, bodyW, bodyH);
    ctx.fill();

    ctx.fillStyle = "#d5a58b";
    ctx.beginPath(); ctx.arc(screenX, screenY - 30 * scale, 14 * scale, 0, Math.PI * 2); ctx.fill();

    ctx.font = `${Math.max(12, 24 * scale)}px sans-serif`; ctx.textAlign = "center";
    ctx.fillStyle = state.phase === "perform" ? "#ffd700" : "#ffffff";
    ctx.fillText(state.phase === "perform" ? "🎵" : member.inst, screenX, screenY + 5 * scale);

    // 🌟 新增：绘制乐器发声的小音符
    if (member.noteTimer > 0) {
      member.noteTimer -= 0.02; // 计时器慢慢减少
      let noteY = (screenY - 30 * scale) - (1 - member.noteTimer) * 60; // 音符向上飘
      ctx.fillStyle = `rgba(255, 215, 0, ${member.noteTimer})`; // 金色，慢慢变透明
      ctx.font = `${Math.max(10, 20 * scale)}px sans-serif`;
      ctx.fillText("🎵", screenX, noteY);
    }
  });
}

function startSong(i) {
  state.playing = true; state.phase = "intro"; state.eventIndex = 0;
  state.score = 0; state.combo = 0; state.hits = 0; state.misses = 0;
  show("game"); $("#songName").textContent = songs[i].name;
  resize();
  state.start = performance.now();
  state.events = [];
  let beat = 60 / songs[i].bpm;
  for (let t = 3; t < 50; t += beat) {
    state.events.push({ 
      t, type: "beat", 
      dir: ["←", "↑", "↓", "→"][state.events.length % 4], 
      done: false,
      bandId: state.events.length % band.length 
    });
  }
  requestAnimationFrame(loop);
}

/* 生成三轨下落箭头的核心逻辑 */
function spawnEvent(e) {
  if (e.spawned) return; e.spawned = true;
  let p = document.createElement("div"); p.className = "prompt";
  p.dataset.id = state.events.indexOf(e); p.textContent = e.dir;

  // 集中在屏幕中间的窄区域，给 Cue 和 Dynamics 留空间
let trackX = 50;
if (e.dir === "←") trackX = 35;
if (e.dir === "→") trackX = 65;
p.style.left = trackX + "%";
p.style.top = "2%";

  $("#promptLayer").appendChild(p); e.el = p;
}

let pointerStart = null;
addEventListener("pointerdown", e => { 
  if (!state.playing || state.paused) return; 
  pointerStart = { x: e.clientX, y: e.clientY }; 
});

addEventListener("pointerup", e => {
  if (!pointerStart || !state.playing || state.paused) return;
  let dx = e.clientX - pointerStart.x, dy = e.clientY - pointerStart.y;
  if (Math.abs(dx) + Math.abs(dy) > 30) {
    let dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "←" : "→") : (dy < 0 ? "↑" : "↓");
    for (let ev of state.events) {
      if (!ev.done && ev.type === "beat") {
        ev.done = true;
        addScore(dir === ev.dir ? "Perfect" : "Good");
        let member = band[ev.bandId];
        if (member) member.noteTimer = 1.0;
        if (ev.el) ev.el.remove(); 
        break; 
      }
    }
  }
  pointerStart = null;
});

function loop(now) {
  if (!state.playing) return;
  let elapsed = (now - state.start) / 1000;

  if (state.phase === "intro") {
  if (elapsed < 1) {
    drawAudience(); // 🌟 改为调用画观众席
    ctx.fillStyle = "#ffd700"; ctx.font = "30px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("面向观众...", innerWidth / 2, innerHeight / 2);
  } else if (elapsed < 2) {
      drawScene();
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = "#ffd700"; ctx.font = "30px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("鞠躬...", innerWidth / 2, innerHeight / 2);
    } else {
      state.phase = "perform"; drawScene();
    }
  } else if (state.phase === "perform") {
    // 生成提前 1.2 秒的箭头
    while (state.eventIndex < state.events.length && state.events[state.eventIndex].t < elapsed + 1.2) {
      spawnEvent(state.events[state.eventIndex]); state.eventIndex++;
    }

    // 更新箭头位置（从上往下落）
    document.querySelectorAll(".prompt").forEach(p => {
      let e = state.events[+p.dataset.id];
      let d = e.t - elapsed + 1.2; // 1.2秒内从 0 变成 1.2
      let progress = Math.max(0, Math.min(1, 1 - d / 1.2)); 
p.style.top = (2 + progress * 70) + "%";
// 改成从 0.1 倍大小开始，变到 0.9 倍大小（从小变大，整体更小更精致）
p.style.transform = `translate(-50%, -50%) scale(${0.1 + progress * 0.8})`;

// 核心修改：越上越暗（0.2），慢慢拉近变亮（1.0）
p.style.opacity = 0.2 + (progress * 0.8);
// 配合滤色，让它从暗灰变成亮白
p.style.filter = `brightness(${0.3 + progress * 0.7})`;

  if (d < 0 && !e.done) { 
    e.done = true; 
    p.style.opacity = 0; // 先变透明
    p.remove(); // 然后彻底从屏幕删除
    feedback("MISS", true); 
    state.misses++; 
    state.combo = 0; 
  }
});

    if (elapsed > 55) { state.playing = false; show("result"); return; }
    drawScene();
  }
  requestAnimationFrame(loop);
}

function feedback(t, bad = false) {
  let f = $("#feedback"); f.textContent = t;
  f.style.color = bad ? "#ff6d78" : "#d9f5ff"; f.style.opacity = 1;
  clearTimeout(feedback.timer);
  feedback.timer = setTimeout(() => f.style.opacity = 0, 450);
}

// 启动
runLoadingScreen();