import { gql } from '@apollo/client';

export const CONTRACT_EVENTS_GQL = gql`
          subscription events(
            $blockNumber: bigint
            $perPage: Int!
            $offset: Int!
            $addressFilter: String!
          ) {
            event(
              limit: $perPage
              offset: $offset
              where: {block_number: { _eq: $blockNumber }, section: { _eq: "evm" }, method: { _eq: "Log" }, data: {_like: $addressFilter}}
              order_by: { block_number: desc, event_index: desc }
            ) {
              block_number
              event_index
              data
              method
              phase
              section
              timestamp
            }
          }
        `;
