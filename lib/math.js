// lib/math.js
// Mathematical functions for Jovan's Calculator
// Ported from my-math.lsp (XLisp-Stat) to JavaScript
// Jovan Trujillo — Advanced Electronics and Photonics Core, Arizona State University
// Original created: 2/2/2026
//
// Loaded via vm.runInContext() — all functions are global (no module.exports).
// S-expression trees use nested arrays: ['op', arg1, arg2].
// Lisp symbols become JS strings; cons pairs [x,y] use index 0/1.
// Point at infinity on elliptic curves is represented as the string 'infinity'.

// ============================================================================
// SYMBOLIC CALCULUS FUNCTIONS
// ============================================================================

function symbolic_derivative(expr, variable) {
  /* Calculate the symbolic derivative of a polynomial expression expr
     with respect to variable. */

  // Constant rule: derivative of a constant is 0.
  if (typeof expr === 'number') return 0;

  // Variable rule: derivative of the variable with respect to itself is 1.
  if (typeof expr === 'string' && expr === variable) return 1;

  // Power rule: derivative of x^n is n * x^(n-1).
  if (Array.isArray(expr) && expr[0] === 'expt') {
    const base = expr[1];
    const power = expr[2];
    if (base === variable && typeof power === 'number') {
      return ['*', power, ['expt', variable, power - 1]];
    }
    return 0;
  }

  // Addition rule: derivative of a + b is da/dx + db/dx.
  if (Array.isArray(expr) && expr[0] === '+') {
    return ['+',
      symbolic_derivative(expr[1], variable),
      symbolic_derivative(expr[2], variable)
    ];
  }

  // Multiplication rule: d(a*b)/dx = (da/dx)*b + a*(db/dx).
  if (Array.isArray(expr) && expr[0] === '*') {
    return ['+',
      ['*', symbolic_derivative(expr[1], variable), expr[2]],
      ['*', expr[1], symbolic_derivative(expr[2], variable)]
    ];
  }

  // Default case (unsupported expressions).
  return 'unsupported';
}

function simplify(expr) {
  /* Simplify the expression by removing zero terms and combining constants. */

  if (Array.isArray(expr) && expr[0] === '+') {
    const simplified = expr.slice(1).map(simplify).filter(x => x !== 0);
    if (simplified.length === 0) return 0;
    if (simplified.length === 1) return simplified[0];
    return ['+', ...simplified];
  }

  if (Array.isArray(expr) && expr[0] === '*') {
    const simplified = expr.slice(1).map(simplify);
    if (simplified.some(x => x === 0)) return 0;
    if (simplified.every(x => typeof x === 'number')) {
      return simplified.reduce((a, b) => a * b, 1);
    }
    return ['*', ...simplified];
  }

  if (Array.isArray(expr) && expr[0] === 'expt') {
    const base = simplify(expr[1]);
    const power = simplify(expr[2]);
    if (typeof base === 'number' && typeof power === 'number') {
      return Math.pow(base, power);
    }
    if (power === 0) return 1;
    if (power === 1) return base;
    return ['expt', base, power];
  }

  return expr;
}

function group_terms(expr) {
  /* Group like terms in an expression and combine their coefficients. */

  if (Array.isArray(expr) && expr[0] === '+') {
    const grouped_terms = []; // array of [var_part, coeff] pairs
    for (const raw_term of expr.slice(1)) {
      const term = simplify(raw_term);
      const coeff = extract_coefficient(term);
      const var_part = extract_variable_part(term);
      const existing = grouped_terms.find(
        pair => JSON.stringify(pair[0]) === JSON.stringify(var_part)
      );
      if (existing) {
        existing[1] += coeff;
      } else {
        grouped_terms.push([var_part, coeff]);
      }
    }
    return terms_to_expression(grouped_terms);
  }

  return simplify(expr);
}

function extract_coefficient(term) {
  /* Extract the numerical coefficient from a term. */

  if (typeof term === 'number') return term;
  if (typeof term === 'string') return 1;
  if (Array.isArray(term) && term[0] === '*') {
    const factors = term.slice(1);
    return typeof factors[0] === 'number' ? factors[0] : 1;
  }
  if (Array.isArray(term) && term[0] === 'expt') return 1;
  return 1;
}

