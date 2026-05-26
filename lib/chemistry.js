// lib/chemistry.js — Chemistry functions for JLab
// Ported from JovansCalculator/my-chemistry.lsp

// ── Gas Laws ──────────────────────────────────────────────────────────────────

function ideal_gas_law(pressure, volume, temperature, moles) {
  // PV = nRT  (gas_constant_atm in L·atm/mol/K)
  if (pressure   == null) return (moles * gas_constant_atm * temperature) / volume;
  if (volume     == null) return (moles * gas_constant_atm * temperature) / pressure;
  if (temperature== null) return (pressure * volume) / (moles * gas_constant_atm);
  if (moles      == null) return (pressure * volume) / (gas_constant_atm * temperature);
  return { P: pressure, V: volume, n: moles, T: temperature };
}

function boyles_law(p1, v1, p2, v2) {
  if (p2 == null) return (p1 * v1) / v2;
  if (v2 == null) return (p1 * v1) / p2;
  if (p1 == null) return (p2 * v2) / v1;
  if (v1 == null) return (p2 * v2) / p1;
  return p1 * v1;
}

function charles_law(v1, t1, v2, t2) {
  if (v2 == null) return (v1 * t2) / t1;
  if (t2 == null) return (v2 * t1) / v1;
  if (v1 == null) return (v2 * t1) / t2;
  if (t1 == null) return (v1 * t2) / v2;
  return v1 / t1;
}

function combined_gas_law(p1, v1, t1, p2, v2, t2) {
  if (p2 == null) return (p1 * v1 * t2) / (v2 * t1);
  if (v2 == null) return (p1 * v1 * t2) / (p2 * t1);
  if (t2 == null) return (p2 * v2 * t1) / (p1 * v1);
  if (p1 == null) return (p2 * v2 * t1) / (v1 * t2);
  if (v1 == null) return (p2 * v2 * t1) / (p1 * t2);
  if (t1 == null) return (p1 * v1) / (p2 * v2 * t2);
  return (p1 * v1) / t1;
}

// ── Solution Chemistry ────────────────────────────────────────────────────────

function molarity(moles, volume_liters)         { return moles / volume_liters; }
function molality(moles, mass_solvent_kg)       { return moles / mass_solvent_kg; }
function mole_fraction(moles_solute, moles_solvent) { return moles_solute / (moles_solute + moles_solvent); }

function dilution_equation(c1, v1, c2, v2) {
  if (c2 == null) return (c1 * v1) / v2;
  if (v2 == null) return (c1 * v1) / c2;
  if (c1 == null) return (c2 * v2) / v1;
  if (v1 == null) return (c2 * v2) / c1;
  return c1 * v1;
}

function mass_to_moles(mass, molecular_weight)  { return mass / molecular_weight; }
function moles_to_mass(moles, molecular_weight) { return moles * molecular_weight; }

// ── Equilibrium ───────────────────────────────────────────────────────────────

function equilibrium_constant(products, reactants) {
  return products.reduce((a,b)=>a*b,1) / reactants.reduce((a,b)=>a*b,1);
}

function henderson_hasselbalch(pka, conjugate_base_conc, weak_acid_conc) {
  return pka + Math.log10(conjugate_base_conc / weak_acid_conc);
}

function ph_from_hydrogen_ion(hydrogen_ion_conc) { return -Math.log10(hydrogen_ion_conc); }
function hydrogen_ion_from_ph(ph)                { return Math.pow(10, -ph); }
function poh_from_hydroxide_ion(oh_conc)         { return -Math.log10(oh_conc); }
function ph_poh_relation(ph_or_poh)              { return 14 - ph_or_poh; }

// Legacy aliases matching original Lisp names
function calculate_molarity(moles_solute, volume_liters)  { return molarity(moles_solute, volume_liters); }
function calculate_ph(h_plus_concentration)               { return ph_from_hydrogen_ion(h_plus_concentration); }
function calculate_poh(oh_minus_concentration)            { return poh_from_hydroxide_ion(oh_minus_concentration); }
function calculate_henderson_hasselbalch(pka, base, acid) { return henderson_hasselbalch(pka, base, acid); }

// ── Kinetics ──────────────────────────────────────────────────────────────────

function first_order_kinetics(initial_conc, rate_constant, time) {
  return initial_conc * Math.exp(-rate_constant * time);
}

function half_life_first_order(rate_constant) { return Math.log(2) / rate_constant; }

