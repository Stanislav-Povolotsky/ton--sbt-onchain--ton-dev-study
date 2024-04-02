import fs from 'fs';
import { Address, toNano } from '@ton/core';
import { SbtItem } from '../wrappers/sbt-item/SbtItem';
import { NftCollection } from "../wrappers/nft-collection/NftCollection";
import { compile, NetworkProvider } from '@ton/blueprint';
import { encodeOnChainContent } from '../wrappers/nft-content/nftContent';
import { CollectionMintSbtItemInput } from '../wrappers/nft-collection/NftCollection.data';
import { randomAddress } from '../utils/randomAddress';

export async function run(provider: NetworkProvider, args: string[]) {
    const collectionInfoFile = "collection.json";
    let collectionInfo = JSON.parse(fs.readFileSync(collectionInfoFile, 'utf8'));
    
    //const ownerAddress = Address.parse(args.length > 0 ? args[0] : await ui.input('Owner address'));
    const ownerAddress = provider.sender().address!;
    const authorityAddress = ownerAddress;

    const collection = provider.open(
        NftCollection.createFromAddress(Address.parse(collectionInfo.collectionAddress))
    );

    console.log('Collection address:', collection.address);

    if (!(await provider.isContractDeployed(collection.address))) {
        throw new Error('Collection not deployed');
    }

    let collData = await collection.getCollectionData();
    console.log('Next item ID:', collData.nextItemId);

    let itemIndex = collData.nextItemId;

    let sbtItemsContent = [
        {
            "name": "@tg_nick_1",
            "stream": "2",
            "description": "I am Student A and a proud owner of this diploma",
            "image":"https://nft.ton.diamonds/nft/0/0.svg",
            "owner": randomAddress(),
        },
        {
            "name": "@tg_nick_2",
            "stream": "2",
            "description": "Looking for a job as a TON DEV",
            "image":"https://nft.ton.diamonds/nft/1/1.svg",
            "owner": randomAddress(),
        },
        {
            "name": "@tg_nick_3",
            "stream": "3",
            "description": "Meow",
            "image":"https://nft.ton.diamonds/nft/2/2.svg",
            "owner": randomAddress(),
        },
    ];

    let pass_amount = toNano('0.05');
    let items: CollectionMintSbtItemInput[] = sbtItemsContent.map((content: any, idx) => { 
        let contentData = {...content};
        let owner = contentData.owner;
        delete contentData.owner;

        return {
            passAmount: pass_amount,
            index: itemIndex + idx,
            ownerAddress: owner,
            authorityAddress: authorityAddress,
            content: encodeOnChainContent(contentData),
        }
    });
    let pass_amount_total = pass_amount * BigInt(items.length)

    let itemAddressFirst = await collection.getNftAddressByIndex(items[0].index);
    console.log('First item index:', items[0].index, 'address:', itemAddressFirst.toString());
    let itemAddressLast = await collection.getNftAddressByIndex(items[items.length - 1].index);
    console.log('Last item index:', items[items.length - 1].index, 'address:', itemAddressLast.toString());

    let res = await collection.sendBatchDeploySbt(provider.sender(), toNano('0.15') + pass_amount_total, {items: items});
    console.log('Sent collection batch mint request');

    await provider.waitForDeploy(itemAddressFirst);
    console.log('Item deployed (first):', itemAddressFirst);

    await provider.waitForDeploy(itemAddressLast);
    console.log('Item deployed (last):', itemAddressLast);
}
