// data.js
let wordDataList = [];

// CSVファイルを非同期で読み込む関数
async function loadCSVData() {
  try {
    const response = await fetch('Target1900.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    wordDataList = parseCSV(text);
    console.log(`データを読み込みました: 全${wordDataList.length}件`);
  } catch (error) {
    console.error('CSV読み込みエラー:', error);
    alert('CSVデータの読み込みに失敗しました。target1900_2.csvの配置を確認してください。');
  }
}

// 簡単なCSVパース処理（ヘッダー: ID, Word, Meaning, Etymology, Derived）
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const result = [];
  // 1行目はヘッダーなのでスキップ
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // カンマ区切り（カンマを含まない前提の処理）
    const cols = line.split(',');
    if (cols.length >= 3) {
      result.push({
        id: parseInt(cols[0], 10),
        word: cols[1] ? cols[1].trim() : '',
        meaning: cols[2] ? cols[2].trim() : '',
        etymology: cols[3] ? cols[3].trim() : '',
        derived: cols[4] ? cols[4].trim() : ''
      });
    }
  }
  return result;
}

// ページ読み込み完了時に自動実行
document.addEventListener('DOMContentLoaded', () => {
  loadCSVData();
});
