// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { useSubscription } from '@apollo/client';
import { BigNumber, ethers } from 'ethers';
import React, { useEffect } from 'react';

import { TOKEN_BALANCES_GQL } from '../gql';

interface TokenBalances {
  accountAddress?: string;
  contractId: string;
  perPage: number;
  offset: number;
}

function toFixedBigExponent (balance: number): string {
  const stringVal = balance.toString(10);

  if (stringVal.indexOf('e')) {
    const splitOnExp = stringVal.split('e');
    const expNr = parseInt(splitOnExp[1]);

    if (expNr > 20) {
      const zerosString = Array(100).fill('0').join('');

      return splitOnExp[0].replace('.', '').padEnd(expNr, zerosString);
    }
  }

  return balance.toFixed(0);
}

export const TokenBalances = function ({ accountAddress, contractId, offset, perPage }: TokenBalances): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: balances, loading } = useSubscription(
    TOKEN_BALANCES_GQL,
    // eslint-disable-next-line sort-keys
    { variables: { offset, perPage, contractId, accountAddress: accountAddress || '%' } }
  );

  // eslint-disable-next-line react/react-in-jsx-scope
  return (<div>
    <h5>
      {!accountAddress && `Token holders for ${contractId}` }
      {!!accountAddress && `Token balance for account ${accountAddress}`}
    </h5>
    {balances?.token_holder.map((b, i) => {
      return (<div key={i}>account: {b.holder_evm_address} <br />
        balance: {ethers.utils.formatEther(BigNumber.from(toFixedBigExponent(b.balance)))}
        <br />
        <br />
      </div>);
    })}
  </div>);
};
