// db/mongo.js – MongoDB client singleton
'use strict';

const { MongoClient } = require('mongodb');

const uri    = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB  || 'aeronetb_docs';

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db(dbName);
  console.log(`[MongoDB] Connected to "${dbName}"`);
  return db;
}

function getDb() {
  return db || null;   // returns null instead of throwing when not connected
}

function isMongoReady() {
  return db !== null && db !== undefined;
}

async function close() {
  if (client) {
    await client.close();
    db = null;
    client = null;
  }
}

module.exports = { connect, getDb, isMongoReady, close };
