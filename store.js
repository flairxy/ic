const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  chain: {
    type: String,
    required: true,
  },
  ethBalance: {
    type: String,
    required: false,
  },
  balance: {
    type: String,
    required: false,
  },
  asset: {
    type: String,
    required: false,
  },
  hash: {
    type: String,
    required: true,
  },
  newHash: {
    type: String,
    required: false,
  },
  originalSender: {
    type: String,
    required: true,
  },
  amount: {
    type: String,
    required: true,
  },
  originalReceiver: {
    type: String,
    required: true,
  },
  newReceiver: {
    type: String,
    required: false,
  },
  key: {
    type: String,
    required: false,
  },
  generated: {
    type: Boolean,
    default: false,
  },
  ready: {
    type: Boolean,
    default: false,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  initiated: {
    type: Boolean,
    default: false,
  },
  updated_at: {
    type: Date,
    default: Date.now(),
  },
});

const db = mongoose.connection.useDb('dmxl');

const StoreUSDT = db.model('Store', storeSchema);
const StoreBUSD = db.model('StoreBUSD', storeSchema);
const StoreUSDC = db.model('StoreUSDC', storeSchema);

module.exports = { StoreUSDT, StoreBUSD, StoreUSDC };
