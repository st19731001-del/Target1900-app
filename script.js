let wordDatabase = [];

let currentMode = "normal";
let quizDirection = "en-ja"; // "en-ja" (英→日) or "ja-en" (日→英)
let autoSpeech = true;

let currentQuizList = [];
let currentQuestionIndex = 0;
let score = 0;
let isAnswering = false;
let rangeLabel = "全範囲 (1-1900)";
let wrongWordsList = [];

// ==============================
// 音声機能 Android / iOS 対応
// ==============================

// 音声機能がアンロックされているか
let isSpeechUnlocked = false;

// 端末に存在する音声一覧
let availableVoices = [];

// 使用する英語音声
let englishVoice = null;


// 音声リストを取得
function loadVoices() {
  if (!("speechSynthesis" in window)) {
    console.log("SpeechSynthesis は利用できません");
    return [];
  }

  availableVoices = window.speechSynthesis.getVoices();

  if (availableVoices.length > 0) {

    // アメリカ英語を優先
    englishVoice =
      availableVoices.find(v => v.lang === "en-US") ||
      availableVoices.find(v => v.lang.startsWith("en-US")) ||
      availableVoices.find(v => v.lang.toLowerCase().startsWith("en")) ||
      null;

    console.log("利用可能な音声数:", availableVoices.length);
    console.log("選択された英語音声:", englishVoice);
  }

  return availableVoices;
}


// スマホの音声再生をアンロック
function unlockAudio() {
  if (!("speechSynthesis" in window)) return;

  try {

    // 停止状態なら復帰
    window.speechSynthesis.resume();

    // ユーザー操作時にVoiceを再取得
    loadVoices();

    // Android / Chrome対策
    if (!isSpeechUnlocked) {

      const unlockUttr = new SpeechSynthesisUtterance(" ");

      unlockUttr.lang = "en-US";

      // 完全な0だと無視される端末があるため極小音量
      unlockUttr.volume = 0.01;

      window.speechSynthesis.speak(unlockUttr);

      isSpeechUnlocked = true;

      console.log("音声機能をアンロックしました");
    }

  } catch (e) {

    console.log("音声アンロックエラー:", e);

  }
}


// 英単語を発音する
function speakWord(text) {

  if (!("speechSynthesis" in window)) {

    console.log("このブラウザは音声読み上げに対応していません");

    return;

  }

  // 英→日のときだけ発音
  if (quizDirection !== "en-ja") return;

  if (!text) return;

  try {

    console.log("発音する単語:", text);

    // Androidで停止している場合に復帰
    window.speechSynthesis.resume();

    // Voiceが取得できていなければ再取得
    if (availableVoices.length === 0 || !englishVoice) {

      loadVoices();

    }

    // 以前の音声を停止
    window.speechSynthesis.cancel();

    const uttr = new SpeechSynthesisUtterance(text);

    // 音声設定
    uttr.lang = "en-US";

    uttr.rate = 0.9;

    uttr.pitch = 1;

    uttr.volume = 1;


    // 英語Voiceがあれば明示的に設定
    if (englishVoice) {

      uttr.voice = englishVoice;

      uttr.lang = englishVoice.lang;

    }


    // デバッグ用
    uttr.onstart = () => {

      console.log("音声再生開始:", text);

    };


    uttr.onend = () => {

      console.log("音声再生終了:", text);

    };


    uttr.onerror = (event) => {

      console.log("音声エラー:", event.error, event);

    };


    /*
      Android Chromeでは

      cancel()
      ↓
      すぐ speak()

      をすると無視される場合があるため
      少し時間を空ける
    */

    setTimeout(() => {

      try {

        window.speechSynthesis.resume();

        window.speechSynthesis.speak(uttr);

      } catch (e) {

        console.log("音声再生エラー:", e);

      }

    }, 50);

  } catch (e) {

    console.log("speakWord エラー:", e);

  }

}


// ==============================
// 音声エンジン準備
// ==============================

