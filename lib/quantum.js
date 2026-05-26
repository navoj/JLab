// lib/quantum.js — Quantum mechanics functions for JLab
// Ported from JovansCalculator/my-quantum.lsp (XLisp-Stat)
// Translation: hyphenated-lisp-names → underscore_js_names
// Requires: constants.js loaded first (h_planck, hbar, k_boltzmann, e_charge,
//           m_electron, c_light, G_gravity, a0_bohr, epsilon_0, mu_0,
//           rydberg_inf, atomic_mass_unit, stefan_boltzmann, wien_constant,
//           fine_structure, PI)

// ============================================================
// Complex number helpers
// Complex numbers are represented as plain objects: {re, im}
// These helpers accept either a plain JS number or a {re,im} object.
// ============================================================

function make_complex(a, b) {
  return { re: a, im: b };
}

function _re(x) { return (typeof x === 'number') ? x : x.re; }
function _im(x) { return (typeof x === 'number') ? 0 : x.im; }

function _cadd(a, b) {
  return { re: _re(a) + _re(b), im: _im(a) + _im(b) };
}

function _cmul(a, b) {
  const ar = _re(a), ai = _im(a), br = _re(b), bi = _im(b);
  return { re: ar * br - ai * bi, im: ar * bi + ai * br };
}

function _cabs(z) {
  return Math.sqrt(_re(z) * _re(z) + _im(z) * _im(z));
}

function conjugate(z) {
  return { re: _re(z), im: -_im(z) };
}

// ============================================================
// Qubit structure
// Qubit = { amplitude_zero: complex, amplitude_one: complex }
// ============================================================

function make_qubit(amplitude_zero, amplitude_one) {
  return { amplitude_zero, amplitude_one };
}

function create_qubit(alpha, beta) {
  /* Create a qubit with the given complex amplitudes alpha and beta.
     Verifies normalization: |alpha|^2 + |beta|^2 == 1. */
  const magnitude = _re(alpha) ** 2 + _im(alpha) ** 2 +
                    _re(beta)  ** 2 + _im(beta)  ** 2;
  if (Math.abs(magnitude - 1) > 2e-5) {
    throw new Error('Amplitudes do not satisfy normalization: |alpha|^2 + |beta|^2 != 1');
  }
  return make_qubit(alpha, beta);
}

function display_qubit(q) {
  /* Display the quantum state of a qubit. */
  const fmtc = z => `(${_re(z).toFixed(6)} + ${_im(z).toFixed(6)}i)`;
  console.log(`Qubit State: alpha = ${fmtc(q.amplitude_zero)}, beta = ${fmtc(q.amplitude_one)}`);
}

// ============================================================
// Qubit gate operations
// ============================================================

function pauli_x(input_qubit) {
  /* Applies the Pauli-X (NOT) gate to a qubit — swaps |0> and |1> amplitudes. */
  return make_qubit(input_qubit.amplitude_one, input_qubit.amplitude_zero);
}

function superpose(input_qubit, alpha, beta) {
  /* Creates a superposition of a qubit with given complex coefficients alpha and beta. */
  const new_amplitude_zero = _cadd(
    _cmul(alpha, input_qubit.amplitude_zero),
    _cmul(beta,  input_qubit.amplitude_one)
  );
  const new_amplitude_one = _cadd(
    _cmul(alpha, input_qubit.amplitude_one),
    _cmul(beta,  input_qubit.amplitude_zero)
  );
  return make_qubit(new_amplitude_zero, new_amplitude_one);
}

function phase_shift(input_qubit, phi) {
  /* Applies a phase shift to the |1> amplitude of a qubit with phase phi (radians). */
  const phase_factor = make_complex(Math.cos(phi), Math.sin(phi));
  const new_amplitude_one = _cmul(input_qubit.amplitude_one, phase_factor);
  return make_qubit(input_qubit.amplitude_zero, new_amplitude_one);
}

// ============================================================
// de Broglie / wave-particle duality
// ============================================================

