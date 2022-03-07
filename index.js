import pkg from 'whatsapp-web.js';
const { Client, LegacySessionAuth  } = pkg;
import fs from 'fs';
import { Listener } from './controller/listener.js';

(() => {
  const SESSION_FILE_PATH = './config/session.json';
  let sessionCfg;

  if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = JSON.parse(fs.readFileSync(SESSION_FILE_PATH, 'utf8'));
  }

  const client = new Client({
    puppeteer: { headless: false },
    authStrategy: new LegacySessionAuth({
      session: sessionCfg
    })
  });

  client.initialize();

  client.on('authenticated', session => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
      if (err) {
        console.error(err);
      }
    });
  });

  const listenerInstance = new Listener(client);
  listenerInstance.listen();
})();
