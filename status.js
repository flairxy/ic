const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  chain: {
    type: String,
    required: false,
  },
  address: {
    type: String,
    required: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
});

const db = mongoose.connection.useDb('icrawler');

const Status = db.model('Status', statusSchema);

module.exports = { Status };
