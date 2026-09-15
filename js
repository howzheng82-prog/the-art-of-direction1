/* ================================================================
   Tiny Orchestra Adventure  ——  game.js
   （整理重写版，逻辑与原版一致，仅调整结构与缩进）
   ================================================================ */

const $ = s => document.querySelector(s);

/* ---------------------------- 曲目数据 ---------------------------- */
const songs = [
  { mark: "🟢", name: "Canon in D",             composer: "Johann Pachelbel",         bpm: 84,  src: "audio/canon-in-d.ogg" },
  { mark: "🟢", name: "Ode to Joy",             composer: "Ludwig van Beethoven",     bpm: 92,  src: "audio/ode-to-joy.ogg" },
  { mark: "🟡", name: "Eine kleine Nachtmusik", composer: "Wolfgang Amadeus Mozart",  bpm: 108, src: "audio/eine-kleine-nachtmusik.ogg" },
  { mark: "🟡", name: "Für Elise",              composer: "Ludwig van Beethoven",     bpm: 96,  src: "audio/fur-elise.ogg" },
  { mark: "🟠", name: "Hungarian Dance No. 5",  composer: "Johannes Brahms",          bpm: 126, src: "audio/hungarian-dance-no-5.ogg" },
  { mark: "🔴", name: "William Tell Overture",  composer: "Gioachino Rossini",        bpm: 144, src: "audio/william-tell-overture.ogg" },
  { mark: "🔴", name: "1812 Overture",          composer: "Pyotr Ilyich Tchaikovsky", bpm: 132, src: "audio/1812-overture.ogg" }
];

/* ---------------------------- 全局状态 ---------------------------- */
let state = {
  song: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  hits: 0,
  misses: 0,
  perfect: 0,
  good: 0,
  total: 0,
  playing: false,
  paused: false,
  phase: "intro",
  events: [],
  eventIndex: 0,
  start: 0,
  last: 0,
  gesture: null,
  trail: null
};

/* ---------------------------- 音频对象 ---------------------------- */
let audio = new Audio();
audio.preload = "auto";
audio.volume = 0.8;

/* ---------------------------- 画布初始化 -------------------------- */
const scene = $("#scene");
const ctx = scene.getContext("2d");

/* ---------------------------- 界面切换 ---------------------------- */
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

/* ---------------------------- 曲目列表 ---------------------------- */
function makeSongs() {
  let list = $("#songList");
  list.innerHTML = "";
  songs.forEach((s, i) => {
    let b = document.createElement("button");
    b.className = "song";
    b.innerHTML = `<span class="mark">${s.mark}</span><span><b>${s.name}</b><small>${s.composer}</small></span>`;
    b.onclick = () => startSong(i);
    list.appendChild(b);
  });
}

/* ---------------------------- 场景绘制 ---------------------------- */
function drawScene() {
  let w = innerWidth, h = innerHeight;

  ctx.clearRect(0, 0, w, h);

  // 背景渐变
  let g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#283650");
  g.addColorStop(0.55, "#151e32");
  g.addColorStop(1, "#070a12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 舞台台面
  ctx.fillStyle = "#0b101d";
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h);
  ctx.lineTo(w * 0.35, h * 0.48);
  ctx.lineTo(w * 0.65, h * 0.48);
  ctx.lineTo(w * 0.92, h);
  ctx.fill();

  // 台面横线
  ctx.strokeStyle = "#3b4968";
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    let y = h * 0.5 + i * i * h * 0.01;
    ctx.beginPath();
    ctx.moveTo(w * 0.08 + i * w * 0.02, y);
    ctx.lineTo(w * 0.92 - i * w * 0.02, y);
    ctx.stroke();
  }

  // 乐手
  let people = [
    ["Flute", 0.20, 0.57, "🎶"],
    ["Clarinet", 0.34, 0.57, "🎵"],
    ["Saxophone", 0.48, 0.57, "🎷"],
    ["Trumpet", 0.62, 0.57, "🎺"],
    ["Horn", 0.28, 0.70, "📯"],
    ["Trombone", 0.48, 0.70, "🎺"],
    ["Low Brass", 0.68, 0.70, "🎺"],
    ["Percussion", 0.50, 0.86, "🥁"]
  ];

  people.forEach(([name, x, y, ins]) => {
    let px = w * x, py = h * y;
    let scale = 1 - (y - 0.5) * 0.8;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(scale, scale);

    // 头
    ctx.fillStyle = "#d5a58b";
    ctx.beginPath();
    ctx.arc(0, -42, 17, 0, Math.PI * 2);
    ctx.fill();

    // 身体
    ctx.fillStyle = "#29344e";
    ctx.beginPath();
    ctx.roundRect(-28, -25, 56, 75, 15);
    ctx.fill();

    // 乐器 / 音符
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.phase === "perform" ? "🎵" : ins, 0, 5);

    ctx.restore();
  });

  // 指挥台
  ctx.fillStyle = "#b9a27b";
  ctx.fillRect(w * 0.44, h * 0.84, w * 0.12, h * 0.035);
}

