// quiz.js
let quizQuestions = [];
let currentQuizIndex = 0;
let score = 0;
let currentGameMode = "normal"; // "normal" | "survival"
let currentQuizDirection = "en-ja"; // "en-ja" | "ja-en"
let currentJaEnMode = "choice"; // "choice" | "input"
let rangeLabel = "全範囲 (1-1900)";
let wrongWordsList = [];
let isSpeechUnlocked = false;

// 音声アンロック機能
function unlockAudio() {
  if (isSpeechUnlocked || !('speechSynthesis' in window)) return;
  const uttr = new SpeechSynthesisUtterance("");
  uttr.volume = 0;
  window.speechSynthesis.speak(uttr);
  isSpeechUnlocked = true;
}

// iPhone/iOS対応: 最適な英語ネイティブボイスを取得する関数
function getBestEnglishVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. アメリカ英語（en-US）の声を最優先
  let englishVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US');

  // 2. なければ他の英語圏（en-GB, en-AU等）を探す
  if (!englishVoice) {
    englishVoice = voices.find(v => v.lang.startsWith('en'));
  }

  // 3. iPhone対策: 名前（Samantha, Karen, Daniel, Alex等）で英語ボイスを特定
  if (!englishVoice) {
    englishVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Karen') || 
      v.name.includes('Daniel') || 
      v.name.includes('Alex') ||
      v.name.includes('Siri')
    );
  }

  return englishVoice;
}

// iOS用の音声リスト事前ロード処理
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// 音声読み上げ関数（修正版）
function speakWord(text) {
  if (!('speechSynthesis' in window)) return;
  if (currentQuizDirection !== "en-ja") return;

  window.speechSynthesis.cancel(); // 前の音声をキャンセル

  const uttr = new SpeechSynthesisUtterance(text);
  uttr.lang = 'en-US'; // 明示的にアメリカ英語を指定
  uttr.rate = 0.85;    // 少しゆっくりめで聞き取りやすく

  const englishVoice = getBestEnglishVoice();
  if (englishVoice) {
    uttr.voice = englishVoice;
  }

  window.speechSynthesis.speak(uttr);
}

// ファンファーレ再生
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

document.addEventListener("DOMContentLoaded", () => {
  const savedName = localStorage.getItem("target_userName");
  if (savedName) {
    const input = document.getElementById("userNameInput");
    if (input) input.value = savedName;
  }
  updateBestRecordText();

  const tabQuizBtn = document.getElementById("tabQuizBtn");
  const tabCardBtn = document.getElementById("tabCardBtn");
  const quizSetupForm = document.getElementById("quizSetupForm");
  const cardSetupForm = document.getElementById("cardSetupForm");

  tabQuizBtn.addEventListener("click", () => {
    tabQuizBtn.classList.add("active");
    tabCardBtn.classList.remove("active");
    quizSetupForm.classList.remove("hidden");
    cardSetupForm.classList.add("hidden");
  });

  tabCardBtn.addEventListener("click", () => {
    tabCardBtn.classList.add("active");
    tabQuizBtn.classList.remove("active");
    cardSetupForm.classList.remove("hidden");
    quizSetupForm.classList.add("hidden");
  });

  // モードラジオボタン（通常 / サバイバル）切替
  const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
  const normalOptions = document.getElementById("normalOptions");
  const startQuizBtn = document.getElementById("startQuizBtn");
  const hardBtn = document.getElementById("hardBtn");

  gameModeRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentGameMode = e.target.value;
      if (currentGameMode === "normal") {
        normalOptions.classList.remove("hidden");
        startQuizBtn.classList.remove("hidden");
        hardBtn.classList.add("hidden");
      } else {
        normalOptions.classList.add("hidden");
        startQuizBtn.classList.add("hidden");
        hardBtn.classList.remove("hidden");
      }
      updateBestRecordText();
    });
  });

  const directionRadios = document.querySelectorAll('input[name="quizDirection"]');
  const jaEnOptionGroup = document.getElementById("jaEnOptionGroup");

  directionRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "ja-en") {
        jaEnOptionGroup.classList.remove("hidden");
      } else {
        jaEnOptionGroup.classList.add("hidden");
      }
    });
  });

  const rangeSelect = document.getElementById("rangeSelect");
  const customRangeGroup = document.getElementById("customRangeGroup");
  rangeSelect.addEventListener("change", () => {
    if (rangeSelect.value === "custom") {
      customRangeGroup.classList.remove("hidden");
    } else {
      customRangeGroup.classList.add("hidden");
    }
  });

  const questionCountSelect = document.getElementById("questionCount");
  const customCountGroup = document.getElementById("customCountGroup");
  questionCountSelect.addEventListener("change", () => {
    if (questionCountSelect.value === "custom") {
      customCountGroup.classList.remove("hidden");
    } else {
      customCountGroup.classList.add("hidden");
    }
  });

  document.getElementById("speechBtn").addEventListener("click", () => {
    unlockAudio();
    const q = quizQuestions[currentQuizIndex];
    if (q) speakWord(q.word);
  });

  document.getElementById("startQuizBtn").addEventListener("click", () => {
    unlockAudio();
    startQuiz(false);
  });

  document.getElementById("hardBtn").addEventListener("click", () => {
    unlockAudio();
    startQuiz(true);
  });

  document.getElementById("startCardBtn").addEventListener("click", initCardMode);

  document.getElementById("quitQuizBtn").addEventListener("click", () => {
    if (confirm("テストを中止して設定画面に戻りますか？")) {
      document.getElementById("quizSection").classList.add("hidden");
      document.getElementById("setupSection").classList.remove("hidden");
    }
  });

  document.getElementById("nextQuestionBtn").addEventListener("click", () => {
    currentQuizIndex++;
    if (currentQuizIndex < quizQuestions.length) {
      showQuestion();
    } else {
      showResult(false);
    }
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    startQuiz(currentGameMode === "survival");
  });

  document.getElementById("backToHomeBtn").addEventListener("click", () => {
    document.getElementById("resultSection").classList.add("hidden");
    document.getElementById("setupSection").classList.remove("hidden");
    updateBestRecordText();
  });

  document.getElementById("retryWrongBtn").addEventListener("click", () => {
    quizQuestions = [...wrongWordsList].sort(() => 0.5 - Math.random());
    wrongWordsList = [];
    currentQuizIndex = 0;
    score = 0;
    document.getElementById("resultSection").classList.add("hidden");
    document.getElementById("quizSection").classList.remove("hidden");
    showQuestion();
  });
});

