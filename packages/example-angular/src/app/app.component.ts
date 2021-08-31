import { Component } from '@angular/core';
import { catchError, map, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { combineLatest, merge, Observable, of, Subject } from 'rxjs';
import { Signer } from '@reef-defi/evm-provider';
import { ethers } from 'ethers';
import { fromPromise } from 'rxjs/internal-compatibility';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { formatBalance } from '@polkadot/util';
import { ReefApiService, ReefSigner } from './reef-api/reef-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  LOADING = '_loading_';
  selectedAccountIdSubject: Subject<ReefSigner> = new Subject();
  selectedAccount$: Observable<ReefSigner> = merge(this.reefApiService.initialAccount$, this.selectedAccountIdSubject).pipe(
    shareReplay(1)
  );

  flipperContractAddressTestnet = '0x6252dC9516792DE316694D863271bd25c07E621B';
  refreshFlipperValue = new Subject();
  flipFlipperValue = new Subject();

  // eslint-disable-next-line camelcase
  evmProvider_account$ = combineLatest([this.reefApiService.evmProvider$, this.selectedAccount$]);
  balance$ = this.evmProvider_account$.pipe(
    switchMap(([evmProvider, acc]) => {
      formatBalance.setDefaults({
        decimals: evmProvider.api.registry.chainDecimals[0],
        unit: evmProvider.api.registry.chainTokens[0]
      });

      return fromPromise(evmProvider.api.query.system.account(acc.address)).pipe(
        map((res: any) => ({
          free: formatBalance(res.data.free, { withSi: true }),
          frozen: formatBalance(res.data.miscFrozen, { withSi: true }),
          reserved: formatBalance(res.data.reserved, { withSi: true })
        }))
      );
    })
  );

  flippedValueTx$ = this.flipFlipperValue.pipe(
    withLatestFrom(this.selectedAccount$),
    switchMap(([, selectedAccount]: [any, ReefSigner]) => this.flipContractValue$(selectedAccount.signer))
  );

  triggerRefreshValue$ = merge(this.refreshFlipperValue, this.flippedValueTx$).pipe(
    startWith(true)
  );

  flipperValue$ = combineLatest([this.triggerRefreshValue$, this.selectedAccount$]).pipe(
    withLatestFrom(this.selectedAccount$),
    switchMap(([[tx], selectedAccount]) => {
      if (tx === this.LOADING) {
        return of(tx);
      }
      return this.getFlipperValue$(selectedAccount.signer);
    }),
    shareReplay(1)
  );

  generateAddress = new Subject();

  phrase_address$ = combineLatest([this.generateAddress.pipe(startWith(true)), this.reefApiService.keyring$]).pipe(
    map(([_, kring]) => {
      const phrase = mnemonicGenerate(12);
      const { address } = kring.createFromUri(phrase);
      return { phrase, address };
    }),
    shareReplay(1)
  );

  // eslint-disable-next-line no-useless-constructor
  constructor (public reefApiService: ReefApiService) {
  }

  getFlipperValue$ (accountSigner: Signer): Observable<any> {
    const ercContract = new ethers.Contract(this.flipperContractAddressTestnet, FlipperAbi as any);

    return fromPromise(ercContract.connect(accountSigner as any)['get()']()).pipe(
      startWith(this.LOADING),
      catchError((e) => {
        console.log('Error calling contract - check if contract/member exists err=', e);

        return of('');
      })
    );
  }

  flipContractValue$ (accountSigner: Signer): Observable<any> {
    const ercContract = new ethers.Contract(this.flipperContractAddressTestnet, FlipperAbi as any);

    return fromPromise(ercContract.connect(accountSigner as any)['flip()']()).pipe(
      tap(v => console.log('value flipped=', v)),
      catchError(err => {
        console.log('ERROR flipping value', err);
        alert('Value was not flipped! See console!');
        return of(null);
      }),
      startWith(this.LOADING)
    );
  }

  findByAddress (accounts: ReefSigner[], target: any) {
    return accounts.find(a => a.address === target.value);
  }
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
