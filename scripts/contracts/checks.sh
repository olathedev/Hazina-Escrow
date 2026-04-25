#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/hazina-escrow"

if ! rustup target list --installed | grep -q '^wasm32v1-none$'; then
  echo "Missing Rust target wasm32v1-none. Install it with: rustup target add wasm32v1-none" >&2
  exit 1
fi

echo "Running cargo fmt --check"
cargo fmt --manifest-path "$CONTRACT_DIR/Cargo.toml" --all -- --check

echo "Running cargo clippy"
cargo clippy --manifest-path "$CONTRACT_DIR/Cargo.toml" --all-targets -- -D warnings

echo "Running cargo test"
cargo test --manifest-path "$CONTRACT_DIR/Cargo.toml"

echo "Building release wasm artifact"
cargo build --manifest-path "$CONTRACT_DIR/Cargo.toml" --release --target wasm32v1-none