function extract_variable_part(term) {
  /* Extract the variable part (non-coefficient) from a term. */

  if (typeof term === 'number') return 1;
  if (typeof term === 'string') return term;
  if (Array.isArray(term) && term[0] === '*') {
    const factors = term.slice(1);
    if (typeof factors[0] === 'number') {
      if (factors.length === 2) return factors[1];
      return ['*', ...factors.slice(1)];
    }
    return term;
  }
  if (Array.isArray(term) && term[0] === 'expt') return term;
  return term;
}

function terms_to_expression(grouped_terms) {
  /* Convert grouped terms back to an expression. */

  const result_terms = [];
  for (const term_pair of grouped_terms) {
    const var_part = term_pair[0];
    const coeff = term_pair[1];
    if (coeff !== 0) {
      if (coeff === 1 && var_part !== 1) {
        result_terms.push(var_part);
      } else if (coeff === -1 && var_part !== 1) {
        result_terms.push(['*', -1, var_part]);
      } else if (var_part === 1) {
        result_terms.push(coeff);
      } else {
        result_terms.push(['*', coeff, var_part]);
      }
    }
  }

  if (result_terms.length === 0) return 0;
  if (result_terms.length === 1) return result_terms[0];
  return ['+', ...result_terms];
}

function infix_notation(expr) {
  /* Convert prefix S-expression trees to infix notation string. */

  if (!Array.isArray(expr)) return String(expr);

  if (expr[0] === '+') {
    const terms = expr.slice(1);
    if (terms.length === 2) {
      return `(${infix_notation(terms[0])} + ${infix_notation(terms[1])})`;
    }
    let result = infix_notation(terms[0]);
    for (const term of terms.slice(1)) {
      result = `${result} + ${infix_notation(term)}`;
    }
    return result;
  }

  if (expr[0] === '-') {
    const terms = expr.slice(1);
    if (terms.length === 1) return `-${infix_notation(terms[0])}`;
    return `(${infix_notation(terms[0])} - ${infix_notation(terms[1])})`;
  }

  if (expr[0] === '*') {
    const factors = expr.slice(1);
    if (factors.length === 2) {
      let left = infix_notation(factors[0]);
      let right = infix_notation(factors[1]);
      if (Array.isArray(factors[0]) && ['+', '-'].includes(factors[0][0])) {
        left = `(${left})`;
      }
      if (Array.isArray(factors[1]) && ['+', '-'].includes(factors[1][0])) {
        right = `(${right})`;
      }
      return `${left} * ${right}`;
    }
    let result = infix_notation(factors[0]);
    for (const factor of factors.slice(1)) {
      let factor_str = infix_notation(factor);
      if (Array.isArray(factor) && ['+', '-'].includes(factor[0])) {
        factor_str = `(${factor_str})`;
      }
      result = `${result} * ${factor_str}`;
    }
    return result;
  }

  if (expr[0] === '/') {
    let numerator = infix_notation(expr[1]);
    let denominator = infix_notation(expr[2]);
    if (Array.isArray(expr[1]) && ['+', '-'].includes(expr[1][0])) {
      numerator = `(${numerator})`;
    }
    if (Array.isArray(expr[2]) && ['+', '-', '*', '/'].includes(expr[2][0])) {
      denominator = `(${denominator})`;
    }
    return `${numerator} / ${denominator}`;
  }

  if (expr[0] === 'expt') {
    let base = infix_notation(expr[1]);
    const power = infix_notation(expr[2]);
    if (Array.isArray(expr[1]) && ['+', '-', '*', '/'].includes(expr[1][0])) {
      base = `(${base})`;
    }
    return `${base}^${power}`;
  }

  // Generic function call fallback.
  if (typeof expr[0] === 'string') {
    const func_name = expr[0];
    const args = expr.slice(1);
    return `${func_name}(${args.map(infix_notation).join(', ')})`;
  }

  return String(expr);
}

function pretty_print_expression(expr) {
  /* Pretty print a mathematical expression in infix notation. */
  const infix_str = infix_notation(expr);
  console.log(infix_str);
  return infix_str;
}

