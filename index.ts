import { dns } from "bun";

const {
  API_KEY,
  HOST,
} = process.env;

if (typeof API_KEY !== 'string') {
  throw new Error('Api key is not defined');
}

if (typeof HOST !== 'string') {
  throw new Error('Host is not defined');
}

dns.prefetch(HOST);

const baseUrl = `https://${HOST}`;

const requestInit: RequestInit = {
  headers: {
    'X-CMC_PRO_API_KEY': API_KEY,
  },
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function getTokenIdsChunks() {
  const idMapUrl = new URL('/v1/cryptocurrency/map', baseUrl);
  idMapUrl.searchParams.set('aux', 'platform');
  idMapUrl.searchParams.set('sort', 'cmc_rank');

  const res = await fetch(idMapUrl, requestInit);

  if (!res.ok) {
    throw new Error('Cannot get cryptocurrency ids');
  }

  const idMap = await res.json();
  const chunkSize = 100;
  const chunks: number[][] = [];
  let counter = 0;

  for(const cryptocurrency of idMap.data) {
    // ignore coins
    if (!cryptocurrency.platform) {
      continue;
    }

    if (!(counter % chunkSize)) {
      chunks.push([]);
    }

    chunks.at(-1)!.push(cryptocurrency.id);
    counter++;
  }

  return chunks;
}

type TokenMetadataMap = {
  [symbol: string]: {
    [platform: string]: string;
  }
}

async function getTokensMetadataMap(ids: number[]): Promise<TokenMetadataMap> {
  if (ids.length > 100) {
    throw new Error('Cannot fetch more than 100 tokens at once');
  }

  const url = new URL('/v1/cryptocurrency/info', baseUrl);
  url.searchParams.set('aux', '');
  url.searchParams.set('id', ids.join(','));

  const res = await fetch(url, requestInit);

  if (!res.ok) {
    throw new Error('Cannot get cryptocurrency metadata');
  }

  const metadata = await res.json();

  const tokensMetadataMap: TokenMetadataMap = {};

  for (const id in metadata.data){
    const { symbol } = metadata.data[id];

    tokensMetadataMap[symbol] = {};

    const contracts = metadata.data[id].contract_address;

    for (const contract of contracts) {
      const { platform, contract_address } = contract;
      tokensMetadataMap[symbol][platform.name] = contract_address;
    }
  } 

  return tokensMetadataMap;
}


async function main() {
  const idsChunks = await getTokenIdsChunks();
  const tokensMetadataMap: TokenMetadataMap = {};
  await sleep(2000);

  for (const chunk of idsChunks) {
    const chunkTokensMetadataMap = await getTokensMetadataMap(chunk);
    Object.assign(tokensMetadataMap, chunkTokensMetadataMap);
    await sleep(2000);
  }

  await Bun.write('./dist/tokens.json', JSON.stringify(tokensMetadataMap, null, '\t'));
}

await main();



