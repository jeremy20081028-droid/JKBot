const express = require('express');
const line = require('@line/bot-sdk');
const fs = require('fs');
const app = express();

const config = {
  channelAccessToken: '2IXSwXm3fMcBDHUmOi/eHdNokRUe84zigR987BWZ+4CtR4vvQbd3JBFlETCyvTAlKKk1SpiNq9LzxitLzqHjbMCbq3AS//0y26qSooPP0/fmxv+tn4JhqJHRHs3EozrrtMQCIqZ78fgwhhv7le7bMgdB04t89/1O/w1cDnyilFU=
', // <-- 填你的 Token
  channelSecret: 'e9b476b663ac72f72d83c0adb761aa8a'    // <-- 填你的 Secret
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

// 定時檢查提醒（每分鐘一次）
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
}, 60 * 1000);

// Webhook
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.sendStatus(200))
    .catch(err => {
      console.error(err);
      res.sendStatus(500);
    });
});

// 處理訊息
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;

  // 自我介紹
  if (text.includes('奴才 自我介紹')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '我是奴才小幫手，會幫大家記錄事情、提醒活動，並可以匯入舊訊息喔～'
    });
  }

  // 記錄新活動
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

  // 查紀錄（支援關鍵字）
  if (text.startsWith('奴才 查紀錄')) {
    const keyword = text.replace('奴才 查紀錄', '').trim();
    let filtered = records.filter(r => r.groupId === groupId);
    const allowedKeywords = ['新活動','活動時間','結束時間','獎品'];
    if (keyword && allowedKeywords.includes(keyword)) {
      filtered = filtered.filter(r => r.text.includes(keyword));
    }
    const lastRecords = filtered.slice(-5).map(r => `${r.text} (時間: ${r.time})`).join('\n');
    const reply = lastRecords || '目前沒有符合的紀錄喔～';
    return client.replyMessage(event.replyToken, { type: 'text', text: reply });
  }

  // 匯入舊訊息
  if (text.startsWith('奴才 匯入')) {
    const content = text.replace('奴才 匯入', '').trim();
    const [note, timeStr] = content.split('|');
    const time = new Date(timeStr);
    if (!note || isNaN(time.getTime())) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '格式錯誤，請使用：奴才 匯入 舊訊息內容|YYYY-MM-DD HH:MM'
      });
    }
    records.push({ groupId, text: note, time: time.toISOString(), notified: true });
    fs.writeFileSync(RECORD_FILE, JSON.stringify(records, null, 2));
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `已匯入舊訊息：${note}，時間：${time.toISOString()}`
    });
  }

  // 回覆喊奴才但不是指令的訊息
  if (text.includes('奴才')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `你說了: ${text}`
    });
  }
}

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`奴才小幫手啟動中，監聽 PORT ${PORT}...`);
});
