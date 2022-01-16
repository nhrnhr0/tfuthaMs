const { Client, MessageAck,Buttons, ChatTypes } = require('whatsapp-web.js');
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

const qr = require('qr-image');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const EXPRESS_PORT = process.env.EXPRESS_PORT;
const HEADLESS = process.env.HEADLESS==='false'?false:true;
const WHATSAPP_ADMINS = ['972524269134@c.us', '972524314139@c.us']


const whatsapp_client = new Client({ puppeteer: { headless: HEADLESS }, clientId: 'example' });
let sent_unread_messages = [];

if(!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !EXPRESS_PORT) {
    console.error('Please set TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID and HEADLESS in .env');
    process.exit(1);
}

const telegram_bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});
let whatsapp_bot_status = "offline";


const express = require('express')
const app = express()
const port = EXPRESS_PORT
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!')
})


app.post('/lead', (req, res) => {
    const { phone, message } = req.body;
    const chatId = phone_to_whatsapp_chat_id(phone);
    
    if(chatId) {
        whatsapp_client.sendMessage(chatId, message);
        res.send(JSON.stringify({success: true}));
    }else {
        console.error('Invalid phone number: ' + phone);
        telegram_bot.sendMessage(TELEGRAM_CHAT_ID, 'מספר טלפון לא תקין לשליחה: ' + phone);
        res.send(JSON.stringify({success: false}));
    }
    
})
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});

function phone_to_whatsapp_chat_id(phone) {
    phone = phone.replace('-', '');
    if(phone.startsWith('+') && phone.length == 13) {
        phone = phone.substring(1);
    }else if(phone.startsWith('0') && phone.length == 10){
        phone = '972' + phone.substring(1);
    }else {
        return null;
    }
    const chatId = phone + "@c.us";
    return chatId;
}

whatsapp_client.on('qr', (qr_code) => {
    whatsapp_bot_status = 'wait for qr';
    console.log('QR RECEIVED', qr_code);
    let img = qr.image(qr_code, { type: 'png' });
    let file = img.pipe(require('fs').createWriteStream('qr.png'));
    setTimeout(()=> {
        telegram_bot.sendPhoto(TELEGRAM_CHAT_ID, 'qr.png', {caption: qr_code}).then((e)=> {
            console.log('done sending qr', e);
        })
    },150);
    //const media = MessageMedia.fromFilePath(__dirname + '\\qr.png');
    //client.sendMessage(chatId=TELEGRAM_CHAT_ID, content=media);
    
    
});
whatsapp_client.on("message_ack", async (msg, ack) => {
    /*console.log('message_ack', msg, ack);
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
    
    telegram_bot.sendMessage(TELEGRAM_CHAT_ID, `${msg.from.replace('@c.us', '')}:\n${msg.body}\nACK: ${ack_str}`);*/
})
whatsapp_client.on('ready', () => {
    whatsapp_bot_status = 'ready';
    console.log('Client is ready!');
    telegram_bot.sendMessage(TELEGRAM_CHAT_ID, 'בוט וואצאפ מוכן לשימוש');
});

