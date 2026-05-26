// matrix.js
// Matrix operations for Jovan's Calculator
// Ported from my-matrix.lsp (XLisp-Stat) to JavaScript
// Jovan Trujillo — Advanced Electronics and Photonics Core, Arizona State University
// Original Lisp: 2/2/2026  |  JS port: 2025
//
// Context: loaded into a Node.js REPL via vm.runInContext().
// All functions are global. The `numeric` library (numeric.js v1.2.6) is a global.
// Matrices are plain nested arrays (array of row-arrays).

// ============================================================
// HELPERS
// ============================================================

// Helper: create n×m matrix from flat 1D array (row-major)
function _make_matrix(n, m, flat) {
  const mat = [];
  for (let i = 0; i < n; i++) {
    mat.push(flat.slice(i * m, (i + 1) * m).map(x => +x));
  }
  return mat;
}

// Helper: deep copy a matrix
function _copy_matrix(mat) {
  return mat.map(row => [...row]);
}

// Helper: normal random number (Box-Muller transform)
function _normal_rand() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Helper: SVD wrapper — returns [U, S, V] matching XLisp (sv-decomp mat)
// numeric.svd returns {U, S, V} where S is a 1D array of singular values
function _sv_decomp(mat) {
  const result = numeric.svd(mat);
  return [result.U, result.S, result.V];
}

// Helper: Cholesky decomposition — returns lower triangular L s.t. L*L^T = mat
function _chol_decomp(mat) {
  const n = mat.length;
  const L = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const val = mat[i][i] - sum;
        if (val < 0) throw new Error('Matrix is not positive definite');
        L[i][j] = Math.sqrt(val);
      } else {
        L[i][j] = (mat[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

// Helper: QR decomposition via Gram-Schmidt — returns [Q, R]
function _qr_decomp(mat) {
  const n = mat.length;
  const m = mat[0].length;
  const cols = [];
  for (let j = 0; j < m; j++) cols.push(mat.map(row => row[j]));
  const qs = [];
  for (let j = 0; j < m; j++) {
    let u = [...cols[j]];
    for (let k = 0; k < j; k++) {
      const dot = qs[k].reduce((acc, v, i) => acc + v * u[i], 0);
      u = u.map((v, i) => v - dot * qs[k][i]);
    }
    const norm = Math.sqrt(u.reduce((acc, v) => acc + v * v, 0));
    qs.push(norm > 1e-15 ? u.map(v => v / norm) : u.map(() => 0));
  }
  // Build Q (n×m): columns are qs
  const Q = Array.from({length: n}, (_, i) =>
    Array.from({length: m}, (_, j) => qs[j][i]));
  // Build R (m×m)
  const R = Array.from({length: m}, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = i; j < m; j++)
      R[i][j] = qs[i].reduce((acc, v, k) => acc + v * cols[j][k], 0);
  return [Q, R];
}

// Helper: LU decomposition with partial pivoting — returns [L, U, pivot]
function _lu_decomp(mat) {
  const n = mat.length;
  const L = identity_matrix(n);
  const U = _copy_matrix(mat);
  const pivot = Array.from({length: n}, (_, i) => i);
  for (let k = 0; k < n; k++) {
    let maxVal = Math.abs(U[k][k]), maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[i][k]) > maxVal) { maxVal = Math.abs(U[i][k]); maxRow = i; }
    }
    if (maxRow !== k) {
      [U[k], U[maxRow]] = [U[maxRow], U[k]];
      [pivot[k], pivot[maxRow]] = [pivot[maxRow], pivot[k]];
      for (let j = 0; j < k; j++) [L[k][j], L[maxRow][j]] = [L[maxRow][j], L[k][j]];
    }
    if (Math.abs(U[k][k]) < 1e-15) continue;
    for (let i = k + 1; i < n; i++) {
      L[i][k] = U[i][k] / U[k][k];
      for (let j = k; j < n; j++) U[i][j] -= L[i][k] * U[k][j];
    }
  }
  return [L, U, pivot];
}

// Helper: eigenvalues (real parts) using numeric.eig
function _eigenvalues(mat) {
  try {
    const eig = numeric.eig(mat);
    return eig.lambda.x;
  } catch (e) {
    return [];
  }
}

// ============================================================
// TOP-LEVEL make-matrix / display-matrix-subset
// ============================================================

function make_matrix(n, m, my_list) {
  // Create a matrix with n rows and m columns from my_list data.
  return _make_matrix(n, m, my_list);
}

function display_matrix_subset(start_i, end_i, start_j, end_j, my_matrix) {
  // Loop through the desired range and give matrix element output.
  const inum = end_i - start_i;
  const jnum = end_j - start_j;
  for (let ii = 0; ii < inum; ii++) {
    process.stdout.write('\n');
    for (let jj = 0; jj < jnum; jj++) {
      const i = start_i + ii;
      const j = start_j + jj;
      process.stdout.write(my_matrix[i][j] + ' ');
    }
  }
}

// ============================================================
// 1. MATRIX CREATION & INITIALIZATION
// ============================================================

function identity_matrix(n) {
  // Create an n x n identity matrix.
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => i === j ? 1 : 0));
}

function zero_matrix(n, m) {
  // Create an n x m matrix of zeros.
  return Array.from({length: n}, () => new Array(m).fill(0));
}

function ones_matrix(n, m) {
  // Create an n x m matrix of ones.
  return Array.from({length: n}, () => new Array(m).fill(1));
}

function diagonal_matrix(diag_list) {
  // Create a square diagonal matrix from a list of diagonal entries.
  const n = diag_list.length;
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => i === j ? +diag_list[i] : 0));
}

function random_matrix(n, m) {
  // Create an n x m matrix with uniform random entries in [0,1).
  return Array.from({length: n}, () =>
    Array.from({length: m}, () => Math.random()));
}

function random_normal_matrix(n, m) {
  // Create an n x m matrix with standard normal random entries.
  return Array.from({length: n}, () =>
    Array.from({length: m}, () => _normal_rand()));
}

function constant_matrix(n, m, val) {
  // Create an n x m matrix filled with constant value val.
  return Array.from({length: n}, () => new Array(m).fill(val));
}

function matrix_from_rows(row_lists) {
  // Create a matrix from a list of row lists.
  return row_lists.map(row => [...row].map(x => +x));
}

function matrix_from_columns(col_lists) {
  // Create a matrix from a list of column lists.
  const m = col_lists.length;
  const n = col_lists[0].length;
  return Array.from({length: n}, (_, i) =>
    Array.from({length: m}, (_, j) => +col_lists[j][i]));
}

function copy_matrix(mat) {
  // Create a deep copy of a matrix.
  return _copy_matrix(mat);
}

function hilbert_matrix(n) {
  // Create an n x n Hilbert matrix: H(i,j) = 1/(i+j+1).
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => 1.0 / (i + j + 1)));
}

function vandermonde_matrix(vec) {
  // Create a Vandermonde matrix from a vector (list).
  const n = vec.length;
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => Math.pow(vec[i], j)));
}

function toeplitz_matrix(first_row) {
  // Create a symmetric Toeplitz matrix from its first row.
  const n = first_row.length;
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => first_row[Math.abs(i - j)]));
}

function companion_matrix(coeffs) {
  // Create a companion matrix for a monic polynomial with given coefficients
  // (lowest degree first, excluding leading 1).
  const n = coeffs.length;
  const mat = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n - 1; i++) mat[i + 1][i] = 1;
  for (let i = 0; i < n; i++) mat[i][n - 1] = -coeffs[i];
  return mat;
}

function exchange_matrix(n) {
  // Create an n x n exchange (reversal) matrix.
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => j === n - 1 - i ? 1 : 0));
}

function circulant_matrix(first_row) {
  // Create a circulant matrix from its first row.
  const n = first_row.length;
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => first_row[((j - i) % n + n) % n]));
}

function tridiagonal_matrix(n, lower, main, upper) {
  // Create an n x n tridiagonal matrix with given diagonal values.
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => {
      if (i === j) return main;
      if (j === i + 1) return upper;
      if (j === i - 1) return lower;
      return 0;
    }));
}

function upper_triangular_from_list(n, vals) {
  // Create an n x n upper triangular matrix from a flat list of upper entries.
  const mat = Array.from({length: n}, () => new Array(n).fill(0));
  let idx = 0;
  for (let i = 0; i < n; i++)
    for (let j = i; j < n; j++)
      mat[i][j] = +vals[idx++];
  return mat;
}

function lower_triangular_from_list(n, vals) {
  // Create an n x n lower triangular matrix from a flat list of lower entries.
  const mat = Array.from({length: n}, () => new Array(n).fill(0));
  let idx = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++)
      mat[i][j] = +vals[idx++];
  return mat;
}