function latex_notation(expr) {
  /* Convert S-expression trees to LaTeX mathematical notation. */

  if (!Array.isArray(expr)) return String(expr);

  if (expr[0] === '+') {
    return expr.slice(1).map(latex_notation).join(' + ');
  }

  if (expr[0] === '-') {
    const terms = expr.slice(1);
    if (terms.length === 1) return `-${latex_notation(terms[0])}`;
    return `${latex_notation(terms[0])} - ${latex_notation(terms[1])}`;
  }

  if (expr[0] === '*') {
    return expr.slice(1).map(latex_notation).join(' \\cdot ');
  }

  if (expr[0] === '/') {
    return `\\frac{${latex_notation(expr[1])}}{${latex_notation(expr[2])}}`;
  }

  if (expr[0] === 'expt') {
    let base = latex_notation(expr[1]);
    const power = latex_notation(expr[2]);
    if (Array.isArray(expr[1])) base = `{${base}}`;
    return `${base}^{${power}}`;
  }

  if (expr[0] === 'sqrt') {
    return `\\sqrt{${latex_notation(expr[1])}}`;
  }

  // Generic function call fallback.
  if (typeof expr[0] === 'string') {
    const func_name = expr[0];
    const args = expr.slice(1);
    return `\\${func_name}\\left(${args.map(latex_notation).join(', ')}\\right)`;
  }

  return String(expr);
}

function derivative_step_by_step(expr, variable) {
  /* Show step-by-step derivative calculation with explanations. */
  console.log(`Finding the derivative of ${infix_notation(expr)} with respect to ${variable}:`);
  console.log(`Original expression: ${infix_notation(expr)}`);
  const result = symbolic_derivative(expr, variable);
  console.log('Applying differentiation rules...');
  console.log(`Result: ${infix_notation(result)}`);
  const simplified = simplify(result);
  if (JSON.stringify(result) !== JSON.stringify(simplified)) {
    console.log(`Simplified: ${infix_notation(simplified)}`);
  }
  return simplified;
}

// ============================================================================
// ALGEBRAIC GEOMETRY FUNCTIONS
// ============================================================================

// ----------------------------------------------------------------------------
// Polynomial and Curve Representations
// ----------------------------------------------------------------------------

function make_polynomial(coeffs, variable) {
  /* Create a polynomial expression from a list of coefficients (lowest degree first).
     Example: make_polynomial([1, 2, 3], 'x') => 1 + 2x + 3x^2 */
  const terms = [];
  let degree = 0;
  for (const coeff of coeffs) {
    if (coeff !== 0) {
      if (degree === 0) {
        terms.push(coeff);
      } else if (degree === 1) {
        terms.push(coeff === 1 ? variable : ['*', coeff, variable]);
      } else {
        terms.push(coeff === 1
          ? ['expt', variable, degree]
          : ['*', coeff, ['expt', variable, degree]]);
      }
    }
    degree++;
  }
  if (terms.length === 0) return 0;
  if (terms.length === 1) return terms[0];
  return ['+', ...terms];
}

function polynomial_degree(coeffs) {
  /* Return the degree of a polynomial given its coefficient list (lowest degree first). */
  let deg = coeffs.length - 1;
  while (deg >= 0 && coeffs[deg] === 0) deg--;
  return Math.max(0, deg);
}

function evaluate_polynomial(coeffs, x_val) {
  /* Evaluate a polynomial at a given point using Horner's method.
     Coefficients are given lowest degree first. */
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = coeffs[i] + result * x_val;
  }
  return result;
}

function polynomial_add(coeffs1, coeffs2) {
  /* Add two polynomials represented as coefficient lists. */
  const len1 = coeffs1.length;
  const len2 = coeffs2.length;
  const max_len = Math.max(len1, len2);
  const result = [];
  for (let i = 0; i < max_len; i++) {
    const c1 = i < len1 ? coeffs1[i] : 0;
    const c2 = i < len2 ? coeffs2[i] : 0;
    result.push(c1 + c2);
  }
  return result;
}

function polynomial_multiply(coeffs1, coeffs2) {
  /* Multiply two polynomials represented as coefficient lists. */
  const len1 = coeffs1.length;
  const len2 = coeffs2.length;
  const result = new Array(len1 + len2 - 1).fill(0);
  for (let i = 0; i < len1; i++) {
    for (let j = 0; j < len2; j++) {
      result[i + j] += coeffs1[i] * coeffs2[j];
    }
  }
  return result;
}

// ----------------------------------------------------------------------------
// Algebraic Curves
// ----------------------------------------------------------------------------

function make_affine_curve(poly, vars) {
  /* Create an affine algebraic curve representation.
     poly: polynomial expression defining f(x,y) = 0
     vars: list of variables, typically ['x', 'y'] */
  return {type: 'affine-curve', polynomial: poly, variables: vars, dimension: 2};
}

