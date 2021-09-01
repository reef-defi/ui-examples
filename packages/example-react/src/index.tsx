import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import { WsProvider } from '@polkadot/rpc-provider';
import { InjectedExtension } from '@polkadot/extension-inject/types';
import { Provider, Signer as EvmSigner } from '@reef-defi/evm-provider';
import { ethers } from 'ethers';

import { Identicon } from '@polkadot/react-identicon';
import { keyring } from '@polkadot/ui-keyring';

import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';

import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';

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
  throw new Error("Unable to find element with id 'example'");
}

function App({ className }: Props): React.ReactElement<Props> | null {
  // API connectivity
  const URL = 'wss://rpc-testnet.reefscan.com/ws';
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isApiInitialized, setIsApiInitialized] = useState(false);

  // Polkadot.js extension initialization
  const [extensions, setExtensions] = useState<InjectedExtension[] | undefined>();
  const [injectedAccounts, setInjectedAccounts] = useState<InjectedAccountExt[]>([]);
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
  }, []);

  // FLIPPER GET(): Call Flipper get() function (view only, no funds are expended)
  const _onClickGetContractValue = useCallback(async (): Promise<void> => {
    if (!evmProvider || !accountId) return;

    const wallet = new EvmSigner(evmProvider as Provider, accountId, accountSigner);
    let ercContract = new ethers.Contract(flipperContractAddressTestnet as string, FlipperAbi as any, wallet);

    const value = await ercContract.get();

    console.log('Value: ', value);
    setFlipperValue(value.toString());
  }, [evmProvider, accountId]);

  // FLIPPER FLIP(): Call Flipper flip() function (the value will be swapped, funds are expended)
  const _onClickFlipContractValue = useCallback(async (): Promise<void> => {
    if (!evmProvider || !accountId) return;

    const wallet = new EvmSigner(evmProvider as Provider, accountId, accountSigner);
    let ercContract = new ethers.Contract(flipperContractAddressTestnet as string, FlipperAbi as any, wallet);

    try {
      const result = await ercContract.flip();

      alert(`Value was flipped! TX: ${result.toString()}`);
      console.log('Result: ', result);
    } catch {
      alert('Value was not flipped! See console!');
    }
  }, [evmProvider, accountId]);

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
  }, [accountId]);

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
                  name: `${meta.name || 'unknown'} (${meta.source === 'polkadot-js' ? 'extension' : meta.source})`,
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
      .then(async (extensions) => {
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
        <select onChange={_onChangeAccountId} value={accountId}>
          {injectedAccounts.map(
            ({ address, meta: { name } }): React.ReactNode => (
              <option key={address} value={address}>
                {name} ({address})
              </option>
            )
          )}
        </select>
        <section>{!evmAddress && isApiInitialized ? <p>No EVM address is bound to this address. The requests will fail.</p> : <p>EVM address: {evmAddress}</p>}</section>
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
        <textarea cols={40} readOnly rows={4} value={phrase} />
      </section>
      <section>
        <label>icons</label>
        <Identicon className='icon' value={address} />
        <Identicon className='icon' theme='polkadot' value={address} />
        <Identicon className='icon' theme='beachball' value={address} />
      </section>
      <section>
        <label>address</label>
        {address}
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