function block_diagonal_matrix(matrices) {
  // Create a block diagonal matrix from a list of square matrices.
  const sizes = matrices.map(m => m.length);
  const total = sizes.reduce((a, b) => a + b, 0);
  const result = Array.from({length: total}, () => new Array(total).fill(0));
  let offset = 0;
  for (const mat of matrices) {
    const sz = mat.length;
    for (let i = 0; i < sz; i++)
      for (let j = 0; j < sz; j++)
        result[offset + i][offset + j] = mat[i][j];
    offset += sz;
  }
  return result;
}

function augmented_matrix(mat, vec) {
  // Create an augmented matrix [A|b] from matrix A and vector b.
  return mat.map((row, i) => [...row, vec[i]]);
}

function hankel_matrix(first_col) {
  // Create a Hankel matrix from its first column (anti-diagonal constant).
  const n = first_col.length;
  const extended = [...first_col, ...new Array(n - 1).fill(0)];
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => extended[i + j]));
}

function sparse_to_dense(n, m, triplets) {
  // Create an n x m matrix from a list of (row col value) triplets.
  const mat = Array.from({length: n}, () => new Array(m).fill(0));
  for (const [r, c, v] of triplets) mat[r][c] = v;
  return mat;
}

function range_vector(start, end, step = 1) {
  // Create a list (vector) from start to end (exclusive) with given step.
  const result = [];
  for (let x = start; x < end; x += step) result.push(x);
  return result;
}

function linspace_vector(start, end, n) {
  // Create a list of n evenly spaced values from start to end (inclusive).
  if (n <= 1) return [start];
  const step = (end - start) / (n - 1);
  return Array.from({length: n}, (_, i) => start + i * step);
}

// ============================================================
// 2. MATRIX PROPERTIES & QUERIES
// ============================================================

function matrix_rows(mat) {
  // Return the number of rows in a matrix.
  return mat.length;
}

function matrix_cols(mat) {
  // Return the number of columns in a matrix.
  return mat[0].length;
}

function matrix_dimensions(mat) {
  // Return a list (rows cols) of matrix dimensions.
  return [mat.length, mat[0].length];
}

function matrix_element(mat, i, j) {
  // Return the element at row i, column j of the matrix.
  return mat[i][j];
}

function matrix_set_element(mat, i, j, val) {
  // Set the element at row i, column j to val. Returns the modified matrix.
  const result = _copy_matrix(mat);
  result[i][j] = val;
  return result;
}

function matrix_trace(mat) {
  // Calculate the trace (sum of diagonal elements) of a square matrix.
  const n = Math.min(mat.length, mat[0].length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += mat[i][i];
  return sum;
}

function matrix_rank_estimate(mat, tol = 1e-10) {
  // Estimate the rank of a matrix using SVD singular values.
  const S = _sv_decomp(mat)[1];
  return S.filter(s => Math.abs(s) > tol).length;
}

function matrix_determinant(mat) {
  // Calculate the determinant of a square matrix.
  return numeric.det(mat);
}

function is_square_p(mat) {
  // Check if a matrix is square.
  return mat.length === mat[0].length;
}

function is_symmetric_p(mat, tol = 1e-10) {
  // Check if a matrix is symmetric within tolerance.
  const n = mat.length, m = mat[0].length;
  if (n !== m) return false;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (Math.abs(mat[i][j] - mat[j][i]) > tol) return false;
  return true;
}

function is_diagonal_p(mat, tol = 1e-10) {
  // Check if a matrix is diagonal within tolerance.
  const n = mat.length, m = mat[0].length;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      if (i !== j && Math.abs(mat[i][j]) > tol) return false;
  return true;
}

function is_upper_triangular_p(mat, tol = 1e-10) {
  // Check if a matrix is upper triangular within tolerance.
  const n = mat.length, m = mat[0].length;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < Math.min(i, m); j++)
      if (Math.abs(mat[i][j]) > tol) return false;
  return true;
}

function is_lower_triangular_p(mat, tol = 1e-10) {
  // Check if a matrix is lower triangular within tolerance.
  const n = mat.length, m = mat[0].length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < m; j++)
      if (Math.abs(mat[i][j]) > tol) return false;
  return true;
}

function is_identity_p(mat, tol = 1e-10) {
  // Check if a matrix is an identity matrix within tolerance.
  const n = mat.length, m = mat[0].length;
  if (n !== m) return false;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const expected = i === j ? 1 : 0;
      if (Math.abs(mat[i][j] - expected) > tol) return false;
    }
  return true;
}

function is_orthogonal_p(mat, tol = 1e-10) {
  // Check if a matrix is orthogonal: A^T * A = I.
  return is_identity_p(numeric.dot(numeric.transpose(mat), mat), tol);
}

function is_positive_definite_p(mat) {
  // Check if a symmetric matrix is positive definite via Cholesky attempt.
  try { _chol_decomp(mat); return true; } catch (e) { return false; }
}

function is_singular_p(mat, tol = 1e-10) {
  // Check if a matrix is singular (determinant near zero).
  return Math.abs(numeric.det(mat)) < tol;
}

function is_nilpotent_p(mat, k) {
  // Check if A^k = 0 for given k.
  const result = matrix_power(mat, k);
  const n = mat.length;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (Math.abs(result[i][j]) > 1e-10) return false;
  return true;
}

function is_involutory_p(mat, tol = 1e-10) {
  // Check if A^2 = I (matrix is its own inverse).
  return is_identity_p(numeric.dot(mat, mat), tol);
}

function is_idempotent_p(mat, tol = 1e-10) {
  // Check if A^2 = A.
  const a2 = numeric.dot(mat, mat);
  const n = mat.length, m = mat[0].length;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      if (Math.abs(a2[i][j] - mat[i][j]) > tol) return false;
  return true;
}

// ============================================================
// 3. BASIC MATRIX ARITHMETIC
// ============================================================