function de_broglie_wavelength(momentum) {
  /* Calculate de Broglie wavelength λ = h/p given momentum (kg·m/s). Returns λ in meters. */
  return h_planck / momentum;
}

function particle_wavelength(mass, velocity) {
  /* Calculate de Broglie wavelength given mass (kg) and velocity (m/s). */
  return h_planck / (mass * velocity);
}

// ============================================================
// Photon energy relations
// ============================================================

function photon_energy(frequency) {
  /* Calculate photon energy E = hf given frequency (Hz). Returns energy in Joules. */
  return h_planck * frequency;
}

function photon_energy_wavelength(wavelength) {
  /* Calculate photon energy E = hc/λ given wavelength (m). Returns energy in Joules. */
  return (h_planck * c_light) / wavelength;
}

function energy_frequency_relation(energy) {
  /* Calculate frequency f = E/h from photon energy (Joules). Returns frequency in Hz. */
  return energy / h_planck;
}

function momentum_wavelength_relation(wavelength) {
  /* Calculate momentum p = h/λ from wavelength (m). Returns momentum in kg·m/s. */
  return h_planck / wavelength;
}

// ============================================================
// Hydrogen atom
// ============================================================

function hydrogen_energy_level(n) {
  /* Calculate energy of hydrogen atom at principal quantum number n.
     Returns energy in eV (negative — bound state). */
  const rydberg_energy = 13.6; // eV
  return -rydberg_energy / (n * n);
}

function hydrogen_ionization_energy(n) {
  /* Calculate ionization energy from level n (in eV). */
  return Math.abs(hydrogen_energy_level(n));
}

function bohr_radius(n) {
  /* Calculate the Bohr radius for the nth orbital of hydrogen. Returns radius in meters. */
  return a0_bohr * n * n;
}

function orbital_velocity(n) {
  /* Calculate orbital velocity of electron in nth Bohr orbit (m/s). */
  return (fine_structure * c_light) / n;
}

// ============================================================
// Quantum oscillator / particle in a box
// ============================================================

function quantum_harmonic_oscillator_energy(n) {
  /* Calculate energy levels of quantum harmonic oscillator E_n = ħω(n + 1/2).
     Uses ω = 1 (normalized/dimensionless case). */
  const omega = 1;
  return hbar * omega * (n + 0.5);
}

function particle_in_box_energy(n, length, mass) {
  /* Calculate energy levels for a particle in a 1D infinite square well.
     E_n = n²h²/(8mL²). Returns energy in Joules. */
  return (n * n * h_planck * h_planck) / (8 * mass * length * length);
}

// ============================================================
// Quantum tunneling
// ============================================================

function tunnel_probability(barrier_width, barrier_height, particle_energy, mass) {
  /* Calculate quantum tunneling probability through a rectangular barrier.
     Uses the WKB-exact transmission formula. Returns probability in [0,1]. */
  if (particle_energy > barrier_height) return 1.0; // classical case
  const k = Math.sqrt((2 * mass * (barrier_height - particle_energy)) / (hbar * hbar));
  const sin_kd = Math.sin(k * barrier_width);
  return 1 / (1 + (barrier_height * barrier_height * sin_kd * sin_kd) /
                   (4 * particle_energy * (barrier_height - particle_energy)));
}

function calculate_tunneling_probability(v0, e, width, mass) {
  /* Calculate tunneling probability via WKB approximation T ≈ exp(-2κL).
     v0 = barrier height (J), e = particle energy (J),
     width = barrier width (m), mass = particle mass (kg). */
  if (e >= v0) return 1.0; // classical case
  const kappa = Math.sqrt((2 * mass * (v0 - e)) / (hbar * hbar));
  return Math.exp(-2 * kappa * width);
}

// ============================================================
// Wavefunction operations
// ============================================================

function wavefunction_probability(amplitude) {
  /* Calculate probability density |ψ|² from a (complex) wavefunction amplitude. */
  const r = _re(amplitude), i = _im(amplitude);
  return r * r + i * i;
}

