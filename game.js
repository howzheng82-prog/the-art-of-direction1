const $ = s => document.querySelector(s);

// 曲目列表（暂时不加载真实音频，确保游戏能跑）
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

// 绘制第一人称管乐团（这里包含了坐姿和起立两种状态）
function drawScene(phase = "waiting") {
  let w = innerWidth, h = innerHeight;
  ctx.clearRect(0, 0, w, h);

  // 背景渐变
  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#283650"); g.addColorStop(1, "#070a12");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // 管乐团布局
  let band = [
    ["🎶", 0.20, 0.55], ["🎺", 0.35, 0.55], ["🎵", 0.50, 0.55], ["🎺", 0.65, 0.55],
    ["📯", 0.25, 0.70], ["🎺", 0.45, 0.70], ["🎺", 0.65, 0.70], ["🥁", 0.50, 0.85]
  ];

  band.forEach(([ins, x, y]) => {
    let px = w * x, py = h * y;
    
    // 如果是等待/鞠躬阶段，乐手是坐着的，身体画得矮一点
    let bodyHeight = (phase === "waiting") ? 30 : 50;
    let instrumentY = (phase === "waiting") ? py + 15 : py + 5;

    // 身体
    ctx.fillStyle = "#1a2238";
    ctx.beginPath(); ctx.roundRect(px - 20, py - 10, 40, bodyHeight, 10); ctx.fill();
    
    // 头部
    ctx.fillStyle = "#d5a58b";
    ctx.beginPath(); ctx.arc(px, py - 20, 14, 0, Math.PI * 2); ctx.fill();
    
    // 乐器（起立/演奏时才发光，或者举起）
    ctx.font = (phase === "waiting") ? "18px sans-serif" : "26px sans-serif";
    ctx.textAlign = "center";
    if (phase === "perform") {
      ctx.fillStyle = "#ffd700"; // 演奏时金色
    } else {
      ctx.fillStyle = "#ffffff";
    }
    ctx.fillText(phase === "perform" ? "🎵" : ins, px, instrumentY);
  });
}

// 开场动画的时间轴（用真实时间模拟）
function updateIntroAnimation(elapsed) {
  // 0秒 ~ 1秒：面向观众（我们直接画一个简单的观众席过渡）
  if (elapsed < 1) {
    ctx.fillStyle = "#05070e";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = "#ffd700";
    ctx.font = "40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎻 面向观众...", innerWidth / 2, innerHeight / 2);
  }
  // 1秒 ~ 2秒：转向乐团（鞠躬过渡）
  else if (elapsed < 2) {
    drawScene("waiting");
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = "#ffd700";
    ctx.font = "40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎻 鞠躬...", innerWidth / 2, innerHeight / 2);
  }
  // 2秒 ~ 3秒：举起指挥棒，乐手起立
  else if (elapsed < 3) {
    drawScene("ready");
    // 给双手一个向上抬起的动画
    let handY = 3 + (1 - (3 - elapsed)) * 5; 
    $("#leftHand").style.bottom = handY + "%";
    $("#rightHand").style.bottom = handY + "%";
  }
  // 3秒后：开始游戏
  else {
    state.phase = "perform";
    $("#leftHand").style.bottom = "3%"; // 手回到原位
    $("#rightHand").style.bottom = "3%";
    drawScene("perform");
  }
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
  state.eventIndex = 0; 
  state.phase = "intro"; 
  state.playing = true; 
  state.paused = false;
  
  show("game"); 
  $("#songName").textContent = songs[i].name;
  resize();
  
  state.start = performance.now();
  state.events = b