function updateBestRecordText() {
  const best = localStorage.getItem(`target_best_${currentGameMode}`) || 0;
  const el = document.getElementById("bestRecordText");
  if (el) {
    if (currentGameMode === "survival") {
      el.textContent = `🏆 サバイバル最高連勝記録: ${best} 問`;
    } else {
      el.textContent = `🏆 通常モード最高スコア: ${best} 点`;
    }
  }
}

function startQuiz(isHard = false) {
  if (wordDataList.length === 0) {
    alert("データの読み込み中です。少々お待ちください。");
    return;
  }

  const userNameInput = document.getElementById("userNameInput");
  const userName = userNameInput ? (userNameInput.value.trim() || "ゲスト") : "ゲスト";
  localStorage.setItem("target_userName", userName);
  wrongWordsList = [];

  const dirRadio = document.querySelector('input[name="quizDirection"]:checked');
  currentQuizDirection = dirRadio ? dirRadio.value : "en-ja";

  const jaEnRadio = document.querySelector('input[name="jaEnMode"]:checked');
  currentJaEnMode = jaEnRadio ? jaEnRadio.value : "choice";

  let minId = 1;
  let maxId = 1900;

  if (isHard) {
    rangeLabel = "全範囲サバイバル";
  } else {
    const rangeSelect = document.getElementById("rangeSelect");
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

  let filtered = wordDataList.filter(w => w.id >= minId && w.id <= maxId);
  if (filtered.length === 0) filtered = wordDataList;

  quizQuestions = [...filtered].sort(() => 0.5 - Math.random());

  if (currentGameMode === "normal") {
    const questionCountSelect = document.getElementById("questionCount");
    let requestedCount = 20;
    if (questionCountSelect && questionCountSelect.value === "custom") {
      const customCountEl = document.getElementById("customQuestionCount");
      requestedCount = customCountEl ? (parseInt(customCountEl.value) || 10) : 10;
    } else if (questionCountSelect) {
      requestedCount = parseInt(questionCountSelect.value) || 20;
    }
    quizQuestions = quizQuestions.slice(0, Math.min(requestedCount, quizQuestions.length));
  }

  currentQuizIndex = 0;
  score = 0;

  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("resultSection").classList.add("hidden");
  document.getElementById("quizSection").classList.remove("hidden");

  showQuestion();
}

function showQuestion() {
  const q = quizQuestions[currentQuizIndex];
  const progressEl = document.getElementById("quizProgress");
  const wordIdText = document.getElementById("wordIdText");
  const questionText = document.getElementById("questionText");
  const optionsGrid = document.getElementById("optionsGrid");
  const explanationArea = document.getElementById("explanationArea");
  const speechBtn = document.getElementById("speechBtn");
  const autoSpeechCheck = document.getElementById("autoSpeechCheck");

  progressEl.textContent = currentGameMode === "normal"
    ? `第 ${currentQuizIndex + 1} 問 / ${quizQuestions.length} 問`
    : `連続 ${currentQuizIndex + 1} 問目`;

  wordIdText.textContent = `No. ${q.id}`;
  optionsGrid.innerHTML = "";
  optionsGrid.style.display = "grid";
  explanationArea.classList.add("hidden");
  resetSpellingUI();

  const isEnJa = (currentQuizDirection === "en-ja");
  questionText.textContent = isEnJa ? q.word : q.meaning;

  speechBtn.style.display = isEnJa ? "inline-block" : "none";

  if (isEnJa && autoSpeechCheck && autoSpeechCheck.checked) {
    setTimeout(() => speakWord(q.word), 200);
  }

  if (!isEnJa && currentJaEnMode === "input") {
    optionsGrid.style.display = "none";
    setupSpellingUI(q.word, (isCorrect, userText) => {
      handleAnswer(isCorrect, userText, q);
    });
  } else {
    const options = generateOptions(q);
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = isEnJa ? opt.meaning : opt.word;
      btn.addEventListener("click", () => {
        const isCorrect = (opt.id === q.id);
        handleAnswer(isCorrect, btn.textContent, q, btn);
      });
      optionsGrid.appendChild(btn);
    });
  }
}

