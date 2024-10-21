const { execSync } = require('child_process');
const fetch = require('node-fetch');
const fs = require('fs');
const unzipper = require('unzipper');
const path = require('path');

// SudachiDictの最新リリースをダウンロード
const SUDACHI_DICT_URL = 'http://sudachi.s3-website-ap-northeast-1.amazonaws.com/sudachidict-raw/';
const MATRIX_DEF_URL = `${SUDACHI_DICT_URL}matrix.def.zip`;

async function getLatestVersion() {
  const response = await fetch(SUDACHI_DICT_URL);
  const html = await response.text();

  // 最新のsmall_lex.zipを探す
  const match = html.match(/(\d{8})\/small_lex\.zip/);
  if (match) {
    const latestVersion = match[1];
    const baseURL = `${SUDACHI_DICT_URL}${latestVersion}/`;
    return {
      latestVersion,
      urls: {
        small_lex: `${baseURL}small_lex.zip`,
        matrix_def: MATRIX_DEF_URL,
        char_def: 'https://raw.githubusercontent.com/WorksApplications/Sudachi/develop/src/main/resources/char.def',
        unk_def: 'https://raw.githubusercontent.com/WorksApplications/Sudachi/develop/src/main/resources/unk.def',
      }
    };
  } else {
    throw new Error('Latest version not found');
  }
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  const fileStream = fs.createWriteStream(outputPath);
  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);
    response.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
  console.log(`Downloaded ${url} to ${outputPath}`);
}

async function downloadAndUnzip(url, outputDir) {
  const response = await fetch(url);
  await response.body
    .pipe(unzipper.Extract({ path: outputDir }))
    .promise();
  console.log(`Downloaded and extracted ${url} to ${outputDir}`);
}

async function setupSudachiDict() {
  try {
    const { latestVersion, urls } = await getLatestVersion();
    console.log(`Downloading SudachiDict version: ${latestVersion}`);
    const dictDir = path.join(__dirname, `sudachi-dict-${latestVersion}`);
    fs.mkdirSync(dictDir, { recursive: true });

    // 各ファイルのダウンロードと解凍
    await downloadAndUnzip(urls.small_lex, dictDir);
    await downloadAndUnzip(urls.matrix_def, dictDir);

    // char.defとunk.defはそのままダウンロード
    await downloadFile(urls.char_def, path.join(dictDir, 'char.def'));
    await downloadFile(urls.unk_def, path.join(dictDir, 'unk.def'));

    console.log(`SudachiDict version ${latestVersion} setup completed.`);
    return dictDir;
  } catch (error) {
    console.error(`Error setting up SudachiDict: ${error}`);
    process.exit(1);
  }
}
function clearDirectory(dir) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    fs.unlinkSync(filePath); // ファイルを削除
  });
  console.log(`Cleared directory: ${dir}`);
}

// 辞書をビルド
function buildDictionary(dictDir) {
  try {
    console.log("Building dictionary...");

    // kuromoji.jsのビルドディレクトリに移動
    const kuromojiDir = path.join(__dirname, 'node_modules/kuromoji');
    // dictディレクトリにあるファイルを削除
    const dictSourceDir = path.join(kuromojiDir, 'dict');
    clearDirectory(dictSourceDir);
    // 必要なファイルを移動してビルド
    fs.mkdirSync(path.join(kuromojiDir, 'node_modules/mecab-ipadic-seed/lib/dict'), { recursive: true });
    const dictPath = path.join(kuromojiDir, 'node_modules/mecab-ipadic-seed/lib/dict');

    // ファイルのコピー
    ['matrix.def', 'char.def', 'unk.def'].forEach(file => {
      fs.copyFileSync(path.join(dictDir, file), path.join(dictPath, file));
    });

    // small_lex.csvのフォーマット変換
    const input = path.join(dictDir, 'small_lex.csv');
    const output = path.join(dictPath, 'small_lex-mod.csv');
    execSync(`awk -F',' 'OFS="," {print $1,$2,$3,$4,$6,$7,$8,$9,$10,$11,$13,$12,"*"}' ${input} > ${output}`);

    // kuromojiディレクトリに移動してnpm run build-dictを実行
    console.log("Running npm install and build-dict...");
    execSync('npm install', { cwd: kuromojiDir, stdio: 'inherit' });
    execSync('npm run build-dict', { cwd: kuromojiDir, stdio: 'inherit' });

    console.log("Dictionary built successfully!");

    // ビルドした辞書を作業ディレクトリにコピー
    const outputDir = path.join(__dirname, 'kuromoji-dict-sudachi');
    fs.mkdirSync(outputDir, { recursive: true });

    // kuromojiDirのdictフォルダ全体をコピー
    fs.readdirSync(dictSourceDir).forEach(file => {
      if (file.endsWith('.dat.gz')) { // .dat.gzファイルのみコピー
        const srcPath = path.join(dictSourceDir, file);
        const destPath = path.join(outputDir, file);
        fs.copyFileSync(srcPath, destPath);
      }
    });
    console.log("Copied dictionary to kuromoji-dict-sudachi.");
  } catch (error) {
    console.error(`Error building dictionary: ${error}`);
    process.exit(1);
  }
}

// メイン処理
(async function main() {
  const dictDir = await setupSudachiDict();
  buildDictionary(dictDir);
})();
