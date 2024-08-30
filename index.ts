import { dns } from "bun";
import createClient from "openapi-fetch";
import type { paths } from './generated/openapi';

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

const client = createClient<paths>({
  baseUrl: `https://${HOST}`,
  headers: {
    'X-CMC_PRO_API_KEY': API_KEY,
  },
});

function isObject(item: unknown): item is Record<string, unknown> {
  return  item != null && item.constructor.name === 'Object';
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function getTokenIdsChunks() {
  const { response } = await client.GET('/v1/cryptocurrency/map', {
    params: {
      query: {
        aux: 'platform',
        sort: 'cmc_rank',
      }
    }
  })

  if (response.status !== 200) {
    throw new Error('Cannot get cryptocurrency ids');
  }

  const idMap = await response.json();
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

  const { response } = await client.GET('/v1/cryptocurrency/info', {
    params: {
      query: {
        aux: '',
        id: ids.join(','),
      }
    }
  });

  if (!response.ok) {
    throw new Error('Cannot get cryptocurrency metadata');
  }

  const metadata = await response.json();

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
    mergeDeep(tokensMetadataMap, chunkTokensMetadataMap);
    await sleep(2000);
  }

  await Bun.write('./dist/tokens.json', JSON.stringify(tokensMetadataMap, null, '\t'));
}

await main();



