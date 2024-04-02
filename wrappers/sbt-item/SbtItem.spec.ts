import {Blockchain, BlockchainSnapshot, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Cell, toNano, Address, beginCell} from '@ton/core';
import {randomAddress} from "../../utils/randomAddress";
import {SbtItemData, OperationCodes, Queries} from "./SbtItem.data";
import {SbtItem} from './SbtItem';
import "@ton/test-utils";

import { compile } from '@ton/blueprint';
import { decodeOnChainContent, encodeOnChainContent } from "../nft-content/nftContent";
import { findTransactionRequired, flattenTransaction } from '@ton/test-utils';

describe('SbtItem (in-collection mode)', () => {
    let code: Cell;

    let blockchain: Blockchain;
    let blockchainInitSnapshot: BlockchainSnapshot;
    let deployer: SandboxContract<TreasuryContract>;
    let authority_wallet: SandboxContract<TreasuryContract>;
    let collection_wallet: SandboxContract<TreasuryContract>;
    let editor_wallet: SandboxContract<TreasuryContract>;
    let token: SandboxContract<SbtItem>;
    
    let OWNER_ADDRESS: Address;
    let AUTHORITY_ADDRESS: Address;
    let COLLECTION_ADDRESS: Address;
    let EDITOR_ADDRESS: Address;

    let config: SbtItemData;
    let configMetadata: { [key: string]: string | Buffer}
    let custom_nft_fields: string[];

    beforeAll(async () => {
        code = await compile('sbt-item/SbtItem');

        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        authority_wallet = await blockchain.treasury('authority');
        collection_wallet = await blockchain.treasury('collection');
        //editor_wallet = await blockchain.treasury('editor');
        editor_wallet = deployer;

        OWNER_ADDRESS = deployer.address;
        AUTHORITY_ADDRESS = authority_wallet.address;
        COLLECTION_ADDRESS = collection_wallet.address;
        EDITOR_ADDRESS = editor_wallet.address;
    
        configMetadata = {
            "name": "@tg_nick_1",
            "stream": "2",
            "description": "I am Student A and a proud owner of this diploma",
            "image":"https://nft.ton.diamonds/nft/0/0.svg",
        };

        custom_nft_fields = ["stream"];

        config = {
            index: 777,
            collectionAddress: COLLECTION_ADDRESS,
            ownerAddress: OWNER_ADDRESS,
            authorityAddress: AUTHORITY_ADDRESS,
            content: encodeOnChainContent(configMetadata),
        }
        
        token = blockchain.openContract(
            SbtItem.createFromConfig(config, code)
        );

        const deployResult = await token.sendDeploy(deployer.getSender(), toNano('0.05'));
  
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            deploy: true,
            success: true,
        });

        blockchainInitSnapshot = blockchain.snapshot();
    });

    beforeEach(async () => {
        blockchain.loadFrom(blockchainInitSnapshot);
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and sbt are ready to use
    });

    it('should ignore external messages', async () => {
        try {
            let res = await blockchain.sendMessage({
                info: {
                    type: 'external-in',
                    dest: token.address,
                    importFee: 0n,
                },
                init: undefined,
                body: beginCell().endCell()
            })
            expect(res.transactions).toHaveTransaction({
                to: token.address,
                success: false,
            });
        } catch (e: any) {
            expect(e.message).toContain('message not accepted');
        }
    })

    it('should return item data', async () => {
        let res = await token.getNftData()
        expect(res.inited).toBe(true)
        expect(res.index).toEqual(config.index)
        expect(res.collectionAddress!.toString()).toEqual(config.collectionAddress!.toString())
        expect(res.ownerAddress?.toString()).toEqual(config.ownerAddress!.toString())
        expect((res.content instanceof Cell) ? decodeOnChainContent(res.content, custom_nft_fields) : {}).toEqual(configMetadata)
    })

    it('should return editor', async () => {
        let res = await token.getEditor();
        expect(res?.toString()).toEqual(EDITOR_ADDRESS.toString());
    })

    it('should not transfer', async () => {
        let newOwner = randomAddress()
        let res = await deployer.send({
            to: token.address,
            value: toNano(1),
            bounce: false,
            body: Queries.transfer({
                    newOwner,
                    forwardAmount: toNano('0.01'),
                    responseTo: randomAddress()
            }).endCell()
        })

        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            success: false,
            exitCode: 413
        });
    })

    it('should not transfer by authority', async () => {
        let newOwner = randomAddress()
        let res = await authority_wallet.send({
            to: token.address,
            value: toNano(1),
            bounce: false,
            body: Queries.transfer({
                    newOwner,
                    forwardAmount: toNano('0.01'),
                    responseTo: randomAddress()
            }).endCell()
        })

        expect(res.transactions).toHaveTransaction({
            from: authority_wallet.address,
            to: token.address,
            success: false,
            exitCode: 413
        });
    })

    it('should destroy', async () => {
        let res = await token.sendDestoy(deployer.getSender(), {})

        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            success: true
        });

        expect(res.transactions).toHaveTransaction({
            from: token.address,
            to: deployer.address,
            success: true,
            op: OperationCodes.excesses
        });

        let data = await token.getNftData()
        if (!data.inited) {
            throw new Error()
        }

        expect(data.ownerAddress).toEqual(null)
        expect(await token.getAuthority()).toEqual(null)
    })

    it('should not destroy', async () => {
        let res = await token.sendDestoy(authority_wallet.getSender(), {})

        expect(res.transactions).toHaveTransaction({
            from: authority_wallet.address,
            to: token.address,
            success: false,
            exitCode: 401
        });
    })


    it('random guy prove ownership', async () => {
        let someGuyWallet = await blockchain.treasury('some guy');

        let dataCell = beginCell()
            .storeUint(888, 16)
            .endCell()

        let res = await someGuyWallet.send({
            to: token.address,
            value: toNano(1),
            bounce: false,
            body: Queries.proveOwnership({
                to: randomAddress(),
                data: dataCell,
                withContent: true
            })
        })

        expect(res.transactions).toHaveTransaction({
            from: someGuyWallet.address,
            to: token.address,
            success: false,
            exitCode: 401
        });
    })

    it('random guy request ownership', async () => {
        let someGuyWallet = await blockchain.treasury('some guy');
        let randomPersonWallet = await blockchain.treasury('random person');

        let dataCell = beginCell()
            .storeUint(888, 16)
            .endCell();

        let res = await someGuyWallet.send({
            to: token.address,
            value: toNano(1),
            bounce: false,
            body: Queries.requestOwnerInfo({
                to: randomPersonWallet.address,
                data: dataCell,
                withContent: true
            })
        })
    
        expect(res.transactions).toHaveTransaction({
            from: someGuyWallet.address,
            to: token.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: token.address,
            to: randomPersonWallet.address,
            success: true,
            op: OperationCodes.OwnerInfo,
        });

        let tx = flattenTransaction(findTransactionRequired(res.transactions, { op: OperationCodes.OwnerInfo }))
        let response = tx.body!.beginParse()

        let op = response.loadUint(32)
        let queryId = response.loadUint(64)
        let index = response.loadUint(256)
        let sender = response.loadAddress()
        let owner = response.loadAddress()
        let data = response.loadRef().beginParse()
        let revokedAt = response.loadUint(64)
        let withCont = response.loadBit()
        let cont = response.loadRef()

        expect(op).toEqual(OperationCodes.OwnerInfo)
        expect(queryId).toEqual(0)
        expect(index).toEqual(777)
        expect(sender.toString()).toEqual(someGuyWallet.address.toString())
        expect(owner.toString()).toEqual(config.ownerAddress!.toString())
        expect(data.loadUint(16)).toEqual(888)
        expect(revokedAt).toEqual(0)
        expect(withCont).toEqual(true)
        expect(decodeOnChainContent(cont, custom_nft_fields)).toEqual(configMetadata)
    })

    it('should request ownership with content', async () => {
        let someGuyWallet = await blockchain.treasury('some guy');
        let randomPersonWallet = await blockchain.treasury('random person');

        let dataCell = beginCell()
            .storeUint(888, 16)
            .endCell();

        let res = await someGuyWallet.send({
            to: token.address,
            value: toNano(1),
            bounce: false,
            body: Queries.requestOwnerInfo({
                to: randomPersonWallet.address,
                data: dataCell,
                withContent: true
            })
        })
    
        expect(res.transactions).toHaveTransaction({
            from: someGuyWallet.address,
            to: token.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: token.address,
            to: randomPersonWallet.address,
            success: true,
            op: OperationCodes.OwnerInfo,
        });

        let tx = flattenTransaction(findTransactionRequired(res.transactions, { op: OperationCodes.OwnerInfo }))
        let response = tx.body!.beginParse()

        let op = response.loadUint(32)
        let queryId = response.loadUint(64)
        let index = response.loadUint(256)
        let sender = response.loadAddress()
        let owner = response.loadAddress()
        let data = response.loadRef().beginParse()
        let revokedAt = response.loadUint(64)
        let withCont = response.loadBit()
        let cont = response.loadRef()

        expect(op).toEqual(OperationCodes.OwnerInfo)
        expect(queryId).toEqual(0)
        expect(index).toEqual(777)
        expect(sender.toString()).toEqual(someGuyWallet.address.toString())
        expect(owner.toString()).toEqual(config.ownerAddress!.toString())
        expect(data.loadUint(16)).toEqual(888)
        expect(revokedAt).toEqual(0)
        expect(withCont).toEqual(true)
        expect(decodeOnChainContent(cont, custom_nft_fields)).toEqual(configMetadata)
    })

    it('should prove ownership with content', async () => {
        let prooveTo = await blockchain.treasury('proove to');

        let dataCell = beginCell()
            .storeUint(888, 16)
            .endCell();

        let res = await deployer.send({
            to: token.address,
            value: toNano(1),
            bounce: false,
            body: Queries.proveOwnership({
                to: prooveTo.address,
                data: dataCell,
                withContent: true
            })
        })

        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: token.address,
            to: prooveTo.address,
            success: true,
            op: OperationCodes.OwnershipProof,
        });

        let tx = flattenTransaction(findTransactionRequired(res.transactions, { op: OperationCodes.OwnershipProof }))
        let response = tx.body!.beginParse()

        let op = response.loadUint(32)
        let queryId = response.loadUint(64)
        let index = response.loadUint(256)
        let owner = response.loadAddress()
        let data = response.loadRef()
        let revokedAt = response.loadUint(64)
        let withCont = response.loadBit()
        let cont = response.loadRef()

        expect(op).toEqual(OperationCodes.OwnershipProof)
        expect(queryId).toEqual(0)
        expect(index).toEqual(777)
        expect(owner.toString()).toEqual(config.ownerAddress!.toString())
        expect(data.beginParse().loadUint(16)).toEqual(888)
        expect(revokedAt).toEqual(0)
        expect(withCont).toEqual(true)
        expect(decodeOnChainContent(cont, custom_nft_fields)).toEqual(configMetadata)
    })

    it('should request ownership without content', async () => {
        let someGuyWallet = await blockchain.treasury('some guy');
        let randomPersonWallet = await blockchain.treasury('random person');

        let dataCell = beginCell()
            .storeUint(888, 16)
            .endCell();

        let res = await someGuyWallet.send({
            to: token.address,
            value: toNano(1),
            bounce: false,
            body: Queries.requestOwnerInfo({
                to: randomPersonWallet.address,
                data: dataCell,
                withContent: false
            })
        })
    
        expect(res.transactions).toHaveTransaction({
            from: someGuyWallet.address,
            to: token.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: token.address,
            to: randomPersonWallet.address,
            success: true,
            op: OperationCodes.OwnerInfo,
        });

        let tx = flattenTransaction(findTransactionRequired(res.transactions, { op: OperationCodes.OwnerInfo }))
        let response = tx.body!.beginParse()

        let op = response.loadUint(32)
        let queryId = response.loadUint(64)
        let index = response.loadUint(256)
        let sender = response.loadAddress()
        let owner = response.loadAddress()
        let data = response.loadRef().beginParse()
        let revokedAt = response.loadUint(64)
        let withCont = response.loadBit()

        expect(op).toEqual(OperationCodes.OwnerInfo)
        expect(queryId).toEqual(0)
        expect(index).toEqual(777)
        expect(sender.toString()).toEqual(someGuyWallet.address.toString())
        expect(owner.toString()).toEqual(config.ownerAddress!.toString())
        expect(data.loadUint(16)).toEqual(888)
        expect(revokedAt).toEqual(0)
        expect(withCont).toEqual(false)
    })

    it('should verify ownership bounce to owner', async () => {
        let nonExistAddr = randomAddress();

        let dataCell = beginCell()
            .storeUint(888, 16)
            .endCell();

        let res = await deployer.send({
            to: token.address,
            value: toNano(1),
            bounce: true,
            body: Queries.proveOwnership({
                queryId: 777,
                to: nonExistAddr,
                data: dataCell,
                withContent: false
            })
        })

        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: token.address,
            to: nonExistAddr,
            success: false,
            op: OperationCodes.OwnershipProof,
        });

        expect(res.transactions).toHaveTransaction({
            from: nonExistAddr,
            to: token.address,
            success: true,
            inMessageBounced: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: token.address,
            to: OWNER_ADDRESS,
            success: true,
            op: OperationCodes.OwnershipProofBounced,
        });

        let tx = flattenTransaction(findTransactionRequired(res.transactions, { op: OperationCodes.OwnershipProofBounced }))
        let response = tx.body!.beginParse()

        let op = response.loadUint(32)
        let queryId = response.loadUint(64)

        expect(op).toEqual(OperationCodes.OwnershipProofBounced)
        expect(queryId).toEqual(777)
    })

    it('should not verify ownership non bounced', async () => {
        let proofReq = await blockchain.treasury('proove req by');

        let dataCell = beginCell()
            .storeUint(888, 16)
            .endCell();

        let res = await proofReq.send({
            to: token.address,
            value: toNano(1),
            bounce: false,
            body: Queries.ownershipProof({
                id: 777,
                owner: config.ownerAddress!,
                data: dataCell,
            })
        })
        
        expect(res.transactions).toHaveTransaction({
            from: proofReq.address,
            to: token.address,
            success: false,
            exitCode: 0xffff,
        });
    })

    it('should revoke', async () => {
        let tm1 = await token.getRevokedTime()
        expect(tm1).toEqual(null)

        let res = await token.sendRevoke(authority_wallet.getSender())
        expect(res.transactions).toHaveTransaction({
            from: authority_wallet.address,
            to: token.address,
            success: true,
            op: OperationCodes.Revoke,
        });

        let tm = await token.getRevokedTime()
        expect(tm).toBeGreaterThanOrEqual(1)
    })

    it('should not revoke', async () => {
        let res = await token.sendRevoke(deployer.getSender())
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            success: false,
            op: OperationCodes.Revoke,
            exitCode: 401,
        });
    })

    it('should not take excess', async () => {
        let res = await token.sendTakeExcess(authority_wallet.getSender())
        expect(res.transactions).toHaveTransaction({
            from: authority_wallet.address,
            to: token.address,
            success: false,
            op: OperationCodes.TakeExcess,
            exitCode: 401,
        });       
    })

    it('should take excess', async () => {
        let res = await token.sendTakeExcess(deployer.getSender())
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            success: true,
            op: OperationCodes.TakeExcess,
        });       
        
        expect(res.transactions).toHaveTransaction({
            from: token.address,
            to: deployer.address,
            success: true,
            op: OperationCodes.excesses,
        });       
    })

    it('custom :: should return tg_nick', async () => {
        let res = await token.getTgNick()
        expect(res).toBe(configMetadata.name);
    })

    it('custom :: should allow to edit description', async () => {
        let configMetadataEdit1 = {
            "description": "New value",
        };
        let configMetadataEdit2 = {
            "name": "New name",
        };

        let res1 = await token.sendEditContent(authority_wallet.getSender(), { content: encodeOnChainContent(configMetadataEdit1) });
        // should fail if sender is not editor (owner)
        expect(res1.transactions).toHaveTransaction({
            from: authority_wallet.address,
            to: token.address,
            success: false,
            exitCode: 410
        });

        let res2 = await token.sendEditContent(deployer.getSender(), { content: encodeOnChainContent(configMetadataEdit1) });
        // should succeed because 'description' field is editable
        expect(res2.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            success: true
        });

        let data = await token.getNftData()
        expect(((data.content instanceof Cell) ? decodeOnChainContent(data.content, custom_nft_fields) : {}).description).toEqual(configMetadataEdit1.description)

        let res3 = await token.sendEditContent(deployer.getSender(), { content: encodeOnChainContent(configMetadataEdit2) });
        // should fail because 'name' field is not editable
        expect(res3.transactions).toHaveTransaction({
            from: deployer.address,
            success: false,
            exitCode: 403
        });
    })
})
