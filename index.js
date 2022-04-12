import pkg from 'whatsapp-web.js';
const { Client, LegacySessionAuth, LocalAuth } = pkg;
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
    authStrategy: new LocalAuth()
  });

  client.initialize();

  const listenerInstance = new Listener(client);
  listenerInstance.listen();
})();
