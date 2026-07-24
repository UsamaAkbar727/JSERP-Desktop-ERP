/**
 * Mock License Server for Development & Testing
 * 
 * This is a simple Express server that simulates a license verification API.
 * Use this for development and testing before integrating with your real license server.
 * 
 * To use:
 * 1. npm install express
 * 2. node scripts/mock-license-server.js
 * 3. Set LICENSE_API_URL=http://localhost:3001/api in your environment
 */

const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

// Simple in-memory license database
const licenses = {
  'TEST-1234-5678-ABCD': {
    licenseKey: 'TEST-1234-5678-ABCD',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    activationDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    features: ['export_data', 'advanced_reports', 'api_access'],
    maxActivations: 1,
    currentActivations: 0,
    status: 'active',
    activatedHardwareIds: []
  },
  'DEMO-AAAA-BBBB-CCCC': {
    licenseKey: 'DEMO-AAAA-BBBB-CCCC',
    customerName: 'Demo User',
    customerEmail: 'demo@example.com',
    activationDate: new Date().toISOString(),
    expiryDate: null, // Perpetual license
    features: ['basic_features'],
    maxActivations: 3,
    currentActivations: 0,
    status: 'active',
    activatedHardwareIds: []
  },
  'EXPIRED-1111-2222-3333': {
    licenseKey: 'EXPIRED-1111-2222-3333',
    customerName: 'Expired User',
    customerEmail: 'expired@example.com',
    activationDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // Expired 10 days ago
    features: [],
    maxActivations: 1,
    currentActivations: 1,
    status: 'expired',
    activatedHardwareIds: []
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock license server is running' });
});

// Activate license
app.post('/api/activate', (req, res) => {
  const { licenseKey, hardwareId, customerEmail, appVersion } = req.body;

  // Validate input
  if (!licenseKey || !hardwareId) {
    return res.status(400).json({
      success: false,
      message: 'License key and hardware ID are required',
      errorCode: 'INVALID_REQUEST'
    });
  }

  // Check if license exists
  const license = licenses[licenseKey];
  if (!license) {
    return res.status(404).json({
      success: false,
      message: 'License key not found',
      errorCode: 'NOT_FOUND'
    });
  }

  // Check if already activated on this hardware
  if (license.activatedHardwareIds.includes(hardwareId)) {
    return res.json({
      success: true,
      message: 'License already activated on this device',
      license: {
        ...license,
        currentActivations: license.activatedHardwareIds.length
      }
    });
  }

  // Check max activations
  if (license.activatedHardwareIds.length >= license.maxActivations) {
    return res.status(403).json({
      success: false,
      message: `License has reached maximum activations (${license.maxActivations})`,
      errorCode: 'MAX_ACTIVATIONS_REACHED'
    });
  }

  // Check if expired
  if (license.expiryDate && new Date(license.expiryDate) < new Date()) {
    return res.status(403).json({
      success: false,
      message: 'License has expired',
      errorCode: 'EXPIRED'
    });
  }

  // Activate
  license.activatedHardwareIds.push(hardwareId);
  license.currentActivations = license.activatedHardwareIds.length;
  license.activationDate = new Date().toISOString();

  res.json({
    success: true,
    message: 'License activated successfully',
    license: {
      ...license,
      currentActivations: license.activatedHardwareIds.length
    }
  });
});

// Verify license
app.post('/api/verify', (req, res) => {
  const { licenseKey, hardwareId } = req.body;


  // Validate input
  if (!licenseKey || !hardwareId) {
    return res.status(400).json({
      success: false,
      message: 'License key and hardware ID are required',
      errorCode: 'INVALID_REQUEST'
    });
  }

  // Check if license exists
  const license = licenses[licenseKey];
  if (!license) {
    return res.status(404).json({
      success: false,
      message: 'License key not found',
      errorCode: 'NOT_FOUND'
    });
  }

  // Check if activated on this hardware
  if (!license.activatedHardwareIds.includes(hardwareId)) {
    return res.status(403).json({
      success: false,
      message: 'License not activated on this device',
      errorCode: 'NOT_ACTIVATED'
    });
  }

  // Check if expired
  if (license.expiryDate && new Date(license.expiryDate) < new Date()) {
    license.status = 'expired';
    return res.status(403).json({
      success: false,
      message: 'License has expired',
      errorCode: 'EXPIRED',
      license: {
        ...license,
        currentActivations: license.activatedHardwareIds.length
      }
    });
  }

  res.json({
    success: true,
    message: 'License is valid',
    license: {
      ...license,
      currentActivations: license.activatedHardwareIds.length
    }
  });
});

// Check license status
app.get('/api/status', (req, res) => {
  const { licenseKey, hardwareId } = req.query;


  // Validate input
  if (!licenseKey || !hardwareId) {
    return res.status(400).json({
      success: false,
      message: 'License key and hardware ID are required',
      errorCode: 'INVALID_REQUEST'
    });
  }

  // Check if license exists
  const license = licenses[licenseKey];
  if (!license) {
    return res.status(404).json({
      success: false,
      message: 'License key not found',
      errorCode: 'NOT_FOUND'
    });
  }

  res.json({
    success: true,
    message: 'License status retrieved',
    license: {
      ...license,
      isActivatedOnThisDevice: license.activatedHardwareIds.includes(hardwareId),
      currentActivations: license.activatedHardwareIds.length
    }
  });
});

// Deactivate license
app.post('/api/deactivate', (req, res) => {
  const { licenseKey, hardwareId } = req.body;


  // Validate input
  if (!licenseKey || !hardwareId) {
    return res.status(400).json({
      success: false,
      message: 'License key and hardware ID are required',
      errorCode: 'INVALID_REQUEST'
    });
  }

  // Check if license exists
  const license = licenses[licenseKey];
  if (!license) {
    return res.status(404).json({
      success: false,
      message: 'License key not found',
      errorCode: 'NOT_FOUND'
    });
  }

  // Remove hardware ID from activated list
  const index = license.activatedHardwareIds.indexOf(hardwareId);
  if (index > -1) {
    license.activatedHardwareIds.splice(index, 1);
    license.currentActivations = license.activatedHardwareIds.length;
  }

  res.json({
    success: true,
    message: 'License deactivated successfully'
  });
});

// Start server
app.listen(PORT, () => {
  (`\n🔐 Mock License Server running on http://localhost:${PORT}`);
 
});
