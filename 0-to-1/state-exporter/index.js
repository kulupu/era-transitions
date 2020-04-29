const { ApiPromise, WsProvider } = require('@polkadot/api');
const BN = require('bn.js');

const main = async () => {
  const wsProvider = new WsProvider('wss://rpc.kulupu.network/ws');
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: {
      Difficulty: 'U256',
    },
  });

  /// Get list of all accounts from the indices module.
  let currentPage = 0;
  let currentIndices = [];
  let accountSets = [];
  do {
    currentIndices = await api.query.indices.enumSet(currentPage);
    currentPage += 1;
    accountSets = accountSets.concat(currentIndices);
  } while (currentIndices.length !== 0);

  console.log("Total length of accounts: ", accountSets.length);

  /// Get balance information of all accounts.
  const accountBalances = {};
  let totalIssuance = new BN();
  for (const accountId of accountSets) {
    const freeBalance = await api.query.balances.freeBalance(accountId);

    accountBalances[accountId.toString()] = freeBalance;
    totalIssuance = totalIssuance.add(freeBalance);
  }

  const chainTotalIssuance = await api.query.balances.totalIssuance();
  if (!totalIssuance.eq(chainTotalIssuance)) {
    throw new Error("Total issuance calculated from individual accounts does not equal to chain total issuance.");
  }

  const difficulty = await api.query.difficulty.currentDifficulty();
  console.log("OK");
};

const info = async () => {
  const wsProvider = new WsProvider('wss://rpc.kulupu.network/ws');
  const api = await ApiPromise.create({ provider: wsProvider });

  console.log(api.query);
};

main()