function normalize_wavefunction(amplitudes) {
  /* Normalize an array of complex wavefunction amplitudes so Σ|ψ_i|² = 1. */
  const norm_squared = amplitudes.reduce((s, a) => s + wavefunction_probability(a), 0);
  const norm = Math.sqrt(norm_squared);
  return amplitudes.map(amp => ({ re: _re(amp) / norm, im: _im(amp) / norm }));
}

function matrix_vector_multiply(matrix, vector) {
  /* Multiply a 2D matrix by a vector. Elements may be real numbers or {re,im} objects. */
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = [];
  for (let i = 0; i < rows; i++) {
    let sum = { re: 0, im: 0 };
    for (let j = 0; j < cols; j++) {
      sum = _cadd(sum, _cmul(matrix[i][j], vector[j]));
    }
    result.push(sum);
  }
  return result;
}

function expectation_value(observable_matrix, wavefunction) {
  /* Calculate quantum expectation value <ψ|Ô|ψ>.
     observable_matrix: 2D array (real or complex entries).
     wavefunction: array of complex amplitudes {re,im}.
     Returns a complex number (imaginary part ≈ 0 for Hermitian observables). */
  const psi_conj = wavefunction.map(amp => conjugate(amp));
  const o_psi    = matrix_vector_multiply(observable_matrix, wavefunction);
  let sum = { re: 0, im: 0 };
  for (let k = 0; k < psi_conj.length; k++) {
    sum = _cadd(sum, _cmul(psi_conj[k], o_psi[k]));
  }
  return sum;
}

function uncertainty_principle(delta_x, delta_p) {
  /* Check Heisenberg uncertainty principle ΔxΔp ≥ ħ/2.
     Returns { satisfied, product, minimum }. */
  const minimum = hbar / 2;
  return {
    satisfied: (delta_x * delta_p) >= minimum,
    product:   delta_x * delta_p,
    minimum
  };
}

// ============================================================
// Compton scattering
// ============================================================

function compton_wavelength(mass) {
  /* Calculate Compton wavelength λ_c = h/(mc). Returns wavelength in meters. */
  return h_planck / (mass * c_light);
}

function compton_scattering_wavelength(initial_wavelength, theta) {
  /* Calculate wavelength after Compton scattering at angle theta (radians).
     Δλ = λ_c(1 - cosθ). */
  return initial_wavelength + compton_wavelength(m_electron) * (1 - Math.cos(theta));
}

// ============================================================
// Blackbody radiation
// ============================================================

function blackbody_energy_density(temperature, frequency) {
  /* Calculate spectral energy density for blackbody radiation (Planck's law).
     u(ν,T) = 8πhν³/[c³(e^{hν/kT} − 1)]. Returns energy density in J/m³/Hz. */
  const hf  = h_planck * frequency;
  const kT  = k_boltzmann * temperature;
  const exp = Math.exp(hf / kT);
  return (8 * PI * h_planck * Math.pow(frequency, 3)) /
         (Math.pow(c_light, 3) * (exp - 1));
}

function wien_displacement_law(temperature) {
  /* Calculate peak wavelength for a blackbody at given temperature (K).
     λ_max = b/T where b is Wien's displacement constant. Returns wavelength in meters. */
  return wien_constant / temperature;
}

function stefan_boltzmann_law(temperature) {
  /* Calculate total radiated power per unit area (W/m²) using Stefan-Boltzmann law.
     j* = σT⁴. */
  return stefan_boltzmann * Math.pow(temperature, 4);
}

// ============================================================
// Spin and magnetic effects
// ============================================================

function spin_eigenvalue(s, ms) {
  /* Calculate spin eigenvalue contribution m_s·ħ·√(s²+s) = m_s·ħ·√(s(s+1))
     for spin quantum number s and magnetic quantum number ms. */
  return hbar * ms * Math.sqrt(s * s + s);
}

