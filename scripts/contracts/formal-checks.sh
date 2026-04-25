#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/hazina-escrow"

echo "Running invariant-oriented contract checks"
cargo test --manifest-path "$CONTRACT_DIR/Cargo.toml" formal_
