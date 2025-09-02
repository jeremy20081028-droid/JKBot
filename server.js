const express = require('express');
const line = require('@line/bot-sdk');
const app = express();

const config = {
  channelAccessToken: '2IXSwXm3fMcBDHUmOi/eHdNokRUe84zigR987BWZ+4CtR4vvQbd3JBFlETCyvTAlKKk1SpiNq9LzxitLzqHjbMCbq3AS//0y26qSooPP0/fmxv+tn4JhqJHRHs3EozrrtMQCIqZ78fgwhhv7le7bMgdB04t89/1O/w1cDnyilFU=', // 替換為你的 Token
  channelSecret: 'e9b476b663ac72f72d83c0adb761aa8a' // 保持這個
};

const client = new line.Client(config);

// 儲存活動和提醒
let activities = [];
let reminders = [];

app.post('/webhook', line.middleware(config), (req, res) => {
  req.body.events.forEach(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text.trim();
      const replyToken = event.replyToken;

      // 記錄活動
      if (userMessage.endsWith('奴才記住')) {
        const activity = userMessage.replace('奴才記住', '').trim();
        activities.push({ text: activity, time: new Date().toLocaleString() });
        client.replyMessage(replyToken, { type: 'text', text: '已記住：' + activity });
        return;
      }

      // 設定提醒
      if (userMessage.endsWith('奴才提醒')) {
        const [time, ...rest] = userMessage.replace('奴才提醒', '').trim().split(' ');
        const task = rest.join(' ');
        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        const remindTime = new Date(now);
        remindTime.setHours(hours, minutes, 0, 0);

        if (remindTime <= now) remindTime.setDate(remindTime.getDate() + 1);

        const delay = remindTime - now;
        reminders.push({ time: remindTime, task, event });
        setTimeout(() => {
          client.pushMessage(event.source.groupId || event.source.userId, { type: 'text', text: `提醒：${task}` });
        }, delay);
        client.replyMessage(replyToken, { type: 'text', text: `已設定${time}提醒：${task}` });
        return;
      }

      // 查詢紀錄
      if (userMessage === '最近的活動' || userMessage === '活動時間') {
        if (activities.length > 0) {
          const latest = activities[activities.length - 1];
          client.replyMessage(replyToken, { type: 'text', text: `最新活動：${latest.text} (時間：${latest.time})` });
        } else {
          client.replyMessage(replyToken, { type: 'text', text: '沒有活動記錄' });
        }
        return;
      }

      // 預設回應
      client.replyMessage(replyToken, { type: 'text', text: '你好！我是奴才，輸入[內容]奴才記住/[時間][事項]奴才提醒/最近的活動' });
    }
  });
  res.sendStatus(200);
});

app.listen(process.env.PORT);

