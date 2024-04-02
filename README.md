# TON SBT for [TON dev study](https://t.me/ton_dev_study)

Based on [TON SBT with onchain metadata](https://github.com/Stanislav-Povolotsky/ton--sbt-onchain/).  
Collection was deployed in the testnet: [kQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z-OZ](https://testnet.tonviewer.com/kQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z-OZ?section=overview)

## Metadata

### Collection metadata

- "name": "TON DEV STUDY Diplomas"  
  Collection name
- "description": "Collection of personal diplomas for students"  
  Collection description
- "image_data": Buffer(binary image)  
  Collection logo

### Collection common metadata

- "name": "TON DEV STUDY Diploma for "  
  Prefix for the 'name' field of all collection tokens

### SBT token metadata

- "name": "@tg_nick_1"
  This field contains token name suffix (telegram nick of the student).  
  The final token name will be calculated as collection_common_metadata.name + token.name  
  Example: "TON DEV STUDY Diploma for " + "@tg_nick_1" = "TON DEV STUDY Diploma for @tg_nick_1"
- "stream": "2"  
  This field contains stdudent's course/stream number.
- "description": "I am Student A and a proud owner of this diploma"  
  This field token description (it's editable by the token owner).
- "image":"https://nft.ton.diamonds/nft/0/0.svg"  
  This field contain unique diplima image for the each student.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Scripts

1. Deploy collection:  
   `npx blueprint run collectionDeploy`
   ```shell
   Using file: collectionDeploy
   ? Which network do you want to use? testnet
   ? Which wallet are you using? TON Connect compatible mobile wallet (example: Tonkeeper)
   Connected to wallet at address: EQD9Ahgp6Uxa-uFn01oyxoHPX70j1eR51BB2lsnZFVardfyn
   Collection address:  EQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z1gT
   Collection info saved to  collection.json
   Sending transaction. Approve in your wallet...[TON_CONNECT_SDK] Send http-bridge request: {...}
   [TON_CONNECT_SDK] Wallet message received: {...}
   Sent transaction
   Deploy request sent
   Contract deployed at address EQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z1gT
   You can view it at https://testnet.tonscan.org/address/EQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z1gT
   Collection deployed: EQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z1gT
   ```
3. Mint SBT for deployed collection:  
   `npx blueprint run collectionMintSbt`
   ```shell
   Using file: collectionMintSbtBatch
   ? Which network do you want to use? testnet
   ? Which wallet are you using? TON Connect compatible mobile wallet (example: Tonkeeper)
   Connected to wallet at address: EQD9Ahgp6Uxa-uFn01oyxoHPX70j1eR51BB2lsnZFVardfyn
   Collection address: EQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z1gT
   Next item ID: 0
   First item index: 0 address: EQAmibW-mrQVqeAMuz5PiNpKuZ9s5-GxYoZtj3tqaemt5gx5
   Last item index: 2 address: EQDniLAZBUN9sDcjibhN2xWv2HlGjYjk54viS4OH2rLYNpZv
   Sending transaction. Approve in your wallet...[TON_CONNECT_SDK] Send http-bridge request: {...
   Sent transaction
   Sent collection batch mint request
   Item deployed (first): EQAmibW-mrQVqeAMuz5PiNpKuZ9s5-GxYoZtj3tqaemt5gx5
   Item deployed (last): EQDniLAZBUN9sDcjibhN2xWv2HlGjYjk54viS4OH2rLYNpZv
   ```
5. Display information for deployed SBT token:  
   `npx blueprint run collectionGetAllInfo`
   ```shell
   ? Which network do you want to use? testnet
   ? Which wallet are you using? TON Connect compatible mobile wallet (example: Tonkeeper)
   Connected to wallet at address: EQD9Ahgp6Uxa-uFn01oyxoHPX70j1eR51BB2lsnZFVardfyn
   ? Item Index 0
   Collection address: EQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z1gT
   Collection data:
           Next item ID: 3
           Owner address: EQD9Ahgp6Uxa-uFn01oyxoHPX70j1eR51BB2lsnZFVardfyn
           Content: {
     name: 'TON DEV STUDY Diplomas',
     description: 'Collection of personal diplomas for students',
     image_data: <Buffer 89 50 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52 00 00 03 60 00 00 03 60 04 03 00 00 00 b8 bc 16 97 00 00 00 1e 50 4c 54 45 47 70 4c 2c 3e 50 2c 3e 50 ... 7894 more bytes>
   }
   Item data:
           Item index: 0
           Item address: EQAmibW-mrQVqeAMuz5PiNpKuZ9s5-GxYoZtj3tqaemt5gx5
   Item nft data:
           Initialized: true
           Collection address: EQDQ3lh1lNVhWMBunvS6qUzSY7A8b4enA07KTZcA6Gd5Z1gT
           Owner address: EQDHIbt_bAIl7soE1MeZEsrLYBpfduQDxwfIKspOhIo9PLE3
           Content: {
     image: 'https://nft.ton.diamonds/nft/0/0.svg',
     name: '@tg_nick_1',
     description: 'I am Student A and a proud owner of this diploma',
     stream: '2'
   }
   Full nft data:
           Content: {
     image: 'https://nft.ton.diamonds/nft/0/0.svg',
     name: 'TON DEV STUDY Diploma for @tg_nick_1',
     description: 'I am Student A and a proud owner of this diploma',
     stream: '2'
   }
   ```

## Useful links

- Overview && guides  
  https://docs.ton.org/develop/dapps/defi/tokens
- NFT standard (TEP 62)  
  https://github.com/ton-blockchain/TEPs/blob/master/text/0062-nft-standard.md
- Token Data Standard (TEP 64)  
  https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md
- SBT (Soulbound NFT) standard (TEP 85)  
  https://github.com/ton-blockchain/TEPs/blob/master/text/0085-sbt-standard.md
- NFTRoyalty standard extension (TEP 66)  
  https://github.com/ton-blockchain/TEPs/blob/master/text/0066-nft-royalty-standard.md

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from @ton/core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `scripts` - scripts used by the project, mainly the deployment scripts.
