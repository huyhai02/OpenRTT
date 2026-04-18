#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NATIVE_DIR="$ROOT_DIR/tests/native"
HOST_SCRIPT="$ROOT_DIR/host/dss/rtt_host.js"

CGT_ROOT_DEFAULT="$HOME/ti/ccs2031/ccs/tools/compiler/ti-cgt-c2000_22.6.3.LTS"
DSS_DEFAULT="$HOME/ti/ccs2031/ccs/ccs_base/scripting/bin/dss.sh"

CGT_ROOT="${CGT_ROOT:-$CGT_ROOT_DEFAULT}"
CL2000="$CGT_ROOT/bin/cl2000"
CGT_INC="$CGT_ROOT/include"
DSS_BIN="${DSS_BIN:-$DSS_DEFAULT}"

echo "[1/3] Native tests"
make -C "$NATIVE_DIR" clean
make -C "$NATIVE_DIR" run

echo "[2/3] cl2000 syntax-check"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

"$CL2000" --c99 --silicon_version=28 \
  -I"$CGT_INC" \
  -I"$ROOT_DIR/firmware/rtt/include" \
  -I"$ROOT_DIR/firmware/rtt/src" \
  -c "$ROOT_DIR/firmware/rtt/src/rtt.c" \
  -fr="$tmpdir" -fs="$tmpdir"

"$CL2000" --c99 --silicon_version=28 \
  -I"$CGT_INC" \
  -I"$ROOT_DIR/firmware/rtt/include" \
  -I"$ROOT_DIR/firmware/rtt/src" \
  -c "$ROOT_DIR/firmware/rtt/src/rtt_ringbuf.c" \
  -fr="$tmpdir" -fs="$tmpdir"

"$CL2000" --c99 --silicon_version=28 \
  -I"$CGT_INC" \
  -I"$ROOT_DIR/firmware/rtt/include" \
  -I"$ROOT_DIR/firmware/rtt/src" \
  -c "$ROOT_DIR/firmware/rtt/src/rtt_port.c" \
  -fr="$tmpdir" -fs="$tmpdir"

echo "[3/3] DSS host self-test"
"$DSS_BIN" "$HOST_SCRIPT" --self-test

echo "All checks passed"