function make_projective_curve(poly, vars) {
  /* Create a projective algebraic curve representation.
     poly: homogeneous polynomial defining f(x,y,z) = 0
     vars: list of variables, typically ['x', 'y', 'z'] */
  return {type: 'projective-curve', polynomial: poly, variables: vars, dimension: 2};
}

function curve_polynomial(curve) {
  /* Extract the defining polynomial from a curve. */
  return curve.polynomial;
}

function curve_variables(curve) {
  /* Extract the variables from a curve definition. */
  return curve.variables;
}

function homogenize_polynomial(poly, var_x, var_y, var_z, degree) {
  /* Homogenize a polynomial in x,y by introducing z to make all terms degree d.
     This converts an affine curve to a projective curve. */

  if (typeof poly === 'number') {
    if (degree === 0) return poly;
    return ['*', poly, ['expt', var_z, degree]];
  }

  if (typeof poly === 'string') {
    if (poly === var_x) {
      return degree === 1 ? var_x : ['*', var_x, ['expt', var_z, degree - 1]];
    }
    if (poly === var_y) {
      return degree === 1 ? var_y : ['*', var_y, ['expt', var_z, degree - 1]];
    }
    return poly;
  }

  if (Array.isArray(poly) && poly[0] === '+') {
    return ['+', ...poly.slice(1).map(
      term => homogenize_polynomial(term, var_x, var_y, var_z, degree)
    )];
  }

  // Multiplication — return as-is (simplified version).
  if (Array.isArray(poly) && poly[0] === '*') {
    return ['*', ...poly.slice(1)];
  }

  if (Array.isArray(poly) && poly[0] === 'expt') {
    return poly;
  }

  return poly;
}

// ----------------------------------------------------------------------------
// Elliptic Curves
// ----------------------------------------------------------------------------

function make_elliptic_curve(a, b) {
  /* Create an elliptic curve in Weierstrass form: y^2 = x^3 + ax + b.
     Returns null if the discriminant is zero (singular curve). */
  const discriminant = 4*a*a*a + 27*b*b;
  if (discriminant === 0) {
    console.log('Warning: Discriminant is zero, curve is singular.');
    return null;
  }
  return {
    type: 'elliptic-curve',
    a: a,
    b: b,
    discriminant: discriminant,
    j_invariant: (-1728 * 4 * a * a * a) / discriminant
  };
}

function elliptic_curve_discriminant(a, b) {
  /* Calculate the discriminant of an elliptic curve y^2 = x^3 + ax + b.
     Discriminant = -16(4a^3 + 27b^2). Curve is non-singular iff discriminant != 0. */
  return -16 * (4*a*a*a + 27*b*b);
}

function elliptic_curve_j_invariant(a, b) {
  /* Calculate the j-invariant of an elliptic curve y^2 = x^3 + ax + b.
     j = -1728 * (4a^3) / discriminant */
  const disc = elliptic_curve_discriminant(a, b);
  if (disc === 0) return null;
  return (-1728 * 4 * a * a * a) / disc;
}

function elliptic_point_on_curve_p(x, y, a, b) {
  /* Check if a point (x, y) lies on the elliptic curve y^2 = x^3 + ax + b. */
  const lhs = y * y;
  const rhs = x*x*x + a*x + b;
  return Math.abs(lhs - rhs) < 1e-10;
}

function elliptic_curve_add(p1, p2, a, b) {
  /* Add two points on an elliptic curve y^2 = x^3 + ax + b.
     Points are represented as [x, y] pairs. Point at infinity is 'infinity'. */
  if (p1 === 'infinity') return p2;
  if (p2 === 'infinity') return p1;

  // Points are inverses of each other.
  if (p1[0] === p2[0] && p1[1] + p2[1] === 0) return 'infinity';

  // Same point — point doubling.
  if (p1[0] === p2[0] && p1[1] === p2[1]) {
    if (p1[1] === 0) return 'infinity';
    const x1 = p1[0], y1 = p1[1];
    const lambda_val = (3*x1*x1 + a) / (2*y1);
    const x3 = lambda_val*lambda_val - 2*x1;
    const y3 = lambda_val*(x1 - x3) - y1;
    return [x3, y3];
  }

  // Different points.
  const x1 = p1[0], y1 = p1[1];
  const x2 = p2[0], y2 = p2[1];
  const lambda_val = (y2 - y1) / (x2 - x1);
  const x3 = lambda_val*lambda_val - x1 - x2;
  const y3 = lambda_val*(x1 - x3) - y1;
  return [x3, y3];
}

