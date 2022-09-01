import pkg from '@adiwajshing/baileys';
const { delay } = pkg;
import { GoogleSpreadsheet } from 'google-spreadsheet';
import moment from 'moment-timezone';
import _ from 'lodash';
import log4js from 'log4js';
import config from '../config/config.js';
// import path from 'path';
import { nullSafety, sleep } from '../utils/utils.js';

// const __dirname = path.resolve();

moment().tz('Asia/Jakarta').format();
moment.locale('id');

log4js.configure({
  appenders: {
    fileAppender: {
      type: 'dateFile',
      filename: './logs/broadcast.log',
      layout: {
        type: 'pattern',
        pattern: '%d - %c:[%p]: %m',
      },
      flags: 'w',
      pattern: '.yyyy-MM-dd',
      compress: true,
      alwaysIncludePattern: true,
      // numToKeep: 3,
    },
  },
  categories: {
    default: {
      appenders: ['fileAppender'],
      level: 'info',
    },
  },
});

const logger = log4js.getLogger();

export class Listener {
  constructor(waClient, events) {
    this.waClient = waClient;
    this.events = events;

    this.doc = new GoogleSpreadsheet(config.googleDocs.key);
  }

  async listen() {
    await this.doc.useServiceAccountAuth(config.googleCreds);
    await this.doc.loadInfo(); // loads document properties and worksheets
    
    if (this.events['messages.upsert']) {
      const upsert = this.events['messages.upsert']

      if (upsert.type === 'notify' || upsert.type === 'append') {
        console.log(JSON.stringify(upsert, undefined, 2));
      }

      if (upsert.type === 'notify') {
        for (const msg of upsert.messages) {
          if (!msg.key.fromMe) {
            if (!_.isNil(msg.message) && msg.message.conversation === '!ping') {
              await this.waClient.readMessages([msg.key]);
              await this.sendMessageWTyping({ text: `Server status alive ${moment().format('MMMM Do YYYY, h:mm:ss a')}` }, msg.key.remoteJid)
            } 
            else if (!_.isNil(msg.message) && msg.message.conversation.startsWith('!sendbroadcast ')) {
              await this.waClient.readMessages([msg.key]);
              await this.handleSendByTitle(msg);
            }
            else if (!_.isNil(msg.message) && msg.message.conversation.startsWith('!sendbroadcastfile ')) {
              await this.waClient.readMessages([msg.key]);
              await this.handleSendAttachmentByTitle(msg);
            }
            // // Autoreply template message this must be end
            // else if (!_.isNil(msg.message) && msg.message.conversation.length > 10) {
            //   await this.waClient.readMessages([msg.key]);
            //   await this.sendMessageWTyping({ text: `*Pesan otomatis, mohon berkenan untuk tidak membalas pesan ini*` }, msg.key.remoteJid)
            // }
          }
        }
      }
    }
  }

  async sendMessageWTyping(msg, jid) {
    await this.waClient.presenceSubscribe(jid);
    await delay(500);

    await this.waClient.sendPresenceUpdate('composing', jid);
    await delay(1000);

    await this.waClient.sendPresenceUpdate('paused', jid);

    await this.waClient.sendMessage(jid, msg);
  }

