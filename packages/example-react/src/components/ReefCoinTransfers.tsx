// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { useSubscription } from '@apollo/client';
import { BigNumber, ethers } from 'ethers';
import React, { useEffect, useState } from 'react';

import { CONTRACT_EVENTS_GQL, REEF_TRANSFERS_GQL } from '../gql';

interface ReefTransfers {
  address: string;
  blockNumber?: BigInt;
  perPage: number;
  offset: number;
}

export const ReefCoinTransfers = function ({ address, blockNumber, offset, perPage }: ReefTransfers): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: transfers, loading } = useSubscription(
    REEF_TRANSFERS_GQL,
    // eslint-disable-next-line sort-keys
    { variables: { offset, perPage, blockNumber, address} }
  );

  // eslint-disable-next-line react/react-in-jsx-scope
  return (<div>
    <h5>Reef transfers for {address}</h5>
    {transfers?.transfer.map((t, i) => {
      return (<div key={i}>from: {t.source} <br />
        to: {t.destination}
        <br />
        value:  {ethers.utils.formatEther(BigNumber.from(t.amount.toString()))} REEF
        <br />
        <br />
      </div>);
    })}
  </div>);
};