function matrix_add(a, b) {
  // Add two matrices element-wise.
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

function matrix_subtract(a, b) {
  // Subtract matrix b from matrix a element-wise.
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

function matrix_scale(scalar, mat) {
  // Multiply every element of a matrix by a scalar.
  return mat.map(row => row.map(v => scalar * v));
}

function matrix_multiply(a, b) {
  // Multiply two matrices using numeric.dot.
  return numeric.dot(a, b);
}

function matrix_transpose(mat) {
  // Transpose a matrix.
  return numeric.transpose(mat);
}

function matrix_inverse(mat) {
  // Compute the inverse of a square matrix.
  return numeric.inv(mat);
}

function matrix_negate(mat) {
  // Negate all elements of a matrix.
  return matrix_scale(-1, mat);
}

function matrix_element_multiply(a, b) {
  // Hadamard (element-wise) product of two matrices.
  return a.map((row, i) => row.map((v, j) => v * b[i][j]));
}

function matrix_element_divide(a, b) {
  // Element-wise division of matrix a by matrix b.
  return a.map((row, i) => row.map((v, j) => v / b[i][j]));
}

function matrix_element_add_scalar(mat, s) {
  // Add scalar s to every element of a matrix.
  return mat.map(row => row.map(v => v + s));
}

function matrix_element_power(mat, p) {
  // Raise every element of a matrix to power p.
  return mat.map(row => row.map(v => Math.pow(v, p)));
}

function matrix_element_sqrt(mat) {
  // Take the square root of every element of a matrix.
  return matrix_element_power(mat, 0.5);
}

function matrix_element_abs(mat) {
  // Take the absolute value of every element of a matrix.
  return mat.map(row => row.map(v => Math.abs(v)));
}

function matrix_element_max(a, b) {
  // Element-wise maximum of two matrices.
  return a.map((row, i) => row.map((v, j) => Math.max(v, b[i][j])));
}

function matrix_element_min(a, b) {
  // Element-wise minimum of two matrices.
  return a.map((row, i) => row.map((v, j) => Math.min(v, b[i][j])));
}

function matrix_power(mat, n) {
  // Raise a square matrix to the nth power (non-negative integer).
  if (n === 0) return identity_matrix(mat.length);
  if (n === 1) return _copy_matrix(mat);
  let result = identity_matrix(mat.length);
  for (let i = 0; i < n; i++) result = numeric.dot(result, mat);
  return result;
}

function matrix_square(mat) {
  // Compute A^2 = A * A.
  return numeric.dot(mat, mat);
}

function matrix_cube(mat) {
  // Compute A^3 = A * A * A.
  return numeric.dot(numeric.dot(mat, mat), mat);
}

function commutator(a, b) {
  // Compute the commutator [A, B] = AB - BA.
  return matrix_subtract(numeric.dot(a, b), numeric.dot(b, a));
}

function anticommutator(a, b) {
  // Compute the anticommutator {A, B} = AB + BA.
  return matrix_add(numeric.dot(a, b), numeric.dot(b, a));
}

// ============================================================
// 4. ROW & COLUMN OPERATIONS
// ============================================================

function matrix_row(mat, i) {
  // Extract row i of a matrix as a list.
  return [...mat[i]];
}

function matrix_column(mat, j) {
  // Extract column j of a matrix as a list.
  return mat.map(row => row[j]);
}

function matrix_diagonal(mat) {
  // Extract the main diagonal of a matrix as a list.
  const n = Math.min(mat.length, mat[0].length);
  return Array.from({length: n}, (_, i) => mat[i][i]);
}

function matrix_set_row(mat, i, row) {
  // Return a new matrix with row i replaced by the given row list.
  const result = _copy_matrix(mat);
  for (let j = 0; j < mat[0].length; j++) result[i][j] = row[j];
  return result;
}

function matrix_set_column(mat, j, col) {
  // Return a new matrix with column j replaced by the given column list.
  const result = _copy_matrix(mat);
  for (let i = 0; i < mat.length; i++) result[i][j] = col[i];
  return result;
}

function matrix_swap_rows(mat, i1, i2) {
  // Return a new matrix with rows i1 and i2 swapped.
  const result = _copy_matrix(mat);
  [result[i1], result[i2]] = [result[i2], result[i1]];
  return result;
}

function matrix_swap_columns(mat, j1, j2) {
  // Return a new matrix with columns j1 and j2 swapped.
  const result = _copy_matrix(mat);
  for (let i = 0; i < mat.length; i++) {
    const tmp = result[i][j1];
    result[i][j1] = result[i][j2];
    result[i][j2] = tmp;
  }
  return result;
}

function matrix_scale_row(mat, i, scalar) {
  // Return a new matrix with row i scaled by scalar.
  const result = _copy_matrix(mat);
  for (let j = 0; j < mat[0].length; j++) result[i][j] *= scalar;
  return result;
}

function matrix_add_scaled_row(mat, target_i, source_i, scalar) {
  // Return a new matrix with row target_i += scalar * row source_i.
  const result = _copy_matrix(mat);
  for (let j = 0; j < mat[0].length; j++)
    result[target_i][j] += scalar * result[source_i][j];
  return result;
}

function matrix_delete_row(mat, i) {
  // Return a new matrix with row i removed.
  return mat.filter((_, r) => r !== i).map(row => [...row]);
}

function matrix_delete_column(mat, j) {
  // Return a new matrix with column j removed.
  return mat.map(row => row.filter((_, c) => c !== j));
}

function matrix_insert_row(mat, i, row) {
  // Return a new matrix with row inserted at position i.
  const n = mat.length;
  const result = [];
  for (let r = 0; r <= n; r++) {
    if (r === i) {
      result.push([...row].map(x => +x));
    } else {
      const src_r = r < i ? r : r - 1;
      result.push([...mat[src_r]]);
    }
  }
  return result;
}

function matrix_insert_column(mat, j, col) {
  // Return a new matrix with column inserted at position j.
  const n = mat.length, m = mat[0].length;
  return Array.from({length: n}, (_, r) => {
    const newRow = [];
    for (let c = 0; c <= m; c++) {
      if (c === j) newRow.push(+col[r]);
      else newRow.push(mat[r][c < j ? c : c - 1]);
    }
    return newRow;
  });
}

function matrix_submatrix(mat, r1, r2, c1, c2) {
  // Extract submatrix from rows [r1,r2) and columns [c1,c2).
  const result = [];
  for (let i = r1; i < r2; i++) {
    const row = [];
    for (let j = c1; j < c2; j++) row.push(mat[i][j]);
    result.push(row);
  }
  return result;
}

function matrix_upper_triangular(mat) {
  // Extract the upper triangular part of a matrix (including diagonal).
  return mat.map((row, i) => row.map((v, j) => j >= i ? v : 0));
}

function matrix_lower_triangular(mat) {
  // Extract the lower triangular part of a matrix (including diagonal).
  return mat.map((row, i) => row.map((v, j) => j <= i ? v : 0));
}

function matrix_strict_upper(mat) {
  // Extract the strictly upper triangular part (above diagonal).
  return mat.map((row, i) => row.map((v, j) => j > i ? v : 0));
}

function matrix_strict_lower(mat) {
  // Extract the strictly lower triangular part (below diagonal).
  return mat.map((row, i) => row.map((v, j) => j < i ? v : 0));
}

function matrix_flatten(mat) {
  // Flatten a matrix into a single list (row-major order).
  return mat.reduce((acc, row) => acc.concat(row), []);
}

function matrix_reshape(mat, n, m) {
  // Reshape a matrix to new dimensions n x m (total elements must match).
  return _make_matrix(n, m, matrix_flatten(mat));
}

// ============================================================
// 5. MATRIX DECOMPOSITIONS
// ============================================================

function lu_decomposition(mat) {
  // Compute LU decomposition. Returns list (L U pivot).
  return _lu_decomp(mat);
}

function qr_decomposition(mat) {
  // Compute QR decomposition. Returns list (Q R).
  return _qr_decomp(mat);
}

function cholesky_decomposition(mat) {
  // Compute Cholesky decomposition of a positive definite matrix. Returns lower triangular L.
  return _chol_decomp(mat);
}

function svd_decomposition(mat) {
  // Compute Singular Value Decomposition. Returns list (U S V).
  return _sv_decomp(mat);
}

function eigen_decomposition(mat) {
  // Compute eigenvalues and eigenvectors. Returns list (eigenvalues mat).
  const evals = _eigenvalues(mat);
  return [evals, mat];
}

function eigenvalues_of(mat) {
  // Compute the eigenvalues of a square matrix.
  return _eigenvalues(mat);
}

function eigenvectors_of(mat) {
  // Estimate eigenvectors using the SVD of (A - lambda*I) for each eigenvalue.
  const evals = _eigenvalues(mat);
  const n = mat.length;
  const evecs = [];
  for (const ev of evals) {
    const shifted = matrix_subtract(mat, matrix_scale(ev, identity_matrix(n)));
    const svd_result = _sv_decomp(shifted);
    const v_mat = svd_result[2];
    const last_col = [];
    for (let i = 0; i < n; i++) last_col.push(v_mat[i][n - 1]);
    evecs.push(last_col);
  }
  return evecs;
}

function singular_values(mat) {
  // Extract the singular values of a matrix.
  return _sv_decomp(mat)[1];
}

function left_singular_vectors(mat) {
  // Extract the left singular vectors (U matrix) from SVD.
  return _sv_decomp(mat)[0];
}

function right_singular_vectors(mat) {
  // Extract the right singular vectors (V matrix) from SVD.
  return _sv_decomp(mat)[2];
}

function matrix_diagonalize(mat) {
  // Attempt to diagonalize a matrix: return (mat D) where D is diagonal of eigenvalues.
  const evals = _eigenvalues(mat);
  const d = diagonal_matrix(evals);
  return [mat, d];
}

function schur_decomposition(mat) {
  // Approximate Schur decomposition using QR iteration.
  // Returns list (Q T) where T is quasi upper-triangular.
  const n = mat.length;
  let q_accum = identity_matrix(n);
  let a = _copy_matrix(mat);
  for (let iter = 0; iter < 100; iter++) {
    const qr = _qr_decomp(a);
    const q_step = qr[0], r_step = qr[1];
    a = numeric.dot(r_step, q_step);
    q_accum = numeric.dot(q_accum, q_step);
  }
  return [q_accum, a];
}

function hessenberg_form(mat) {
  // Reduce a matrix to upper Hessenberg form using Householder reflections.
  // Returns list (Q H) where A = Q*H*Q^T.
  const n = mat.length;
  let h = _copy_matrix(mat);
  let q_accum = identity_matrix(n);
  for (let k = 0; k < n - 2; k++) {
    const col = [];
    for (let i = k + 1; i < n; i++) col.push(h[i][k]);
    const alpha = Math.sqrt(col.reduce((acc, x) => acc + x * x, 0));
    const sign = col[0] >= 0 ? 1 : -1;
    const v = [...col];
    v[0] += sign * alpha;
    const vNorm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
    if (vNorm <= 1e-15) continue;
    const vn = v.map(x => x / vNorm);
    // Apply H from left: h[k+1:n, :] -= 2*vn*(vn^T * h[k+1:n, :])
    for (let j = 0; j < n; j++) {
      let dot = 0;
      for (let p = 0; p < vn.length; p++) dot += vn[p] * h[k + 1 + p][j];
      for (let p = 0; p < vn.length; p++) h[k + 1 + p][j] -= 2 * vn[p] * dot;
    }
    // Apply H from right: h[:, k+1:n] -= 2*(h[:, k+1:n]*vn)*vn^T
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let p = 0; p < vn.length; p++) dot += h[i][k + 1 + p] * vn[p];
      for (let p = 0; p < vn.length; p++) h[i][k + 1 + p] -= 2 * dot * vn[p];
    }
    // Accumulate Q
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let p = 0; p < vn.length; p++) dot += q_accum[i][k + 1 + p] * vn[p];
      for (let p = 0; p < vn.length; p++) q_accum[i][k + 1 + p] -= 2 * dot * vn[p];
    }
  }
  return [q_accum, h];
}

