// server.js
const express = require('express');
const line = require('@line/bot-sdk');
const fs = require('fs');
const app = express();

// --- 環境變數檢查 ---
if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_CHANNEL_SECRET) {
  console.error('請先設定環境變數：LINE_CHANNEL_ACCESS_TOKEN 與 LINE_CHANNEL_SECRET');
  process.exit(1); // Token 沒設定就直接退出
}

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN, 
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

// 讀取或初始化紀錄檔
let records = [];
const RECORD_FILE = 'records.json';
if (fs.existsSync(RECORD_FILE)) {
  try {
    records = JSON.parse(fs.readFileSync(RECORD_FILE));
  } catch (e) {
    console.error('讀取 records.json 失敗，初始化為空陣列');
    records = [];
  }
}

// --- 定時檢查提醒（每分鐘一次） ---
setInterval(() => {
  const now = new Date();
  const toNotify = records.filter(r => !r.notified && new Date(r.time) <= now);
  toNotify.forEach(r => {
    client.pushMessage(r.groupId, {
      type: 'text',
      text: `提醒：${r.text} (設定時間: ${r.time})`
    });
    r.notified = true;
  });
  if (toNotify.length > 0) {
    fs.writeFileSync(RECORD_FILE, JSON.stringify(records, null, 2));
  }
}, 60 * 1000); // 每分鐘檢查一次

// --- Webhook ---
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.sendStatus(200))
    .catch(err => {
      console.error(err);
      res.sendStatus(500);
    });
});

// --- 處理訊息 ---
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text;
  const groupId = event.source.groupId || event.source.userId;

  // 自我介紹
  if (text.includes('奴才 自我介紹')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '我是奴才小幫手，會幫大家記錄事情和提醒活動喔～'
    });
  }

  // 記錄事情
  // 格式: 奴才 記住 活動名稱|YYYY-MM-DD HH:MM
  if (text.startsWith('奴才 記住')) {
    const content = text.replace('奴才 記住', '').trim();
    const [note, timeStr] = content.split('|');
    const time = new Date(timeStr);
    if (!note || isNaN(time.getTime())) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '格式錯誤，請使用：奴才 記住 活動名稱|YYYY-MM-DD HH:MM'
      });
    }

    records.push({ groupId, text: note, time: time.toISOString(), notified: false });
    fs.writeFileSync(RECORD_FILE, JSON.stringify(records, null, 2));
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `已記錄：${note}，提醒時間：${time.toISOString()}`
    });
  }

  // 查紀錄
  if (text.includes('奴才 查紀錄')) {
    const lastRecords = records
      .filter(r => r.groupId === groupId)
      .slice(-5)
      .map(r => `${r.text} (時間: ${r.time})`)
      .join('\n');
    const reply = lastRecords || '目前沒有任何紀錄喔～';
    return client.replyMessage(event.replyToken, { type: 'text', text: reply });
  }

  // 群組有人喊奴才但不是其他指令，就簡單回覆
  if (text.includes('奴才')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `你說了: ${text}`
    });
  }
}

// --- 啟動伺服器 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`奴才小幫手啟動中，監聽 PORT ${PORT}...`);
});
