let wordDatabase = [];

let currentMode = "normal";
let currentQuizList = [];
let currentQuestionIndex = 0;
let score = 0;
let isAnswering = false;
let rangeLabel = "全範囲 (1-1900)";
let wrongWordsList = [];

window.addEventListener("DOMContentLoaded", () => {
  const csvFiles = ["Target1900.csv", "target1900.csv", "./Target1900.csv"];
  
  const loadCSV = async () => {
    for (const file of csvFiles) {
      try {
        const response = await fetch(file);
        if (response.ok) {
          // Shift-JIS（日本語Windows形式）でデコードして文字化けを防ぐ
          const arrayBuffer = await response.arrayBuffer();
          let text = "";
          try {
            const decoder = new TextDecoder("shift-jis");
            text = decoder.decode(arrayBuffer);
          } catch (e) {
            const decoder = new TextDecoder("utf-8");
            text = decoder.decode(arrayBuffer);
          }

          parseCSV(text);
          if (wordDatabase.length > 0) {
            console.log(`CSV読み込み成功: ${wordDatabase.length}件の単語を読込`);
            break;
          }
        }
      } catch (e) {
        console.log(`${file} の読み込みスキップ`);
      }
    }

    if (wordDatabase.length === 0) {
      console.warn("CSVの読み込みに失敗したため、初期データを使用します");
      for (let i = 1; i <= 100; i++) {
        wordDatabase.push({ id: i, word: `word_${i}`, meaning: `意味_${i}` });
      }
    }
  };

  loadCSV();

  const savedName = localStorage.getItem("target_userName");
  if (savedName) {
    const input = document.getElementById("userNameInput");
    if (input) input.value = savedName;
  }
  updateBestRecordText();
});

function parseCSV(text) {
  const lines = text.split(/\r\n|\n/);
  const parsedData = [];
  
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    const cols = line.split(",");
    if (cols.length >= 2) {
      let id = idx + 1;
      let word = "";
      let meaning = "";

      if (!isNaN(parseInt(cols[0].trim())) && cols.length >= 3) {
        id = parseInt(cols[0].trim());
        word = cols[1].replace(/^"|"$/g, '').trim();
        meaning = cols[2].replace(/^"|"$/g, '').trim();
      } else {
        word = cols[0].replace(/^"|"$/g, '').trim();
        meaning = cols[1].replace(/^"|"$/g, '').trim();
      }

      if (word && meaning) {
        parsedData.push({ id, word, meaning });
      }
    }
  });

  if (parsedData.length > 0) {
    wordDatabase = parsedData;
  }
}

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

if (tabNormal && tabSurvival) {
  tabNormal.addEventListener("click", () => {
    currentMode = "normal";
    tabNormal.classList.add("active");
    tabSurvival.classList.remove("active");
    if (normalOptions) normalOptions.classList.remove("hidden");
    if (questionCountSelect && questionCountSelect.value === "custom") {
      if (customCountGroup) customCountGroup.classList.remove("hidden");
    }
    if (hardBtn) hardBtn.classList.add("hidden");
    updateBestRecordText();
  });

  tabSurvival.addEventListener("click", () => {
    currentMode = "survival";
    tabSurvival.classList.add("active");
    tabNormal.classList.remove("active");
    if (normalOptions) normalOptions.classList.add("hidden");
    if (customCountGroup) customCountGroup.classList.add("hidden");
    if (hardBtn) hardBtn.classList.remove("hidden");
    updateBestRecordText();
  });
}

if (rangeSelect) {
  rangeSelect.addEventListener("change", () => {
    if (rangeSelect.value === "custom") {
      if (customRangeGroup) customRangeGroup.classList.remove("hidden");
    } else {
      if (customRangeGroup) customRangeGroup.classList.add("hidden");
    }
  });
}

if (questionCountSelect) {
  questionCountSelect.addEventListener("change", () => {
    if (questionCountSelect.value === "custom") {
      if (customCountGroup) customCountGroup.classList.remove("hidden");
    } else {
      if (customCountGroup) customCountGroup.classList.add("hidden");
    }
  });
}

function updateBestRecordText() {
  const best = localStorage.getItem(`target_best_${currentMode}`) || 0;
  const el = document.getElementById("bestRecordText");
  if (el) {
    if (currentMode === "survival") {
      el.textContent = `🏆 サバイバル最高連勝記録: ${best} 問`;
    } else {
      el.textContent = `🏆 通常モード最高スコア: ${best} 点`;
    }
  }
}

if (startBtn) startBtn.addEventListener("click", () => startQuiz(false));
if (hardBtn) hardBtn.addEventListener("click", () => startQuiz(true));

const cancelBtn = document.getElementById("cancelBtn");
if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    if (confirm("テストを中止して設定画面に戻りますか？")) {
      document.getElementById("quizSection").classList.add("hidden");
      document.getElementById("setupSection").classList.remove("hidden");
    }
  });
}