/* ---------------------------- 反馈文字 ---------------------------- */
function feedback(t, bad = false) {
  let f = $("#feedback");
  f.textContent = t;
  f.style.color = bad ? "#ff6d78" : "#d9f5ff";
  f.style.opacity = 1;
  clearTimeout(feedback.timer);
  feedback.timer = setTimeout(() => (f.style.opacity = 0), 450);
}

/* ---------------------------- 计分 ---------------------------- */
function addScore(kind) {
  state.total++;

  if (kind === "Miss") {
    state.misses++;
    state.combo = 0;
    feedback("MISS", true);
    return;
  }

  state.hits++;
  state.combo++;
  state.maxCombo = Math.max(state.maxCombo, state.combo);

  if (kind === "Perfect") {
    state.perfect++;
    state.score += 1000;
    feedback("PERFECT");
  } else {
    state.good++;
    state.score += kind === "Great" ? 700 : 400;
    feedback(kind);
  }
}

/* ---------------------------- 事件生成 ---------------------------- */
function buildEvents() {
  let arr = [];
  let beat = 60 / songs[state.song].bpm;
  let endTime = Math.max(48, Math.min(90, audio.duration || 65));

  for (let t = 3; t < endTime; t += beat) {
    let dirs = ["←", "↑", "↓", "→"];
    arr.push({ t, type: "beat", dir: dirs[arr.length % 4], done: false });

    // 声部 Cue
    if (arr.length % 19 === 7) {
      arr.push({
        t: t + 0.12,
        type: "cue",
        done: false,
        section: ["Flute", "Trumpet", "Clarinet", "Percussion"][arr.length % 4]
      });
    }

    // 力度变化 Dynamics
    if (arr.length % 23 === 11) {
      arr.push({ t: t + 0.25, type: "dyn", done: false });
    }
  }

  return arr.sort((a, b) => a.t - b.t);
}

/* ---------------------------- 开始一首曲子 ------------------------ */
function startSong(i) {
  state.song = i;
  state.score = state.combo = state.maxCombo = 0;
  state.hits = state.misses = state.perfect = state.good = state.total = 0;
  state.eventIndex = 0;
  state.phase = "intro";
  state.playing = true;
  state.paused = false;

  show("game");
  $("#songName").textContent = songs[i].name;
  resize();

  audio.pause();
  audio.currentTime = 0;
  audio.src = songs[i].src;
  audio.volume = +$("#musicVol").value;
  audio.onerror = () => feedback("音频尚未放入 audio 文件夹", true);
  audio.play().catch(() => {});

  state.start = performance.now();
  state.last = state.start;
  state.events = buildEvents();

  if (!localStorage.getItem("tadTutorial")) showTutorial();

  requestAnimationFrame(loop);
}

/* ---------------------------- 教学提示 ---------------------------- */
function showTutorial() {
  state.paused = true;
  $("#tutorial").classList.remove("hidden");
  $("#tutorialText").textContent =
    "箭头靠近时，用手指向对应方向滑动；圆圈先点击。Cue 要先点圆圈，再点目标声部；Dynamics 要按住手指沿彩色轨迹移动，最后在 ● 处松开。";
  $("#tutorialNext").onclick = () => {
    $("#tutorial").classList.add("hidden");
    state.paused = false;
    localStorage.setItem("tadTutorial", "1");
  };
}

/* ---------------------------- 生成提示元素 ------------------------ */
function spawnEvent(e, now) {
  if (e.spawned) return;
  e.spawned = true;

  let p = document.createElement("div");
  p.className = "prompt";
  p.dataset.id = state.events.indexOf(e);
  p.textContent = e.type === "beat" ? e.dir : "●";
  if (e.type !== "beat") p.classList.add("special");
  $("#promptLayer").appendChild(p);

  e.el = p;

  if (e.type === "cue") p.onclick = () => cueTap(e);
  if (e.type === "dyn") p.onclick = () => dynStart(e);
}

/* ---------------------------- Cue 交互 ---------------------------- */
function cueTap(e) {
  if (e.done) return;
  e.done = true;
  addScore("Great");
  feedback("选择 " + e.section);

  let idx = ["Flute", "Trumpet", "Clarinet", "Percussion"].indexOf(e.section);
  setTimeout(() => {
    feedback("Cue " + e.section);
    addScore("Perfect");
  }, 250);
}

/* ---------------------------- Dynamics 交互 ----------------------- */
function dynStart(e) {
  if (e.done) return;
  e.done = true;
  addScore("Great");

  setTimeout(() => {
    let tr = document.createElement("div");
    tr.className = "trail";
    tr.style.left = "15%";
    tr.style.top = 35 + Math.random() * 30 + "%";
    tr.style.width = "70%";
    $("#promptLayer").appendChild(tr);

    let dot = document.createElement("div");
    dot.className = "trailDot";
    dot.textContent = "●";
    dot.style.left = "84%";
    dot.style.top = tr.style.top;
    $("#promptLayer").appendChild(dot);

    state.trail = {
      tr,
      dot,
      start: performance.now(),
      end: performance.now() + 3200
    };
  }, 2000);
}

