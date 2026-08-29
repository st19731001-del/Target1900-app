let wordDatabase = [
  { id: 1, word: "create", meaning: "〜を創り出す、引き起こす" },
  { id: 2, word: "increase", meaning: "増加する、〜を増やす" },
  { id: 3, word: "improve", meaning: "〜を向上させる、改善する" },
  { id: 4, word: "provide", meaning: "〜を供給する、与える" },
  { id: 5, word: "consider", meaning: "〜を考慮する、〜とみなす" }
];

let currentMode = "normal";
let currentQuizList = [];
let currentQuestionIndex = 0;
let score = 0;
let isAnswering = false;
let rangeLabel = "全範囲 (1-1900)";
let wrongWordsList = [];

window.addEventListener("DOMContentLoaded", () => {
  fetch("target1900.csv")
    .then(response => {
      if (!response.ok) throw new Error("CSV not found");
      return response.text();
    })
    .then(text => {
      const lines = text.split(/\r\n|\n/);
      const parsedData = [];
      lines.forEach((line, idx) => {
        if (!line.trim()) return;
        const cols = line.split(",");
        if (cols.length >= 2) {
          let id = idx + 1;
          let word = cols[0].replace(/^"|"$/g, '').trim();
          let meaning = cols[1].replace(/^"|"$/g, '').trim();
          if (!isNaN(parseInt(cols[0])) && cols.length >= 3) {
            id = parseInt(cols[0]);
            word = cols[1].replace(/^"|"$/g, '').trim();
            meaning = cols[2].replace(/^"|"$/g, '').trim();
          }
          parsedData.push({ id, word, meaning });
        }
      });
      if (parsedData.length > 0) {
        wordDatabase = parsedData;
      }
    })
    .catch(err => console.log("Using fallback database"));

  const savedName = localStorage.getItem("target_userName");
  if (savedName) document.getElementById("userNameInput").value = savedName;
  updateBestRecordText();
});

function playFanfare() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.3);
    });
  } catch(e){}
}

const tabNormal = document.getElementById("tabNormal");
const tabSurvival = document.getElementById("tabSurvival");
const normalOptions = document.getElementById("normalOptions");
const startBtn = document.getElementById("startBtn");
const hardBtn = document.getElementById("hardBtn");
const rangeSelect = document.getElementById("rangeSelect");
const customRangeGroup = document.getElementById("customRangeGroup");
const questionCountSelect = document.getElementById("questionCount");
const customCountGroup = document.getElementById("customCountGroup");

tabNormal.addEventListener("click", () => {
  currentMode = "normal";
  tabNormal.classList.add("active");
  tabSurvival.classList.remove("active");
  normalOptions.classList.remove("hidden");
  if (questionCountSelect.value === "custom") customCountGroup.classList.remove("hidden");
  hardBtn.classList.add("hidden");
  updateBestRecordText();
});

tabSurvival.addEventListener("click", () => {
  currentMode = "survival";
  tabSurvival.classList.add("active");
  tabNormal.classList.remove("active");
  normalOptions.classList.add("hidden");
  customCountGroup.classList.add("hidden");
  hardBtn.classList.remove("hidden");
  updateBestRecordText();
});

rangeSelect.addEventListener("change", () => {
  if (rangeSelect.value === "custom") {
    customRangeGroup.classList.remove("hidden");
  } else {
    customRangeGroup.classList.add("hidden");
  }
});

questionCountSelect.addEventListener("change", () => {
  if (questionCountSelect.value === "custom") {
    customCountGroup.classList.remove("hidden");
  } else {
    customCountGroup.classList.add("hidden");
  }
});

function updateBestRecordText() {
  const best = localStorage.getItem(`target_best_${currentMode}`) || 0;
  const el = document.getElementById("bestRecordText");
  if (currentMode === "survival") {
    el.textContent = `🏆 サバイバル最高連勝記録: ${best} 問`;
  } else {
    el.textContent = `🏆 通常モード最高スコア: ${best} 点`;
  }
}