function arrhenius_equation(pre_exponential, activation_energy, temperature) {
  return pre_exponential * Math.exp(-activation_energy / (gas_constant * temperature));
}
function calculate_arrhenius_rate(pre_exponential, activation_energy, temperature) {
  return arrhenius_equation(pre_exponential, activation_energy, temperature);
}

// ── Thermochemistry ───────────────────────────────────────────────────────────

function gibbs_free_energy(enthalpy, entropy, temperature)  { return enthalpy - temperature * entropy; }
function calculate_gibbs_free_energy(delta_h, delta_s, temperature) { return gibbs_free_energy(delta_h, delta_s, temperature); }

function equilibrium_from_gibbs(gibbs_energy, temperature) {
  return Math.exp(-gibbs_energy / (gas_constant * temperature));
}

function heat_capacity_temperature(heat_capacity, mass, delta_temp) { return mass * heat_capacity * delta_temp; }
function enthalpy_combustion(moles_fuel, enthalpy_per_mole)         { return moles_fuel * enthalpy_per_mole; }

// ── Electrochemistry ──────────────────────────────────────────────────────────

function nernst_equation(standard_potential, electron_count, reaction_quotient, temperature) {
  return standard_potential - (gas_constant * temperature * Math.log(reaction_quotient)) /
         (electron_count * faraday_constant);
}
function calculate_nernst_equation(standard_potential, temperature, moles_electrons, reaction_quotient) {
  return nernst_equation(standard_potential, moles_electrons, reaction_quotient, temperature);
}

function faradays_law(current, time, electron_count) {
  return (current * time) / (electron_count * faraday_constant);
}

function cell_potential(cathode_potential, anode_potential) { return cathode_potential - anode_potential; }

// ── Molecular ─────────────────────────────────────────────────────────────────

function molecular_weight(atomic_weights, atom_counts) {
  return atomic_weights.reduce((sum, w, i) => sum + w * atom_counts[i], 0);
}
function percent_composition(element_mass, total_mass) { return (element_mass / total_mass) * 100; }
function density_gas(mol_weight, pressure, temperature) {
  return (mol_weight * pressure) / (gas_constant_atm * temperature);
}

// ── Spectroscopy ──────────────────────────────────────────────────────────────

function photon_energy_chemistry(wavelength_nm) {
  var wl_m = wavelength_nm * 1e-9;
  return (h_planck * c_light) / (wl_m * e_charge); // eV
}

function beer_lambert_law(molar_absorptivity, path_length, concentration) {
  return molar_absorptivity * path_length * concentration;
}

function concentration_from_absorbance(absorbance, molar_absorptivity, path_length) {
  return absorbance / (molar_absorptivity * path_length);
}

// ── Crystallography ───────────────────────────────────────────────────────────

function bragg_law(n, wavelength, d_spacing, theta) {
  if (wavelength == null) return (2 * d_spacing * Math.sin(theta)) / n;
  if (d_spacing  == null) return (n * wavelength) / (2 * Math.sin(theta));
  if (theta      == null) return Math.asin((n * wavelength) / (2 * d_spacing));
  if (n          == null) return (2 * d_spacing * Math.sin(theta)) / wavelength;
  return 2 * d_spacing * Math.sin(theta);
}

// ── Additional legacy functions ───────────────────────────────────────────────

function calculate_half_life_first_order(rate_constant)           { return half_life_first_order(rate_constant); }
function calculate_boiling_point_elevation(kb, molality_val)       { return kb * molality_val; }
function calculate_freezing_point_depression(kf, molality_val)     { return kf * molality_val; }

// ── Electron Orbital Visualization ───────────────────────────────────────────

function _factorial(n) {
  if (n <= 1) return 1;
  var result = 1;
  for (var i = 2; i <= n; i++) result *= i;
  return result;
}

function associated_laguerre(n, alpha, x) {
  if (n === 0) return 1.0;
  if (n === 1) return 1.0 + alpha - x;
  var l0 = 1.0, l1 = 1.0 + alpha - x, lk = 0.0;
  for (var k = 2; k <= n; k++) {
    lk = ((2*(k-1) + alpha + 1 - x) * l1 - ((k-1) + alpha) * l0) / k;
    l0 = l1; l1 = lk;
  }
  return lk;
}