  async handleSendByTitle(msg = {}) {
    const title = msg.message.conversation.slice(15).trim();
    const sheet = this.doc.sheetsByTitle[title];

    if (_.isNil(sheet)) {
      await this.sendMessageWTyping({ text: `Judul sheet tidak ditemukan` }, msg.key.remoteJid);
      return false;
    }

    const rows = await sheet.getRows(); // can pass in { limit, offset }
    const failedNumber = [];

    for await (let element of rows) {
      await sleep(1000);

      const no = element.Hp.trim();
      const id = '62' + no.substring(1);
      const number = '62' + no.substring(1) + '@s.whatsapp.net';
      let txt = rows[0].Text.replace("[Dynamic_1]", element.Dynamic_1);
      txt = txt.replace("[Dynamic_2]", element.Dynamic_2);

      const result = await this.waClient.onWhatsApp(id);

      if (!_.isNil(result) && result.length > 0) {
        await this.waClient.sendMessage(number, { text: txt });
        logger.info(`SUCCESS : ${no}`);
      } else {
        failedNumber.push(no);
        logger.info(`FAILED : ${no}`);
        console.log(no, 'Nomer Belum Teregistrasi WA');
      }
    }

    if (failedNumber.length > 0) {
      await this.waClient.sendMessage(msg.key.remoteJid, { text: `Nomor yang gagal dikirim : \n${failedNumber.join('\n')}` });
    }

    await this.waClient.sendMessage(msg.key.remoteJid, { text: `Broadcast berhasil dikirim` });
  }

  async handleSendAttachmentByTitle(msg = {}) {
    const title = msg.message.conversation.slice(19).trim();
    const sheet = this.doc.sheetsByTitle[title];

    if (_.isNil(sheet)) {
      await this.sendMessageWTyping({ text: `Judul sheet tidak ditemukan` }, msg.key.remoteJid);
      return false;
    }

    const rows = await sheet.getRows(); // can pass in { limit, offset }
    const failedNumber = [];

    for await (let element of rows) {
      await sleep(1000);

      const no = element.Hp.trim();
      const id = '62' + no.substring(1);
      const number = '62' + no.substring(1) + '@s.whatsapp.net';
      let txt = rows[0].Text.replace("[Dynamic_1]", element.Dynamic_1);
      txt = txt.replace("[Dynamic_2]", element.Dynamic_2);

      let messageOne;
      let messageOneTxt;
      if (rows[0].Attachment_Type == "image") {
        messageOne = {
          image: { url: `${rows[0].Attachment}` },
          caption: txt
        }
        messageOneTxt = "";
      } else {
        if (rows[0].Attachment_Type == "xls") {
          messageOne = {
            document: { url: `${rows[0].Attachment}` },
            mimetype: "application/vnd.ms-excel",
            fileName: 'Attachment_file.xls',
          }
        }
        else if (rows[0].Attachment_Type == "xlsx") {
          messageOne = {
            document: { url: `${rows[0].Attachment}` },
            mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName: 'Attachment_file.xlsx',
          }
        }
        else if (rows[0].Attachment_Type == "doc") {
          messageOne = {
            document: { url: `${rows[0].Attachment}` },
            mimetype: "application/msword",
            fileName: 'Attachment_file.doc',
          }
        }
        else if (rows[0].Attachment_Type == "docx") {
          messageOne = {
            document: { url: `${rows[0].Attachment}` },
            mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileName: 'Attachment_file.docx',
          }
        }
        else if (rows[0].Attachment_Type == "pdf") {
          messageOne = {
            document: { url: `${rows[0].Attachment}` },
            mimetype: "application/pdf",
            fileName: 'Attachment_file.pdf',
          }
        }

        messageOneTxt = {
          text: txt
        }

      }

      const result = await this.waClient.onWhatsApp(id);

      if (!_.isNil(result) && result.length > 0) {

        if (messageOneTxt != "") {
          await this.waClient.sendMessage(number, messageOneTxt);
        }

        await this.waClient.sendMessage(number, messageOne);

        logger.info(`SUCCESS : ${no}`);
      } else {
        failedNumber.push(no);
        logger.info(`FAILED : ${no}`);
        console.log(no, 'Nomer Belum Teregistrasi WA');
      }
    }

    if (failedNumber.length > 0) {
      await this.waClient.sendMessage(msg.key.remoteJid, { text: `Nomor yang gagal dikirim : \n${failedNumber.join('\n')}` });
    }

    await this.waClient.sendMessage(msg.key.remoteJid, { text: `Broadcast berhasil dikirim` });
  }
}
