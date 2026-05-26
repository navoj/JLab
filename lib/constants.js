// lib/constants.js — Physical constants for JLab
// Ported from JovansCalculator (my-electrical.lsp, my-chemistry.lsp, my-quantum.lsp)

// ── Mathematical ──────────────────────────────────────────────────────────────
var PI = Math.PI;

// ── Electromagnetic ───────────────────────────────────────────────────────────
var epsilon_0              = 8.854187817e-12;  // Permittivity of free space (F/m)
var mu_0                   = 4 * Math.PI * 1e-7; // Permeability of free space (H/m)
var c_light                = 2.99792458e8;     // Speed of light in vacuum (m/s)
var e_charge               = 1.602176634e-19;  // Elementary charge (C)

// ── Quantum mechanics ─────────────────────────────────────────────────────────
var h_planck               = 6.62607015e-34;   // Planck constant (J·s)
var hbar                   = h_planck / (2 * Math.PI); // Reduced Planck constant (J·s)
var k_boltzmann            = 1.380649e-23;     // Boltzmann constant (J/K)
var m_electron             = 9.1093837015e-31; // Electron mass (kg)
var m_proton               = 1.67262192369e-27;// Proton mass (kg)
var m_neutron              = 1.67492749804e-27;// Neutron mass (kg)
var a0_bohr                = 5.29177210903e-11;// Bohr radius (m)
var rydberg_inf            = 10973731.568160;  // Rydberg constant (m⁻¹)
var fine_structure         = 7.2973525693e-3;  // Fine-structure constant (dimensionless)
var stefan_boltzmann       = 5.670374419e-8;   // Stefan–Boltzmann constant (W/m²/K⁴)
var wien_constant          = 2.897771955e-3;   // Wien displacement law constant (m·K)

// ── Gravitational & cosmological ──────────────────────────────────────────────
var G_gravity              = 6.67430e-11;      // Gravitational constant (N·m²/kg²)

// ── Chemistry / thermodynamics ────────────────────────────────────────────────
var avogadro               = 6.02214076e23;    // Avogadro's number (mol⁻¹)
var gas_constant           = 8.314462618;      // Universal gas constant (J/mol/K)
var gas_constant_atm       = 0.082057;         // Gas constant (L·atm/mol/K)
var faraday_constant       = 96485.33212;      // Faraday constant (C/mol)
var atomic_mass_unit       = 1.66053906660e-27;// Atomic mass unit (kg)

// ── Electrical engineering ────────────────────────────────────────────────────
var copper_bulk_resistivity = 1.7e-8;          // Copper resistivity at 20 °C (Ω·m)
var current_limit_tungsten  = 3.73e7;          // Tungsten current density limit (A/m²)

console.log("JLab constants loaded. Type 'help()' for function reference.");
