# @reef-defi/ui-examples

Basic browser and framework agnostic UI components for creating apps on the Reef Chain based on
[@polkadot-js/ui](https://github.com/polkadot-js/ui).

## Installation

Install dependencies with `yarn`.

## Examples

A single file React example for EVM contract interaction can be run with:

- [example-react](packages/example-react) - start with `yarn example:react` and view on `http://localhost:8080`

It showcases the most used APIs.

## Overview

The following UI components are currently available -

- [react-identicon](packages/react-identicon/) React identity icon generator with address as input
- [reactnative-identicon](packages/reactnative-identicon/) React Native identity icon generator with address as input
- [vue-identicon](packages/vue-identicon/) Vue identity icon generator with address as input
- [react-qr](packages/react-qr/) QR code generator/reader for [uos](https://github.com/maciejhirsz/uos) (Substrate/Polkadot only)

Additionally some shared libraries, that is not dependent on any framework -

- [ui-assets](packages/ui-assets/) Static assets, images and others, shared accross projects
- [ui-keyring](packages/ui-keyring/) A browser-specific wrapper around the base [@polkadot/util-keyring](https://github.com/polkadot-js/util/) library
- [ui-settings](packages/ui-settings/) A browser local storage wrapper for app settings & configuration
- [ui-shared](packages/ui-shared) Shared logic that is used accross UI components, e.g. for icon generation

