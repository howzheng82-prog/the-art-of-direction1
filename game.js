const $ = s => document.querySelector(s);

// 曲目列表（暂不加载真实音频，避免白屏）
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

/* =========================================================
   🌟 2.5D 核心渲染代码
   ========================================================= */
// 乐团布局（加入 z 表示深度，z 越大越远）
// 我们按照管乐团合理的座位：长笛靠近小号，打击乐在最后方
const band = [
  // 第一排（木管，近处，z=0.5）
  { inst: "🎶", x: 0.2, z: 0.5 }, { inst: "🎵", x: 0.4, z: 0.5 }, { inst: "🎷", x: 0.6, z: 0.5 }, { inst: "🎶", x: 0.8, z: 0.5 },
  // 第二排（铜管，中间，z=1.5）
  { inst: "🎺", x: 0.25, z: 1.5 }, { inst: "🎺", x: 0.45, z: 1.5 }, { inst: "📯", x: 0.65, z: 1.5 }, { inst: "🎺", x: 0.85, z: 1.5 },
  // 第三排（打击乐与低音铜管，最后方，z=2.5）
  { inst: "🥁", x: 0.35, z: 2.5 }, { inst: "🎺", x: 0.55, z: 2.5 }, { inst: "🥁", x: 0.75, z: 2.5 }
];

function drawScene() {
  let w = innerWidth, h = innerHeight;
  ctx.clearRect(0, 0, w, h);

  // 背景：模拟舞台灯光与深度
  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a2238"); // 顶部远处暗
  g.addColorStop(0.5, "#283650"); // 中间舞台
  g.addColorStop(1, "#070a12"); // 底部近处深色
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // 绘制指挥台底部的黑影，增强第一人称视角
  ctx.fillStyle = "#05070e";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.2, h * 0.85);
  ctx.lineTo(w * 0.8, h * 0.85);
  ctx.lineTo(w, h);
  ctx.fill();

  // 2.5D 参数定义
  const horizonY = h * 0.45; // 地平线位置（越远的乐手越靠近这里）
  const floorY = h * 0.95;   // 舞台最前沿（离玩家最近的位置）
  const centerX = w / 2;

  // 核心：按深度 z 排序，远的先画，近的后画（解决遮挡问题）
  band.sort((a, b) => b.z - a.z);

  band.forEach((member) => {
    // 1. 计算透视缩放比例 (Scale)
    // z 越小（越近），scale 越接近 1；z 越大（越远），scale 越小
    let scale = 1 / (1 + member.z * 0.4); 
    
    // 2. 计算屏幕上的 Y 坐标（透视压缩）
    // 通过从地平线到地板进行插值，越远越靠近地平线
    let screenY = horizonY + (floorY - horizonY) * scale;
    
    // 3. 计算屏幕上的 X 坐标（向中心点收敛）
    let screenX = centerX + (member.x * w - centerX) * scale;

    // 4. 根据缩放比例绘制乐手
    let bodyW = 40 * scale;
    let bodyH = (state.phase === "perform" ? 50 : 30) * scale; // 演奏时身体挺拔，等待时坐着
    let headR = 14 * scale;

    // 画身体
    ctx.fillStyle = "#1a2238";
    ctx.beginPath();
    // 用 roundRect 画圆角矩形身体
    if (ctx.roundRect) {
      ctx.roundRect(screenX - bodyW/2, screenY - 10 * scale, bodyW, bodyH, 8 * scale);
    } else {
      ctx.rect(screenX - bodyW/2, screenY - 10 * scale, bodyW, bodyH);
    }
    ctx.fill();

    // 画头部
    ctx.fillStyle = "#d5a58b";
    ctx.beginPath();
    ctx.arc(screenX, screenY - (20 + 10) * scale, headR, 0, Math.PI * 2);
    ctx.fill();

    // 画乐器（或者音符）
    ctx.font = `${Math.max(12, 24 * scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = state.phase === "perform" ? "#ffd700" : "#ffffff"; // 演奏时金色
    let instY = screenY + 5 * scale;
    ctx.fillText(state.phase === "perform" ? "🎵" : member.inst, screenX, instY);
  });
}
/* ========================================================= */

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
  state.score = state.com