#!/bin/sh

set -eu

OPT_INCLUDE_TIMESTAMP=""
OPT_SWITCH_BRANCH=""
OPT_FORCE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
  -h | --help)
    echo "\
Usage: measure.sh [-h | --help] [-b | --branch <branch>] [-t | --timestamp] [-f | --force]
Record heap, cpu and v8 profile for the current ssg-zero setup.
  -h, --help        Show this message
  -b, --branch      Branch to checkout before running
  -t, --timestamp   Include a timestamp in file names
  -f, --force       Overwrite results
"
    exit 0
  ;;
  -t | --timestamp)
    OPT_INCLUDE_TIMESTAMP=true
  ;;
  -b | --branch)
    shift
    OPT_SWITCH_BRANCH="$1"
  ;;
  -f | --force)
    OPT_FORCE=true
  ;;
  *)
    echo "Unknown option '$1'" 1>&2
    exit 4
  ;;
  esac

  shift
done

MACHINE="$(uname -sm | tr ' ' '_' | tr '[:upper:]' '[:lower:]')"
DATE=""
BRANCH=""
if [ -n "$OPT_INCLUDE_TIMESTAMP" ]; then
  DATE="_$(date '+%y%m%d_%H%M%S')"
fi

if [ -n "$OPT_SWITCH_BRANCH" ]; then
  if ! git checkout "$OPT_SWITCH_BRANCH" 1>/dev/null 2>/dev/null; then
    exit 8
  fi
fi

BRANCH="_$(git branch --show-current | tr '/' '.')"
PREFIX="${MACHINE}${BRANCH}${DATE}"

if [ -z "$OPT_FORCE" ]; then
  [ -f "./diagnostic/${PREFIX}.v8profile.txt" ] && exit 16
  [ -f "./diagnostic/${PREFIX}.heapprofile.json" ] && exit 16
  [ -f "./diagnostic/${PREFIX}.cpuprofile.json" ] && exit 16
fi

npm run --include-workspace-root --if-present compile
node --heap-prof --heap-prof-name="${PREFIX}.heapprofile.json" --diagnostic-dir=diagnostic zero.config.js
node --cpu-prof --cpu-prof-name="${PREFIX}.cpuprofile.json" --diagnostic-dir=diagnostic zero.config.js
node --prof zero.config.js

V8_FILE="$(ls -t1 | awk '/isolate/' | head -n 1)"
if ! [ -f "$V8_FILE" ]; then
 exit 1
fi

node --prof-process "$V8_FILE" > "diagnostic/${PREFIX}.v8profile.txt"

rm "$V8_FILE"
if [ -n "$OPT_SWITCH_BRANCH" ]; then
  git checkout -
fi