function zeeman_energy(magnetic_field, ms, g_factor) {
  /* Calculate energy shift due to Zeeman effect (J).
     ΔE = -g·μ_B·B·m_s  where μ_B is the Bohr magneton (9.2740100783e-24 J/T). */
  const bohr_magneton = 9.2740100783e-24; // J/T
  return -g_factor * bohr_magneton * magnetic_field * ms;
}

// ============================================================
// Paschen series
// ============================================================

function paschen_wavelength(n) {
  /* Calculate the wavelength for the Paschen series (m=3) spectral line.
     n must be > 3. Returns wavelength in nanometers. */
  const m = 3;
  const inverse_wavelength = rydberg_inf * (1.0 / (m * m) - 1.0 / (n * n));
  return (1.0 / inverse_wavelength) * 1e9; // meters → nanometers
}

// ============================================================
// Hydrogen-like atoms (atomic number Z)
// ============================================================

function calculate_bohr_radius(n, z) {
  /* Calculate the Bohr radius for a hydrogen-like atom with atomic number z
     at principal quantum number n. Returns radius in meters. */
  return (a0_bohr * n * n) / z;
}

function calculate_energy_level(n, z) {
  /* Calculate the energy level of a hydrogen-like atom in eV.
     E_n = -13.6·Z²/n². */
  const rydberg_energy = 13.6; // eV
  return -(rydberg_energy * z * z) / (n * n);
}

// ============================================================
// Photon calculations (alternative entry points)
// ============================================================

function calculate_photon_energy(wavelength) {
  /* Calculate the energy of a photon given its wavelength in meters.
     Returns energy in Joules. */
  return (h_planck * c_light) / wavelength;
}

function calculate_photon_wavelength(energy) {
  /* Calculate the wavelength of a photon given its energy in Joules.
     Returns wavelength in meters. */
  return (h_planck * c_light) / energy;
}

function calculate_de_broglie_wavelength(mass, velocity) {
  /* Calculate the de Broglie wavelength λ = h/(mv). Returns wavelength in meters. */
  return h_planck / (mass * velocity);
}

// ============================================================
// Electromagnetic calculations
// ============================================================

function calculate_coulomb_force(q1, q2, r) {
  /* Calculate the Coulomb force between two point charges.
     q1, q2 = charges (C), r = distance (m). Returns force in Newtons. */
  const k = 1 / (4 * PI * epsilon_0);
  return (k * q1 * q2) / (r * r);
}

function calculate_electric_field(q, r) {
  /* Calculate the electric field magnitude due to a point charge.
     q = charge (C), r = distance (m). Returns field in V/m. */
  const k = 1 / (4 * PI * epsilon_0);
  return (k * q) / (r * r);
}

function calculate_magnetic_field(current, distance) {
  /* Calculate the magnetic field due to an infinite straight current-carrying wire.
     current = current (A), distance = perpendicular distance (m). Returns field in Tesla. */
  return (mu_0 * current) / (2 * PI * distance);
}

function calculate_lorentz_force(q, e_field, v, b_field) {
  /* Calculate the Lorentz force F = q(E + v×B) on a charged particle.
     e_field, v, b_field are [x,y,z] arrays. Returns force as [Fx, Fy, Fz] in Newtons. */
  const [ex, ey, ez] = e_field;
  const [vx, vy, vz] = v;
  const [bx, by, bz] = b_field;
  // v × B cross product
  const cross_x = vy * bz - vz * by;
  const cross_y = vz * bx - vx * bz;
  const cross_z = vx * by - vy * bx;
  return [
    q * (ex + cross_x),
    q * (ey + cross_y),
    q * (ez + cross_z)
  ];
}

function calculate_compton_wavelength(mass) {
  /* Calculate the Compton wavelength of a particle λ_c = h/(mc). Returns wavelength in meters. */
  return h_planck / (mass * c_light);
}

// ============================================================
// Fundamental constants derivations
// ============================================================