function startQuiz(isHard) {
  const userNameInput = document.getElementById("userNameInput");
  const userName = userNameInput ? (userNameInput.value.trim() || "ゲスト") : "ゲスト";
  localStorage.setItem("target_userName", userName);
  wrongWordsList = [];

  let minId = 1;
  let maxId = 1900;

  if (isHard) {
    rangeLabel = "1900語 ハード全範囲";
  } else {
    const rangeVal = rangeSelect ? rangeSelect.value : "all";
    if (rangeVal === "1-100") { minId = 1; maxId = 100; rangeLabel = "1-100 必修"; }
    else if (rangeVal === "101-300") { minId = 101; maxId = 300; rangeLabel = "101-300 必修"; }
    else if (rangeVal === "301-800") { minId = 301; maxId = 800; rangeLabel = "301-800 必修"; }
    else if (rangeVal === "801-1500") { minId = 801; maxId = 1500; rangeLabel = "801-1500 標準"; }
    else if (rangeVal === "1501-1900") { minId = 1501; maxId = 1900; rangeLabel = "1501-1900 応用"; }
    else if (rangeVal === "custom") {
      const startEl = document.getElementById("startNum");
      const endEl = document.getElementById("endNum");
      minId = startEl ? (parseInt(startEl.value) || 1) : 1;
      maxId = endEl ? (parseInt(endEl.value) || 1900) : 1900;
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
    if (questionCountSelect && questionCountSelect.value === "custom") {
      const customCountEl = document.getElementById("customQuestionCount");
      requestedCount = customCountEl ? (parseInt(customCountEl.value) || 10) : 10;
    } else if (questionCountSelect) {
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

  const progressBar = document.getElementById("progressBar");
  if (progressBar) {
    progressBar.style.width = currentMode === "normal" 
      ? `${(currentQuestionIndex / totalQ) * 100}%` 
      : `100%`;
  }

  const qNumText = document.getElementById("questionNumText");
  if (qNumText) {
    qNumText.textContent = currentMode === "normal"
      ? `第 ${currentQuestionIndex + 1} 問 / ${totalQ} 問`
      : `連続 ${currentQuestionIndex + 1} 問目`;
  }

  const wordIdText = document.getElementById("wordIdText");
  if (wordIdText) wordIdText.textContent = `No. ${q.id}`;

  const wordTitle = document.getElementById("wordTitle");
  if (wordTitle) wordTitle.textContent = q.word;

  const grid = document.getElementById("optionsGrid");
  if (!grid) return;
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
    if (scoreDisplay) scoreDisplay.textContent = `${score} / ${total}`;
    if (badgeDisplay) badgeDisplay.textContent = `通常モード [${rangeLabel}]`;
    if (scoreMessage) {
      if (score === total) {
        isPerfect = true;
        scoreMessage.textContent = "全問正解！素晴らしい成果です！🎉";
      } else {
        scoreMessage.textContent = "復習して何度も挑戦しよう！💪";
      }
    }

    const prevBest = parseInt(localStorage.getItem("target_best_normal") || "0");
    if (score > prevBest) localStorage.setItem("target_best_normal", score);

  } else {
    if (scoreDisplay) scoreDisplay.textContent = `${score} 問連続正解`;
    if (badgeDisplay) badgeDisplay.textContent = `サバイバル [${rangeLabel}]`;
    if (scoreMessage) {
      scoreMessage.textContent = isGameOver ? "ここでストップ！記録更新を目指そう！🔥" : "スゴい！最後まで完走！👑";
    }

    if (score > 0) isPerfect = true;

    const prevBest = parseInt(localStorage.getItem("target_best_survival") || "0");
    if (score > prevBest) localStorage.setItem("target_best_survival", score);
  }

  if (retryWrongBtn) {
    if (wrongWordsList.length > 0) {
      retryWrongBtn.textContent = `🔄 間違えた問題のみ再挑戦 (${wrongWordsList.length}問)`;
      retryWrongBtn.classList.remove("hidden");
    } else {
      retryWrongBtn.classList.add("hidden");
    }
  }

  if (isPerfect) {
    playFanfare();
    if (typeof confetti === "function") {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }

  const lineBtn = document.getElementById("lineShareBtn");
  if (lineBtn) {
    lineBtn.onclick = () => {
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
}

const retryBtn = document.getElementById("retryWrongBtn");
if (retryBtn) {
  retryBtn.addEventListener("click", () => {
    currentQuizList = [...wrongWordsList].sort(() => 0.5 - Math.random());
    wrongWordsList = [];
    currentQuestionIndex = 0;
    score = 0;

    document.getElementById("resultSection").classList.add("hidden");
    document.getElementById("quizSection").classList.remove("hidden");
    showQuestion();
  });
}

const restartBtn = document.getElementById("restartBtn");
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    startQuiz(rangeLabel.includes("ハード"));
  });
}

const backBtn = document.getElementById("backToHomeBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    document.getElementById("resultSection").classList.add("hidden");
    document.getElementById("setupSection").classList.remove("hidden");
    updateBestRecordText();
  });
}
