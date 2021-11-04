import { gql } from '@apollo/client';

export const CONTRACT_EVENTS_GQL = gql`
          subscription events(
            $blockNumber: bigint
            $perPage: Int!
            $offset: Int!
            $contractAddressFilter: String!
          ) {
            event(
              limit: $perPage
              offset: $offset
              where: {block_number: { _eq: $blockNumber }, section: { _eq: "evm" }, method: { _eq: "Log" }, data: {_like: $contractAddressFilter}}
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

export const REEF_TRANSFERS_GQL = gql`
          subscription reefTransfers(
            $blockNumber: bigint
            $perPage: Int!
            $offset: Int!
            $address: String!
          ) {
            transfer(
              limit: $perPage
              offset: $offset
              where: {block_number: { _eq: $blockNumber }, source: { _eq: $address } }
              order_by: { block_number: desc, extrinsic_index: desc }
            ) {
              block_number
              section
              method
              hash
              source
              destination
              amount
              denom
              fee_amount
              success
              error_message
              timestamp
            }
          }
        `;

export const ACCOUNT_TOKENS_GQL = gql`
          subscription token_holder($accountId: String!) {
            token_holder(
              where: { holder_account_id: { _eq: $accountId } }
              order_by: { balance: desc }
          ) {
              contract_id
              holder_account_id
              holder_evm_address
              balance
              contract {
                token_decimals
                token_name
                token_symbol
              }
            }
          }
        `;

export const TOKEN_HOLDERS_GQL = gql`
          subscription tokenHolders(
            $contractId: String!
            $perPage: Int!
            $offset: Int!
          ) {
            token_holder(
              limit: $perPage
              offset: $offset
              where: {contract_id: { _eq: $contractId } }
              order_by: { block_height: desc }
            ) {
              contract_id
              holder_account_id
              holder_evm_address
              balance
              block_height
              timestamp
            }
          }
        `;

