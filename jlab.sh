#!/bin/bash
# jlab.sh - Linux equivalent of jlab.bat
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/jlab.js"