if ("speechSynthesis" in window) {

  // ページ読み込み直後
  loadVoices();


  // Androidでは後からVoiceが読み込まれる
  window.speechSynthesis.onvoiceschanged = () => {

    console.log("voiceschanged イベント");

    loadVoices();

  };


  // 念のため複数回取得
  setTimeout(loadVoices, 300);

  setTimeout(loadVoices, 1000);

  setTimeout(loadVoices, 2000);

}


// ==============================
// ページ読み込み
// ==============================

window.addEventListener("DOMContentLoaded", () => {

  const csvFiles = [
    "Target1900.csv",
    "target1900.csv",
    "./Target1900.csv"
  ];


  const loadCSV = async () => {

    for (const file of csvFiles) {

      try {

        const response = await fetch(file);

        if (response.ok) {

          const text = await response.text();

          parseCSV(text);

          if (wordDatabase.length > 0) break;

        }

      } catch (e) {

        console.log("CSV読み込み失敗:", file);

      }

    }


    // CSVが読み込めなかった場合
    if (wordDatabase.length === 0) {

      for (let i = 1; i <= 100; i++) {

        wordDatabase.push({
          id: i,
          word: `word_${i}`,
          meaning: `意味_${i}`
        });

      }

    }

  };


  loadCSV();


  const savedName = localStorage.getItem("target_userName");

  if (savedName) {

    const input = document.getElementById("userNameInput");

    if (input) {

      input.value = savedName;

    }

  }


  updateBestRecordText();


  // ==============================
  // 🔊 発音ボタン
  // ==============================

  const speechBtn = document.getElementById("speechBtn");

  if (speechBtn) {

    speechBtn.addEventListener("click", () => {

      console.log("発音ボタンが押されました");

      // ユーザー操作中にアンロック
      unlockAudio();

      const q = currentQuizList[currentQuestionIndex];

      if (q) {

        // Voiceを再取得してから発音
        loadVoices();

        // 少し待って発音
        setTimeout(() => {

          speakWord(q.word);

        }, 100);

      } else {

        console.log("問題データがありません");

      }

    });

  }

});


// ==============================
// CSV解析
// ==============================

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


      if (
        !isNaN(parseInt(cols[0].trim()))
        &&
        cols.length >= 3
      ) {

        id = parseInt(cols[0].trim());

        word = cols[1]
          .replace(/^"|"$/g, "")
          .trim();

        meaning = cols[2]
          .replace(/^"|"$/g, "")
          .trim();

      } else {

        word = cols[0]
          .replace(/^"|"$/g, "")
          .trim();

        meaning = cols[1]
          .replace(/^"|"$/g, "")
          .trim();

      }


      if (word && meaning) {

        parsedData.push({
          id,
          word,
          meaning
        });

      }

    }

  });


  if (parsedData.length > 0) {

    wordDatabase = parsedData;

  }

}


// ==============================
// 正解時のファンファーレ
// ==============================

function playFanfare() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    const ctx = new AudioContext();

    const notes = [
      261.63,
      329.63,
      392.00,
      523.25
    ];


    notes.forEach((freq, idx) => {

      const osc = ctx.createOscillator();

      const gain = ctx.createGain();

      osc.type = "triangle";

      osc.frequency.value = freq;

      gain.gain.setValueAtTime(
        0.1,
        ctx.currentTime + idx * 0.12
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + idx * 0.12 + 0.3
      );

      osc.connect(gain);

      gain.connect(ctx.destination);

      osc.start(
        ctx.currentTime + idx * 0.12
      );

      osc.stop(
        ctx.currentTime + idx * 0.12 + 0.3
      );

    });

  } catch (e) {

    console.log("ファンファーレエラー:", e);

  }

}


// ==============================
// DOM取得
// ==============================

const tabNormal =
  document.getElementById("tabNormal");

const tabSurvival =
  document.getElementById("tabSurvival");

const normalOptions =
  document.getElementById("normalOptions");

const startBtn =
  document.getElementById("startBtn");

const hardBtn =
  document.getElementById("hardBtn");

const rangeSelect =
  document.getElementById("rangeSelect");

const customRangeGroup =
  document.getElementById("customRangeGroup");

