import type { metadataV2 } from "@zhelvis/cmc";

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
};

type TokenMetadata = {
	name: string;
	logo: string;
	description: string | null;
	urls: TokenMetadataUrls;
	addresses: {
		[platform: string]: string;
	};
};

type TokenMetadataMap = { [symbol: string]: TokenMetadata };

export async function getTokensMetadataMap(
	ids: number[],
	fetcher: typeof metadataV2,
): Promise<TokenMetadataMap> {
	if (ids.length > 100) {
		throw new Error("Cannot fetch more than 100 tokens at once");
	}

	const { data, response } = await fetcher({
		query: {
			aux: "urls,logo,description",
			id: ids.join(","),
		},
	});

	if (!response.ok) {
		throw new Error("Cannot get cryptocurrency metadata");
	}

	// TODO: runtime schema validation
	const payload = data as any;

	const tokensMetadataMap: TokenMetadataMap = {};

	for (const id in payload.data) {
		const { symbol, name, description, logo, urls } = payload.data[id];

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
