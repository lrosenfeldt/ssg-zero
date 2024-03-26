#!/bin/sh

set -eu

MACHINE="$(uname -sm | tr ' ' '_' | tr '[:upper:]' '[:lower:]')"
DATE="$(date '+%y%m%d_%H%M%S')"
BRANCH="$(git branch --show-current | tr '/' '.')"
PREFIX="${MACHINE}_${BRANCH}_${DATE}"

EXE="node"
RM="rm"

while [ "$#" -gt 0 ]; do
  case "$1" in
  -h | --help)
    echo "\
Usage: measure [-h | --help] [-n | --dry]
Record heap, cpu and v8 profile for the current ssg-zero setup.
  -h, --help  Show this message
  -n, --dry   Only show what would be executed"
    exit 0
  ;;
  -n | --dry)
    RM="echo rm"
    EXE="echo node"
  ;;
  *)
    echo "Unknown option '$1'" 1>&2
    exit 4
  ;;
  esac

  shift
done

$EXE --heap-prof --heap-prof-name="${PREFIX}.heapprofile.txt" --diagnostic-dir=diagnostic zero.config.js
$EXE --cpu-prof --cpu-prof-name="${PREFIX}.cpuprofile.txt" --diagnostic-dir=diagnostic zero.config.js
$EXE --prof zero.config.js

V8_FILE=""
if [ "$EXE" == "node" ]; then
  V8_FILE="$(ls -t1 | awk '/isolate/' | head -n 1)"
  [ -f "$V8_FILE" ] || exit 1
else
  V8_FILE="V8_FILE"
fi

$EXE --prof-process "$V8_FILE" > "diagnostic/${PREFIX}.v8profile.txt"

$RM "$V8_FILE"
