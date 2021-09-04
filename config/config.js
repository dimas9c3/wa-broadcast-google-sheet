import dotenv from 'dotenv';

dotenv.config();

export default {
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
  },
  googleCreds: {
    private_key: process.env.GOOGLE_CREDS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CREDS_CLIENT_EMAIL,
  },
  googleDocs: {
    key: process.env.GOOGLE_SHEET_KEY,
  },
};
