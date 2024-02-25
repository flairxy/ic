const mongoose = require('mongoose');

const AddressListSchema = new mongoose.Schema({
  original: {
    type: String,
    required: true,
  },
  generated: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  updated_at: {
    type: Date,
    default: Date.now(),
  },
});

const db = mongoose.connection.useDb('dmxl');

const AddressList = db.model('AddressList', AddressListSchema);

module.exports = { AddressList };
