import express from 'express';
import axios from 'axios';
import http from 'http'; // Use ESM import for http

const router = express.Router();

// POST /api/ai/generate-idea
router.post('/generate-idea', async (req, res) => {
  try {
    let { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });
    prompt = `Generate 5 innovative ideas for: ${prompt}. For each idea, provide:
1. A title (one line)
2. A 3-line description
3. 3-5 relevant tags (as a comma-separated list)
Format:
1. <Title>\n<Description line 1>\n<Description line 2>\n<Description line 3>\nTags: <tag1>, <tag2>, <tag3>[, <tag4>, <tag5>]
2. ... (repeat for all 5 ideas)
Only output 5 ideas, nothing else. Do not add explanations or follow-up questions.`;

    // Use native http for streaming
    const options = {
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const requestBody = JSON.stringify({
      model: 'gemma3:1b',
      prompt,
      stream: true,
    });

    let buffer = '';
    let ideasText = '';
    let finished = false;

    const ideaRegex = /\n?\d+\.\s+/g; // matches "1. ", "2. ", etc.

    const clientReq = http.request(options, (llmRes) => {
      llmRes.setEncoding('utf8');
      llmRes.on('data', (chunk) => {
        if (finished) return;
        // The LLM streams JSON objects, one per line
        const lines = chunk.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              buffer += json.response;
              // Count how many ideas are present
              const matches = buffer.match(ideaRegex);
              if (matches && matches.length >= 5) {
                // Find the end of the 5th idea
                const indices = [...buffer.matchAll(ideaRegex)].map(m => m.index);
                if (indices.length >= 5) {
                  // The start of the 6th idea or end of string
                  const endIdx = indices[5] || buffer.length;
                  ideasText = buffer.slice(0, endIdx);
                  finished = true;
                  clientReq.abort?.();
                  llmRes.destroy?.();
                  // Parse the ideas
                  const ideas = parseIdeasWithDescriptionAndTags(ideasText);
                  return res.json({ ideas });
                }
              }
            }
          } catch (e) {
            // Ignore parse errors for incomplete lines
          }
        }
      });
      llmRes.on('end', () => {
        if (!finished) {
          // Fallback: parse whatever we have
          const ideas = parseIdeasWithDescriptionAndTags(buffer);
          res.json({ ideas });
        }
      });
    });
    clientReq.on('error', (err) => {
      if (!finished) {
        console.error('LLM stream error:', err);
        res.status(500).json({ message: 'Failed to generate idea', error: err.message || err });
      }
    });
    clientReq.write(requestBody);
    clientReq.end();
  } catch (error) {
    // Log the full error object for debugging
    console.error('AI generation error:', error);
    if (error.response) {
      console.error('LLM response error:', error.response.data);
      return res.status(500).json({ message: 'Failed to generate idea', error: error.response.data });
    }
    res.status(500).json({ message: 'Failed to generate idea', error: error.message || error });
  }
});

// Helper to parse ideas with description and tags
function parseIdeasWithDescriptionAndTags(text) {
  // Split by numbered ideas
  const rawIdeas = text.split(/\n?\d+\.\s+/).map(s => s.trim()).filter(Boolean);
  return rawIdeas.slice(0, 5).map(raw => {
    // Expect: Title\nDesc1\nDesc2\nDesc3\nTags: ...
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const title = lines[0] || '';
    const description = lines.slice(1, 4).join(' ');
    let tags = [];
    const tagsLine = lines.find(l => l.toLowerCase().startsWith('tags:'));
    if (tagsLine) {
      tags = tagsLine.replace(/tags:/i, '').split(',').map(t => t.trim()).filter(Boolean);
    }
    return { title, description, tags };
  });
}

export default router; 