function polar_decomposition(mat) {
  // Compute polar decomposition A = U*P where U is unitary and P is positive semi-definite.
  // Uses SVD: A = Usvd*S*V^T => U = Usvd*V^T, P = V*S*V^T.
  const svd = _sv_decomp(mat);
  const u_svd = svd[0], s_vals = svd[1], v_mat = svd[2];
  const u_polar = numeric.dot(u_svd, numeric.transpose(v_mat));
  const p_polar = numeric.dot(v_mat, numeric.dot(diagonal_matrix(s_vals), numeric.transpose(v_mat)));
  return [u_polar, p_polar];
}

function spectral_decomposition(mat) {
  // Compute spectral decomposition of a symmetric matrix.
  // Returns list of (eigenvalue eigenvector) pairs.
  const evals = _eigenvalues(mat);
  const evecs = eigenvectors_of(mat);
  return evals.map((ev, i) => [ev, evecs[i]]);
}

// ============================================================
// 6. SOLVING LINEAR SYSTEMS
// ============================================================

function solve_system(a, b) {
  // Solve the linear system Ax = b. b can be a list or column matrix.
  return numeric.solve(a, b);
}

function solve_upper_triangular(u, b) {
  // Solve an upper triangular system Ux = b by back-substitution.
  const n = u.length;
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) sum -= u[i][j] * x[j];
    x[i] = sum / u[i][i];
  }
  return x;
}

function solve_lower_triangular(l, b) {
  // Solve a lower triangular system Lx = b by forward-substitution.
  const n = l.length;
  const x = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let j = 0; j < i; j++) sum -= l[i][j] * x[j];
    x[i] = sum / l[i][i];
  }
  return x;
}

function gaussian_elimination(mat) {
  // Perform Gaussian elimination to produce an upper triangular matrix.
  const n = mat.length, m = mat[0].length;
  const result = _copy_matrix(mat);
  const minNM = Math.min(n, m);
  for (let k = 0; k < minNM; k++) {
    let maxVal = Math.abs(result[k][k]), maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(result[i][k]) > maxVal) { maxVal = Math.abs(result[i][k]); maxRow = i; }
    }
    if (maxRow !== k) [result[k], result[maxRow]] = [result[maxRow], result[k]];
    if (Math.abs(result[k][k]) > 1e-15) {
      for (let i = k + 1; i < n; i++) {
        const factor = result[i][k] / result[k][k];
        for (let j = 0; j < m; j++) result[i][j] -= factor * result[k][j];
      }
    }
  }
  return result;
}

function gauss_jordan_elimination(mat) {
  // Perform Gauss-Jordan elimination to reduced row echelon form.
  const n = mat.length, m = mat[0].length;
  const result = _copy_matrix(mat);
  let pivot_col = 0;
  for (let pivot_row = 0; pivot_row < n; pivot_row++) {
    if (pivot_col >= m) break;
    let found = -1;
    for (let i = pivot_row; i < n; i++) {
      if (Math.abs(result[i][pivot_col]) > 1e-15) { found = i; break; }
    }
    if (found >= 0) {
      if (found !== pivot_row) [result[pivot_row], result[found]] = [result[found], result[pivot_row]];
      const pv = result[pivot_row][pivot_col];
      for (let j = 0; j < m; j++) result[pivot_row][j] /= pv;
      for (let i = 0; i < n; i++) {
        if (i !== pivot_row) {
          const factor = result[i][pivot_col];
          for (let j = 0; j < m; j++) result[i][j] -= factor * result[pivot_row][j];
        }
      }
    }
    pivot_col++;
  }
  return result;
}

function row_echelon_form(mat) {
  // Compute row echelon form of a matrix.
  return gaussian_elimination(mat);
}

function reduced_row_echelon_form(mat) {
  // Compute reduced row echelon form (RREF) of a matrix.
  return gauss_jordan_elimination(mat);
}

function least_squares_solve(a, b) {
  // Solve the least squares problem min ||Ax - b||^2.
  // Solution: x = (A^T A)^-1 A^T b.
  const at = numeric.transpose(a);
  const ata = numeric.dot(at, a);
  const atb = numeric.dot(at, matrix_from_columns([b]));
  return numeric.solve(ata, atb);
}

function weighted_least_squares(a, b, w) {
  // Solve weighted least squares: min (Ax-b)^T W (Ax-b).
  // w is a list of weights (diagonal of W).
  const w_mat = diagonal_matrix(w);
  const at = numeric.transpose(a);
  const atwa = numeric.dot(at, numeric.dot(w_mat, a));
  const atwb = numeric.dot(at, numeric.dot(w_mat, matrix_from_columns([b])));
  return numeric.solve(atwa, atwb);
}

function tikhonov_regularization(a, b, lambda_val) {
  // Solve Tikhonov-regularized least squares: min ||Ax-b||^2 + lambda*||x||^2.
  // Solution: x = (A^T A + lambda*I)^-1 A^T b.
  const at = numeric.transpose(a);
  const ata = numeric.dot(at, a);
  const n = a[0].length;
  const reg = matrix_scale(lambda_val, identity_matrix(n));
  const lhs = matrix_add(ata, reg);
  const rhs = numeric.dot(at, matrix_from_columns([b]));
  return numeric.solve(lhs, rhs);
}

function cramers_rule_2x2(a, b) {
  // Solve a 2x2 system Ax = b using Cramer's rule.
  const det_a = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  const det_x1 = b[0] * a[1][1] - a[0][1] * b[1];
  const det_x2 = a[0][0] * b[1] - b[0] * a[1][0];
  return [det_x1 / det_a, det_x2 / det_a];
}

function cramers_rule_3x3(a, b) {
  // Solve a 3x3 system Ax = b using Cramer's rule.
  const det_a = numeric.det(a);
  const results = [];
  for (let col = 0; col < 3; col++) {
    const modified = _copy_matrix(a);
    for (let row = 0; row < 3; row++) modified[row][col] = b[row];
    results.push(numeric.det(modified) / det_a);
  }
  return results;
}

function iterative_jacobi(a, b, tol = 1e-8, max_iter = 1000) {
  // Solve Ax = b using Jacobi iterative method.
  const n = a.length;
  let x = new Array(n).fill(0.0);
  for (let iter = 0; iter < max_iter; iter++) {
    const x_new = new Array(n).fill(0.0);
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) if (i !== j) sum -= a[i][j] * x[j];
      x_new[i] = sum / a[i][i];
    }
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(x_new[i] - x[i]);
    x = x_new;
    if (diff < tol) return x;
  }
  return x;
}

function iterative_gauss_seidel(a, b, tol = 1e-8, max_iter = 1000) {
  // Solve Ax = b using Gauss-Seidel iterative method.
  const n = a.length;
  let x = new Array(n).fill(0.0);
  for (let iter = 0; iter < max_iter; iter++) {
    const x_old = [...x];
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) if (i !== j) sum -= a[i][j] * x[j];
      x[i] = sum / a[i][i];
    }
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(x[i] - x_old[i]);
    if (diff < tol) return x;
  }
  return x;
}

function conjugate_gradient_solve(a, b, tol = 1e-8, max_iter = 1000) {
  // Solve symmetric positive definite system Ax = b using conjugate gradient method.
  const n = b.length;
  let x = new Array(n).fill(0.0);
  let r = [...b];
  let p = [...b];
  let rs_old = r.reduce((acc, ri) => acc + ri * ri, 0);
  for (let iter = 0; iter < max_iter; iter++) {
    const ap = new Array(n).fill(0.0);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        ap[i] += a[i][j] * p[j];
    const pap = p.reduce((acc, pi, i) => acc + pi * ap[i], 0);
    const alpha = rs_old / pap;
    x = x.map((xi, i) => xi + alpha * p[i]);
    r = r.map((ri, i) => ri - alpha * ap[i]);
    const rs_new = r.reduce((acc, ri) => acc + ri * ri, 0);
    if (Math.sqrt(rs_new) < tol) return x;
    const beta = rs_new / rs_old;
    p = r.map((ri, i) => ri + beta * p[i]);
    rs_old = rs_new;
  }
  return x;
}

// ============================================================
// 7. NORMS & METRICS
// ============================================================

function vector_norm_1(v) {
  // Compute the L1 norm (Manhattan norm) of a vector (list).
  return v.reduce((acc, x) => acc + Math.abs(x), 0);
}

function vector_norm_2(v) {
  // Compute the L2 norm (Euclidean norm) of a vector (list).
  return Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
}