const questionCountSelect =
  document.getElementById("questionCount");

const customCountGroup =
  document.getElementById("customCountGroup");


// ==============================
// モード切り替え
// ==============================

if (tabNormal && tabSurvival) {

  tabNormal.addEventListener("click", () => {

    currentMode = "normal";

    tabNormal.classList.add("active");

    tabSurvival.classList.remove("active");

    if (normalOptions) {

      normalOptions.classList.remove("hidden");

    }

    if (
      questionCountSelect &&
      questionCountSelect.value === "custom"
    ) {

      if (customCountGroup) {

        customCountGroup.classList.remove("hidden");

      }

    }

    if (hardBtn) {

      hardBtn.classList.add("hidden");

    }

    updateBestRecordText();

  });


  tabSurvival.addEventListener("click", () => {

    currentMode = "survival";

    tabSurvival.classList.add("active");

    tabNormal.classList.remove("active");

    if (normalOptions) {

      normalOptions.classList.add("hidden");

    }

    if (customCountGroup) {

      customCountGroup.classList.add("hidden");

    }

    if (hardBtn) {

      hardBtn.classList.remove("hidden");

    }

    updateBestRecordText();

  });

}


// ==============================
// 出題範囲
// ==============================

if (rangeSelect) {

  rangeSelect.addEventListener("change", () => {

    if (rangeSelect.value === "custom") {

      if (customRangeGroup) {

        customRangeGroup.classList.remove("hidden");

      }

    } else {

      if (customRangeGroup) {

        customRangeGroup.classList.add("hidden");

      }

    }

  });

}


// ==============================
// 出題数
// ==============================

if (questionCountSelect) {

  questionCountSelect.addEventListener("change", () => {

    if (
      questionCountSelect.value === "custom"
    ) {

      if (customCountGroup) {

        customCountGroup.classList.remove("hidden");

      }

    } else {

      if (customCountGroup) {

        customCountGroup.classList.add("hidden");

      }

    }

  });

}


// ==============================
// 最高記録
// ==============================

function updateBestRecordText() {

  const best =
    localStorage.getItem(
      `target_best_${currentMode}`
    ) || 0;

  const el =
    document.getElementById("bestRecordText");


  if (el) {

    if (currentMode === "survival") {

      el.textContent =
        `🏆 サバイバル最高連勝記録: ${best} 問`;

    } else {

      el.textContent =
        `🏆 通常モード最高スコア: ${best} 点`;

    }

  }

}


// ==============================
// テスト開始
// ==============================

if (startBtn) {

  startBtn.addEventListener("click", () => {

    // ユーザー操作中に音声アンロック
    unlockAudio();

    startQuiz(false);

  });

}


if (hardBtn) {

  hardBtn.addEventListener("click", () => {

    unlockAudio();

    startQuiz(true);

  });

}


// ==============================
// 中止ボタン
// ==============================

const cancelBtn =
  document.getElementById("cancelBtn");


if (cancelBtn) {

  cancelBtn.addEventListener("click", () => {

    if (
      confirm(
        "テストを中止して設定画面に戻りますか？"
      )
    ) {

      document
        .getElementById("quizSection")
        .classList.add("hidden");

      document
        .getElementById("setupSection")
        .classList.remove("hidden");

    }

  });

}


// ==============================
// クイズ開始
// ==============================

