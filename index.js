const { Client } = require('whatsapp-web.js');
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

const qr = require('qr-image');
const client = new Client({ puppeteer: { headless: false }, clientId: 'example' });
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});
let whatsapp_bot_status = "offline";

client.on('qr', (qr_code) => {
    whatsapp_bot_status = 'wait for qr';
    console.log('QR RECEIVED', qr_code);
    let img = qr.image(qr_code, { type: 'png' });
    let file = img.pipe(require('fs').createWriteStream('qr.png'));
    setTimeout(()=> {
        bot.sendPhoto(TELEGRAM_CHAT_ID, 'qr.png', {caption: qr_code}).then((e)=> {
            console.log('done sending qr', e);
        })
    },150);
    //const media = MessageMedia.fromFilePath(__dirname + '\\qr.png');
    //client.sendMessage(chatId=TELEGRAM_CHAT_ID, content=media);
    
    
});

client.on('ready', () => {
    whatsapp_bot_status = 'ready';
    console.log('Client is ready!');
    bot.sendMessage(TELEGRAM_CHAT_ID, 'בוט וואצאפ מוכן לשימוש');
});

bot.on('message', (msg) => {
    console.log('message', msg);
    if (msg.text === '/restart') {
        bot.sendMessage(msg.chat.id, 'התחל מחדש בעוד 5 שניות');
        setTimeout(()=> {
            process.exit(0);
        },5000);
        
    }else if(msg.text === '/status') {
        bot.sendMessage(msg.chat.id, whatsapp_bot_status);
    }else if(msg.text.startsWith('/lead')){
        let number = msg.text.substring(6);
        console.log('lead', number);
        const bot_number = '+972555571040';
        let contact_id = bot_number.substring(1) + "@c.us";
        let contact = client.getContactById(contact_id).then(contact => {
            const chatId = number.substring(1) + "@c.us";
            let text = 'אנחנו שמחים שהחלטת להצטרף לרשימת הVIP שלנו. אנא שמור מספר זה'
            client.sendMessage(chatId, text);
            client.sendMessage(chatId, contact);
        });
    }
});

client.initialize();
whatsapp_bot_status = 'online';