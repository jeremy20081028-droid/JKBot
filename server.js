const express = require('express');
const line = require('@line/bot-sdk');
const app = express();

const config = {
  channelAccessToken: '2IXSwXm3fMcBDHUmOi/eHdNokRUe84zigR987BWZ+4CtR4vvQbd3JBFlETCyvTAlKKk1SpiNq9LzxitLzqHjbMCbq3AS//0y26qSooPP0/fmxv+tn4JhqJHRHs3EozrrtMQCIqZ78fgwhhv7le7bMgdB04t89/1O/w1cDnyilFU=
', // 替換為你的 Token
  channelSecret: 'e9b476b663ac72f72d83c0adb761aa8a' // 保持這個
};

const client = new line.Client(config);

app.post('/webhook', line.middleware(config), (req, res) => {
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000);
