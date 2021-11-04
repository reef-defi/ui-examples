// [object Object]
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line header/header
import { useSubscription } from '@apollo/client';
import React from 'react';

import { TOKEN_BALANCES_GQL } from '../gql';

interface AccountTokens {
  address?: string;
  perPage: number;
  offset: number;
}

export const AccountTokens = function ({ address, offset, perPage }: AccountTokens): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: holders, loading } = useSubscription(
    TOKEN_BALANCES_GQL,
    // eslint-disable-next-line sort-keys
    { variables: { offset, perPage, address } }
  );

  // eslint-disable-next-line react/react-in-jsx-scope
  return (<div>
    <h5>Tokens for address {address}</h5>
    {holders?.token_holder.map((h: {holder_evm_address:string, balance: number}, i: number) => {
      return (<div key={i}>account: {h.holder_evm_address} <br />
        balance: {h.balance}
        <br />
        <br />
      </div>);
    })}
  </div>);
};
