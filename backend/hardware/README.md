# ADAM Hardware Integration Layer

This module provides integration with Desktop Metal additive manufacturing hardware fleet.

## Overview

The hardware integration layer enables ADAM to:
- Connect to Desktop Metal Live Suite API
- Submit print jobs to the printer fleet
- Monitor job status and progress
- Track hardware telemetry and health
- Manage job queues and scheduling
- Handle hardware errors and recovery

## Architecture

```
Controller Agent (Nova)
       ↓
Hardware Service
       ↓
Desktop Metal API Client
       ↓
Live Suite API
       ↓
Physical Hardware Fleet
```

## Hardware Fleet

### Supported Printers

1. **X25 Pro** - Production metal/ceramic printing
2. **Shop System** - Batch metal production
3. **X160 Pro** - Industrial ceramic printing
4. **InnoventX** - R&D open architecture
5. **ETEC Xtreme 8K** - Polymer DLP printing
6. **Shop System Ceramics** - Technical ceramics

## Configuration

Set environment variables in `.env.backend`:

```bash
DESKTOP_METAL_API_KEY=your_api_key_here
DESKTOP_METAL_API_URL=https://live.desktopmetal.com/api/v1
DESKTOP_METAL_ORG_ID=your_organization_id
```

## Usage

See individual service files for detailed API documentation.