function vector_norm_inf(v) {
  // Compute the L-infinity norm (max absolute value) of a vector.
  return v.reduce((acc, x) => Math.max(acc, Math.abs(x)), 0);
}

function vector_norm_p(v, p) {
  // Compute the Lp norm of a vector.
  return Math.pow(v.reduce((acc, x) => acc + Math.pow(Math.abs(x), p), 0), 1.0 / p);
}

function frobenius_norm(mat) {
  // Compute the Frobenius norm of a matrix: sqrt(sum of squares of all elements).
  let sum = 0;
  for (const row of mat) for (const v of row) sum += v * v;
  return Math.sqrt(sum);
}

function matrix_norm_1(mat) {
  // Compute the 1-norm (max column sum of absolute values).
  const m = mat[0].length;
  let maxSum = 0;
  for (let j = 0; j < m; j++) {
    const colSum = mat.reduce((acc, row) => acc + Math.abs(row[j]), 0);
    if (colSum > maxSum) maxSum = colSum;
  }
  return maxSum;
}

function matrix_norm_inf(mat) {
  // Compute the infinity-norm (max row sum of absolute values).
  return mat.reduce((maxSum, row) => {
    const rowSum = row.reduce((acc, v) => acc + Math.abs(v), 0);
    return Math.max(maxSum, rowSum);
  }, 0);
}

function spectral_norm(mat) {
  // Compute the spectral norm (largest singular value).
  const s_vals = singular_values(mat);
  return s_vals.reduce((acc, s) => Math.max(acc, Math.abs(s)), 0);
}

function condition_number(mat) {
  // Compute the condition number using singular values (ratio of largest to smallest).
  const s_vals = singular_values(mat).map(Math.abs);
  const s_max = Math.max(...s_vals);
  const s_min = Math.min(...s_vals);
  return s_min < 1e-15 ? Number.MAX_SAFE_INTEGER : s_max / s_min;
}

function matrix_distance(a, b) {
  // Compute the Frobenius distance between two matrices.
  return frobenius_norm(matrix_subtract(a, b));
}

function vector_distance(u, v) {
  // Compute the Euclidean distance between two vectors (lists).
  return vector_norm_2(u.map((ui, i) => ui - v[i]));
}

function cosine_similarity(u, v) {
  // Compute the cosine similarity between two vectors.
  const dot = u.reduce((acc, ui, i) => acc + ui * v[i], 0);
  return dot / (vector_norm_2(u) * vector_norm_2(v));
}

function angle_between_vectors(u, v) {
  // Compute the angle (in radians) between two vectors.
  return Math.acos(Math.min(1.0, Math.max(-1.0, cosine_similarity(u, v))));
}

function matrix_sparsity(mat, tol = 1e-15) {
  // Compute the sparsity ratio (fraction of zero elements).
  const n = mat.length, m = mat[0].length;
  let zero_count = 0;
  for (const row of mat) for (const v of row) if (Math.abs(v) < tol) zero_count++;
  return zero_count / (n * m);
}

function residual_norm(a, x, b) {
  // Compute ||Ax - b|| for solution verification. x and b are lists.
  const n = a.length;
  const ax = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < a[0].length; j++) sum += a[i][j] * x[j];
    ax.push(sum);
  }
  return vector_norm_2(ax.map((v, i) => v - b[i]));
}

// ============================================================
// 8. VECTOR OPERATIONS
// ============================================================

function dot_product(u, v) {
  // Compute the dot product of two vectors (lists).
  return u.reduce((acc, ui, i) => acc + ui * v[i], 0);
}

function cross_product_3d(u, v) {
  // Compute the cross product of two 3D vectors (lists of length 3).
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0]
  ];
}

function outer_product(u, v) {
  // Compute the outer product of two vectors, returning a matrix.
  return u.map(ui => v.map(vj => ui * vj));
}

function vector_add(u, v) {
  // Add two vectors element-wise.
  return u.map((ui, i) => ui + v[i]);
}

function vector_subtract(u, v) {
  // Subtract vector v from vector u element-wise.
  return u.map((ui, i) => ui - v[i]);
}

function vector_scale(scalar, v) {
  // Multiply a vector by a scalar.
  return v.map(x => scalar * x);
}

function normalize_vector(v) {
  // Normalize a vector to unit length.
  const norm = vector_norm_2(v);
  return norm < 1e-15 ? [...v] : v.map(x => x / norm);
}

function vector_length(v) {
  // Compute the length (L2 norm) of a vector.
  return vector_norm_2(v);
}

function vector_projection(u, v) {
  // Project vector u onto vector v.
  const scale = dot_product(u, v) / dot_product(v, v);
  return vector_scale(scale, v);
}

function scalar_projection(u, v) {
  // Compute the scalar projection of u onto v.
  return dot_product(u, v) / vector_norm_2(v);
}

function vector_rejection(u, v) {
  // Compute the rejection of u from v (component perpendicular to v).
  return vector_subtract(u, vector_projection(u, v));
}

function vector_reflect(v, normal) {
  // Reflect vector v across a plane with given normal.
  return vector_subtract(v, vector_scale(2, vector_projection(v, normal)));
}

function gram_schmidt(vectors) {
  // Perform Gram-Schmidt orthonormalization on a list of vectors.
  const ortho = [];
  for (const v of vectors) {
    let u = [...v];
    for (const q of ortho) u = vector_subtract(u, vector_projection(u, q));
    ortho.push(normalize_vector(u));
  }
  return ortho;
}

function is_orthogonal_set_p(vectors, tol = 1e-10) {
  // Check if a set of vectors is mutually orthogonal.
  const n = vectors.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (Math.abs(dot_product(vectors[i], vectors[j])) > tol) return false;
  return true;
}

function triple_scalar_product(u, v, w) {
  // Compute the scalar triple product u . (v x w).
  return dot_product(u, cross_product_3d(v, w));
}

function triple_vector_product(u, v, w) {
  // Compute the vector triple product u x (v x w) = v(u.w) - w(u.v).
  return vector_subtract(vector_scale(dot_product(u, w), v),
                         vector_scale(dot_product(u, v), w));
}

function vector_lerp(u, v, param_t) {
  // Linear interpolation between vectors u and v at parameter t.
  return vector_add(vector_scale(1 - param_t, u), vector_scale(param_t, v));
}

function unit_vector(i, n) {
  // Create the ith standard basis vector of dimension n.
  const v = new Array(n).fill(0);
  v[i] = 1;
  return v;
}

function random_unit_vector(n) {
  // Generate a random unit vector of dimension n.
  const v = Array.from({length: n}, () => Math.random() * 2.0 - 1.0);
  return normalize_vector(v);
}

function vector_rotate_2d(v, angle) {
  // Rotate a 2D vector by angle (radians).
  const c = Math.cos(angle), s = Math.sin(angle);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1]];
}

function vector_component(v, i) {
  // Extract component i from vector v.
  return v[i];
}

function vector_cross_matrix(v) {
  // Create the skew-symmetric cross-product matrix [v]x for a 3D vector.
  return [
    [0,    -v[2],  v[1]],
    [v[2],  0,    -v[0]],
    [-v[1], v[0],  0   ]
  ];
}

function vector_element_multiply(u, v) {
  // Element-wise multiplication of two vectors.
  return u.map((ui, i) => ui * v[i]);
}

function vector_cumulative_sum(v) {
  // Compute the cumulative sum of a vector.
  let running = 0;
  return v.map(x => { running += x; return running; });
}

function vector_reverse(v) {
  // Reverse the order of elements in a vector.
  return [...v].reverse();
}

// ============================================================
// 9. SUBSPACE OPERATIONS
// ============================================================

function null_space_basis(mat, tol = 1e-10) {
  // Compute an approximate basis for the null space of a matrix using SVD.
  const svd = _sv_decomp(mat);
  const S = svd[1], V = svd[2];
  const n = V.length;
  const basis = [];
  for (let j = 0; j < S.length; j++) {
    if (Math.abs(S[j]) < tol) {
      basis.push(Array.from({length: n}, (_, i) => V[i][j]));
    }
  }
  return basis;
}

function column_space_basis(mat, tol = 1e-10) {
  // Compute a basis for the column space of a matrix using SVD.
  const svd = _sv_decomp(mat);
  const S = svd[1], U = svd[0];
  const n = U.length;
  const basis = [];
  for (let j = 0; j < S.length; j++) {
    if (Math.abs(S[j]) > tol) {
      basis.push(Array.from({length: n}, (_, i) => U[i][j]));
    }
  }
  return basis;
}

function row_space_basis(mat, tol = 1e-10) {
  // Compute a basis for the row space of a matrix.
  return column_space_basis(numeric.transpose(mat), tol);
}

function projection_matrix(mat) {
  // Compute the orthogonal projection matrix onto the column space of A: P = A(A^T A)^-1 A^T.
  const at = numeric.transpose(mat);
  const ata_inv = numeric.inv(numeric.dot(at, mat));
  return numeric.dot(mat, numeric.dot(ata_inv, at));
}

