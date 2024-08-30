import { write } from "bun";
import { transpile } from "postman2openapi";
import openapiTS, { astToString } from "openapi-typescript";

const collection = await fetch('https://pro-api.coinmarketcap.com/v1/tools/postman')
    .then(res => res.json());

const openApiSchema = transpile(collection);

const ast = await openapiTS(openApiSchema);
const contents = astToString(ast);

await write("generated/openapi.ts", contents);