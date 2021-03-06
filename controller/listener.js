import { GoogleSpreadsheet } from 'google-spreadsheet';
import moment from 'moment-timezone';
import _ from 'lodash';
import log4js from 'log4js';
import config from '../config/config.js';
// import path from 'path';
import qrcode from 'qrcode-terminal';
import { sleep } from '../utils/utils.js';

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
  constructor(waClient) {
    this.waClient = waClient;

    this.doc = new GoogleSpreadsheet(config.googleDocs.key);

    this.initDoc();
  }

  async initDoc() {
    await this.doc.useServiceAccountAuth(config.googleCreds);
    await this.doc.loadInfo(); // loads document properties and worksheets
  }

  async listen() {
    this.waClient.on('ready', async () => {
      // this.handleSendByTitle('Sheet3');
      // const sheet = this.doc.sheetsByIndex[0];
      // const rows = await sheet.getRows();
      // rows.forEach(element => {
      //   console.log(element);
      //   const number = element.Hp.trim();
      //   const text = `Whatsapp bot broadcast testing to contacts : ${element.Nama}`;
      //   const chatId = '62' + number.substring(1) + '@c.us';
      //   // this.waClient.sendMessage(chatId, text);
      // });
    });

    this.waClient.on('message', async msg => {
      console.log('MESSAGE RECEIVED', msg);

      if (msg.body === '!ping') {
        // Send a new message as a reply to the current one
        msg.reply(
          `Server status alive ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        );
      } else if (msg.body.startsWith('!sendbroadcast ')) {
        this.handleSendByTitle(msg);
      }
    });

    this.waClient.on('qr', qr => {
      // NOTE: This event will not be fired if a session is specified.
      qrcode.generate(qr, {small: true});
    });

    this.waClient.on('authenticated', () => {
      console.log('AUTHENTICATED');
    });

    this.waClient.on('auth_failure', msg => {
      // Fired if session restore was unsuccessfull
      console.error('AUTHENTICATION FAILURE', msg);
    });

    this.waClient.on('message_create', msg => {
      // Fired on all message creations, including your own
      if (msg.fromMe) {
        // do stuff here
      }
    });

    this.waClient.on('message_revoke_everyone', async (after, before) => {
      // Fired whenever a message is deleted by anyone (including you)
      console.log(after); // message after it was deleted.
      if (before) {
        console.log(before); // message before it was deleted.
      }
    });

    this.waClient.on('message_revoke_me', async msg => {
      // Fired whenever a message is only deleted in your own view.
      console.log(msg.body); // message before it was deleted.
    });

    this.waClient.on('message_ack', (msg, ack) => {
      /*
                == ACK VALUES ==
                ACK_ERROR: -1
                ACK_PENDING: 0
                ACK_SERVER: 1
                ACK_DEVICE: 2
                ACK_READ: 3
                ACK_PLAYED: 4
            */

      if (ack == 3) {
        // The message was read
      }
    });

    this.waClient.on('group_join', notification => {
      // User has joined or been added to the group.
      console.log('join', notification);
      notification.reply('User joined.');
    });

    this.waClient.on('group_leave', notification => {
      // User has left or been kicked from the group.
      console.log('leave', notification);
      notification.reply('User left.');
    });

    this.waClient.on('group_update', notification => {
      // Group picture, subject or description has been updated.
      console.log('update', notification);
    });

    this.waClient.on('change_battery', batteryInfo => {
      // Battery percentage for attached device has changed
      const { battery, plugged } = batteryInfo;
      console.log(`Battery: ${battery}% - Charging? ${plugged}`);
    });

    this.waClient.on('change_state', state => {
      console.log('CHANGE STATE', state);
    });

    this.waClient.on('disconnected', reason => {
      console.log('this.waClient was logged out', reason);
    });
  }

  async handleSendByTitle(msg = {}) {
    if (_.isNil(msg.body)) {
      this.waClient.sendMessage(msg.from, `Request tidak valid`);
      return false;
    }

    const title = msg.body.slice(15).trim();
    const sheet = this.doc.sheetsByTitle[title];

    if (_.isNil(sheet)) {
      this.waClient.sendMessage(msg.from, `Judul sheet tidak ditemukan`);
      return false;
    }

    const rows = await sheet.getRows(); // can pass in { limit, offset }
    const failedNumber = [];

    for await (let element of rows) {
      await sleep(1000);

      const no  = element.Hp ?? "-";
      let txt   = rows[0].Text.replace("[Dynamic_1]", element.Dynamic_1);
      txt       = txt.replace("[Dynamic_2]", element.Dynamic_2);

      const number = '62' + no.substring(1) + '@c.us';
      const number_details = await this.waClient.getNumberId(number); // get mobile number details

      if (number_details) {
        // eslint-disable-next-line no-underscore-dangle
        await this.waClient.sendMessage(number_details._serialized, txt); // send message
        logger.info(`SUCCESS : ${no}`);
      } else {
        failedNumber.push(`${element.Dynamic_1} - ${no}`);
        logger.info(`FAILED : ${element.Dynamic_1} - ${no}`);
        console.log(no, 'Nomer Belum Teregistrasi WA');
      }
    }

    if (failedNumber.length > 0) {
      await this.waClient.sendMessage(
        msg.from,
        `Nomor yang gagal dikirim : \n${failedNumber.join('\n')}`
      );
    }

    await this.waClient.sendMessage(msg.from, `Broadcast berhasil dikirim`);
  }
}
