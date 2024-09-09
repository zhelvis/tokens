import type { coinmarketcapIdMap } from "@zhelvis/cmc";

export async function getTokenIdsChunks(
	fetcher: typeof coinmarketcapIdMap,
): Promise<number[][]> {
	const { data, response } = await fetcher({
		query: {
			aux: "platform",
			sort: "cmc_rank",
		},
	});

	if (response.status !== 200) {
		throw new Error("Cannot get cryptocurrency ids");
	}

	// TODO: runtime schema validation
	const payload = data as any;

	const chunkSize = 100;
	const chunks: number[][] = [];
	let counter = 0;

	for (const cryptocurrency of payload.data) {
		// ignore coins
		if (!cryptocurrency.platform) {
			continue;
		}

		if (!(counter % chunkSize)) {
			chunks.push([]);
		}

		chunks.at(-1)?.push(cryptocurrency.id);
		counter++;
	}

	return chunks;
}
