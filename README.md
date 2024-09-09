# Tokens

Downloads metadata of well-known tokens in diffrenent networks from CmC API

## Instalation

```sh
npm install @zhelvis/tokens
```

## Usage

```sh
Usage: tokens [options]

Options:
  -V, --version         output the version number
  -k, --key <string>    CmC API key (default: "b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c")
  -h --host <string>    CmC API host (default: "sandbox-api.coinmarketcap.com")
  -r --rate <number>    Requests per minute (default: 30)
  -o --output <string>  Output file (default: "tokens.json")
  --help                display help for command
```

## Output structure

```
{
    [symbol: string]: {
        name: string;
        logo: string;
        description: string | null;
        urls: {
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
        addresses: {
            [platform: string]: string;
        };
    } 
}
```