function generateOptions(correctItem) {
  const dummyPool = wordDataList.filter(item => item.id !== correctItem.id);
  const shuffled = dummyPool.sort(() => 0.5 - Math.random()).slice(0, 3);
  return [correctItem, ...shuffled].sort(() => 0.5 - Math.random());
}

function handleAnswer(isCorrect, selectedText, correctQuestion, clickedBtn = null) {
  unlockAudio();

  const explanationArea = document.getElementById("explanationArea");
  const resultEl = document.getElementById("explanationResult");
  const optionsGrid = document.getElementById("optionsGrid");

  if (optionsGrid.style.display !== "none") {
    const buttons = optionsGrid.querySelectorAll(".option-btn");
    buttons.forEach(btn => {
      btn.disabled = true;
      const targetText = currentQuizDirection === "en-ja" ? correctQuestion.meaning : correctQuestion.word;
      if (btn.textContent === targetText) {
        btn.classList.add("correct");
      }
    });
    if (!isCorrect && clickedBtn) {
      clickedBtn.classList.add("incorrect");
    }
  }

  if (isCorrect) {
    score++;
  } else {
    wrongWordsList.push(correctQuestion);
  }

  if (currentGameMode === "survival") {
    setTimeout(() => {
      if (isCorrect) {
        currentQuizIndex++;
        if (currentQuizIndex < quizQuestions.length) {
          showQuestion();
        } else {
          showResult(false);
        }
      } else {
        showResult(true);
      }
    }, 1000);
    return;
  }

  if (isCorrect) {
    resultEl.textContent = "⭕️ 正解！";
    resultEl.style.color = "#10b981";
  } else {
    resultEl.textContent = `❌ 不正解... (正解: ${correctQuestion.word} / ${correctQuestion.meaning})`;
    resultEl.style.color = "#ef4444";
  }

  document.getElementById("etymologyText").textContent = correctQuestion.etymology || "なし";
  document.getElementById("derivedText").textContent = correctQuestion.derived || "なし";
  explanationArea.classList.remove("hidden");
}

function showResult(isGameOver = false) {
  document.getElementById("quizSection").classList.add("hidden");
  document.getElementById("resultSection").classList.remove("hidden");

  const userName = localStorage.getItem("target_userName") || "ゲスト";
  const scoreDisplay = document.getElementById("scoreDisplay");
  const scoreMessage = document.getElementById("scoreMessage");
  const badgeDisplay = document.getElementById("badgeDisplay");
  const retryWrongBtn = document.getElementById("retryWrongBtn");

  const dirBadge = (currentQuizDirection === "en-ja") ? "英→日" : "日→英";
  let isPerfect = false;

  if (currentGameMode === "normal") {
    const total = quizQuestions.length;
    scoreDisplay.textContent = `${score} / ${total}`;
    badgeDisplay.textContent = `通常モード [${rangeLabel}] (${dirBadge})`;
    
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
    badgeDisplay.textContent = `サバイバル [${rangeLabel}] (${dirBadge})`;
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

  const lineBtn = document.getElementById("lineShareBtn");
  lineBtn.onclick = () => {
    const appUrl = window.location.href;
    let text = "";
    if (currentGameMode === "normal") {
      text = `🎯 TARGET1900 テスト結果\nプレイヤー: ${userName}\n範囲: ${rangeLabel} (${dirBadge})\nスコア: ${score} / ${quizQuestions.length}\n\nみんなも挑戦してみてね！\n${appUrl}`;
    } else {
      text = `🎯 TARGET1900 サバイバル結果\nプレイヤー: ${userName}\n範囲: ${rangeLabel} (${dirBadge})\n記録: ${score} 問連続正解！\n\nこの記録を超えられる？\n${appUrl}`;
    }
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  };
}
