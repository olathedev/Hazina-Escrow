# Hazina Escrow Contract

The Soroban contract now supports:

- A default platform fee plus dataset-specific fee overrides
- Admin-managed whitelist and blacklist controls for buyer and seller addresses
- Invariant-focused verification tests that can be run independently

## Verification scripts

From the repository root:

```sh
npm run contracts:check
npm run contracts:formal
```

`contracts:check` runs formatting, clippy, the full Rust test suite, and a release wasm build.

`contracts:formal` runs the invariant-oriented tests whose names start with `formal_`.
