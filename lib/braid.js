// lib/braid.js — Quantum Braiding / Topological functions for JLab
// Ported from JovansCalculator/nonAbelian-Braid-Statistics.lsp

// ── Pauli Matrices (complex entries as [re, im]) ──────────────────────────────

var sigma_x = [[{re:0,im:0},{re:1,im:0}],
               [{re:1,im:0},{re:0,im:0}]];

var sigma_y = [[{re:0,im:0},{re:0,im:-1}],
               [{re:0,im:1},{re:0,im:0}]];

var sigma_z = [[{re:1,im:0},{re:0,im:0}],
               [{re:0,im:0},{re:-1,im:0}]];

// Identity 2×2
var sigma_0 = [[{re:1,im:0},{re:0,im:0}],
               [{re:0,im:0},{re:1,im:0}]];

// ── Complex helpers (reused from quantum.js if available) ─────────────────────

function _cmul(a, b) { return { re: a.re*b.re - a.im*b.im, im: a.re*b.im + a.im*b.re }; }
function _cadd(a, b) { return { re: a.re+b.re, im: a.im+b.im }; }
function _cabs(a)    { return Math.sqrt(a.re*a.re + a.im*a.im); }
function _cconj(a)   { return { re: a.re, im: -a.im }; }
function _cscale(s, a){ return { re: s*a.re, im: s*a.im }; }
function _cexp(a)    {
  var eMag = Math.exp(a.re);
  return { re: eMag*Math.cos(a.im), im: eMag*Math.sin(a.im) };
}

// Matrix multiply of complex N×N matrices stored as arrays-of-arrays
function _cmatmul(A, B) {
  var n = A.length;
  var m = B[0].length;
  var k = B.length;
  var C = [];
  for (var i = 0; i < n; i++) {
    C[i] = [];
    for (var j = 0; j < m; j++) {
      var s = {re:0, im:0};
      for (var p = 0; p < k; p++) s = _cadd(s, _cmul(A[i][p], B[p][j]));
      C[i][j] = s;
    }
  }
  return C;
}

function _cmat_scale(s, M) {
  return M.map(function(row){ return row.map(function(e){ return _cscale(s, e); }); });
}

function _cmat_add(A, B) {
  return A.map(function(row, i){ return row.map(function(a, j){ return _cadd(a, B[i][j]); }); });
}

// Scalar complex × matrix (s may be a complex or plain number)
function _cscalar_mat(sc, M) {
  if (typeof sc === 'number') sc = {re:sc, im:0};
  return M.map(function(row){ return row.map(function(e){ return _cmul(sc, e); }); });
}

// Print complex matrix for display
function _print_cmat(M) {
  M.forEach(function(row){
    var s = row.map(function(e){
      var re = e.re.toFixed(4), im = Math.abs(e.im).toFixed(4);
      return '(' + re + (e.im < 0 ? '-' : '+') + im + 'i)';
    }).join('  ');
    console.log(s);
  });
}

// ── Braiding Matrices ─────────────────────────────────────────────────────────

function _make_braid_op(sigma_angle) {
  // R = exp(i*sigma_angle) * [[1,0],[0,exp(i*pi)]] generalised
  // For Fibonacci anyons the standard representation is used below
  var c = Math.cos(sigma_angle), s = Math.sin(sigma_angle);
  return [[{re:c,im:s},{re:0,im:0}],
          [{re:0,im:0},{re:c,im:s}]];
}

// Standard Fibonacci anyon braiding matrices (phi = golden ratio)
var _phi = (1 + Math.sqrt(5)) / 2;

// R-matrix eigenvalues for Fibonacci anyons: e^{4πi/5} and e^{-3πi/5}
var _r1 = _cexp({re:0, im: 4*Math.PI/5});
var _r2 = _cexp({re:0, im:-3*Math.PI/5});

// F-matrix for Fibonacci anyons (2×2 real, but store as complex)
var fibonacci_F_matrix = [
  [{re: 1/_phi,       im:0}, {re: 1/Math.sqrt(_phi), im:0}],
  [{re: 1/Math.sqrt(_phi), im:0}, {re:-1/_phi,       im:0}]
];

// Fusion matrix R for Fibonacci τ particles
var fibonacci_R_matrix = [
  [_r1,          {re:0,im:0}],
  [{re:0,im:0},  _r2]
];

function fibonacci_braid_matrix() {
  // B = F R F†  (in 2-anyon fusion space)
  var Fd = fibonacci_F_matrix.map(function(row, i){
    return fibonacci_F_matrix.map(function(col, j){ return _cconj(fibonacci_F_matrix[j][i]); });
  });
  return _cmatmul(_cmatmul(fibonacci_F_matrix, fibonacci_R_matrix), Fd);
}

function compute_topological_charge(braid_matrix) {
  // Phase of the top-left element encodes topological charge
  var z = braid_matrix[0][0];
  return Math.atan2(z.im, z.re);
}

