// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { useSubscription } from '@apollo/client';
import { BigNumber, ethers } from 'ethers';
import React, { useEffect } from 'react';

import { TOKEN_BALANCES_GQL } from '../gql';
import { toFixedBigExponent } from '../util';

interface TokenBalances {
  accountAddress?: string;
  contractId: string;
  perPage: number;
  offset: number;
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
    {balances?.token_holder.map((b: any, i: number) => {
      return (<div key={i}>account: {b.holder_evm_address} <br />
        balance: {ethers.utils.formatEther(BigNumber.from(toFixedBigExponent(b.balance)))}
        <br />
        <br />
      </div>);
    })}
  </div>);
};