function associated_legendre(l, m, x) {
  var absM = Math.abs(m);
  if (absM > l) return 0.0;
  var pmm = 1.0;
  if (absM > 0) {
    var somx2 = Math.sqrt(1.0 - x * x);
    var fact = 1.0;
    for (var i = 0; i < absM; i++) { pmm *= -fact * somx2; fact += 2.0; }
  }
  if (l === absM) return pmm;
  var pmm1 = x * (2.0 * absM + 1.0) * pmm;
  if (l === absM + 1) return pmm1;
  var pll = 0.0;
  for (var ll = absM + 2; ll <= l; ll++) {
    pll = ((2.0*ll - 1.0) * x * pmm1 - (ll + absM - 1.0) * pmm) / (ll - absM);
    pmm = pmm1; pmm1 = pll;
  }
  return pll;
}

function spherical_harmonic_real(l, m, theta, phi) {
  var absM = Math.abs(m);
  var norm = Math.sqrt((2.0*l + 1.0) / (4.0*Math.PI) *
                       _factorial(l - absM) / _factorial(l + absM));
  var plm = associated_legendre(l, absM, Math.cos(theta));
  if (m > 0) return norm * plm * Math.sqrt(2.0) * Math.cos(m * phi);
  if (m < 0) return norm * plm * Math.sqrt(2.0) * Math.sin(absM * phi);
  return norm * plm;
}

function radial_wavefunction(n, l, r) {
  var rho  = 2.0 * r / n;
  var norm = Math.sqrt(Math.pow(2.0/n, 3) *
             _factorial(n - l - 1) / (2.0 * n * Math.pow(_factorial(n + l), 3)));
  var lag  = associated_laguerre(n - l - 1, 2*l + 1, rho);
  return norm * Math.pow(rho, l) * Math.exp(-rho / 2.0) * lag;
}

function hydrogen_wavefunction_squared(n, l, m, r, theta, phi) {
  var R = radial_wavefunction(n, l, r);
  var Y = spherical_harmonic_real(l, m, theta, phi);
  return R * R * Y * Y;
}

function orbital_label(n, l, m) {
  var subshells = ['s','p','d','f','g','h','i'];
  return n + (subshells[l] || '?') + ' (m=' + m + ')';
}

function _orbital_max_radius(n) { return 4.0 * n * n; }

function _estimate_max_density(n, l, m, nSamples) {
  nSamples = nSamples || 5000;
  var rMax = _orbital_max_radius(n);
  var maxDensity = 0.0;
  for (var i = 0; i < nSamples; i++) {
    var r     = Math.random() * rMax;
    var theta = Math.random() * Math.PI;
    var phi   = Math.random() * 2.0 * Math.PI;
    var d = hydrogen_wavefunction_squared(n, l, m, r, theta, phi) * r * r * Math.sin(theta);
    if (d > maxDensity) maxDensity = d;
  }
  return maxDensity;
}

function generate_orbital_points(n, l, m, numPoints) {
  numPoints = numPoints || 2000;
  if (n < 1) throw new Error('n must be >= 1');
  if (l < 0 || l >= n) throw new Error('l must satisfy 0 <= l < n');
  if (m < -l || m > l) throw new Error('m must satisfy -l <= m <= l');
  var rMax = _orbital_max_radius(n);
  var maxDensity = 1.2 * _estimate_max_density(n, l, m, 10000);
  if (maxDensity < 1e-30) maxDensity = 1e-10;
  var xs = [], ys = [], zs = [];
  var maxAttempts = numPoints * 500;
  for (var attempt = 0; attempt < maxAttempts && xs.length < numPoints; attempt++) {
    var r         = Math.pow(Math.random(), 1/3) * rMax;
    var cosTheta  = 2.0 * Math.random() - 1.0;
    var theta     = Math.acos(cosTheta);
    var phi       = Math.random() * 2.0 * Math.PI;
    var density   = hydrogen_wavefunction_squared(n, l, m, r, theta, phi) * r * r;
    if (Math.random() * maxDensity < density) {
      var sinTheta = Math.sin(theta);
      xs.push(r * sinTheta * Math.cos(phi));
      ys.push(r * sinTheta * Math.sin(phi));
      zs.push(r * cosTheta);
    }
  }
  console.log('Generated ' + xs.length + ' points for ' + orbital_label(n, l, m) + ' orbital');
  console.log('(Coordinates in Bohr radii. Use xs/ys/zs from the returned object.)');
  return { xs: xs, ys: ys, zs: zs };
}