function orthogonal_complement(mat) {
  // Compute the projection matrix onto the orthogonal complement: I - P.
  const n = mat.length;
  return matrix_subtract(identity_matrix(n), projection_matrix(mat));
}

function matrix_image_dim(mat, tol = 1e-10) {
  // Compute the dimension of the image (column space) of a matrix.
  return column_space_basis(mat, tol).length;
}

function matrix_kernel_dim(mat, tol = 1e-10) {
  // Compute the dimension of the kernel (null space) of a matrix.
  return null_space_basis(mat, tol).length;
}

function is_linearly_independent_p(vectors) {
  // Check if a list of vectors is linearly independent.
  const mat = matrix_from_rows(vectors);
  return matrix_rank_estimate(mat) === vectors.length;
}

function span_contains_p(basis, vec, tol = 1e-8) {
  // Check if vec lies in the span of the given basis vectors.
  const mat = matrix_from_columns(basis);
  const n = mat.length, m = mat[0].length;
  if (m > n) return true;
  const atb = numeric.dot(numeric.transpose(mat), matrix_from_columns([vec]));
  const ata = numeric.dot(numeric.transpose(mat), mat);
  const x = numeric.solve(ata, atb);
  const ax = numeric.dot(mat, x);
  let residual = 0;
  for (let i = 0; i < n; i++) {
    const val = Array.isArray(ax[i]) ? ax[i][0] : ax[i];
    residual += (val - vec[i]) ** 2;
  }
  return Math.sqrt(residual) < tol;
}

function four_fundamental_subspaces(mat) {
  // Compute the four fundamental subspaces of a matrix.
  // Returns list: (column-space null-space row-space left-null-space).
  return [
    column_space_basis(mat),
    null_space_basis(mat),
    row_space_basis(mat),
    null_space_basis(numeric.transpose(mat))
  ];
}

function basis_change_matrix(old_basis, new_basis) {
  // Compute the change of basis matrix from old_basis to new_basis.
  const old_mat = matrix_from_columns(old_basis);
  const new_mat = matrix_from_columns(new_basis);
  return numeric.solve(new_mat, old_mat);
}

function coordinates_in_basis(vec, basis) {
  // Express a vector in terms of the given basis vectors.
  const mat = matrix_from_columns(basis);
  const b_col = matrix_from_columns([vec]);
  const result = numeric.solve(mat, b_col);
  return basis.map((_, i) => Array.isArray(result[i]) ? result[i][0] : result[i]);
}

function orthogonal_projection_onto(subspace_basis, vec) {
  // Project a vector onto the subspace spanned by the given basis.
  let result = new Array(vec.length).fill(0);
  for (const b of subspace_basis)
    result = vector_add(result, vector_projection(vec, b));
  return result;
}

function gram_schmidt_matrix(mat) {
  // Apply Gram-Schmidt to the columns of a matrix, returning orthonormalized columns.
  const m = mat[0].length;
  const cols = Array.from({length: m}, (_, j) => matrix_column(mat, j));
  return matrix_from_columns(gram_schmidt(cols));
}

function dimension_of_span(vectors, tol = 1e-10) {
  // Compute the dimension of the span of a set of vectors.
  return matrix_rank_estimate(matrix_from_rows(vectors), tol);
}

// ============================================================
// 10. TRANSFORMATIONS & GEOMETRY
// ============================================================

function rotation_matrix_2d(angle) {
  // Create a 2D rotation matrix for given angle (radians).
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[c, -s], [s, c]];
}

function rotation_matrix_x(angle) {
  // Create a 3D rotation matrix around the X axis.
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[1, 0, 0], [0, c, -s], [0, s, c]];
}

function rotation_matrix_y(angle) {
  // Create a 3D rotation matrix around the Y axis.
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
}