function calculate_rydberg_constant(atomic_mass) {
  /* Calculate the Rydberg constant for a given atomic mass (in atomic mass units, u).
     Corrects R_∞ for finite nuclear mass via reduced mass. */
  const m_nucleus   = atomic_mass * atomic_mass_unit;
  const reduced_mass = (m_electron * m_nucleus) / (m_electron + m_nucleus);
  return rydberg_inf * (reduced_mass / m_electron);
}

function calculate_fine_structure_constant() {
  /* Calculate the fine-structure constant α = e²/(4πε₀ħc) ≈ 1/137. */
  return (e_charge * e_charge) / (4 * PI * epsilon_0 * hbar * c_light);
}

function calculate_planck_length() {
  /* Calculate the Planck length l_P = √(ħG/c³) in meters. */
  return Math.sqrt((hbar * G_gravity) / Math.pow(c_light, 3));
}

function calculate_planck_mass() {
  /* Calculate the Planck mass m_P = √(ħc/G) in kilograms. */
  return Math.sqrt((hbar * c_light) / G_gravity);
}

function calculate_planck_time() {
  /* Calculate the Planck time t_P = √(ħG/c⁵) in seconds. */
  return Math.sqrt((hbar * G_gravity) / Math.pow(c_light, 5));
}

function calculate_planck_temperature() {
  /* Calculate the Planck temperature T_P = m_P·c²/k_B in Kelvin. */
  return calculate_planck_mass() * c_light * c_light / k_boltzmann;
}

// ============================================================
// Gravitational & astrophysics
// ============================================================

function calculate_schwarzschild_radius(mass) {
  /* Calculate the Schwarzschild radius of a black hole r_s = 2GM/c². Returns radius in meters. */
  return (2 * G_gravity * mass) / (c_light * c_light);
}

function calculate_hawking_temperature(mass) {
  /* Calculate the Hawking temperature of a black hole T_H = ħc³/(8πGMk_B). Returns T in Kelvin. */
  return (hbar * Math.pow(c_light, 3)) /
         (8 * PI * G_gravity * mass * k_boltzmann);
}

function calculate_gravitational_force(m1, m2, r) {
  /* Calculate the gravitational force F = Gm₁m₂/r². Returns force in Newtons. */
  return (G_gravity * m1 * m2) / (r * r);
}

function calculate_gravitational_potential_energy(m1, m2, r) {
  /* Calculate gravitational potential energy U = -Gm₁m₂/r. Returns energy in Joules (negative). */
  return -(G_gravity * m1 * m2) / r;
}

function calculate_escape_velocity(mass, radius) {
  /* Calculate escape velocity v_e = √(2GM/r). Returns velocity in m/s. */
  return Math.sqrt((2 * G_gravity * mass) / radius);
}

function calculate_orbital_velocity(mass, radius, altitude) {
  /* Calculate circular orbital velocity v = √(GM/(r+h)).
     mass = central body mass (kg), radius = body radius (m), altitude = orbit height (m). */
  return Math.sqrt((G_gravity * mass) / (radius + altitude));
}

// ============================================================
// Special relativity
// ============================================================

function calculate_time_dilation(velocity) {
  /* Calculate the Lorentz factor γ = 1/√(1−β²).
     velocity is given as a fraction of c (e.g. 0.99 = 99%c). */
  return 1 / Math.sqrt(1 - velocity * velocity);
}

function calculate_length_contraction(length, velocity) {
  /* Calculate the contracted length L = L₀·√(1−β²).
     velocity is given as a fraction of c. Returns contracted length in the same units as length. */
  return length * Math.sqrt(1 - velocity * velocity);
}

function calculate_relativistic_mass(mass, velocity) {
  /* Calculate relativistic (apparent) mass m_rel = γ·m₀.
     velocity is given as a fraction of c. */
  return mass * calculate_time_dilation(velocity);
}

function calculate_relativistic_kinetic_energy(mass, velocity) {
  /* Calculate relativistic kinetic energy KE = (γ−1)·m₀c².
     velocity is given as a fraction of c. Returns energy in Joules. */
  const gamma = calculate_time_dilation(velocity);
  return mass * c_light * c_light * (gamma - 1);
}