whatsapp_client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);
    if(WHATSAPP_ADMINS.includes(msg.id.participant)) {
        if(msg.body.startsWith('!\n')) {
            let body = msg.body.substring(2);
            // echo the body with the media if exists (image, video, audio) as attachment
            let reponse;
            if(msg.hasMedia) {
                /*reponse = await msg.reply(body, {
                    caption: msg.caption,
                    media: msg.media,
                    parse_mode: 'markdown'
                });*/
                msg.downloadMedia().then(media => {
                    console.log('downloaded media', media);
                    whatsapp_client.sendMessage(msg.from, body,{caption: body, media: media, parse_mode: 'markdown'});
                });
            }else {
                whatsapp_client.sendMessage(msg.from, body);
                /*reponse = await msg.reply(body, {
                    parse_mode: 'markdown'
                });*/
            }
        }
        else if(msg.body.startsWith('!שלח')){
            if(msg.hasQuotedMsg) {
                let message_to_send = await msg.getQuotedMessage();
                let campain_body = message_to_send.body;
                let campain_media = undefined;
                if(message_to_send.hasMedia) {
                    campain_media = await message_to_send.downloadMedia();
                }
                if(campain_body == undefined || campain_body == '') {
                    console.error('campain_body is empty');
                    return;
                }
                let groups = msg.body.substring(5).split('\n');
                let bot_chats = await whatsapp_client.getChats();
                if(groups == undefined || groups.length == 0 || bot_chats == undefined || bot_chats.length == 0) { 
                    console.error('groups or all user chats is empty');
                    return ;
                }
                for(let i = 0; i < bot_chats.length; i++) {
                    let chat = bot_chats[i];
                    let iter_group = chat.name;
                    if(groups.includes(iter_group)) {
                        if(campain_media) {
                            whatsapp_client.sendMessage(chat.id._serialized, campain_body,{caption: campain_body, media: campain_media, parse_mode: 'markdown'});
                        }else {
                            whatsapp_client.sendMessage(chat.id._serialized, campain_body);
                        }
                    }
                }
            }else {
                msg.reply('לא נמצא הודעה מצורפת');
            }
        }
    }
});

const help_markup = {
    reply_markup: {
        keyboard: [
            [{text: '/restart'}, {text: '/status'}],
            [{text: '/help'}, {text: '/lead'}],
        ]
    }
};

telegram_bot.on('message', (msg) => {
    console.log('telegram message: ', msg);
    if(msg.chat.id == TELEGRAM_CHAT_ID){
        if (msg.text === '/help') {
            // send /restart /status /lead as buttons with description
            message = '/status - לבדוק את מצב הבוט' + '\n'
            message += '/restart - להפעיל מחדש את הבוט' + '\n'
            message += '/lead - שליחת הודעה בוואצאפ. שימוש:' + '\n'
            message += '/lead <phone>\n<message>' + '\n'
            telegram_bot.sendMessage(msg.chat.id, message);
        }
        else if (msg.text === '/restart') {
            telegram_bot.sendMessage(msg.chat.id, 'התחל מחדש בעוד 5 שניות');
            setTimeout(()=> {
                process.exit(0);
            },5000);
            
        }else if(msg.text === '/status') {
            telegram_bot.sendMessage(msg.chat.id, whatsapp_bot_status);
        }else if(msg.text.startsWith('/lead')){
            debugger;
            let number = msg.text.substring(6, msg.text.indexOf('\n'));
            if(number.startsWith('+') && number.length == 13) {
                number = number.substring(1);
            }else if(number.startsWith('0') && number.length == 10){
                number = '972' + number.substring(1);
            }else {
                telegram_bot.sendMessage(msg.chat.id, number + ' לא תקין');
                return;
            }

            const chatId = number + "@c.us";
            const message = msg.text.substring(msg.text.indexOf('\n') + 1);
            whatsapp_client.sendMessage(chatId, message);
            /*const bot_number = '+972555571040';
            let contact_id = bot_number.substring(1) + "@c.us";
            let contact = whatsapp_client.getContactById(contact_id).then(contact => {
                const chatId = number + "@c.us";
                let text = 'אנחנו שמחים שהחלטת להצטרף לרשימת הVIP שלנו. אנא שמור מספר זה'
                let text_response = whatsapp_client.sendMessage(chatId, text);
                let contact_response = whatsapp_client.sendMessage(chatId, contact);
                text_response.then((text_resp)=> {
                    contact_response.then((contact_resp)=> {
                        sent_unread_messages.push({
                            message_id: text_resp.id,
                        });
                        sent_unread_messages.push({
                            message_id: contact_resp.id,
                        });

                        telegram_bot.sendMessage(msg.chat.id, 'הודעה נשלחה ל' + number);
                    });
                });
                
            });*/
        }
    }
});

whatsapp_client.initialize();
whatsapp_bot_status = 'online';