function rotation_matrix_z(angle) {
  // Create a 3D rotation matrix around the Z axis.
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

function scaling_matrix_2d(sx, sy) {
  // Create a 2D scaling matrix.
  return [[sx, 0], [0, sy]];
}

function scaling_matrix_3d(sx, sy, sz) {
  // Create a 3D scaling matrix.
  return [[sx, 0, 0], [0, sy, 0], [0, 0, sz]];
}

function translation_matrix_3d(tx, ty, tz) {
  // Create a 4x4 homogeneous translation matrix.
  return [[1, 0, 0, tx], [0, 1, 0, ty], [0, 0, 1, tz], [0, 0, 0, 1]];
}

function reflection_matrix_2d(angle) {
  // Create a 2D reflection matrix across a line at the given angle from x-axis.
  const c2 = Math.cos(2 * angle), s2 = Math.sin(2 * angle);
  return [[c2, s2], [s2, -c2]];
}

function shear_matrix_2d(kx, ky) {
  // Create a 2D shear matrix.
  return [[1, kx], [ky, 1]];
}

function householder_matrix(v) {
  // Create a Householder reflection matrix: H = I - 2*v*v^T/||v||^2.
  const n = v.length;
  const vv = dot_product(v, v);
  const outer = outer_product(v, v);
  const eye = identity_matrix(n);
  return matrix_subtract(eye, matrix_scale(2.0 / vv, outer));
}

function givens_rotation_matrix(n, i, j, angle) {
  // Create an n x n Givens rotation matrix rotating in the (i,j) plane.
  const g = identity_matrix(n);
  const c = Math.cos(angle), s = Math.sin(angle);
  g[i][i] = c; g[j][j] = c;
  g[i][j] = -s; g[j][i] = s;
  return g;
}

function rodrigues_rotation(axis, angle) {
  // Create a 3D rotation matrix using Rodrigues' rotation formula.
  // axis is a 3D unit vector, angle in radians.
  const k = normalize_vector(axis);
  const kx = vector_cross_matrix(k);
  const kx2 = numeric.dot(kx, kx);
  const eye = identity_matrix(3);
  const sin_a = Math.sin(angle);
  const cos_a = 1 - Math.cos(angle);
  return matrix_add(eye, matrix_add(matrix_scale(sin_a, kx), matrix_scale(cos_a, kx2)));
}

function look_at_matrix(eye, target, up) {
  // Create a look-at view matrix from eye position, target, and up vector.
  const f = normalize_vector(vector_subtract(target, eye));
  const s = normalize_vector(cross_product_3d(f, up));
  const u = cross_product_3d(s, f);
  return [
    [s[0], s[1], s[2], -dot_product(s, eye)],
    [u[0], u[1], u[2], -dot_product(u, eye)],
    [-f[0], -f[1], -f[2], dot_product(f, eye)],
    [0, 0, 0, 1]
  ];
}

function perspective_projection_matrix(fov, aspect, near, far) {
  // Create a perspective projection matrix. fov in radians.
  const f = 1.0 / Math.tan(fov / 2.0);
  const nf = 1.0 / (near - far);
  return [
    [f / aspect, 0, 0, 0],
    [0, f, 0, 0],
    [0, 0, (near + far) * nf, 2 * far * near * nf],
    [0, 0, -1, 0]
  ];
}

function euler_to_rotation(alpha, beta, gamma) {
  // Convert Euler angles (Z-Y-X convention) to a 3x3 rotation matrix.
  return numeric.dot(rotation_matrix_z(alpha),
           numeric.dot(rotation_matrix_y(beta), rotation_matrix_x(gamma)));
}

function affine_transform(mat, vec, point) {
  // Apply an affine transformation: result = mat * point + vec.
  const mp = numeric.dot(mat, matrix_from_columns([point]));
  return vec.map((vi, i) => vi + (Array.isArray(mp[i]) ? mp[i][0] : mp[i]));
}

function apply_transformation(transform_mat, points) {
  // Apply a transformation matrix to a list of point vectors.
  return points.map(pt => {
    const col = matrix_from_columns([pt]);
    const res = numeric.dot(transform_mat, col);
    return pt.map((_, i) => Array.isArray(res[i]) ? res[i][0] : res[i]);
  });
}

function compose_transformations(t1, t2) {
  // Compose two transformation matrices (multiply t1 * t2).
  return numeric.dot(t1, t2);
}

function homogeneous_coordinates(points) {
  // Convert 3D points to homogeneous coordinates (append 1).
  return points.map(pt => [...pt, 1]);
}

function cartesian_from_homogeneous(hpoints) {
  // Convert homogeneous coordinates back to Cartesian by dividing by w.
  return hpoints.map(hp => {
    const w = hp[hp.length - 1];
    return hp.slice(0, -1).map(x => x / w);
  });
}

// ============================================================
// 11. STATISTICAL MATRIX OPERATIONS
// ============================================================

function covariance_matrix(data_matrix) {
  // Compute the covariance matrix of data (rows = observations, cols = variables).
  // Returns the sample covariance matrix.
  const n = data_matrix.length, m = data_matrix[0].length;
  const means = Array.from({length: m}, (_, j) =>
    data_matrix.reduce((acc, row) => acc + row[j], 0) / n);
  const result = [];
  for (let j1 = 0; j1 < m; j1++) {
    const row = [];
    for (let j2 = 0; j2 < m; j2++) {
      let sum = 0;
      for (let i = 0; i < n; i++)
        sum += (data_matrix[i][j1] - means[j1]) * (data_matrix[i][j2] - means[j2]);
      row.push(sum / (n - 1));
    }
    result.push(row);
  }
  return result;
}

function correlation_matrix(data_matrix) {
  // Compute the correlation matrix from data.
  const cov = covariance_matrix(data_matrix);
  const m = cov.length;
  const stds = Array.from({length: m}, (_, i) => Math.sqrt(cov[i][i]));
  return Array.from({length: m}, (_, i) =>
    Array.from({length: m}, (_, j) => cov[i][j] / (stds[i] * stds[j])));
}

function mean_vector(data_matrix) {
  // Compute the mean of each column of a data matrix.
  const n = data_matrix.length, m = data_matrix[0].length;
  return Array.from({length: m}, (_, j) =>
    data_matrix.reduce((acc, row) => acc + row[j], 0) / n);
}

function center_matrix(data_matrix) {
  // Center a data matrix by subtracting column means.
  const means = mean_vector(data_matrix);
  return data_matrix.map(row => row.map((v, j) => v - means[j]));
}

function standardize_matrix(data_matrix) {
  // Standardize a data matrix (zero mean, unit variance per column).
  const n = data_matrix.length, m = data_matrix[0].length;
  const means = mean_vector(data_matrix);
  const stds = Array.from({length: m}, (_, j) => {
    const sum = data_matrix.reduce((acc, row) => acc + (row[j] - means[j]) ** 2, 0);
    return Math.sqrt(sum / (n - 1));
  });
  return data_matrix.map(row =>
    row.map((v, j) => stds[j] > 1e-15 ? (v - means[j]) / stds[j] : 0.0));
}

function principal_components(data_matrix, k) {
  // Compute the first k principal components of the data.
  // Returns list (scores loadings eigenvalues).
  const centered = center_matrix(data_matrix);
  const cov = covariance_matrix(data_matrix);
  const svd = _sv_decomp(cov);
  const v = svd[0]; // U — eigenvectors sorted by decreasing singular value
  const s_vals = svd[1];
  const m = cov.length;
  // Extract first k columns of v as loadings (m×k matrix)
  const loadings = Array.from({length: m}, (_, i) =>
    Array.from({length: k}, (_, j) => v[i][j]));
  const scores = numeric.dot(centered, loadings);
  const top_evals = s_vals.slice(0, k);
  return [scores, loadings, top_evals];
}

function mahalanobis_distance(x, mean_vec, cov_mat) {
  // Compute the Mahalanobis distance of point x from a distribution.
  const diff = vector_subtract(x, mean_vec);
  const diff_col = matrix_from_columns([diff]);
  const cov_inv = numeric.inv(cov_mat);
  const result = numeric.dot(numeric.transpose(diff_col), numeric.dot(cov_inv, diff_col));
  return Math.sqrt(result[0][0]);
}

function whitening_matrix(data_matrix) {
  // Compute the whitening (ZCA) matrix for the data.
  const cov = covariance_matrix(data_matrix);
  const svd = _sv_decomp(cov);
  const u = svd[0], s_vals = svd[1];
  const s_inv_sqrt = diagonal_matrix(s_vals.map(s =>
    Math.abs(s) > 1e-15 ? 1.0 / Math.sqrt(s) : 0.0));
  return numeric.dot(u, numeric.dot(s_inv_sqrt, numeric.transpose(u)));
}

function scatter_matrix(data_matrix) {
  // Compute the scatter matrix (unnormalized covariance): S = X_c^T * X_c.
  const centered = center_matrix(data_matrix);
  return numeric.dot(numeric.transpose(centered), centered);
}

function explained_variance_ratio(data_matrix, k) {
  // Compute the fraction of variance explained by the first k principal components.
  const cov = covariance_matrix(data_matrix);
  const s_vals = _sv_decomp(cov)[1];
  const total = s_vals.reduce((a, b) => a + b, 0);
  const top_k = s_vals.slice(0, k).reduce((a, b) => a + b, 0);
  return top_k / total;
}

// ============================================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================================

function matrix_kronecker_product(a, b) {
  // Compute the Kronecker product A ⊗ B.
  const na = a.length, ma = a[0].length;
  const nb = b.length, mb = b[0].length;
  const result = Array.from({length: na * nb}, () => new Array(ma * mb).fill(0));
  for (let ia = 0; ia < na; ia++)
    for (let ib = 0; ib < nb; ib++)
      for (let ja = 0; ja < ma; ja++)
        for (let jb = 0; jb < mb; jb++)
          result[ia * nb + ib][ja * mb + jb] = a[ia][ja] * b[ib][jb];
  return result;
}

function matrix_direct_sum(a, b) {
  // Compute the direct sum of matrices A and B (block diagonal).
  return block_diagonal_matrix([a, b]);
}

function matrix_vec(mat) {
  // Vectorize a matrix by stacking columns into a single list.
  const n = mat.length, m = mat[0].length;
  const data = [];
  for (let j = 0; j < m; j++)
    for (let i = 0; i < n; i++)
      data.push(mat[i][j]);
  return data;
}

function matrix_sum_all(mat) {
  // Sum all elements of a matrix.
  let sum = 0;
  for (const row of mat) for (const v of row) sum += v;
  return sum;
}

function matrix_max_element(mat) {
  // Find the maximum element in a matrix.
  let maxVal = mat[0][0];
  for (const row of mat) for (const v of row) if (v > maxVal) maxVal = v;
  return maxVal;
}

function matrix_min_element(mat) {
  // Find the minimum element in a matrix.
  let minVal = mat[0][0];
  for (const row of mat) for (const v of row) if (v < minVal) minVal = v;
  return minVal;
}

function matrix_abs_max(mat) {
  // Find the maximum absolute value element in a matrix.
  let maxVal = 0;
  for (const row of mat) for (const v of row) if (Math.abs(v) > maxVal) maxVal = Math.abs(v);
  return maxVal;
}

function matrix_apply(func, mat) {
  // Apply a function to every element of a matrix.
  return mat.map(row => row.map(func));
}

function matrix_map_rows(func, mat) {
  // Apply a function to each row of a matrix, returning a list of results.
  return mat.map(row => func([...row]));
}

function matrix_map_columns(func, mat) {
  // Apply a function to each column of a matrix, returning a list of results.
  const m = mat[0].length;
  return Array.from({length: m}, (_, j) => func(matrix_column(mat, j)));
}

function matrix_column_sums(mat) {
  // Compute the sum of each column.
  return matrix_map_columns(col => col.reduce((a, b) => a + b, 0), mat);
}

function matrix_row_sums(mat) {
  // Compute the sum of each row.
  return matrix_map_rows(row => row.reduce((a, b) => a + b, 0), mat);
}

function matrix_column_means(mat) {
  // Compute the mean of each column.
  const n = mat.length;
  return matrix_column_sums(mat).map(s => s / n);
}

function matrix_row_means(mat) {
  // Compute the mean of each row.
  const m = mat[0].length;
  return matrix_row_sums(mat).map(s => s / m);
}

function matrix_stack_vertical(a, b) {
  // Stack two matrices vertically (concatenate rows).
  return [...a.map(row => [...row]), ...b.map(row => [...row])];
}

function matrix_stack_horizontal(a, b) {
  // Stack two matrices horizontally (concatenate columns).
  return a.map((row, i) => [...row, ...b[i]]);
}

function matrix_repmat(mat, nr, nc) {
  // Tile a matrix nr times vertically and nc times horizontally.
  const n = mat.length, m = mat[0].length;
  const result = [];
  for (let ri = 0; ri < nr; ri++) {
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let cj = 0; cj < nc; cj++)
        for (let j = 0; j < m; j++) row.push(mat[i][j]);
      result.push(row);
    }
  }
  return result;
}

function matrix_minor(mat, i, j) {
  // Compute the (i,j) minor of a matrix (determinant of submatrix with row i and col j removed).
  return numeric.det(matrix_delete_row(matrix_delete_column(mat, j), i));
}

function matrix_cofactor(mat, i, j) {
  // Compute the (i,j) cofactor of a matrix.
  const sign = (i + j) % 2 === 0 ? 1 : -1;
  return sign * matrix_minor(mat, i, j);
}

function matrix_adjugate(mat) {
  // Compute the adjugate (classical adjoint) of a matrix.
  const n = mat.length;
  return Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) => matrix_cofactor(mat, j, i)));
}

