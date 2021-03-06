// [object Object]
// SPDX-License-Identifier: Apache-2.0
// eslint-disable-next-line header/header
import { ApolloProvider } from '@apollo/client';
// eslint-disable-next-line header/header,import/no-duplicates
import { Provider, Signer as EvmSigner } from '@reef-defi/evm-provider';
import { ethers } from 'ethers';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import { web3Accounts, web3Enable, web3FromSource } from '@reef-defi/extension-dapp';
import { InjectedExtension } from '@reef-defi/extension-inject/types';
import { Identicon } from '@polkadot/react-identicon';
import { WsProvider } from '@polkadot/rpc-provider';
import { keyring } from '@polkadot/ui-keyring';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';
import { ContractTransferEvents } from './components/ContractTransferEvents';
import { apolloClientInstance } from './apolloConfig';
import { ReefCoinTransfers } from './components/ReefCoinTransfers';
import { TokenBalances } from './components/TokenBalances';

interface Props {
  className?: string;
}

interface InjectedAccountExt {
  address: string;
  meta: {
    name: string;
    source: string;
    whenCreated: number;
  };
}

// Flipper ABI definition
const FlipperAbi = [
  {
    inputs: [
      {
        internalType: 'bool',
        name: 'initvalue',
        type: 'bool'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'flip',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'get',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

const rootElement = document.getElementById('example');

if (!rootElement) {
  throw new Error('Unable to find element with id \'example\'');
}

function App ({ className }: Props): React.ReactElement<Props> | null {
  // API connectivity
  const URL = 'wss://rpc-testnet.reefscan.com/ws';
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isApiInitialized, setIsApiInitialized] = useState(false);

  // Polkadot.js extension initialization
  const [extensions, setExtensions] = useState<InjectedExtension[] | undefined>();
  const [injectedAccounts, setInjectedAccounts] = useState<InjectedAccountExt[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [accountSigner, setAccountSigner] = useState<any>(null);

  // EVM contract interaction
  const [accountId, setAccountId] = useState<string>();
  const [evmAddress, setEvmAddress] = useState('');
  const [evmProvider, setEvmProvider] = useState<Provider | null>(null);

  // Flipper contract values
  const flipperContractAddressTestnet = '0x6252dC9516792DE316694D863271bd25c07E621B';
  const [flipperValue, setFlipperValue] = useState('not called yet');

  // DROPDOWN ACCOUNT SELECTION
  const _onChangeAccountId = useCallback(({ currentTarget: { value } }: React.SyntheticEvent<HTMLSelectElement>): void => {
    setAccountId(value);

    const pair = injectedAccounts.filter((account) => account.address == value);
    if (pair) {
        const meta = (pair[0] && pair[0].meta) || {};
        web3FromSource(meta.source as string)
          .catch((): null => null)
          .then((injected) => setAccountSigner(injected?.signer))
          .catch(console.error);

    }
  }, [injectedAccounts]);

  // FLIPPER GET(): Call Flipper get() function (view only, no funds are expended)
  const _onClickGetContractValue = useCallback(async (): Promise<void> => {
    if (!evmProvider || !accountId) return;

    const wallet = new EvmSigner(evmProvider, accountId, accountSigner);
    const ercContract = new ethers.Contract(flipperContractAddressTestnet as string, FlipperAbi as any, wallet);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
    const value = await ercContract.get();

    console.log('Value: ', value);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    setFlipperValue(value.toString());
  }, [evmProvider, accountId, accountSigner]);

  // FLIPPER FLIP(): Call Flipper flip() function (the value will be swapped, funds are expended)
  const _onClickFlipContractValue = useCallback(async (): Promise<void> => {
    if (!evmProvider || !accountId) return;

    const wallet = new EvmSigner(evmProvider, accountId, accountSigner);
    const ercContract = new ethers.Contract(flipperContractAddressTestnet as string, FlipperAbi as any, wallet);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
      const result = await ercContract.flip();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call,@typescript-eslint/restrict-template-expressions
      alert(`Value was flipped! TX: ${result.toString()}`);
      console.log('Result: ', result);
    } catch {
      alert('Value was not flipped! See console!');
    }
  }, [evmProvider, accountId, accountSigner]);

  // Obtain EVM address based on the accountId
  useEffect(() => {
    if (accountId && evmProvider && evmProvider.api) {
      evmProvider.api.isReady.then(() => {
        evmProvider.api.query.evmAccounts.evmAddresses(accountId).then((result) => {
          if (result.isEmpty) {
            setEvmAddress('');
          } else {
            setEvmAddress(result.toString());
          }
        });
      });
    } else {
      setEvmAddress('');
    }
  }, [accountId, evmProvider]);

  useEffect((): void => {
    // Polkadot.js extension initialization as per https://polkadot.js.org/docs/extension/usage/
    const injectedPromise = web3Enable('@reef-defi/ui-example');

    const evmProvider = new Provider({
      provider: new WsProvider(URL)
    });

    setEvmProvider(evmProvider);

    evmProvider.api.on('connected', () => setIsApiConnected(true));
    evmProvider.api.on('disconnected', () => setIsApiConnected(false));

    // Populate account dropdown with all accounts when API is ready
    evmProvider.api.on('ready', async (): Promise<void> => {
      try {
        await injectedPromise
          .then(() => web3Accounts())
          .then((accounts) =>
            accounts.map(
              ({ address, meta }, whenCreated): InjectedAccountExt => ({
                address,
                meta: {
                  ...meta,
                  name: `${meta.name || 'unknown'} (${meta.source})`,
                  whenCreated
                }
              })
            )
          )
          .then((accounts) => {
            setInjectedAccounts(accounts);
            setAccountId(accounts[0].address);
          })
          .catch((error): InjectedAccountExt[] => {
            console.error('web3Enable', error);

            return [];
          });
      } catch (error) {
        console.error('Unable to load chain', error);
      }
    });

    // Setup Polkadot.js signer
    injectedPromise
      .then((extensions) => {
        setExtensions(extensions);
        setAccountSigner(extensions[0]?.signer);
      })
      .catch((error) => console.error(error));

    setIsApiInitialized(true);
  }, []);

  // ------- SUBSTRATE ACCOUNT GENERATION -------
  const [address, setAddress] = useState<string | null>(null);
  const [phrase, setPhrase] = useState<string | null>(null);
  const SS58_FORMAT = 42;

  const _onClickNew = useCallback((): void => {
    const phrase = mnemonicGenerate(12);
    const { address } = keyring.createFromUri(phrase);

    setAddress(keyring.encodeAddress(address, SS58_FORMAT));
    setPhrase(phrase);
  }, []);

  useEffect((): void => {
    _onClickNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect((): void => {
    address && setAddress(keyring.encodeAddress(address, SS58_FORMAT));
  }, [address]);

  if (!address || !phrase) {
    return null;
  }

  return (
    <div className={className}>
      <h1>EVM contract interaction</h1>
      <section>
        <label>Account:</label>
        <select
          onChange={_onChangeAccountId}
          value={accountId}
        >
          {injectedAccounts.map(
            ({ address, meta: { name } }): React.ReactNode => (
              <option
                key={address}
                value={address}
              >
                {name} ({address})
              </option>
            )
          )}
        </select>
        <section>{!evmAddress && isApiInitialized
          ? <p>No EVM address is bound to this address. The requests will fail.</p>
          : <p>EVM address: {evmAddress}</p>}</section>
      </section>
      <section>
        <i>Example of interaction with Flipper contract ({flipperContractAddressTestnet})</i>

        <section>
            Current value: <b>{flipperValue}</b>
          <button onClick={_onClickGetContractValue}>Get value</button>
          <button onClick={_onClickFlipContractValue}>Flip value</button>
        </section>
      </section>

      <h1>Substrate account generation example</h1>
      <section>
        <button onClick={_onClickNew}>another random address</button>
      </section>
      <section>
        <label>phrase</label>
        <textarea
          cols={40}
          readOnly
          rows={4}
          value={phrase}
        />
      </section>
      <section>
        <label>icons</label>
        <Identicon
          className='icon'
          value={address}
        />
        <Identicon
          className='icon'
          theme='polkadot'
          value={address}
        />
        <Identicon
          className='icon'
          theme='beachball'
          value={address}
        />
      </section>
      <section>
        <label>address</label>
        {address}
      </section>
      <section>
        <label>GraphQL</label>
        {!!apolloClientInstance &&
          <ApolloProvider client={apolloClientInstance}>
            <ContractTransferEvents
              contractAddress='0x0000000000000000000000000000000001000000'
              offset={0}
              perPage={10}
            ></ContractTransferEvents>

            <ReefCoinTransfers address={accountId}
                               offset={0}
                               perPage={10}></ReefCoinTransfers>

            <TokenBalances contractId="0xF7108a2737687f3780D7846852DEd6A75fADaC01"
                           accountAddress="0xc842BcD9c323584016b91DD6e9406F7083a0cd00"
                           perPage={5} offset={0}></TokenBalances>

            <TokenBalances contractId="0xF7108a2737687f3780D7846852DEd6A75fADaC01"
                           perPage={5} offset={0}></TokenBalances>
          </ApolloProvider>}
      </section>
    </div>
  );
}

cryptoWaitReady()
  .then((): void => {
    keyring.loadAll({ ss58Format: 42, type: 'sr25519' });
    ReactDOM.render(<App />, rootElement);
  })
  .catch(console.error);
