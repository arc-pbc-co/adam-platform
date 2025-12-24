/**
 * INTERSECT Edge Services
 *
 * This module exports the edge-deployed components of the ADAM Platform's
 * INTERSECT integration. These services run at the edge (lab floor) and
 * provide the bridge between ADAM's cloud services and physical instruments.
 *
 * Architecture:
 * - instrument-controller-sim: Simulated controller for testing
 * - instrument-controller-dm: Desktop Metal binder jetting printer controller
 *
 * Each controller implements the INTERSECT Instrument Controller capability
 * contract, exposing actions (instant operations) and activities (long-running
 * processes with progress tracking).
 */

// Simulated Controller (for testing)
export {
  SimulatedInstrumentController,
  createSimulatedController,
} from './instrument-controller-sim/SimulatedController';

// Desktop Metal Controller (production)
export {
  DesktopMetalController,
  createDesktopMetalController,
} from './instrument-controller-dm/DesktopMetalController';
