const { ApiPromise, WsProvider } = require('@polkadot/api');
const BN = require('bn.js');

const targetBlockNumber = 309000;

const main = async () => {
  const wsProvider = new WsProvider('wss://rpc.kulupu.network/ws');
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: {
      Difficulty: 'U256',
      DifficultyAndTimestamp: {
        difficulty: 'Difficulty',
        timestamp: 'Moment'
      }
    },
  });

  // Get previous era information.
  const genesisBlockHash = await api.rpc.chain.getBlockHash(0);
  if (genesisBlockHash.toHex() !== api.genesisHash.toHex()) {
    throw new Error("Genesis hash fetched using different method is not equal.");
  }
  const finalBlockHash = await api.rpc.chain.getBlockHash(targetBlockNumber);
  const finalBlock = await api.rpc.chain.getBlock(finalBlockHash);
  const finalStateRoot = finalBlock.block.header.stateRoot;

  // Get list of all accounts from the indices module.
  let currentPage = 0;
  let currentIndices = [];
  let accountSets = [];
  do {
    currentIndices = await api.query.indices.enumSet.at(finalBlockHash, currentPage);
    currentPage += 1;
    accountSets = accountSets.concat(currentIndices);
  } while (currentIndices.length !== 0);

  console.error("Total length of accounts:", accountSets.length);

  const outputSets = [];
  accountSets.forEach((accountId, index) => {
    outputSets.push({
      address: accountId.toHex(),
      index: index,
    });
  });

  // Get balance information of all accounts.
  const accountBalances = [];
  let totalIssuance = new BN();
  for (const accountId of accountSets) {
    const freeBalance = await api.query.balances.freeBalance.at(finalBlockHash, accountId);

    accountBalances.push({
      address: accountId.toHex(),
      balance: freeBalance.toHex()
    });
    totalIssuance = totalIssuance.add(freeBalance);
  }

  const chainTotalIssuance = await api.query.balances.totalIssuance.at(finalBlockHash);
  if (!totalIssuance.eq(chainTotalIssuance)) {
    throw new Error("Total issuance calculated from individual accounts does not equal to chain total issuance.");
  }

  console.error("Total issuance:", totalIssuance.toString());

  // Get difficulty information.
  const difficulty = await api.query.difficulty.currentDifficulty.at(finalBlockHash);

  const output = {
    previousEra: {
      genesisBlockHash: genesisBlockHash.toHex(),
      finalBlockHash: finalBlockHash.toHex(),
      finalStateRoot: finalStateRoot.toHex(),
    },
    difficulty: difficulty.toHex(),
    balances: accountBalances,
    indices: outputSets,
  };
  console.log(JSON.stringify(output, null, 4));
  console.error("Done");
};

const info = async () => {
  const wsProvider = new WsProvider('wss://rpc.kulupu.network/ws');
  const api = await ApiPromise.create({ provider: wsProvider });

  console.log(api.query);
};

main()
