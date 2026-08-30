// card.js
let currentCardIndex = 0;

function initCardMode() {
  const startNoInput = document.getElementById("startNoInput");
  let startNo = parseInt(startNoInput.value, 10);

  if (isNaN(startNo) || startNo < 1) startNo = 1;
  if (startNo > wordDataList.length) startNo = wordDataList.length;

  // インデックス（0始まり）に変換
  currentCardIndex = startNo - 1;

  showFlashCard();

  // 画面の切り替え
  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("cardSection").classList.remove("hidden");
}

// カードの描画
function showFlashCard() {
  if (wordDataList.length === 0) return;

  const item = wordDataList[currentCardIndex];

  // 表面の更新
  document.getElementById("cardNo").textContent = `No. ${item.id}`;
  document.getElementById("cardWord").textContent = item.word;

  // 裏面の更新
  document.getElementById("cardMeaning").textContent = item.meaning;
  document.getElementById("cardEtymology").textContent = item.etymology || "なし";
  document.getElementById("cardDerived").textContent = item.derived || "なし";

  // 裏面を隠した状態で初期化
  document.getElementById("cardBack").classList.add("hidden");
}

// イベントリスナーの登録
document.addEventListener("DOMContentLoaded", () => {
  const flashCard = document.getElementById("flashCard");
  const prevBtn = document.getElementById("prevCardBtn");
  const nextBtn = document.getElementById("nextCardBtn");
  const quitBtn = document.getElementById("quitCardBtn");

  // タップで裏面（意味・語源など）のトグル表示
  if (flashCard) {
    flashCard.addEventListener("click", () => {
      const cardBack = document.getElementById("cardBack");
      cardBack.classList.toggle("hidden");
    });
  }

  // 「前へ」ボタン
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentCardIndex > 0) {
        currentCardIndex--;
        showFlashCard();
      }
    });
  }

  // 「次へ」ボタン
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentCardIndex < wordDataList.length - 1) {
        currentCardIndex++;
        showFlashCard();
      }
    });
  }

  // TOPへ戻るボタン
  if (quitBtn) {
    quitBtn.addEventListener("click", () => {
      document.getElementById("cardSection").classList.add("hidden");
      document.getElementById("setupSection").classList.remove("hidden");
    });
  }
});