/* ---------------------------- 箭头判定 ---------------------------- */
function processBeat(e) {
  if (e.done) return;
  e.done = true;

  let g = state.gesture;
  if (g && Math.abs(g.dy) + Math.abs(g.dx) > 18) {
    let dx = g.dx, dy = g.dy;
    let dir = Math.abs(dx) > Math.abs(dy)
      ? (dx < 0 ? "←" : "→")
      : (dy < 0 ? "↑" : "↓");
    addScore(dir === e.dir ? "Perfect" : "Good");
  } else {
    addScore("Miss");
  }
}

/* ---------------------------- 主循环 ------------------------------ */
function loop(now) {
  if (!state.playing) return;

  let elapsed = audio.currentTime || (now - state.start) / 1000;

  if (!state.paused) {
    // 前奏结束 -> 进入演奏
    if (state.phase === "intro" && elapsed > 2) {
      state.phase = "perform";
      drawScene();
    }

    if (state.phase === "perform") {
      // 提前 1.2 秒生成提示
      while (
        state.eventIndex < state.events.length &&
        state.events[state.eventIndex].t < elapsed + 1.2
      ) {
        spawnEvent(state.events[state.eventIndex], elapsed);
        state.eventIndex++;
      }

      // 更新提示位置与判定
      document.querySelectorAll(".prompt").forEach(p => {
        let e = state.events[+p.dataset.id];
        let d = e.t - elapsed + 1.2;
        let z = Math.max(0.25, 1 - d / 1.2);
        p.style.transform = `translate(-50%,-50%) scale(${z})`;
        p.style.opacity = d < 0 ? "0" : ".95";

        if (d < 0 && !e.done) {
          if (e.type === "beat") {
            processBeat(e);
          } else {
            e.done = true;
            addScore("Miss");
          }
        }
      });

      // 结束判定
      if (audio.ended || elapsed > Math.max(55, audio.duration || 60)) {
        finish();
      }
    }
  }

  // HUD 更新
  $("#score").textContent = state.score;
  $("#combo").textContent = state.combo;
  $("#accuracy").textContent =
    (state.total ? Math.round((state.hits / state.total) * 100) : 100) + "%";
  $("#clock").textContent =
    Math.floor(elapsed / 60) + ":" + String(Math.floor(elapsed % 60)).padStart(2, "0");

  state.last = now;
  requestAnimationFrame(loop);
}

/* ---------------------------- 结算 -------------------------------- */
function finish() {
  state.playing = false;
  audio.pause();
  show("result");

  let acc = state.total ? Math.round((state.hits / state.total) * 100) : 100;

  $("#reaction").textContent = acc >= 80 ? "🌸🌸🌸🌸🌸" : "🍎🍅🍊🍌";
  $("#resultStats").innerHTML = `
    <div class="resultgrid">
      <div>Score<br><b>${state.score}</b></div>
      <div>Accuracy<br><b>${acc}%</b></div>
      <div>Max Combo<br><b>${state.maxCombo}</b></div>
      <div>Perfect / Great<br><b>${state.perfect} / ${state.good}</b></div>
      <div>Miss<br><b>${state.misses}</b></div>
      <div>曲目<br><b>${songs[state.song].name}</b></div>
    </div>`;
}

/* ---------------------------- 按钮事件 ---------------------------- */
$("#pauseBtn").onclick = () => {
  state.paused = true;
  $("#pauseOverlay").classList.remove("hidden");
  audio.pause();
};

$("#continueBtn").onclick = () => {
  state.paused = false;
  $("#pauseOverlay").classList.add("hidden");
  audio.play().catch(() => {});
};

$("#musicVol").oninput = e => (audio.volume = +e.target.value);

$("#restartBtn").onclick = () => startSong(state.song);

$("#songMenuBtn").onclick = () => {
  state.playing = false;
  audio.pause();
  $("#pauseOverlay").classList.add("hidden");
  show("songs");
};

$("#againBtn").onclick = () => startSong(state.song);

$("#resultMenuBtn").onclick = () => show("songs");

$("#startBtn").onclick = () => {
  makeSongs();
  show("songs");
};

$("#backMenu").onclick = () => show("menu");
$("#creditsBtn").onclick = () => show("credits");
$("#creditsBack").onclick = () => show("menu");

/* ---------------------------- 手势输入 ---------------------------- */
let pointer = null;

addEventListener("pointerdown", e => {
  if (!state.playing || state.paused) return;
  pointer = { x: e.clientX, y: e.clientY };
  state.gesture = { dx: 0, dy: 0 };
});

addEventListener("pointermove", e => {
  if (!pointer) return;
  state.gesture = { dx: e.clientX - pointer.x, dy: e.clientY - pointer.y };
});

addEventListener("pointerup", () => {
  pointer = null;
});

/* ---------------------------- 启动 -------------------------------- */
makeSongs();
resize();