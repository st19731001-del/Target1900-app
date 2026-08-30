// card.js
let currentCardIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  const flashCard = document.getElementById("flashCard");
  const cardBack = document.getElementById("cardBack");
  const prevCardBtn = document.getElementById("prevCardBtn");
  const nextCardBtn = document.getElementById("nextCardBtn");
  const quitCardBtn = document.getElementById("quitCardBtn");
  const cardSpeechBtn = document.getElementById("cardSpeechBtn");

  // カードのめくり動作
  if (flashCard) {
    flashCard.addEventListener("click", () => {
      cardBack.classList.toggle("hidden");
    });
  }

  // 単語帳モードの音声再生（クイズと同じネイティブ発音関数を呼び出す）
  if (cardSpeechBtn) {
    cardSpeechBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // カードが裏返るのを防止
      
      if (typeof unlockAudio === "function") {
        unlockAudio();
      }

      const cardWordEl = document.getElementById("cardWord");
      if (cardWordEl && cardWordEl.textContent) {
        if (typeof speakWord === "function") {
          speakWord(cardWordEl.textContent);
        }
      }
    });
  }

  if (prevCardBtn) {
    prevCardBtn.addEventListener("click", () => {
      if (currentCardIndex > 0) {
        currentCardIndex--;
        updateCardDisplay();
      }
    });
  }

  if (nextCardBtn) {
    nextCardBtn.addEventListener("click", () => {
      if (currentCardIndex < wordDataList.length - 1) {
        currentCardIndex++;
        updateCardDisplay();
      }
    });
  }

  if (quitCardBtn) {
    quitCardBtn.addEventListener("click", () => {
      document.getElementById("cardSection").classList.add("hidden");
      document.getElementById("setupSection").classList.remove("hidden");
    });
  }
});

function initCardMode() {
  if (typeof wordDataList === "undefined" || wordDataList.length === 0) {
    alert("単語データが読み込まれていません。");
    return;
  }

  const startNoInput = document.getElementById("startNoInput");
  let startNo = parseInt(startNoInput ? startNoInput.value : 1) || 1;

  if (startNo < 1) startNo = 1;
  if (startNo > wordDataList.length) startNo = wordDataList.length;

  const foundIndex = wordDataList.findIndex(w => w.id === startNo);
  currentCardIndex = foundIndex !== -1 ? foundIndex : 0;

  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("cardSection").classList.remove("hidden");

  updateCardDisplay();
}

function updateCardDisplay() {
  const q = wordDataList[currentCardIndex];
  if (!q) return;

  document.getElementById("cardNo").textContent = `No. ${q.id}`;
  document.getElementById("cardWord").textContent = q.word;
  document.getElementById("cardMeaning").textContent = q.meaning;
  document.getElementById("cardEtymology").textContent = q.etymology || "なし";
  document.getElementById("cardDerived").textContent = q.derived || "なし";

  // 表に戻す
  document.getElementById("cardBack").classList.add("hidden");

  // ボタンの活性・非活性制御
  document.getElementById("prevCardBtn").disabled = (currentCardIndex === 0);
  document.getElementById("nextCardBtn").disabled = (currentCardIndex === wordDataList.length - 1);
}
