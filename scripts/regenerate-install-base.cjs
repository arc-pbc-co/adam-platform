#!/usr/bin/env node
/**
 * Regenerate install-base.json from CSV data
 *
 * This script reads installbase_consolidated_raw.csv and groups printers by Site Key
 * to create install-base.json with proper site grouping and printer arrays.
 */

const fs = require('fs');
const path = require('path');

// Paths
const RAW_CSV = path.join(__dirname, '..', 'installbase_consolidated_raw.csv');
const OUTPUT_JSON = path.join(__dirname, '..', 'frontend', 'public', 'data', 'install-base.json');

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// Parse CSV content
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length - 2) { // Allow some flexibility
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

// Normalize product line
function normalizeProductLine(line) {
  const normalized = line.trim();
  if (normalized === 'Shop') return 'Shop';
  if (normalized === 'Studio') return 'Studio';
  if (normalized === 'InnX' || normalized === 'Innx') return 'InnX';
  return normalized;
}

// Main function
function main() {
  console.log('Reading CSV file...');

  // Read file
  const rawContent = fs.readFileSync(RAW_CSV, 'utf-8');
  const raw = parseCSV(rawContent);

  console.log(`Raw: ${raw.rows.length} printer records`);
  console.log(`Headers: ${raw.headers.join(', ')}`);

  // Group by Site Key
  const siteMap = new Map();

  raw.rows.forEach(row => {
    const siteKey = row['Site Key'];
    const serialNumber = row['Serial Number'];
    const productLine = normalizeProductLine(row['Product Line']);

    if (!siteKey || !serialNumber) return;

    if (!siteMap.has(siteKey)) {
      // First printer for this site - create site record
      const lat = parseFloat(row['lat']);
      const lng = parseFloat(row['lng']);

      // Determine product line flags
      const hasShop = productLine === 'Shop';
      const hasStudio = productLine === 'Studio';
      const hasInnX = productLine === 'InnX';

      siteMap.set(siteKey, {
        siteKey,
        siteName: row['Site Name'],
        street: row['Street'] || '',
        city: row['City'] || '',
        state: row['ST'] || '',
        zip: row['Zip'] || '',
        country: row['Country'] || 'US',
        latitude: isNaN(lat) ? 0 : lat,
        longitude: isNaN(lng) ? 0 : lng,
        priorityScore: parseFloat(row['Priority Score']) || 10,
        priorityTier: row['Priority Tier'] || 'C',
        contactName: row['Contact Name'] || '',
        contactEmail: row['Contact Email'] || '',
        contactPhone: row['Contact Phone'] || '',
        hasShop,
        hasStudio,
        hasInnX,
        printers: [{
          serialNumber,
          productLine
        }]
      });
    } else {
      // Add printer to existing site
      const site = siteMap.get(siteKey);

      // Avoid duplicate serial numbers
      if (!site.printers.find(p => p.serialNumber === serialNumber)) {
        site.printers.push({
          serialNumber,
          productLine
        });
      }

      // Update product line flags
      if (productLine === 'Shop') site.hasShop = true;
      if (productLine === 'Studio') site.hasStudio = true;
      if (productLine === 'InnX') site.hasInnX = true;
    }
  });

  console.log(`Grouped into ${siteMap.size} unique sites`);

  // Convert to sites array
  const sites = [];
  let index = 0;

  siteMap.forEach((siteData, siteKey) => {
    // Skip sites without valid coordinates
    if (siteData.latitude === 0 && siteData.longitude === 0) {
      console.log(`Skipping site without coordinates: ${siteData.siteName}`);
      return;
    }

    index++;
    sites.push({
      id: `site-${index}`,
      name: siteData.siteName,
      street: siteData.street,
      city: siteData.city,
      state: siteData.state,
      zip: siteData.zip,
      country: siteData.country,
      latitude: siteData.latitude,
      longitude: siteData.longitude,
      installations: siteData.printers.length,
      productLines: (siteData.hasShop ? 1 : 0) + (siteData.hasStudio ? 1 : 0) + (siteData.hasInnX ? 1 : 0),
      priorityScore: siteData.priorityScore,
      priorityTier: siteData.priorityTier,
      hasShop: siteData.hasShop,
      hasStudio: siteData.hasStudio,
      hasInnX: siteData.hasInnX,
      contactName: siteData.contactName,
      contactEmail: siteData.contactEmail,
      contactPhone: siteData.contactPhone,
      printers: siteData.printers
    });
  });

  console.log(`Generated ${sites.length} sites with coordinates`);

  // Stats
  let totalPrinters = 0;
  let shopCount = 0;
  let studioCount = 0;
  let innxCount = 0;

  sites.forEach(site => {
    totalPrinters += site.printers.length;
    site.printers.forEach(p => {
      if (p.productLine === 'Shop') shopCount++;
      if (p.productLine === 'Studio') studioCount++;
      if (p.productLine === 'InnX') innxCount++;
    });
  });

  console.log(`Total printers: ${totalPrinters}`);
  console.log(`  Shop: ${shopCount}`);
  console.log(`  Studio: ${studioCount}`);
  console.log(`  InnX: ${innxCount}`);

  // Verify a few key sites
  const ncState = sites.find(s => s.name.includes('North Carolina State'));
  if (ncState) {
    console.log(`\nVerification - North Carolina State University:`);
    console.log(`  State: ${ncState.state}`);
    console.log(`  City: ${ncState.city}`);
    console.log(`  Printers: ${ncState.printers.length}`);
  }

  // Write output
  const output = { sites };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));

  console.log(`\nWrote ${OUTPUT_JSON}`);
}

main();