function elliptic_curve_scalar_mult(n, p, a, b) {
  /* Scalar multiplication: compute n*P on an elliptic curve using double-and-add. */
  if (n === 0) return 'infinity';
  if (n === 1) return p;
  if (n % 2 === 0) {
    return elliptic_curve_scalar_mult(n / 2, elliptic_curve_add(p, p, a, b), a, b);
  }
  return elliptic_curve_add(p, elliptic_curve_scalar_mult(n - 1, p, a, b), a, b);
}

// ----------------------------------------------------------------------------
// Bezout's Theorem and Intersection Theory
// ----------------------------------------------------------------------------

function bezout_number(deg1, deg2) {
  /* Calculate the Bezout number for two curves of given degrees.
     Two general curves of degrees d1 and d2 intersect in exactly d1*d2 points
     (counting multiplicities and points at infinity in projective space). */
  return deg1 * deg2;
}

function intersection_multiplicity_at_origin(poly1, poly2) {
  /* Estimate the intersection multiplicity of two curves at the origin.
     This is a simplified version that counts the minimum degree of terms. */
  const min_deg1 = find_minimum_degree(poly1);
  const min_deg2 = find_minimum_degree(poly2);
  return min_deg1 * min_deg2;
}

function find_minimum_degree(poly) {
  /* Find the minimum total degree of any term in a polynomial. */
  if (typeof poly === 'number') {
    return poly === 0 ? Number.MAX_SAFE_INTEGER : 0;
  }
  if (typeof poly === 'string') return 1;
  if (Array.isArray(poly) && poly[0] === '+') {
    return Math.min(...poly.slice(1).map(find_minimum_degree));
  }
  if (Array.isArray(poly) && poly[0] === '*') {
    return poly.slice(1).map(find_minimum_degree).reduce((a, b) => a + b, 0);
  }
  if (Array.isArray(poly) && poly[0] === 'expt') {
    return find_minimum_degree(poly[1]) * poly[2];
  }
  return 0;
}

// ----------------------------------------------------------------------------
// Genus and Topological Invariants
// ----------------------------------------------------------------------------

function genus_smooth_plane_curve(degree) {
  /* Calculate the genus of a smooth plane curve of given degree.
     Formula: g = (d-1)(d-2)/2 where d is the degree. */
  return (degree - 1) * (degree - 2) / 2;
}

function euler_characteristic_surface(genus) {
  /* Calculate the Euler characteristic of a closed orientable surface.
     chi = 2 - 2g where g is the genus. */
  return 2 - 2 * genus;
}

function arithmetic_genus(degree, dimension) {
  /* Calculate the arithmetic genus of a hypersurface of degree d in P^n.
     For a smooth curve in P^2:  p_a = (d-1)(d-2)/2
     For a smooth surface in P^3: p_a = (d-1)(d-2)(d-3)/6 */
  if (dimension === 2) return (degree - 1) * (degree - 2) / 2;
  if (dimension === 3) return (degree - 1) * (degree - 2) * (degree - 3) / 6;
  console.log(`General formula not implemented for dimension ${dimension}`);
  return null;
}

// ----------------------------------------------------------------------------
// Rational Curves and Parameterizations
// ----------------------------------------------------------------------------

function make_rational_curve(x_param, y_param, param_var) {
  /* Create a rational parametric curve representation.
     x_param, y_param: rational expressions in param_var
     Example: Circle: x=(1-t^2)/(1+t^2), y=2t/(1+t^2) */
  return {type: 'rational-curve', x_param: x_param, y_param: y_param, parameter: param_var};
}

function evaluate_rational_curve(curve, t_val) {
  /* Evaluate a rational parametric curve at parameter value t.
     Returns placeholder pairs — a full implementation requires symbolic substitution. */
  const x_param = curve.x_param;
  const y_param = curve.y_param;
  return [['x', x_param], ['y', y_param], ['t', t_val]];
}

function circle_rational_param() {
  /* Return the rational parameterization of the unit circle.
     x = (1-t^2)/(1+t^2),  y = 2t/(1+t^2) */
  return make_rational_curve(
    ['/', ['-', 1, ['expt', 't', 2]], ['+', 1, ['expt', 't', 2]]],
    ['/', ['*', 2, 't'],             ['+', 1, ['expt', 't', 2]]],
    't'
  );
}

