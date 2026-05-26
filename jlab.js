#!/usr/bin/env node
// jlab.js - Linux/Node.js equivalent of jlab.wsf + jshell.js
// Replaces: cscript + WScript APIs with Node.js built-in REPL

const repl = require('repl');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;

// Start REPL with the same prompt as the original
const r = repl.start({ prompt: 'jscript> ' });

// Load numeric library into the REPL's execution context
const numericCode = fs.readFileSync(path.join(dir, 'numeric-1.2.6.js'), 'utf8');
vm.runInContext(numericCode, r.context);

// Expose print() as in the original jlab.wsf
r.context.print = (x) => console.log(x);