startBtn.addEventListener("click", () => startQuiz(false));
hardBtn.addEventListener("click", () => startQuiz(true));

document.getElementById("cancelBtn").addEventListener("click", () => {
  if (confirm("テストを中止して設定画面に戻りますか？")) {
    document.getElementById("quizSection").classList.add("hidden");
    document.getElementById("setupSection").classList.remove("hidden");
  }
});

function startQuiz(isHard) {
  const userName = document.getElementById("userNameInput").value.trim() || "ゲスト";
  localStorage.setItem("target_userName", userName);
  wrongWordsList = [];

  let minId = 1;
  let maxId = 1900;

  if (isHard) {
    rangeLabel = "1900語 ハード全範囲";
  } else {
    const rangeVal = rangeSelect.value;
    if (rangeVal === "1-100") { minId = 1; maxId = 100; rangeLabel = "1-100 必修"; }
    else if (rangeVal === "101-300") { minId = 101; maxId = 300; rangeLabel = "101-300 必修"; }
    else if (rangeVal === "301-800") { minId = 301; maxId = 800; rangeLabel = "301-800 必修"; }
    else if (rangeVal === "801-1500") { minId = 801; maxId = 1500; rangeLabel = "801-1500 標準"; }
    else if (rangeVal === "1501-1900") { minId = 1501; maxId = 1900; rangeLabel = "1501-1900 応用"; }
    else if (rangeVal === "custom") {
      minId = parseInt(document.getElementById("startNum").value) || 1;
      maxId = parseInt(document.getElementById("endNum").value) || 1900;
      rangeLabel = `カスタム (${minId}-${maxId})`;
    } else {
      rangeLabel = "全範囲 (1-1900)";
    }
  }

  let filtered = wordDatabase.filter(w => w.id >= minId && w.id <= maxId);
  if (filtered.length === 0) filtered = wordDatabase;

  currentQuizList = [...filtered].sort(() => 0.5 - Math.random());
  
  if (currentMode === "normal") {
    let requestedCount = 20;
    if (questionCountSelect.value === "custom") {
      requestedCount = parseInt(document.getElementById("customQuestionCount").value) || 10;
    } else {
      requestedCount = parseInt(questionCountSelect.value) || 20;
    }
    const finalCount = Math.min(requestedCount, currentQuizList.length);
    currentQuizList = currentQuizList.slice(0, finalCount);
  }

  currentQuestionIndex = 0;
  score = 0;

  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("resultSection").classList.add("hidden");
  document.getElementById("quizSection").classList.remove("hidden");

  showQuestion();
}

function showQuestion() {
  isAnswering = false;
  const q = currentQuizList[currentQuestionIndex];
  const totalQ = currentQuizList.length;

  document.getElementById("progressBar").style.width = currentMode === "normal" 
    ? `${(currentQuestionIndex / totalQ) * 100}%` 
    : `100%`;

  document.getElementById("questionNumText").textContent = currentMode === "normal"
    ? `第 ${currentQuestionIndex + 1} 問 / ${totalQ} 問`
    : `連続 ${currentQuestionIndex + 1} 問目`;

  document.getElementById("wordIdText").textContent = `No. ${q.id}`;
  document.getElementById("wordTitle").textContent = q.word;

  const grid = document.getElementById("optionsGrid");
  grid.innerHTML = "";

  let otherMeanings = wordDatabase
    .filter(w => w.meaning !== q.meaning)
    .map(w => w.meaning)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  const options = [q.meaning, ...otherMeanings].sort(() => 0.5 - Math.random());

  options.forEach(optText => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = optText;
    btn.addEventListener("click", () => handleAnswer(optText, q.meaning, btn, q));
    grid.appendChild(btn);
  });
}