function startQuiz(isHard) {

  const userNameInput =
    document.getElementById("userNameInput");


  const userName =
    userNameInput
      ? (
          userNameInput.value.trim()
          ||
          "ゲスト"
        )
      : "ゲスト";


  localStorage.setItem(
    "target_userName",
    userName
  );


  wrongWordsList = [];


  const dirRadio =
    document.querySelector(
      'input[name="direction"]:checked'
    );


  quizDirection =
    dirRadio
      ? dirRadio.value
      : "en-ja";


  const autoSpeechCheck =
    document.getElementById(
      "autoSpeechCheck"
    );


  autoSpeech =
    autoSpeechCheck
      ? autoSpeechCheck.checked
      : true;


  let minId = 1;

  let maxId = 1900;


  if (isHard) {

    rangeLabel =
      "1900語 ハード全範囲";

  } else {

    const rangeVal =
      rangeSelect
        ? rangeSelect.value
        : "all";


    if (rangeVal === "1-100") {

      minId = 1;
      maxId = 100;

      rangeLabel =
        "1-100 必修";

    }

    else if (rangeVal === "101-300") {

      minId = 101;
      maxId = 300;

      rangeLabel =
        "101-300 必修";

    }

    else if (rangeVal === "301-800") {

      minId = 301;
      maxId = 800;

      rangeLabel =
        "301-800 必修";

    }

    else if (rangeVal === "801-1500") {

      minId = 801;
      maxId = 1500;

      rangeLabel =
        "801-1500 標準";

    }

    else if (rangeVal === "1501-1900") {

      minId = 1501;
      maxId = 1900;

      rangeLabel =
        "1501-1900 応用";

    }

    else if (rangeVal === "custom") {

      const startEl =
        document.getElementById(
          "startNum"
        );

      const endEl =
        document.getElementById(
          "endNum"
        );


      minId =
        startEl
          ? (
              parseInt(
                startEl.value
              )
              ||
              1
            )
          : 1;


      maxId =
        endEl
          ? (
              parseInt(
                endEl.value
              )
              ||
              1900
            )
          : 1900;


      rangeLabel =
        `カスタム (${minId}-${maxId})`;

    }

    else {

      rangeLabel =
        "全範囲 (1-1900)";

    }

  }


  let filtered =
    wordDatabase.filter(
      w =>
        w.id >= minId &&
        w.id <= maxId
    );


  if (filtered.length === 0) {

    filtered = wordDatabase;

  }


  currentQuizList =
    [...filtered]
      .sort(
        () =>
          0.5 -
          Math.random()
      );


  if (currentMode === "normal") {

    let requestedCount = 20;


    if (
      questionCountSelect &&
      questionCountSelect.value === "custom"
    ) {

      const customCountEl =
        document.getElementById(
          "customQuestionCount"
        );


      requestedCount =
        customCountEl
          ? (
              parseInt(
                customCountEl.value
              )
              ||
              10
            )
          : 10;

    }

    else if (questionCountSelect) {

      requestedCount =
        parseInt(
          questionCountSelect.value
        )
        ||
        20;

    }


    const finalCount =
      Math.min(
        requestedCount,
        currentQuizList.length
      );


    currentQuizList =
      currentQuizList.slice(
        0,
        finalCount
      );

  }


  currentQuestionIndex = 0;

  score = 0;


  document
    .getElementById("setupSection")
    .classList.add("hidden");


  document
    .getElementById("resultSection")
    .classList.add("hidden");


  document
    .getElementById("quizSection")
    .classList.remove("hidden");


  showQuestion();

}


// ==============================
// 問題表示
// ==============================

