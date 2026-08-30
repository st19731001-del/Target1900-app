// quiz.js
let quizQuestions = [];
let currentQuizIndex = 0;
let currentGameMode = "normal"; // "normal" | "survival"
let currentQuizDirection = "en-ja"; // "en-ja" | "ja-en"
let currentJaEnMode = "choice"; // "choice" | "input"

// タブ切り替え制御
document.addEventListener("DOMContentLoaded", () => {
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

  // 出題方向変更時のオプション表示制御
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

  // クイズ開始ボタン
  document.getElementById("startQuizBtn").addEventListener("click", startQuiz);

  // 単語帳開始ボタン
  document.getElementById("startCardBtn").addEventListener("click", initCardMode);

  // クイズ終了（中断）ボタン
  document.getElementById("quitQuizBtn").addEventListener("click", () => {
    document.getElementById("quizSection").classList.add("hidden");
    document.getElementById("setupSection").classList.remove("hidden");
  });

  // クイズ内の「次へ」ボタン
  document.getElementById("nextQuestionBtn").addEventListener("click", () => {
    currentQuizIndex++;
    if (currentQuizIndex < quizQuestions.length) {
      showQuestion();
    } else {
      alert("全問終了しました！");
      document.getElementById("quizSection").classList.add("hidden");
      document.getElementById("setupSection").classList.remove("hidden");
    }
  });
});

// クイズの初期化・開始
function startQuiz() {
  if (wordDataList.length === 0) {
    alert("データの読み込み中です。少々お待ちください。");
    return;
  }

  // 設定の取得
  currentGameMode = document.querySelector('input[name="gameMode"]:checked').value;
  currentQuizDirection = document.querySelector('input[name="quizDirection"]:checked').value;
  
  const jaEnRadio = document.querySelector('input[name="jaEnMode"]:checked');
  currentJaEnMode = jaEnRadio ? jaEnRadio.value : "choice";

  // ランダムに問題をセット（シャッフル）
  quizQuestions = [...wordDataList].sort(() => Math.random() - 0.5);
  currentQuizIndex = 0;

  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("quizSection").classList.remove("hidden");

  showQuestion();
}

// 問題表示
function showQuestion() {
  const q = quizQuestions[currentQuizIndex];
  const progressEl = document.getElementById("quizProgress");
  const questionText = document.getElementById("questionText");
  const optionsGrid = document.getElementById("optionsGrid");
  const explanationArea = document.getElementById("explanationArea");

  // 初期化
  progressEl.textContent = `No. ${q.id} (${currentQuizIndex + 1}/${quizQuestions.length})`;
  optionsGrid.innerHTML = "";
  optionsGrid.style.display = "grid";
  explanationArea.classList.add("hidden");
  resetSpellingUI();

  // 問題文のセット
  if (currentQuizDirection === "en-ja") {
    questionText.textContent = q.word;
  } else {
    questionText.textContent = q.meaning;
  }

  // 日→英 ＆ スペル入力モードの場合
  if (currentQuizDirection === "ja-en" && currentJaEnMode === "input") {
    optionsGrid.style.display = "none";
    setupSpellingUI(q.word, handleAnswer);
  } else {
    // 4択選択肢の作成
    const options = generateOptions(q);
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = currentQuizDirection === "en-ja" ? opt.meaning : opt.word;
      btn.addEventListener("click", () => handleAnswer(opt === q, opt, q, btn));
      optionsGrid.appendChild(btn);
    });
  }
}

// 誤答用の選択肢を作成（正解1つ＋ダミー3つ）
function generateOptions(correctItem) {
  const dummyPool = wordDataList.filter(item => item.id !== correctItem.id);
  const shuffled = dummyPool.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [correctItem, ...shuffled];
  return options.sort(() => Math.random() - 0.5);
}

// 回答時の判定処理
function handleAnswer(isCorrect, selectedData, correctQuestion, clickedBtn = null) {
  const explanationArea = document.getElementById("explanationArea");
  const resultEl = document.getElementById("explanationResult");
  const optionsGrid = document.getElementById("optionsGrid");

  // 選択肢のボタン色変更（選択肢モード時）
  if (optionsGrid.style.display !== "none") {
    const buttons = optionsGrid.querySelectorAll(".option-btn");
    buttons.forEach(btn => btn.disabled = true);
  }

  // --- サバイバルモードの場合 ---
  if (currentGameMode === "survival") {
    if (isCorrect) {
      // 正解なら即座に次の問題へテンポよく移動
      currentQuizIndex++;
      if (currentQuizIndex < quizQuestions.length) {
        showQuestion();
      } else {
        alert("全問正解！クリアです！");
        document.getElementById("quizSection").classList.add("hidden");
        document.getElementById("setupSection").classList.remove("hidden");
      }
    } else {
      // 不正解でゲームオーバー
      alert(`ゲームオーバー！\n正解は: ${correctQuestion.word} (${correctQuestion.meaning})`);
      document.getElementById("quizSection").classList.add("hidden");
      document.getElementById("setupSection").classList.remove("hidden");
    }
    return;
  }

  // --- 通常モードの場合 ---
  // 結果テキスト
  if (isCorrect) {
    resultEl.textContent = "⭕️ 正解！";
    resultEl.style.color = "#28a745";
  } else {
    resultEl.textContent = `❌ 不正解... (正解: ${correctQuestion.word} / ${correctQuestion.meaning})`;
    resultEl.style.color = "#dc3545";
  }

  // 語源・派生語のセット
  document.getElementById("etymologyText").textContent = correctQuestion.etymology || "なし";
  document.getElementById("derivedText").textContent = correctQuestion.derived || "なし";

  // 解説エリアを表示（「次へ」ボタンで自分のペースで進める）
  explanationArea.classList.remove("hidden");
}
