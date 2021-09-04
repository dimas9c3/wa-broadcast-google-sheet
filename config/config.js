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
    // Insert google creds here
  },
  googleDocs: {
    key: process.env.GOOGLE_SHEET_KEY
  }
};
