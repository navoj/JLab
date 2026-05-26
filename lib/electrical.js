// lib/electrical.js — Electrical Engineering functions for JLab
// Ported from JovansCalculator/my-electrical.lsp

// ── Capacitance ───────────────────────────────────────────────────────────────

function calculate_capacitance(area, k, thickness) {
  // C = (area * epsilon_0 * k) / thickness
  return (area * epsilon_0 * k) / thickness;
}

function calculate_capacitor_area(capacitance, k, thickness) {
  return (capacitance * thickness) / (epsilon_0 * k);
}

function calculate_capacitance_series(area1, area2, k1, k2, thickness1, thickness2) {
  var c1 = (area1 * epsilon_0 * k1) / thickness1;
  var c2 = (area2 * epsilon_0 * k2) / thickness2;
  return 1 / (1/c1 + 1/c2);
}

function calculate_capacitance_parallel(area1, area2, k1, k2, thickness1, thickness2) {
  var c1 = (area1 * epsilon_0 * k1) / thickness1;
  var c2 = (area2 * epsilon_0 * k2) / thickness2;
  return c1 + c2;
}

function calculate_capacitor_thickness(capacitance, k, area) {
  return (area * epsilon_0 * k) / capacitance;
}

function calculate_dielectric_constant(capacitance, thickness, area) {
  return (capacitance * thickness) / (area * epsilon_0);
}

// ── Gas Discharge ─────────────────────────────────────────────────────────────

function paschen_breakdown_voltage(pressure, gap) {
  // Paschen's law for gas discharge
  // pressure in kPa, gap in meters
  var gamma_se = 2204.21513347591;
  var A = 112.50 / 100;   // kPa·cm coefficient
  var B = 2727.50 / 100;  // V/(kPa·cm) coefficient
  var T1 = 1 + 1/gamma_se;
  var T2 = Math.log(Math.log(T1));
  var T3 = Math.log(A * pressure * gap);
  var T4 = T3 - T2;
  var T5 = B * pressure * gap;
  return T5 / T4;
}

// ── Diode ─────────────────────────────────────────────────────────────────────

function diode_current(v, is, n, vt, rs) {
  // Iteratively solve Shockley equation: I = Is*(exp((V-I*Rs)/(n*Vt)) - 1)
  var i = 1e-12;
  var tol = 1e-6;
  var maxIter = 100;
  for (var iter = 0; iter < maxIter; iter++) {
    var f  = is * (Math.exp((v - i * rs) / (n * vt)) - 1) - i;
    var df = is * (rs / (n * vt)) * Math.exp((v - i * rs) / (n * vt)) - 1;
    var iNew = i - f / df;
    if (Math.abs(iNew - i) < tol) return iNew;
    i = iNew;
  }
  return i;
}

// ── Tungsten Probe ────────────────────────────────────────────────────────────

function tungsten_probe_max_current(diameter) {
  var area = Math.PI * Math.pow(diameter / 2, 2);
  var imax = current_limit_tungsten * area;
  console.log('Tungsten probe of ' + diameter + ' m diameter: max current = ' + imax.toExponential(3) + ' A');
  return imax;
}

function tungsten_max_power(length, diameter, t_ambient, t_max) {
  var k     = 173; // thermal conductivity of tungsten W/(m·K)
  var area  = Math.PI * Math.pow(diameter / 2, 2);
  var delta_t = t_max - t_ambient;
  return k * area * delta_t / length;
}

function tungsten_current_limit_geo(length, diameter, pmax) {
  var rho  = 5.6e-8; // resistivity of tungsten (Ω·m)
  var area = Math.PI * Math.pow(diameter / 2, 2);
  var resistance = rho * length / area;
  return Math.sqrt(pmax / resistance);
}

// ── Copper ────────────────────────────────────────────────────────────────────

function copper_bulk_resistivity_fn(temperature) {
  var rho0  = 1.68e-8; // reference resistivity at 20 °C
  var T0    = 20;
  var alpha = 0.0039;  // temperature coefficient of copper
  var rho   = rho0 * (1 + alpha * (temperature - T0));
  console.log('Copper bulk resistivity at ' + temperature + ' °C: ' + rho.toExponential(4) + ' Ω·m');
  return rho;
}

function copper_film_thickness(sheet_resistance) {
  var thickness = copper_bulk_resistivity / sheet_resistance;
  console.log('Copper film thickness: ' + (thickness * 1e6).toFixed(4) + ' μm');
  return thickness;
}

// ── Power / dB conversions ────────────────────────────────────────────────────

function watts_to_dbm(power_watts) {
  return 10 + 10 * Math.log10(power_watts / 0.001);
}

function dbm_to_watts(power_dbm) {
  return 0.001 * Math.pow(10, power_dbm / 10);
}