function braid_exchange_phase(anyon_type, n_exchanges) {
  var phases = {
    'boson':   0,
    'fermion': Math.PI,
    'semion':  Math.PI / 2,
    'fibonacci': 4 * Math.PI / 5
  };
  var base = phases[anyon_type];
  if (base == null) throw new Error('Unknown anyon type: ' + anyon_type);
  return base * n_exchanges;
}

// ── Bell States (2-qubit) ─────────────────────────────────────────────────────

function bell_state(index) {
  var s = 1 / Math.sqrt(2);
  var states = {
    'phi_plus':  [s, 0, 0, s],   // (|00>+|11>)/√2
    'phi_minus': [s, 0, 0,-s],   // (|00>-|11>)/√2
    'psi_plus':  [0, s, s, 0],   // (|01>+|10>)/√2
    'psi_minus': [0, s,-s, 0]    // (|01>-|10>)/√2
  };
  var st = states[index];
  if (!st) throw new Error('Unknown Bell state: ' + index + '. Use phi_plus, phi_minus, psi_plus, psi_minus');
  return st;
}

// ── Quantum Gates ─────────────────────────────────────────────────────────────

function hadamard_gate() {
  var s = 1/Math.sqrt(2);
  return [[{re:s,im:0},{re:s,im:0}],
          [{re:s,im:0},{re:-s,im:0}]];
}

function phase_gate(theta) {
  return [[{re:1,im:0},{re:0,im:0}],
          [{re:0,im:0}, _cexp({re:0,im:theta})]];
}

function t_gate()  { return phase_gate(Math.PI/4); }
function s_gate()  { return phase_gate(Math.PI/2); }
function z_gate()  { return phase_gate(Math.PI); }

// Rotation gates
function rx_gate(theta) {
  var c = Math.cos(theta/2), s = Math.sin(theta/2);
  return [[{re:c,im:0},{re:0,im:-s}],
          [{re:0,im:-s},{re:c,im:0}]];
}
function ry_gate(theta) {
  var c = Math.cos(theta/2), s = Math.sin(theta/2);
  return [[{re:c,im:0},{re:-s,im:0}],
          [{re:s,im:0},{re:c,im:0}]];
}
function rz_gate(theta) {
  return [[_cexp({re:0,im:-theta/2}),{re:0,im:0}],
          [{re:0,im:0}, _cexp({re:0,im:theta/2})]];
}

// CNOT gate (4×4 complex)
function cnot_gate() {
  var z = {re:0,im:0}, o = {re:1,im:0};
  return [[o,z,z,z],
          [z,o,z,z],
          [z,z,z,o],
          [z,z,o,z]];
}

// Apply a 2×2 complex gate to a 2-element state vector [a, b]
function apply_gate(gate, state) {
  var a = typeof state[0] === 'number' ? {re:state[0],im:0} : state[0];
  var b = typeof state[1] === 'number' ? {re:state[1],im:0} : state[1];
  return [_cadd(_cmul(gate[0][0],a), _cmul(gate[0][1],b)),
          _cadd(_cmul(gate[1][0],a), _cmul(gate[1][1],b))];
}

// ── Von Neumann Entropy ───────────────────────────────────────────────────────

function von_neumann_entropy(eigenvalues) {
  // S = -Σ λ log₂(λ)   (for non-zero eigenvalues)
  return eigenvalues.reduce(function(s, lam) {
    if (lam <= 0) return s;
    return s - lam * Math.log2(lam);
  }, 0);
}

function qubit_state_entropy(alpha, beta) {
  // Single qubit density matrix eigenvalues
  var p = alpha * alpha;
  return von_neumann_entropy([p, 1 - p]);
}

// ── Gate Decomposition helper ─────────────────────────────────────────────────

function decompose_to_hadamard_t(gate_name) {
  // Returns string description of standard Hadamard+T decompositions
  var decomps = {
    'X':   'H T T T T H T T H',
    'Y':   'H T T T T H T T H S S',
    'Z':   'T T T T',
    'S':   'T T',
    'H':   'H'
  };
  var d = decomps[gate_name];
  if (!d) return 'No known Hadamard+T decomposition for ' + gate_name;
  return gate_name + ' ≈ ' + d;
}

// ── Topological Phase ─────────────────────────────────────────────────────────

function topological_phase_factor(anyon_type) {
  var phases = {
    'boson':    {re:1,im:0},
    'fermion':  {re:-1,im:0},
    'semion':   {re:0,im:1},
    'fibonacci': _cexp({re:0, im: 4*Math.PI/5})
  };
  var p = phases[anyon_type];
  if (!p) throw new Error('Unknown anyon type: ' + anyon_type);
  return p;
}

function print_braid_matrix(name, M) {
  console.log('--- ' + name + ' ---');
  _print_cmat(M);
}

function show_fibonacci_braiding() {
  var B = fibonacci_braid_matrix();
  print_braid_matrix('Fibonacci Braiding Matrix B = F·R·F†', B);
  console.log('Topological charge (rad): ' + compute_topological_charge(B).toFixed(6));
  return B;
}
