// spelling.js

// スペル入力エリアのセットアップ
function setupSpellingUI(correctWord, onAnswerCallback) {
  const inputArea = document.getElementById("spellingInputArea");
  const inputEl = document.getElementById("spellingInput");
  const submitBtn = document.getElementById("submitSpellingBtn");

  if (!inputArea || !inputEl || !submitBtn) return;

  // 入力欄のクリア＆表示
  inputArea.classList.remove("hidden");
  inputEl.value = "";
  inputEl.style.borderColor = "#ccc";
  inputEl.disabled = false;
  submitBtn.disabled = false;
  inputEl.focus(); // キーボードフォーカス

  // 確定ボタン押下・Enterキー押下時の共通処理
  const handleSubmit = () => {
    const userText = inputEl.value.trim();
    if (!userText) return;

    // 大文字・小文字の区別なく比較
    const isCorrect = userText.toLowerCase() === correctWord.toLowerCase();

    // 入力エリアをロック
    inputEl.disabled = true;
    submitBtn.disabled = true;
    inputEl.style.borderColor = isCorrect ? "#28a745" : "#dc3545";

    // quiz.js 側の判定ロジックへ結果を渡す
    onAnswerCallback(isCorrect, userText, correctWord);
  };

  // イベント二重登録を防ぐためにボタンを再登録
  const newSubmitBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
  newSubmitBtn.addEventListener("click", handleSubmit);

  // Enterキーでの確定機能
  inputEl.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };
}

// スペル入力エリアの非表示・リセット
function resetSpellingUI() {
  const inputArea = document.getElementById("spellingInputArea");
  const inputEl = document.getElementById("spellingInput");

  if (inputArea) inputArea.classList.add("hidden");
  if (inputEl) {
    inputEl.value = "";
    inputEl.disabled = false;
    inputEl.style.borderColor = "#ccc";
  }
}
