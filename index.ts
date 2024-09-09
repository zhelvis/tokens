import { dns } from "bun";
import {
  client,
  metadataV2,
  coinmarketcapIdMap,
} from "@zhelvis/cmc";
import Bottleneck from 'bottleneck';

const {
  API_KEY,
  HOST,
  REQUESTS_PER_MINUTE,
} = process.env;

if (typeof API_KEY !== 'string') {
  throw new Error('Api key is not defined');
}

if (typeof HOST !== 'string') {
  throw new Error('Host is not defined');
}

if (typeof REQUESTS_PER_MINUTE !== 'string') {
  throw new Error('Rate limit is not defined');
}

dns.prefetch(HOST);

client.setConfig({
  baseUrl: `https://${HOST}`,
  headers: {
    'X-CMC_PRO_API_KEY': API_KEY,
  },
});

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000 / (Number(REQUESTS_PER_MINUTE) / 60),
});

function isObject(item: unknown): item is Record<string, unknown> {
  return item != null && item.constructor.name === 'Object';
}


export function mergeDeep(target: unknown, ...sources: unknown[]) {
  if (!sources.length) {
    return target
  };

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} })
        };
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

async function getTokenIdsChunks() {
  const { data, response } = await limiter
    .schedule(() => coinmarketcapIdMap({
      query: {
        aux: 'platform',
        sort: 'cmc_rank',
      },
    }));

  if (response.status !== 200) {
    throw new Error('Cannot get cryptocurrency ids');
  }

  const idMap = data as any;

  const chunkSize = 100;
  const chunks: number[][] = [];
  let counter = 0;

  for (const cryptocurrency of idMap.data) {
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

type TokenMetadataUrls = {
  website: string[];
  technical_doc: string[];
  explorer: string[];
  source_code: string[];
  message_board: string[];
  chat: string[];
  announcement: string[];
  reddit: string[];
  twitter: string[];
}

type TokenMetadata = {
  name: string;
  logo: string;
  description: string | null;
  urls: TokenMetadataUrls;
  addresses: {
    [platform: string]: string;
  }
};

type TokenMetadataMap = { [symbol: string]: TokenMetadata };

async function getTokensMetadataMap(ids: number[]): Promise<TokenMetadataMap> {
  if (ids.length > 100) {
    throw new Error('Cannot fetch more than 100 tokens at once');
  }

  const { data, response } = await limiter
    .schedule(() => metadataV2({
      query: {
        aux: 'urls,logo,description',
        id: ids.join(','),
      },
    }));

  if (!response.ok) {
    throw new Error('Cannot get cryptocurrency metadata');
  }

  const payload = data as any;

  const tokensMetadataMap: TokenMetadataMap = {};

  for (const id in payload.data){
    const {
      symbol,
      name,
      description,
      logo,
      urls
    } = payload.data[id];

    tokensMetadataMap[symbol] = {
      name,
      description,
      logo,
      urls,
      addresses: {},
    };

    const contracts = payload.data[id].contract_address;

    for (const contract of contracts) {
      const { platform, contract_address } = contract;
      tokensMetadataMap[symbol].addresses[platform.name] = contract_address;
    }
  } 

  return tokensMetadataMap;
}


async function main() {
  const idsChunks = await getTokenIdsChunks();
  const tokensMetadataMap = {};

  for (const chunk of idsChunks) {
    const chunkTokensMetadataMap = await getTokensMetadataMap(chunk);
    mergeDeep(tokensMetadataMap, chunkTokensMetadataMap);
  }

  await Bun.write('./dist/tokens.json', JSON.stringify(tokensMetadataMap, null, '\t'));
}

await main();