// ----------------------------------------------------------------------------
// Singularity Analysis
// ----------------------------------------------------------------------------

function is_singular_point(poly, x_val, y_val, var_x, var_y) {
  /* Check if (x_val, y_val) is a singular point of the curve f(x,y)=0.
     A point is singular if f=0 and all first partial derivatives vanish.
     (Simplified — full implementation requires symbolic evaluation.) */
  return {
    point: [x_val, y_val],
    f_value: 'needs-evaluation',
    singular_p: 'needs-evaluation'
  };
}

function count_nodes_and_cusps(poly) {
  /* Analyze a polynomial for ordinary double points (nodes) and cusps.
     Returns estimated count based on polynomial structure.
     (Simplified — actual implementation requires solving systems.) */
  return {nodes: 'to-be-computed', cusps: 'to-be-computed', polynomial: poly};
}

function milnor_number(singularity_type) {
  /* Return the Milnor number for common singularity types.
     A_n (nodes): n,  D_n: n,  E_6: 6,  E_7: 7,  E_8: 8 */
  if (Array.isArray(singularity_type) && singularity_type[0] === 'A') {
    return singularity_type[1];
  }
  if (Array.isArray(singularity_type) && singularity_type[0] === 'D') {
    return singularity_type[1];
  }
  if (singularity_type === 'E6') return 6;
  if (singularity_type === 'E7') return 7;
  if (singularity_type === 'E8') return 8;
  if (singularity_type === 'node') return 1;
  if (singularity_type === 'cusp') return 2;
  return null;
}

// ----------------------------------------------------------------------------
// Projective Geometry Utilities
// ----------------------------------------------------------------------------

function affine_to_projective(x, y) {
  /* Convert affine coordinates (x, y) to projective coordinates [x:y:1]. */
  return [x, y, 1];
}

function projective_to_affine(coords) {
  /* Convert projective coordinates [x:y:z] to affine coordinates (x/z, y/z).
     Returns null if z=0 (point at infinity). */
  const x = coords[0], y = coords[1], z = coords[2];
  if (z === 0) return null;
  return [x / z, y / z];
}

function projective_line_through_points(p1, p2) {
  /* Find the projective line through two points in P^2.
     Returns coefficients [a:b:c] such that ax + by + cz = 0. */
  const x1 = p1[0], y1 = p1[1], z1 = p1[2];
  const x2 = p2[0], y2 = p2[1], z2 = p2[2];
  return [
    y1*z2 - y2*z1,
    z1*x2 - z2*x1,
    x1*y2 - x2*y1
  ];
}

function projective_intersection(line1, line2) {
  /* Find the intersection point of two projective lines.
     Lines given as [a:b:c] representing ax + by + cz = 0. */
  const a1 = line1[0], b1 = line1[1], c1 = line1[2];
  const a2 = line2[0], b2 = line2[1], c2 = line2[2];
  return [
    b1*c2 - b2*c1,
    c1*a2 - c2*a1,
    a1*b2 - a2*b1
  ];
}

function cross_ratio(p1, p2, p3, p4) {
  /* Calculate the cross-ratio of four collinear points in projective space.
     Cross-ratio (p1,p2;p3,p4) = ((p1-p3)(p2-p4)) / ((p1-p4)(p2-p3)) */
  const num = (p1 - p3) * (p2 - p4);
  const den = (p1 - p4) * (p2 - p3);
  if (den === 0) return 'infinity';
  return num / den;
}

// ----------------------------------------------------------------------------
// Degree and Dimension Calculations
// ----------------------------------------------------------------------------

function hilbert_polynomial_curve(degree) {
  /* Return the Hilbert polynomial of a plane curve of given degree.
     For a curve C of degree d: P(n) = d*n + 1 - g  where g = (d-1)(d-2)/2 */
  const g = genus_smooth_plane_curve(degree);
  return (n) => degree * n + 1 - g;
}

function dimension_linear_system(degree, genus, num_points) {
  /* Estimate dimension of linear system |D| using Riemann-Roch.
     For a divisor D of degree d on a curve of genus g:
     dim|D| >= d - g  (with equality for d > 2g-2) */
  return Math.max(0, degree - genus);
}
