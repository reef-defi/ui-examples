//[object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Signer as InjectedSigner } from '@polkadot/api/types';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

import { Injectable } from '@angular/core';
import { Provider, Signer } from '@reef-defi/evm-provider';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import keyring from '@polkadot/ui-keyring';

import { environment } from '../../environments/environment';
import { getSignerPointer } from './localStore';
import { AvailableNetworks, loadTokens, loadVerifiedERC20Tokens, reefNetworks } from './network';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@Injectable({ providedIn: 'root' })
export class ReefApiService {
  evmProvider$: Observable<any>;
  initialAccount$: Observable<ReefSigner>;
  availableAccounts$: Observable<ReefSigner[]>;
  keyring$ = of(keyring).pipe(
    tap((k) => k.loadAll({})),
    shareReplay(1)
  );

  private evmAddressCache: Map<string, Observable<string>> = new Map<string, Observable<string>>();
  private network: AvailableNetworks = environment.reefTestnet ? 'testnet' : 'mainnet';

  constructor () {
    const initValues$ = fromPromise(this.init(this.network, 'Reef Chain')).pipe(
      shareReplay(1)
    );

    this.evmProvider$ = initValues$.pipe(
      map((v) => v.evmProvider),
      shareReplay(1)
    );
    this.availableAccounts$ = initValues$.pipe(
      map((v) => v.signers),
      shareReplay(1)
    );
    this.initialAccount$ = initValues$.pipe(
      map((v) => v.signers[v.selectedAccountIndex]),
      shareReplay(1)
    );
  }

  getEvmAddress (address: string): Observable<string> {
    if (!this.evmAddressCache.has(address)) {
      const selectedAccountEvmAddress$: Observable<string> = this.evmProvider$.pipe(
        switchMap((evmProvider: Provider) => {
          if (evmProvider.api.query.evmAccounts) {
            return fromPromise(evmProvider.api.query.evmAccounts.evmAddresses(address));
          }

          return of({ isEmpty: true });
        }),
        map((result: any) => {
          if (!result || (result.isEmpty)) {
            return '';
          } else {
            return result.toString();
          }
        }),
        shareReplay(1)
      );

      this.evmAddressCache.set(address, selectedAccountEvmAddress$);
    }

    return this.evmAddressCache.get(address) as Observable<string>;
  }

  private init = async (network: AvailableNetworks, appName: string): Promise<{ evmProvider: Provider, signers: ReefSigner[], selectedAccountIndex: number }> => {
    const selNetwork = reefNetworks[network];

    console.log('Connecting to Polkadot extension...');
    const inj = await web3Enable(appName);

    this.ensure(inj.length > 0, 'Polkadot extension is disabled! You need to approve the app in Polkadot-extension!');

    console.log('Retrieving accounts...');
    const web3accounts = await web3Accounts();

    this.ensure(web3accounts.length > 0, 'To use Reefswap you need to create Polkadot account in Polkadot-extension!');

    console.log('Connecting to chain...');
    const evmProvider = new Provider({
      provider: new WsProvider(selNetwork.rpcUrl)
    });

    await evmProvider.api.isReadyOrError;

    console.log('Creating signers...');
    const signers = await this.accountsToSigners(
      web3accounts,
      evmProvider,
      inj[0].signer
    );

    console.log('Loading tokens...');
    const verifiedTokens = await loadVerifiedERC20Tokens(selNetwork);
    const newTokens = await loadTokens(verifiedTokens, signers[0].signer);

    const signerPointer = getSignerPointer();

    // Make sure selecting account is after setting signers
    // Else error will occure
    const selectedAccountIndex = signers.length > signerPointer ? signerPointer : 0;

    return { evmProvider, selectedAccountIndex, signers };
  };

  private ensure = (condition: boolean, message: string): void => {
    if (!condition) {
      throw new Error(message);
    }
  };

  private accountsToSigners = async (accounts: InjectedAccountWithMeta[], provider: Provider, sign: InjectedSigner): Promise<ReefSigner[]> => Promise.all(
    accounts
      .map((account) => ({
        address: account.address,
        name: account.meta.name || '',
        signer: new Signer(provider, account.address, sign)
      }))
      .map(async (signer): Promise<ReefSigner> => ({
        ...signer,
        evmAddress: await signer.signer.getAddress(),
        isEvmClaimed: await signer.signer.isClaimed()
      }))
  );
}

export interface ReefSigner {
  signer: Signer;
  name: string;
  address: string;
  evmAddress: string;
  isEvmClaimed: boolean;
}