function handleAnswer(selected, correct, selectedBtn, wordObj) {
  if (isAnswering) return;
  isAnswering = true;

  const buttons = document.querySelectorAll(".option-btn");
  const isCorrect = (selected === correct);

  if (isCorrect) {
    score++;
    selectedBtn.classList.add("correct");
  } else {
    selectedBtn.classList.add("incorrect");
    wrongWordsList.push(wordObj);
    buttons.forEach(btn => {
      if (btn.textContent === correct) btn.classList.add("correct");
    });
  }

  setTimeout(() => {
    if (currentMode === "survival" && !isCorrect) {
      showResult(true);
    } else {
      currentQuestionIndex++;
      if (currentQuestionIndex < currentQuizList.length) {
        showQuestion();
      } else {
        showResult(false);
      }
    }
  }, 1200);
}

function showResult(isGameOver) {
  document.getElementById("quizSection").classList.add("hidden");
  document.getElementById("resultSection").classList.remove("hidden");

  const userName = localStorage.getItem("target_userName") || "ゲスト";
  const scoreDisplay = document.getElementById("scoreDisplay");
  const scoreMessage = document.getElementById("scoreMessage");
  const badgeDisplay = document.getElementById("badgeDisplay");
  const retryWrongBtn = document.getElementById("retryWrongBtn");

  let isPerfect = false;

  if (currentMode === "normal") {
    const total = currentQuizList.length;
    scoreDisplay.textContent = `${score} / ${total}`;
    badgeDisplay.textContent = `通常モード [${rangeLabel}]`;
    if (score === total) {
      isPerfect = true;
      scoreMessage.textContent = "全問正解！素晴らしい成果です！🎉";
    } else {
      scoreMessage.textContent = "復習して何度も挑戦しよう！💪";
    }

    const prevBest = parseInt(localStorage.getItem("target_best_normal") || "0");
    if (score > prevBest) localStorage.setItem("target_best_normal", score);

  } else {
    scoreDisplay.textContent = `${score} 問連続正解`;
    badgeDisplay.textContent = `サバイバル [${rangeLabel}]`;
    scoreMessage.textContent = isGameOver ? "ここでストップ！記録更新を目指そう！🔥" : "スゴい！最後まで完走！👑";

    if (score > 0) isPerfect = true;

    const prevBest = parseInt(localStorage.getItem("target_best_survival") || "0");
    if (score > prevBest) localStorage.setItem("target_best_survival", score);
  }

  if (wrongWordsList.length > 0) {
    retryWrongBtn.textContent = `🔄 間違えた問題のみ再挑戦 (${wrongWordsList.length}問)`;
    retryWrongBtn.classList.remove("hidden");
  } else {
    retryWrongBtn.classList.add("hidden");
  }

  if (isPerfect) {
    playFanfare();
    if (typeof confetti === "function") {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }

  document.getElementById("lineShareBtn").onclick = () => {
    const appUrl = window.location.href;
    let text = "";
    if (currentMode === "normal") {
      text = `🎯 ターゲット1900 テスト結果\nプレイヤー: ${userName}\n範囲: ${rangeLabel}\nスコア: ${score} / ${currentQuizList.length}\n\nみんなも挑戦してみてね！\n${appUrl}`;
    } else {
      text = `🎯 ターゲット1900 サバイバル結果\nプレイヤー: ${userName}\n範囲: ${rangeLabel}\n記録: ${score} 問連続正解！\n\nこの記録を超えられる？\n${appUrl}`;
    }
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  };
}

document.getElementById("retryWrongBtn").addEventListener("click", () => {
  currentQuizList = [...wrongWordsList].sort(() => 0.5 - Math.random());
  wrongWordsList = [];
  currentQuestionIndex = 0;
  score = 0;

  document.getElementById("resultSection").classList.add("hidden");
  document.getElementById("quizSection").classList.remove("hidden");
  showQuestion();
});

document.getElementById("restartBtn").addEventListener("click", () => {
  startQuiz(rangeLabel.includes("ハード"));
});

document.getElementById("backToHomeBtn").addEventListener("click", () => {
  document.getElementById("resultSection").classList.add("hidden");
  document.getElementById("setupSection").classList.remove("hidden");
  updateBestRecordText();
});