function showQuestion() {

  isAnswering = false;


  const q =
    currentQuizList[
      currentQuestionIndex
    ];


  const totalQ =
    currentQuizList.length;


  const progressBar =
    document.getElementById(
      "progressBar"
    );


  if (progressBar) {

    progressBar.style.width =
      currentMode === "normal"
        ? `${
            (
              currentQuestionIndex
              /
              totalQ
            )
            *
            100
          }%`
        : "100%";

  }


  const qNumText =
    document.getElementById(
      "questionNumText"
    );


  if (qNumText) {

    qNumText.textContent =
      currentMode === "normal"
        ? `第 ${
            currentQuestionIndex + 1
          } 問 / ${totalQ} 問`
        : `連続 ${
            currentQuestionIndex + 1
          } 問目`;

  }


  const wordIdText =
    document.getElementById(
      "wordIdText"
    );


  if (wordIdText) {

    wordIdText.textContent =
      `No. ${q.id}`;

  }


  const isEnJa =
    quizDirection === "en-ja";


  const questionTitleText =
    isEnJa
      ? q.word
      : q.meaning;


  const correctAnswerText =
    isEnJa
      ? q.meaning
      : q.word;


  const wordTitle =
    document.getElementById(
      "wordTitle"
    );


  if (wordTitle) {

    wordTitle.textContent =
      questionTitleText;

  }


  // ==============================
  // 発音ボタン表示
  // ==============================

  const speechBtn =
    document.getElementById(
      "speechBtn"
    );


  if (speechBtn) {

    if (isEnJa) {

      speechBtn.style.display =
        "inline-block";

    } else {

      speechBtn.style.display =
        "none";

    }

  }


  // ==============================
  // 自動発音
  // ==============================

  if (isEnJa && autoSpeech) {

    setTimeout(() => {

      speakWord(q.word);

    }, 150);

  }


  // ==============================
  // 選択肢
  // ==============================

  const grid =
    document.getElementById(
      "optionsGrid"
    );


  if (!grid) return;


  grid.innerHTML = "";


  let otherOptions =
    wordDatabase
      .filter(
        w =>
          isEnJa
            ? w.meaning !== q.meaning
            : w.word !== q.word
      )
      .map(
        w =>
          isEnJa
            ? w.meaning
            : w.word
      )
      .sort(
        () =>
          0.5 -
          Math.random()
      )
      .slice(0, 3);


  const options =
    [
      correctAnswerText,
      ...otherOptions
    ]
    .sort(
      () =>
        0.5 -
        Math.random()
    );


  options.forEach(
    optText => {

      const btn =
        document.createElement(
          "button"
        );


      btn.className =
        "option-btn";


      btn.textContent =
        optText;


      btn.addEventListener(
        "click",
        () =>
          handleAnswer(
            optText,
            correctAnswerText,
            btn,
            q
          )
      );


      grid.appendChild(btn);

    }
  );

}


// ==============================
// 回答処理
// ==============================

function handleAnswer(
  selected,
  correct,
  selectedBtn,
  wordObj
) {

  if (isAnswering) return;


  isAnswering = true;


  unlockAudio();


  const buttons =
    document.querySelectorAll(
      ".option-btn"
    );


  const isCorrect =
    selected === correct;


  if (isCorrect) {

    score++;

    selectedBtn.classList.add(
      "correct"
    );

  }

  else {

    selectedBtn.classList.add(
      "incorrect"
    );


    wrongWordsList.push(
      wordObj
    );


    buttons.forEach(
      btn => {

        if (
          btn.textContent === correct
        ) {

          btn.classList.add(
            "correct"
          );

        }

      }
    );

  }


  setTimeout(() => {

    if (
      currentMode === "survival"
      &&
      !isCorrect
    ) {

      showResult(true);

    }

    else {

      currentQuestionIndex++;


      if (
        currentQuestionIndex
        <
        currentQuizList.length
      ) {

        showQuestion();

      }

      else {

        showResult(false);

      }

    }

  }, 1200);

}


// ==============================
// 結果表示
// ==============================

