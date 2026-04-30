require('dotenv').config();

const { createApp, initDb, MONGO_URL, DB_NAME } = require('./app');

const PORT = process.env.PORT || 5000;
const app = createApp();

async function start() {
  await initDb();

  app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} da ishlayapti`);
    console.log(`MongoDB ${MONGO_URL}/${DB_NAME} ga ulandi`);
  });
}

start().catch((error) => {
  console.error('Server ishga tushmadi:', error);
  process.exit(1);
});
