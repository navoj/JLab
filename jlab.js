#!/usr/bin/env node
// jlab.js - Linux/Node.js equivalent of jlab.wsf + jshell.js
// Replaces: cscript + WScript APIs with Node.js built-in REPL

const repl = require('repl');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;

function loadFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, r.context);
}

// Start REPL with the same prompt as the original
const r = repl.start({ prompt: 'jscript> ' });

// 1. Numeric library
loadFile(path.join(dir, 'numeric-1.2.6.js'));

// 2. Initialise the help database before any help_data files
vm.runInContext('var _helpDb = [];', r.context);

// 3. Help data (category entries pushed into _helpDb)
const helpDataDir = path.join(dir, 'help_data');
const helpDataFiles = [
  'mathematical.js',
  'matrix_operations.js',
  'electrical_engineering.js',
  'quantum_physics.js',
  'chemistry.js',
  'utilities.js',
];
helpDataFiles.forEach(f => loadFile(path.join(helpDataDir, f)));

// 4. Help system engine (reads _helpDb)
loadFile(path.join(dir, 'lib', 'help.js'));

// 5. Physical constants (must precede all lib files that use them)
loadFile(path.join(dir, 'lib', 'constants.js'));

// 6. Function libraries
const libFiles = [
  'math.js',
  'matrix.js',
  'electrical.js',
  'quantum.js',
  'chemistry.js',
  'braid.js',
];
libFiles.forEach(f => {
  const p = path.join(dir, 'lib', f);
  if (fs.existsSync(p)) {
    loadFile(p);
  } else {
    console.warn('[jlab] Warning: ' + f + ' not found, skipping.');
  }
});

// 7. Expose print() as in the original jlab.wsf
r.context.print = (x) => console.log(x);