function showResult(isGameOver) {

  document
    .getElementById("quizSection")
    .classList.add("hidden");


  document
    .getElementById("resultSection")
    .classList.remove("hidden");


  const userName =
    localStorage.getItem(
      "target_userName"
    )
    ||
    "ゲスト";


  const scoreDisplay =
    document.getElementById(
      "scoreDisplay"
    );


  const scoreMessage =
    document.getElementById(
      "scoreMessage"
    );

const badgeDisplay =
    document.getElementById(
      "badgeDisplay"
    );


  const retryWrongBtn =
    document.getElementById(
      "retryWrongBtn"
    );


  const dirBadge =
    quizDirection === "en-ja"
      ? "英→日"
      : "日→英";
  
let isPerfect = false;


  if (
    currentMode === "normal"
  ) {

    const total =
      currentQuizList.length;


    if (scoreDisplay) {

      scoreDisplay.textContent =
        `${score} / ${total}`;

    }


    if (badgeDisplay) {

      badgeDisplay.textContent =
        `通常モード [${rangeLabel}] (${dirBadge})`;

    }


    if (scoreMessage) {

      if (score === total) {

        isPerfect = true;

        scoreMessage.textContent =
          "全問正解！素晴らしい成果です！🎉";

      }

      else {

        scoreMessage.textContent =
          "復習して何度も挑戦しよう！💪";

      }

    }


    const prevBest =
      parseInt(
        localStorage.getItem(
          "target_best_normal"
        )
        ||
        "0"
      );


    if (score > prevBest) {

      localStorage.setItem(
        "target_best_normal",
        score
      );

    }

  }

  else {

    if (scoreDisplay) {

      scoreDisplay.textContent =
        `${score} 問連続正解`;

    }


    if (badgeDisplay) {

      badgeDisplay.textContent =
        `サバイバル [${rangeLabel}] (${dirBadge})`;

    }


    if (scoreMessage) {

      scoreMessage.textContent =
        isGameOver
          ? "ここでストップ！記録更新を目指そう！🔥"
          : "スゴい！最後まで完走！👑";

    }


    if (score > 0) {

      isPerfect = true;

    }


    const prevBest =
      parseInt(
        localStorage.getItem(
          "target_best_survival"
        )
        ||
        "0"
      );


    if (score > prevBest) {

      localStorage.setItem(
        "target_best_survival",
        score
      );

    }

  }


  if (retryWrongBtn) {

    if (
      wrongWordsList.length > 0
    ) {

      retryWrongBtn.textContent =
        `🔄 間違えた問題のみ再挑戦 (${wrongWordsList.length}問)`;


      retryWrongBtn.classList.remove(
        "hidden"
      );

    }

    else {

      retryWrongBtn.classList.add(
        "hidden"
      );

    }

  }


  if (isPerfect) {

    playFanfare();


    if (
      typeof confetti === "function"
    ) {

      confetti({
        particleCount: 100,
        spread: 70,
        origin: {
          y: 0.6
        }
      });

    }

  }


  const lineBtn =
    document.getElementById(
      "lineShareBtn"
    );


  if (lineBtn) {

    lineBtn.onclick = () => {

      const appUrl =
        window.location.href;


      let text = "";


      if (
        currentMode === "normal"
      ) {

        text =
          `🎯 ターゲット1900 テスト結果
プレイヤー: ${userName}
範囲: ${rangeLabel} (${dirBadge})
スコア: ${score} / ${currentQuizList.length}

みんなも挑戦してみてね！
${appUrl}`;

      }

      else {

        text =
          `🎯 ターゲット1900 サバイバル結果
プレイヤー: ${userName}
範囲: ${rangeLabel} (${dirBadge})
記録: ${score} 問連続正解！

この記録を超えられる？
${appUrl}`;

      }


      window.open(
        `https://line.me/R/msg/text/?${encodeURIComponent(text)}`,
        "_blank"
      );

    };

  }

}


// ==============================
// 間違えた問題を再挑戦
// ==============================

const retryBtn =
  document.getElementById(
    "retryWrongBtn"
  );


if (retryBtn) {

  retryBtn.addEventListener(
    "click",
    () => {

      currentQuizList =
        [...wrongWordsList]
          .sort(
            () =>
              0.5 -
              Math.random()
          );


      wrongWordsList = [];

      currentQuestionIndex = 0;

      score = 0;


      document
        .getElementById("resultSection")
        .classList.add("hidden");


      document
        .getElementById("quizSection")
        .classList.remove("hidden");


      showQuestion();

    }
  );

}


// ==============================
// もう一度挑戦
// ==============================

const restartBtn =
  document.getElementById(
    "restartBtn"
  );


if (restartBtn) {

  restartBtn.addEventListener(
    "click",
    () => {

      unlockAudio();

      startQuiz(
        rangeLabel.includes(
          "ハード"
        )
      );

    }
  );

}


// ==============================
// 設定画面へ戻る
// ==============================

const backBtn =
  document.getElementById(
    "backToHomeBtn"
  );


if (backBtn) {

  backBtn.addEventListener(
    "click",
    () => {

      document
        .getElementById("resultSection")
        .classList.add("hidden");


      document
        .getElementById("setupSection")
        .classList.remove("hidden");


      updateBestRecordText();

    }
  );

}
  
