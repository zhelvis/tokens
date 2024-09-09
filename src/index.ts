import { client, coinmarketcapIdMap, metadataV2 } from "@zhelvis/cmc";
import Bottleneck from "bottleneck";
import { Command } from "commander";
import { version } from "../package.json";
import { getTokenIdsChunks } from "./getTokenIdsChunks";
import { getTokensMetadataMap } from "./getTokensMetadataMap";
import { mergeDeep } from "./mergeDeep";

const program = new Command();

program
	.name("tokens")
	.version(version)
	.option(
		"-k, --key <string>",
		"CmC API key",
		"b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c",
	)
	.option("-h --host <string>", "CmC API host", "sandbox-api.coinmarketcap.com")
	.option("-r --rate <number>", "Requests per minute", "30")
	.option("-o --output <string>", "Output file", "tokens.json")
	.action(async ({ key, host, rate, output }) => {
		client.setConfig({
			baseUrl: `https://${host}`,
			headers: {
				"X-CMC_PRO_API_KEY": key,
			},
		});

		const limiter = new Bottleneck({
			maxConcurrent: 1,
			minTime: 1000 / (Number(rate) / 60),
		});

		const limitedCoinmarketcapIdMap = limiter.wrap(coinmarketcapIdMap);
		const limitedMetadataV2 = limiter.wrap(metadataV2);

		const idsChunks = await getTokenIdsChunks(limitedCoinmarketcapIdMap);

		const tokensMetadataMap = {};

		await Promise.allSettled(
			idsChunks.map(async (chunk) => {
				const chunkTokensMetadataMap = await getTokensMetadataMap(
					chunk,
					limitedMetadataV2,
				);
				mergeDeep(tokensMetadataMap, chunkTokensMetadataMap);
			}),
		);

		await Bun.write(output, JSON.stringify(tokensMetadataMap, null, "\t"));
	});

program.parse(process.argv);
