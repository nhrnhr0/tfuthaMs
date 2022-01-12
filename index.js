const { Client, MessageAck } = require('whatsapp-web.js');
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

const qr = require('qr-image');
const client = new Client({ puppeteer: { headless: false }, clientId: 'example' });
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let sent_unread_messages = [];

if(!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
    process.exit(1);
}
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
client.on("message_ack", async (msg, ack) => {
    console.log('message_ack', msg, ack);
    console.log(msg); 
    console.log(ack);
    let ack_str = '?';
    
    if(ack == MessageAck.ACK_ERROR) {
        ack_str = 'error';
    }else if(ack == MessageAck.ACK_PENDING) {
        ack_str = 'pending';
    }else if(ack == MessageAck.ACK_SERVER) {
        ack_str = 'server';
    }else if(ack == MessageAck.ACK_READ) {
        ack_str = 'read';
    }else if(ack == MessageAck.ACK_DEVICE) {
        ack_str = 'device';
    }else if(ack == MessageAck.ACK_PLAYED) {
        ack_str = 'played';
    }
    
    bot.sendMessage(TELEGRAM_CHAT_ID, `${msg.from.replace('@c.us', '')}:\n${msg.body}\nACK: ${ack_str}`);
})
client.on('ready', () => {
    whatsapp_bot_status = 'ready';
    console.log('Client is ready!');
    bot.sendMessage(TELEGRAM_CHAT_ID, 'בוט וואצאפ מוכן לשימוש');
});

bot.on('message', (msg) => {
    console.log('message', msg);
    if(msg.chat.id == TELEGRAM_CHAT_ID){
        if (msg.text === '/restart') {
            bot.sendMessage(msg.chat.id, 'התחל מחדש בעוד 5 שניות');
            setTimeout(()=> {
                process.exit(0);
            },5000);
            
        }else if(msg.text === '/status') {
            bot.sendMessage(msg.chat.id, whatsapp_bot_status);
        }else if(msg.text.startsWith('/lead')){
            let number = msg.text.substring(6);
            if(number.startsWith('+') && number.length == 13) {
                number = number.substring(1);
            }else if(number.startsWith('0') && number.length == 10){
                number = '972' + number.substring(1);
            }else {
                bot.sendMessage(msg.chat.id, number + ' לא תקין');
                return;
            }
            console.log('lead', number);
            const bot_number = '+972555571040';
            let contact_id = bot_number.substring(1) + "@c.us";
            let contact = client.getContactById(contact_id).then(contact => {
                const chatId = number + "@c.us";
                let text = 'אנחנו שמחים שהחלטת להצטרף לרשימת הVIP שלנו. אנא שמור מספר זה'
                let text_response = client.sendMessage(chatId, text);
                let contact_response = client.sendMessage(chatId, contact);
                text_response.then((text_resp)=> {
                    contact_response.then((contact_resp)=> {
                        sent_unread_messages.push({
                            message_id: text_resp.id,
                        });
                        sent_unread_messages.push({
                            message_id: contact_resp.id,
                        });

                        bot.sendMessage(msg.chat.id, 'הודעה נשלחה ל' + number);
                    });
                });
                
            });
        }
    }
});

client.initialize();
whatsapp_bot_status = 'online';