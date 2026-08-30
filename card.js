// card.js
let currentCardIndex = 0;

function initCardMode() {
  const startNoInput = document.getElementById("startNoInput");
  let startNo = parseInt(startNoInput.value, 10);

  if (isNaN(startNo) || startNo < 1) startNo = 1;
  if (startNo > wordDataList.length) startNo = wordDataList.length;

  currentCardIndex = startNo - 1;

  showFlashCard();

  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("cardSection").classList.remove("hidden");
}

function showFlashCard() {
  if (wordDataList.length === 0) return;

  const item = wordDataList[currentCardIndex];

  document.getElementById("cardNo").textContent = `No. ${item.id}`;
  document.getElementById("cardWord").textContent = item.word;

  document.getElementById("cardMeaning").textContent = item.meaning;
  document.getElementById("cardEtymology").textContent = item.etymology || "なし";
  document.getElementById("cardDerived").textContent = item.derived || "なし";

  document.getElementById("cardBack").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const flashCard = document.getElementById("flashCard");
  const prevBtn = document.getElementById("prevCardBtn");
  const nextBtn = document.getElementById("nextCardBtn");
  const quitBtn = document.getElementById("quitCardBtn");
  const cardSpeechBtn = document.getElementById("cardSpeechBtn");

  // タップで裏面表示
  if (flashCard) {
    flashCard.addEventListener("click", () => {
      const cardBack = document.getElementById("cardBack");
      cardBack.classList.toggle("hidden");
    });
  }

  // 単語帳での手動発音ボタン
  if (cardSpeechBtn) {
    cardSpeechBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // カードめくりイベントの発生を防ぐ
      unlockAudio();
      const item = wordDataList[currentCardIndex];
      if (item && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const uttr = new SpeechSynthesisUtterance(item.word);
        uttr.lang = 'en-US';
        uttr.rate = 0.9;
        window.speechSynthesis.speak(uttr);
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentCardIndex > 0) {
        currentCardIndex--;
        showFlashCard();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentCardIndex < wordDataList.length - 1) {
        currentCardIndex++;
        showFlashCard();
      }
    });
  }

  if (quitBtn) {
    quitBtn.addEventListener("click", () => {
      document.getElementById("cardSection").classList.add("hidden");
      document.getElementById("setupSection").classList.remove("hidden");
    });
  }
});
