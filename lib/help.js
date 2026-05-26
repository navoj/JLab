// lib/help.js — Help system for JLab
// Ported from JovansCalculator/help.lsp (Lisp → JavaScript)
// Functions: help(), helpFunction(n), helpCategory(name), helpSearch(kw),
//            listCategories(), listCategoriesOnly()

// _helpDb is populated by the help_data/*.js files loaded before this one.
if (typeof _helpDb === 'undefined') var _helpDb = [];

function _buildSortedHelp() {
  return [..._helpDb].sort(function(a, b) {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return  1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return  1;
    return 0;
  });
}

function help() {
  var sorted = _buildSortedHelp();
  console.log('\n============================================');
  console.log('         JLAB — HELP SYSTEM');
  console.log('============================================');
  console.log('Available Functions  (use helpFunction(n) for details)\n');

  var currentCategory = null;
  var index = 1;
  for (var i = 0; i < sorted.length; i++) {
    var fn = sorted[i];
    if (fn.category !== currentCategory) {
      if (currentCategory !== null) console.log('');
      console.log(fn.category + ':');
      currentCategory = fn.category;
    }
    console.log('  ' + String(index).padStart(3) + '. ' + fn.name);
    index++;
  }

  console.log('\n============================================');
  console.log('Commands:');
  console.log('  helpFunction(n)          — detailed help for function #n');
  console.log('  helpCategory("name")     — all functions in a category');
  console.log('  helpSearch("keyword")    — search names & descriptions');
  console.log('  listCategories()         — categories with counts');
  console.log('  listCategoriesOnly()     — category names only');
  console.log('============================================');
}

function helpFunction(index) {
  var sorted = _buildSortedHelp();
  if (typeof index !== 'number' || index < 1 || index > sorted.length) {
    console.log('Invalid index. Run help() to see the numbered list.');
    return;
  }
  var fn = sorted[index - 1];
  console.log('\n============================================');
  console.log('Function : ' + fn.name);
  console.log('Category : ' + fn.category);
  console.log('Params   : ' + fn.parameters);
  console.log('Lisp name: ' + fn.lispName);
  console.log('--------------------------------------------');
  console.log(fn.description);
  console.log('Example  : ' + fn.example);
  console.log('============================================');
}

function helpCategory(categoryName) {
  var sorted = _buildSortedHelp();
  console.log("\nFunctions in '" + categoryName + "':");
  console.log('============================================');
  var found = false;
  var index = 1;
  for (var i = 0; i < sorted.length; i++) {
    var fn = sorted[i];
    if (fn.category === categoryName) {
      console.log('  ' + String(index).padStart(3) + '. ' + fn.name + ' — ' + fn.description);
      found = true;
    }
    index++;
  }
  if (!found) console.log("No functions found in '" + categoryName + "'.");
  console.log('============================================');
}

function helpSearch(keyword) {
  var kw = keyword.toLowerCase();
  var sorted = _buildSortedHelp();
  console.log("\nSearch results for '" + keyword + "':");
  console.log('============================================');
  var found = false;
  var index = 1;
  for (var i = 0; i < sorted.length; i++) {
    var fn = sorted[i];
    if (fn.name.toLowerCase().includes(kw) ||
        fn.description.toLowerCase().includes(kw) ||
        (fn.lispName && fn.lispName.toLowerCase().includes(kw))) {
      console.log('  ' + String(index).padStart(3) + '. ' + fn.name + ' — ' + fn.description);
      found = true;
    }
    index++;
  }
  if (!found) console.log("No matches for '" + keyword + "'.");
  console.log('============================================');
}

function listCategories() {
  var counts = {};
  for (var i = 0; i < _helpDb.length; i++) {
    var cat = _helpDb[i].category;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  var cats = Object.keys(counts).sort();
  console.log('\nAvailable categories:');
  console.log('==========================================');
  for (var j = 0; j < cats.length; j++) {
    var n = counts[cats[j]];
    console.log('  * ' + cats[j] + ' (' + n + ' function' + (n === 1 ? '' : 's') + ')');
  }
  console.log('\nUse helpCategory("name") to see functions in a category.');
  console.log('Use listCategoriesOnly() for a simple category list.');
}

function listCategoriesOnly() {
  var seen = {};
  var cats = [];
  for (var i = 0; i < _helpDb.length; i++) {
    var cat = _helpDb[i].category;
    if (!seen[cat]) { seen[cat] = true; cats.push(cat); }
  }
  cats.sort();
  console.log('\nAvailable Categories:');
  console.log('=====================');
  for (var j = 0; j < cats.length; j++) console.log('  * ' + cats[j]);
  console.log('\nUse helpCategory("category-name") to see functions in a category.');
}
