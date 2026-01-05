const express = require('express');
const cors = require('cors');
const nodeFetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS for your frontend
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Proxy endpoint for Nominatim reverse geocoding
app.get('/api/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon, zoom = 18, addressdetails = 1 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const response = await nodeFetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=${zoom}&addressdetails=${addressdetails}`,
      {
        headers: {
          'User-Agent': 'LogiTech-Logistics-App/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch address',
      message: error.message 
    });
  }
});

// Proxy endpoint for Nominatim forward geocoding
app.get('/api/geocode', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const response = await nodeFetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'LogiTech-Logistics-App/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ 
      error: 'Failed to search address',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🌍 Geocoding proxy server running on port ${PORT}`);
  console.log(`📍 Reverse geocoding: http://localhost:${PORT}/api/reverse-geocode?lat=LAT&lon=LON`);
  console.log(`🔍 Forward geocoding: http://localhost:${PORT}/api/geocode?q=ADDRESS`);
});