function calculate_mass_energy_equivalence(mass) {
  /* Calculate energy equivalent E = mc². Returns energy in Joules. */
  return mass * c_light * c_light;
}

// ============================================================
// Pauli matrices and non-Abelian braiding
// ============================================================

function pauli_matrices() {
  /* Return the three Pauli matrices as 2×2 arrays of {re,im} complex objects.
     Returns [σx, σy, σz]. */
  const sigma_x = [
    [make_complex(0, 0), make_complex(1, 0)],
    [make_complex(1, 0), make_complex(0, 0)]
  ];
  const sigma_y = [
    [make_complex(0, 0),  make_complex(0, -1)],
    [make_complex(0, 1),  make_complex(0,  0)]
  ];
  const sigma_z = [
    [make_complex(1, 0),  make_complex(0, 0)],
    [make_complex(0, 0),  make_complex(-1, 0)]
  ];
  return [sigma_x, sigma_y, sigma_z];
}

function braiding_matrix(sigma) {
  /* Generate braiding matrix for non-Abelian anyon statistics.
     sigma = 1, 2, or 3 selects which Pauli matrix to use.
     Returns R = (1/√2)(I + iσ_k) as a 2×2 array of {re,im} objects. */
  const s = 1 / Math.sqrt(2);
  const result = [[null, null], [null, null]];
  if (sigma === 1) {
    // R = (1/√2)((1, i)(i, 1))
    result[0][0] = make_complex(s, 0);
    result[0][1] = make_complex(0, s);
    result[1][0] = make_complex(0, s);
    result[1][1] = make_complex(s, 0);
  } else if (sigma === 2) {
    // R = (1/√2)((1, 1)(-1, 1))
    result[0][0] = make_complex(s,  0);
    result[0][1] = make_complex(s,  0);
    result[1][0] = make_complex(-s, 0);
    result[1][1] = make_complex(s,  0);
  } else if (sigma === 3) {
    // R = (1/√2)((1+i, 0)(0, 1-i))
    result[0][0] = make_complex(s,  s);
    result[0][1] = make_complex(0,  0);
    result[1][0] = make_complex(0,  0);
    result[1][1] = make_complex(s, -s);
  } else {
    throw new Error('braiding_matrix: sigma must be 1, 2, or 3');
  }
  return result;
}

function matrix_2x2_multiply(a, b) {
  /* Multiply two 2×2 complex matrices (elements are {re,im} objects or plain numbers). */
  const result = [[null, null], [null, null]];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      result[i][j] = _cadd(_cmul(a[i][0], b[0][j]),
                           _cmul(a[i][1], b[1][j]));
    }
  }
  return result;
}

function simulate_braiding() {
  /* Simulate braiding operations in non-Abelian anyon systems.
     Demonstrates that R1·R2 ≠ R2·R1 (non-Abelian property).
     Returns [R1*R2, R2*R1]. */
  const r1    = braiding_matrix(1);
  const r2    = braiding_matrix(2);
  const r1_r2 = matrix_2x2_multiply(r1, r2);
  const r2_r1 = matrix_2x2_multiply(r2, r1);

  const fmt = z => {
    const re = _re(z).toFixed(4), im = _im(z).toFixed(4);
    return `${re}${im >= 0 ? '+' : ''}${im}i`;
  };
  const mat_str = (m) =>
    `  [[${fmt(m[0][0])}, ${fmt(m[0][1])}]\n   [${fmt(m[1][0])}, ${fmt(m[1][1])}]]`;

  console.log('Braiding Matrix R1 (σx):');
  console.log(mat_str(r1));
  console.log('\nBraiding Matrix R2 (σy):');
  console.log(mat_str(r2));
  console.log('\nR1 * R2:');
  console.log(mat_str(r1_r2));
  console.log('\nR2 * R1:');
  console.log(mat_str(r2_r1));
  console.log('\nNon-Abelian property: R1*R2 ≠ R2*R1');

  return [r1_r2, r2_r1];
}

console.log('JLab quantum.js loaded.');