function dbm_to_dbw(power_dbm)  { return power_dbm - 30; }
function dbw_to_dbm(power_dbw)  { return power_dbw + 30; }

function power_to_voltage(power, impedance) { return Math.sqrt(power * impedance); }
function voltage_to_power(voltage, impedance) { return voltage * voltage / impedance; }

// ── S-Parameters ──────────────────────────────────────────────────────────────

function reflection_coefficient(zload, z0) {
  return (zload - z0) / (zload + z0);
}

function vswr_from_reflection(gamma_magnitude) {
  return (1 + gamma_magnitude) / (1 - gamma_magnitude);
}

function reflection_from_vswr(vswr) {
  return (vswr - 1) / (vswr + 1);
}

function return_loss(gamma_magnitude) {
  return -20 * Math.log10(gamma_magnitude);
}

function insertion_loss_db(s21_magnitude) {
  return -20 * Math.log10(s21_magnitude);
}

// ── Transmission Line ─────────────────────────────────────────────────────────

function characteristic_impedance(inductance_per_length, capacitance_per_length) {
  return Math.sqrt(inductance_per_length / capacitance_per_length);
}

function propagation_velocity(inductance_per_length, capacitance_per_length) {
  return 1 / Math.sqrt(inductance_per_length * capacitance_per_length);
}

function electrical_length(physical_length, wavelength) {
  return 360 * physical_length / wavelength;
}

function wavelength_in_medium(frequency, velocity) {
  return velocity / frequency;
}

function cable_loss(loss_per_length, length_meters) {
  return loss_per_length * length_meters;
}

function cable_loss_with_frequency(loss_coeff, frequency_mhz, length_meters) {
  return loss_coeff * Math.sqrt(frequency_mhz) * length_meters;
}

function quarter_wave_transformer_impedance(z1, z2) {
  return Math.sqrt(z1 * z2);
}

function velocity_factor_coax(dielectric_constant) {
  return 1 / Math.sqrt(dielectric_constant);
}

// ── Noise ─────────────────────────────────────────────────────────────────────

function noise_figure_db(signal_in, signal_out, noise_in, noise_out) {
  var snr_in  = signal_in / noise_in;
  var snr_out = signal_out / noise_out;
  return 10 * Math.log10(snr_in / snr_out);
}

function noise_temperature(noise_figure_db_val) {
  return 290 * (Math.pow(10, noise_figure_db_val / 10) - 1);
}

function friis_noise_formula(nf1_db, nf2_db, gain1_db) {
  var nf1 = Math.pow(10, nf1_db / 10);
  var nf2 = Math.pow(10, nf2_db / 10);
  var g1  = Math.pow(10, gain1_db / 10);
  return 10 * Math.log10(nf1 + (nf2 - 1) / g1);
}

// ── Filters ───────────────────────────────────────────────────────────────────

function lowpass_cutoff_frequency(resistance, capacitance) {
  return 1 / (2 * Math.PI * resistance * capacitance);
}

function highpass_cutoff_frequency(resistance, capacitance) {
  return 1 / (2 * Math.PI * resistance * capacitance);
}

function q_factor_rlc(resistance, inductance, capacitance) {
  return Math.sqrt(inductance / capacitance) / resistance;
}

function resonant_frequency_lc(inductance, capacitance) {
  return 1 / (2 * Math.PI * Math.sqrt(inductance * capacitance));
}

// ── Antenna ───────────────────────────────────────────────────────────────────

function free_space_path_loss(distance_km, frequency_mhz) {
  return 20 * Math.log10(distance_km) + 20 * Math.log10(frequency_mhz) + 32.44;
}

function effective_radiated_power(tx_power_dbm, antenna_gain_dbi, cable_loss_db) {
  return tx_power_dbm + antenna_gain_dbi - cable_loss_db;
}

function link_budget(tx_power_dbm, tx_gain_dbi, rx_gain_dbi, path_loss_db, cable_losses_db) {
  return tx_power_dbm + tx_gain_dbi + rx_gain_dbi - path_loss_db - cable_losses_db;
}

function dipole_length(frequency_mhz) {
  return 150 / frequency_mhz;
}

function antenna_aperture(gain_dbi, frequency_hz) {
  var gain_ratio = Math.pow(10, gain_dbi / 10);
  var wavelength = c_light / frequency_hz;
  return (gain_ratio * wavelength * wavelength) / (4 * Math.PI);
}

// ── TDR ───────────────────────────────────────────────────────────────────────

function tdr_distance_to_fault(time_ns, velocity_factor) {
  return 0.5 * time_ns * 1e-9 * velocity_factor * c_light;
}

// ── Resistivity (Kelvin probe) ────────────────────────────────────────────────

function blanket_metal_resistance_colinear(sheet_res) {
  return (Math.log(2) * sheet_res) / Math.PI;
}
