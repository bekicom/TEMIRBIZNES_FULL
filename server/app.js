const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'temir_biznes';

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = '0000';
const COLLECTIONS = {
  cars: 'cars',
  clients: 'clients',
  factories: 'factories',
  expenses: 'expenses',
  dailyExpenses: 'dailyExpenses',
  clientPayments: 'clientPayments',
  factoryPayments: 'factoryPayments',
  cargoEntries: 'cargoEntries',
};

let db;
let dbPromise;

const getAllowedOrigins = () => {
  const rawOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || '';

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (/^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }

  if (/^https:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  if (/^https:\/\/[a-z0-9-]+-[a-z0-9-]+-bekicoms-projects\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return getAllowedOrigins().includes(origin);
};

const toClientItem = (item) => {
  const { _id, ...rest } = item;

  return {
    id: _id.toString(),
    ...rest,
  };
};

const initDb = async () => {
  if (db) {
    return db;
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const client = new MongoClient(MONGO_URL);
      await client.connect();
      const connectedDb = client.db(DB_NAME);

      await Promise.all(
        Object.values(COLLECTIONS).map((collectionName) =>
          connectedDb.collection(collectionName).createIndex({ createdAt: -1 }),
        ),
      );

      db = connectedDb;
      return connectedDb;
    })();
  }

  return dbPromise;
};

const getCollection = (name) => db.collection(COLLECTIONS[name]);

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const readItems = async (name) => {
  const items = await getCollection(name)
    .find()
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  return items.map(toClientItem);
};

const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }

        return callback(new Error('CORS ruxsat etilmagan'));
      },
    }),
  );
  app.use(express.json());

  app.use(
    asyncHandler(async (req, res, next) => {
      await initDb();
      next();
    }),
  );

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
      return res.json({
        user: {
          login: ADMIN_LOGIN,
          role: 'admin',
        },
      });
    }

    return res.status(401).json({ message: 'Login yoki parol xato' });
  });

  const createCrudRoutes = (routeName) => {
    app.get(
      `/api/${routeName}`,
      asyncHandler(async (req, res) => {
        res.json(await readItems(routeName));
      }),
    );

    app.post(
      `/api/${routeName}`,
      asyncHandler(async (req, res) => {
        const now = new Date();
        const payload = {
          ...req.body,
          createdAt: now,
          updatedAt: now,
        };

        delete payload.id;

        const result = await getCollection(routeName).insertOne(payload);
        const createdItem = await getCollection(routeName).findOne({
          _id: result.insertedId,
        });

        res.status(201).json(toClientItem(createdItem));
      }),
    );

    app.put(
      `/api/${routeName}/:id`,
      asyncHandler(async (req, res) => {
        const payload = {
          ...req.body,
          updatedAt: new Date(),
        };

        delete payload.id;
        delete payload._id;
        delete payload.createdAt;

        const result = await getCollection(routeName).findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: payload },
          { returnDocument: 'after' },
        );

        if (!result) {
          return res.status(404).json({ message: 'Maʼlumot topilmadi' });
        }

        return res.json(toClientItem(result));
      }),
    );

    app.delete(
      `/api/${routeName}/:id`,
      asyncHandler(async (req, res) => {
        const result = await getCollection(routeName).deleteOne({
          _id: new ObjectId(req.params.id),
        });

        if (!result.deletedCount) {
          return res.status(404).json({ message: 'Maʼlumot topilmadi' });
        }

        return res.status(204).send();
      }),
    );
  };

  Object.keys(COLLECTIONS).forEach(createCrudRoutes);

  app.get(
    '/api/bootstrap',
    asyncHandler(async (req, res) => {
      const [
        cars,
        clients,
        factories,
        expenses,
        dailyExpenses,
        clientPayments,
        factoryPayments,
        cargoEntries,
      ] = await Promise.all([
        readItems('cars'),
        readItems('clients'),
        readItems('factories'),
        readItems('expenses'),
        readItems('dailyExpenses'),
        readItems('clientPayments'),
        readItems('factoryPayments'),
        readItems('cargoEntries'),
      ]);

      res.json({
        cars,
        clients,
        factories,
        expenses,
        dailyExpenses,
        clientPayments,
        factoryPayments,
        cargoEntries,
      });
    }),
  );

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ message: 'Serverda xatolik bor' });
  });

  return app;
};

module.exports = {
  createApp,
  initDb,
  COLLECTIONS,
  MONGO_URL,
  DB_NAME,
};