function matrix_pseudoinverse(mat) {
  // Compute the Moore-Penrose pseudoinverse using SVD.
  const svd = _sv_decomp(mat);
  const u = svd[0], s_vals = svd[1], v = svd[2];
  const s_inv = diagonal_matrix(s_vals.map(s => Math.abs(s) > 1e-15 ? 1.0 / s : 0.0));
  return numeric.dot(v, numeric.dot(s_inv, numeric.transpose(u)));
}

function matrix_exp_pade(mat, order = 6) {
  // Approximate the matrix exponential using Pade approximation.
  const n = mat.length;
  const eye = identity_matrix(n);
  let numer = _copy_matrix(eye);
  let denom = _copy_matrix(eye);
  let mat_power = _copy_matrix(eye);
  let c = 1.0;
  for (let k = 0; k < order; k++) {
    const k1 = k + 1;
    c *= (order - k) / (k1 * (2 * order - k));
    mat_power = numeric.dot(mat_power, mat);
    const term = matrix_scale(c, mat_power);
    numer = matrix_add(numer, term);
    if (k1 % 2 !== 0) denom = matrix_subtract(denom, term);
    else               denom = matrix_add(denom, term);
  }
  return numeric.dot(numeric.inv(denom), numer);
}

function matrix_log_series(mat, terms = 20) {
  // Approximate matrix logarithm using series expansion log(I+X) for small X.
  const n = mat.length;
  const x = matrix_subtract(mat, identity_matrix(n));
  let result = zero_matrix(n, n);
  let x_power = identity_matrix(n);
  for (let k = 0; k < terms; k++) {
    const k1 = k + 1;
    x_power = numeric.dot(x_power, x);
    const sign = k1 % 2 !== 0 ? 1.0 : -1.0;
    result = matrix_add(result, matrix_scale(sign / k1, x_power));
  }
  return result;
}

function matrix_sqrt_denman_beavers(mat, max_iter = 50, tol = 1e-10) {
  // Compute the matrix square root using the Denman-Beavers iteration.
  const n = mat.length;
  let y = _copy_matrix(mat);
  let z = identity_matrix(n);
  for (let iter = 0; iter < max_iter; iter++) {
    const y_inv = numeric.inv(y);
    const z_inv = numeric.inv(z);
    const y_new = matrix_scale(0.5, matrix_add(y, z_inv));
    const z_new = matrix_scale(0.5, matrix_add(z, y_inv));
    if (frobenius_norm(matrix_subtract(y_new, y)) < tol) return y_new;
    y = y_new;
    z = z_new;
  }
  return y;
}

function matrix_is_hermitian_p(mat, tol = 1e-10) {
  // Check if a matrix is Hermitian (equal to its conjugate transpose).
  return is_symmetric_p(mat, tol);
}

function matrix_symmetrize(mat) {
  // Symmetrize a matrix: (A + A^T) / 2.
  return matrix_scale(0.5, matrix_add(mat, numeric.transpose(mat)));
}

function matrix_skew_symmetrize(mat) {
  // Skew-symmetrize a matrix: (A - A^T) / 2.
  return matrix_scale(0.5, matrix_subtract(mat, numeric.transpose(mat)));
}

function is_skew_symmetric_p(mat, tol = 1e-10) {
  // Check if a matrix is skew-symmetric: A^T = -A.
  const n = mat.length;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (Math.abs(mat[i][j] + mat[j][i]) > tol) return false;
  return true;
}

function matrix_column_norms(mat) {
  // Compute the L2 norm of each column.
  return matrix_map_columns(vector_norm_2, mat);
}

function matrix_row_norms(mat) {
  // Compute the L2 norm of each row.
  return matrix_map_rows(vector_norm_2, mat);
}

function matrix_normalize_columns(mat) {
  // Normalize each column of a matrix to unit length.
  const m = mat[0].length;
  return matrix_from_columns(
    Array.from({length: m}, (_, j) => normalize_vector(matrix_column(mat, j))));
}

function matrix_normalize_rows(mat) {
  // Normalize each row of a matrix to unit length.
  return matrix_from_rows(mat.map(row => normalize_vector([...row])));
}

function matrix_khatri_rao(a, b) {
  // Compute the Khatri-Rao (column-wise Kronecker) product.
  const ma = a[0].length;
  const cols = [];
  for (let j = 0; j < ma; j++) {
    const col_a = matrix_column(a, j);
    const col_b = matrix_column(b, j);
    const kron_col = [];
    for (const ai of col_a) for (const bi of col_b) kron_col.push(ai * bi);
    cols.push(kron_col);
  }
  return matrix_from_columns(cols);
}

function matrix_hadamard_power(mat, p) {
  // Raise each element of a matrix to the pth power (Hadamard power).
  return matrix_element_power(mat, p);
}

function matrix_entrywise_log(mat) {
  // Apply natural log to each element of a matrix.
  return matrix_apply(Math.log, mat);
}

function matrix_entrywise_exp(mat) {
  // Apply exp to each element of a matrix.
  return matrix_apply(Math.exp, mat);
}

function display_matrix(mat, formatFn) {
  // Pretty-print a matrix with formatted output.
  const fmt = formatFn || (x => x.toFixed(3).padStart(8));
  const n = mat.length, m = mat[0].length;
  for (let i = 0; i < n; i++) {
    let line = '[ ';
    for (let j = 0; j < m; j++) line += fmt(mat[i][j]) + ' ';
    line += ']';
    console.log(line);
  }
  console.log('');
  return mat;
}

function matrix_to_list_of_lists(mat) {
  // Convert a matrix to a list of row lists.
  return mat.map(row => [...row]);
}

function matrix_from_function(n, m, func) {
  // Create an n x m matrix where element (i,j) = func(i,j).
  return Array.from({length: n}, (_, i) =>
    Array.from({length: m}, (_, j) => func(i, j)));
}

function matrix_anti_diagonal(mat) {
  // Extract the anti-diagonal of a square matrix.
  const n = mat.length;
  return Array.from({length: n}, (_, i) => mat[i][n - 1 - i]);
}

function matrix_polynomial(mat, coeffs) {
  // Evaluate a matrix polynomial p(A) = c0*I + c1*A + c2*A^2 + ...
  // coeffs is a list of coefficients from lowest to highest degree.
  const n = mat.length;
  let result = matrix_scale(coeffs[0], identity_matrix(n));
  let a_power = identity_matrix(n);
  for (let k = 1; k < coeffs.length; k++) {
    a_power = numeric.dot(a_power, mat);
    result = matrix_add(result, matrix_scale(coeffs[k], a_power));
  }
  return result;
}

function matrix_commutes_p(a, b, tol = 1e-10) {
  // Check if two matrices commute: AB = BA.
  const diff = matrix_subtract(numeric.dot(a, b), numeric.dot(b, a));
  const n = a.length;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (Math.abs(diff[i][j]) > tol) return false;
  return true;
}

function matrix_similar_p(a, b, tol = 1e-6) {
  // Check if two matrices are similar (same eigenvalues).
  const eval_a = [..._eigenvalues(a)].sort((x, y) => x - y);
  const eval_b = [..._eigenvalues(b)].sort((x, y) => x - y);
  if (eval_a.length !== eval_b.length) return false;
  return eval_a.every((ea, i) => Math.abs(ea - eval_b[i]) < tol);
}

function characteristic_polynomial_coeffs(mat) {
  // Compute coefficients of the characteristic polynomial using Faddeev-LeVerrier algorithm.
  // Returns coefficients from highest to lowest degree.
  const n = mat.length;
  let coeffs = [1]; // coeffs[0] is the most recently prepended value
  let m = identity_matrix(n);
  for (let k = 0; k < n; k++) {
    if (k === 0) {
      m = mat;
    } else {
      m = numeric.dot(mat, matrix_add(m, matrix_scale(coeffs[0], identity_matrix(n))));
    }
    coeffs.unshift(-matrix_trace(m) / (k + 1));
  }
  return [...coeffs].reverse();
}

function matrix_permanent_small(mat) {
  // Compute the permanent of a small matrix (brute force, up to ~8x8).
  const n = mat.length;
  if (n === 1) return mat[0][0];
  let sum = 0;
  for (let j = 0; j < n; j++)
    sum += mat[0][j] * matrix_permanent_small(matrix_delete_row(matrix_delete_column(mat, j), 0));
  return sum;
}

function matrix_band_width(mat, tol = 1e-15) {
  // Compute the bandwidth of a matrix (max distance from diagonal with non-zero entries).
  const n = mat.length, m = mat[0].length;
  let bw = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      if (Math.abs(mat[i][j]) > tol) bw = Math.max(bw, Math.abs(i - j));
  return bw;
}

function matrix_density(mat, tol = 1e-15) {
  // Compute the density (fraction of non-zero elements) of a matrix.
  return 1.0 - matrix_sparsity(mat, tol);
}
