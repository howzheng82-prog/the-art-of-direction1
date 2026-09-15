const $ = s => document.querySelector(s);

// 曲目数据
const songs = [
  { mark: "🟢", name: "Canon in D", composer: "Johann Pachelbel", bpm: 84 },
  { mark: "🟢", name: "Ode to Joy", composer: "Ludwig van Beethoven", bpm: 92 },
  { mark: "🟡", name: "Eine kleine Nachtmusik", composer: "Wolfgang Amadeus Mozart", bpm: 108 },
  { mark: "🟡", name: "Für Elise", composer: "Ludwig van Beethoven", bpm: 96 },
  { mark: "🟠", name: "Hungarian Dance No. 5", composer: "Johannes Brahms", bpm: 126 },
  { mark: "🔴", name: "William Tell Overture", composer: "Gioachino Rossini", bpm: 144 },
  { mark: "🔴", name: "1812 Overture", composer: "Pyotr Ilyich Tchaikovsky", bpm: 132 }
];

let state = { song: 0, playing: false, paused: false, phase: "intro", events: [], eventIndex: 0, start: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0, perfect: 0, good: 0, total: 0 };

function show(id) {
  document.querySelectorAll(".screen").forEach(x => x.classList.add("hidden"));
  $("#" + id).classList.remove("hidden");
}

/* =========================================================
   0. 加载流程 (Loading Screen)
   ========================================================= */
const loadingSteps = [
  "Preparing the stage...",
  "Tuning the orchestra...",
  "Preparing the score...",
  "Almost ready...",
  "Ready."
];

function runLoadingScreen() {
  let step = 0;
  let progress = 0;
  const bar = $("#loadingBar");
  const text = $("#loadingText");

  const interval = setInterval(() => {
    progress += 25; // 每次增加25%
    if (progress > 100) progress = 100;
    bar.style.width = progress + "%";
    
    // 更新文字
    text.textContent = loadingSteps[step];
    step++;

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        show("menu"); // 加载完毕，进入主菜单
      }, 1000);
    }
  }, 600); // 每600毫秒走一步，总共3秒左右
}

/* =========================================================
   1. 界面切换与主菜单逻辑
   ========================================================= */
$("#startBtn").onclick = () => { show("songs"); makeSongs(); };
$("#backMenu").onclick = () => show("menu");
$("#creditsBtn").onclick = () => alert("这只是一个测试版，先把界面跑通！");

function makeSongs() {
  let list = $("#songList"); 
  list.innerHTML = "";
  songs.forEach((s, i) => {
    let b = document.createElement("button"); 
    b.className = "song";
    b.innerHTML = `<span class="mark">${s.mark}</span><span><b>${s.name}</b><small>${s.composer}</small></span>`;
    b.onclick = () => goToPrep(i); 
    list.appendChild(b);
  });
}

/* =========================================================
   2. 准备界面逻辑 (Preparation)
   ========================================================= */
function goToPrep(index) {
  state.song = index;
  $("#prepTitle").textContent = songs[index].name.toUpperCase();
  $("#prepComposer").textContent = songs[index].composer;
  show("prep");

  // 模拟“准备”动画 3秒，然后进入游戏
  setTimeout(() => {
    startSong(index);
  }, 3000);
}

/* =========================================================
   3. 游戏核心逻辑 (暂时保留之前的 2.5D 架子)
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

// 2.5D 核心渲染
const band = [
  { inst: "🎶", x: 0.2, z: 0.5 }, { inst: "🎵", x: 0.4, z: 0.5 }, { inst: "🎷", x: 0.6, z: 0.5 }, { inst: "🎶", x: 0.8, z: 0.5 },
  { inst: "🎺", x: 0.25, z: 1.5 }, { inst: "🎺", x: 0.45, z: 1.5 }, { inst: "📯", x: 0.65, z: 1.5 }, { inst: "🎺", x: 0.85, z: 1.5 },
  { inst: "🥁", x: 0.35, z: 2.5 }, { inst: "🎺", x: 0.55, z: 2.5 }, { inst: "🥁", x: 0.75, z: 2.5 }
];

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
    if (ctx.roundRect) ctx.roundRect(screenX - bodyW/2, screenY - 10 * scale, bodyW, bodyH, 8 * scale);
    else ctx.rect(screenX - bodyW/2, screenY - 10 * scale, bodyW, bodyH);
    ctx.fill();

    ctx.fillStyle = "#d5a58b";
    ctx.beginPath(); ctx.arc(screenX, screenY - 30 * scale, 14 * scale, 0, Math.PI * 2); ctx.fill();

    ctx.font = `${Math.max(12, 24 * sca