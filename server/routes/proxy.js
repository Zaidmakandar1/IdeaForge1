import express from 'express';
import axios from 'axios';

const router = express.Router();

// Proxy for /ai/prompts
router.get('/ai/prompts', async (req, res) => {
  try {
    const response = await axios.get('https://extensions.aitopia.ai/ai/prompts');
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error (ai/prompts):', error?.response?.data || error.message);
    res.status(500).json({ message: 'Proxy failed for ai/prompts' });
  }
});

// Proxy for /extensions/app/get_key
router.get('/extensions/app/get_key', async (req, res) => {
  try {
    const response = await axios.get('https://extensions.aitopia.ai/extensions/app/get_key');
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error (get_key):', error?.response?.data || error.message);
    res.status(500).json({ message: 'Proxy failed for get_key' });
  }
});

export default router; 