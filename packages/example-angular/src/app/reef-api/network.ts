// @ts-ignore
import testnetTokens from './validated-tokens-testnet.json';
// @ts-ignore
import mainnetTokens from './validated-tokens-mainnet.json';
import {Contract, BigNumber} from 'ethers';
import {ERC20} from './ERC20';
import {Signer} from '@reef-defi/evm-provider';

export type AvailableNetworks = 'mainnet' | 'testnet';

export interface ReefNetwork {
    rpcUrl: string;
    name: AvailableNetworks;
}

type ReefNetworks = Record<AvailableNetworks, ReefNetwork>;

export const reefNetworks: ReefNetworks = {
    testnet: {
        name: 'testnet',
        rpcUrl: 'wss://rpc-testnet.reefscan.com/ws',
    },
    mainnet: {
        name: 'mainnet',
        rpcUrl: 'wss://rpc.reefscan.com/ws',
    },
};

export const loadVerifiedERC20Tokens = async ({name}: ReefNetwork): Promise<ValidatedToken[]> => {
    switch (name) {
        case 'testnet':
            return testnetTokens.tokens;
        case 'mainnet':
            return mainnetTokens.tokens;
        default:
            throw new Error('Chain URL does not exist!');
    }
};

export const loadToken = async (address: string, signer: Signer, iconUrl: string, coingeckoId: string): Promise<Token> => {
    const token = await getContract(address, signer);

    const signerAddress = await signer.getAddress();
    const balance = await token.balanceOf(signerAddress);
    const symbol = await token.symbol();
    const decimals = await token.decimals();

    return {
        iconUrl,
        decimals,
        coingeckoId,
        address: token.address,
        balance: balance.toString(),
        name: symbol,
    };
};

export const loadTokens = async (addresses: ValidatedToken[], signer: Signer): Promise<Token[]> => {
    const tokens = Promise.all(
        addresses.map((token) => loadToken(token.address, signer, token.iconUrl, token.coingeckoId)),
    );
    return tokens;
};


export const checkIfERC20ContractExist = async (address: string, signer: Signer): Promise<void> => {
    try {
        // @ts-ignore
        const contract = new Contract(address, ERC20, signer);

        // TODO add additional checkers to be surtent of Contract existance
        await contract.name();
        await contract.symbol();
        await contract.decimals();
    } catch (error) {
        console.error(error);
        throw new Error('Unknown address');
    }
};

export const getContract = async (address: string, signer: Signer): Promise<Contract> => {
    await checkIfERC20ContractExist(address, signer);
    // @ts-ignore
    return new Contract(address, ERC20, signer);
};

export const balanceOf = async (address: string, balanceAddress: string, signer: Signer): Promise<BigNumber> => {
    const contract = await getContract(address, signer);
    const balance = await contract.balanceOf(balanceAddress);
    return balance;
};

export interface ValidatedToken {
    name: string;
    address: string;
    iconUrl: string;
    coingeckoId: string;
}

export interface Token extends ValidatedToken {
    balance: string;
    decimals: number;
}
