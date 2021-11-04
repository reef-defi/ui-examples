// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { useSubscription } from '@apollo/client';
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';

import { CONTRACT_EVENTS_GQL } from '../gql';

interface ContractEventsComponent {
  blockNumber?: BigInt;
  contractAddress: string;
  abi: string[];
  perPage: number;
  offset: number;
}

interface ParsedEvent {
  args: string[],
  name: string,
  signature: string,
  topic: string
}

const transferAbi = ['event Transfer(address indexed from, address indexed to, uint value)'];

function parseLogData (eventJson: string, abi: string[]): ethers.utils.LogDescription | undefined {
  const eventLogJson: {topics: string[], data: string}[] = JSON.parse(eventJson);

  try {
    const iface = new ethers.utils.Interface(abi);

    return iface.parseLog(eventLogJson[0]);
  } catch (e) {
    // console.log('errParse=',e.message)
  }

  return undefined;
}

export const ContractEventsComponent = function ({ abi, blockNumber, contractAddress, offset, perPage }: ContractEventsComponent): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: eventsRes, loading } = useSubscription(
    CONTRACT_EVENTS_GQL,
    // eslint-disable-next-line sort-keys
    { variables: { offset, perPage, blockNumber, contractAddressFilter: contractAddress ? `[{"address":"${contractAddress}"%` : '[{%' } }
  );
  const [events, setEvents] = useState<ethers.utils.LogDescription>([]);

  useEffect(() => {
    const { event } = eventsRes || {};
    const parsedEventData = event?.length ? event.map((e) => parseLogData(e.data, abi || transferAbi)) : [];

    setEvents(parsedEventData.filter((ped) => !!ped));
  }, [eventsRes]);

  // eslint-disable-next-line react/react-in-jsx-scope
  return (<div>
    <h5>Contract {contractAddress} transfers from logs</h5>
    {events.map((e, i) => {
      return (<div key={i}>from: {e.args.from} <br />
        to: {e.args.to}
        <br />
        value: {ethers.utils.formatEther(e.args.value)}
        <br />
        <br />
      </div>);
    })}
  </div>);
};
