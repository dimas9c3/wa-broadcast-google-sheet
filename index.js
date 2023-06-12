import pkg from '@whiskeysockets/baileys';
import {
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  useMultiFileAuthState ,
} from '@whiskeysockets/baileys';
// import { Boom } from '@hapi/boom';
import P from 'pino';
import { Listener } from './controller/listener.js';

const makeWASocket = pkg.default;

(async () => {
  // the store maintains the data of the WA connection in memory
  // can be written out to a file & read from it
  const store = makeInMemoryStore({
    logger: P().child({ level: 'debug', stream: 'store' }),
  });
  store.readFromFile('./config/baileys_store.json');
  // save every 10s
  setInterval(() => {
    store.writeToFile('./config/baileys_store.json');
  }, 10_000);

  const { state, saveCreds } = await useMultiFileAuthState('config/auth');

  // start a connection
  const startSock = async () => {
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);
  
      const sock = await makeWASocket({
        version,
        logger: P({ level: 'debug' }),
        printQRInTerminal: true,
        auth: state,
      });

      store?.bind(sock.ev);
  
      sock.ev.process(
        // events is a map for event name => event data
        async(events) => {
          // something about the connection changed
          // maybe it closed, or we received all offline message or connection opened
          if(events['connection.update']) {
            const update = events['connection.update']
            const { connection, lastDisconnect } = update
            if(connection === 'close') {
              // reconnect if not logged out
              if(lastDisconnect?.error) {
                // process.exit();
                startSock()
              } else {
                console.log('Connection closed. You are logged out.')
              }
            }
    
            // console.log('connection update', update)
          }
    
          // credentials updated -- save them
          if(events['creds.update']) {
            await saveCreds()
          }

          const listenerInstance = new Listener(sock, events);
          await listenerInstance.listen();
        }
      )

      return sock; 
    } catch (error) {
      console.log(error);
      process.exit();
    }
   
  };

  startSock();
})();
