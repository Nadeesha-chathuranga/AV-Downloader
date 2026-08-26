const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

const TEMPLATES_FILE = path.join(__dirname, '../templates/templates.json');
const DEFAULTS_FILE = path.join(__dirname, '../templates/defaults.json');

const DANGEROUS_FLAGS = [
  '--rm', '--exec', '--run', '--power-shell',
  '--batch-file', '--delete',
];

const validateArgs = (args) => {
  const flagged = args.match(/--[a-zA-Z-]+/g) || [];
  for (const flag of flagged) {
    if (DANGEROUS_FLAGS.includes(flag.toLowerCase())) {
      return { valid: false, error: `Blocked dangerous flag: ${flag}` };
    }
  }
  if (/[;&|`$]/.test(args)) {
    return { valid: false, error: 'Shell characters (;, &, |, `, $) are not allowed' };
  }
  return { valid: true };
};

const loadTemplates = async () => {
  try {
    if (await fs.pathExists(TEMPLATES_FILE)) {
      return await fs.readJson(TEMPLATES_FILE);
    }
  } catch (e) {
    console.warn('Failed to load user templates:', e.message);
  }
  return [];
};

const saveTemplates = async (templates) => {
  await fs.ensureDir(path.dirname(TEMPLATES_FILE));
  await fs.writeJson(TEMPLATES_FILE, templates, { spaces: 2 });
};

const loadDefaults = async () => {
  try {
    if (await fs.pathExists(DEFAULTS_FILE)) {
      return await fs.readJson(DEFAULTS_FILE);
    }
  } catch (e) {
    console.warn('Failed to load default templates:', e.message);
  }
  return [];
};

// GET /api/templates - List all templates (defaults + user)
router.get('/', async (req, res) => {
  try {
    const defaults = await loadDefaults();
    const user = await loadTemplates();
    res.json({ defaults, templates: user });
  } catch (error) {
    console.error('Error loading templates:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

// POST /api/templates - Create a new template
router.post('/', async (req, res) => {
  try {
    const { name, description, args } = req.body;
    if (!name || !args) {
      return res.status(400).json({ error: 'Name and args are required' });
    }

    const validation = validateArgs(args);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const templates = await loadTemplates();
    const id = `user-${Date.now()}`;
    const now = new Date().toISOString();

    const template = {
      id,
      name,
      description: description || '',
      args,
      builtIn: false,
      createdAt: now,
      updatedAt: now,
    };

    templates.push(template);
    await saveTemplates(templates);

    res.json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id - Update a template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, args } = req.body;

    const templates = await loadTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (templates[index].builtIn) {
      return res.status(403).json({ error: 'Cannot edit built-in templates' });
    }

    if (args) {
      const validation = validateArgs(args);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    templates[index] = {
      ...templates[index],
      name: name || templates[index].name,
      description: description !== undefined ? description : templates[index].description,
      args: args || templates[index].args,
      updatedAt: new Date().toISOString(),
    };

    await saveTemplates(templates);
    res.json(templates[index]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id - Delete a template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templates = await loadTemplates();
    const template = templates.find((t) => t.id === id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.builtIn) {
      return res.status(403).json({ error: 'Cannot delete built-in templates' });
    }

    const filtered = templates.filter((t) => t.id !== id);
    await saveTemplates(filtered);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// GET /api/templates/validate - Validate yt-dlp args
router.get('/validate', (req, res) => {
  const { args } = req.query;
  if (!args) {
    return res.status(400).json({ error: 'args parameter is required' });
  }
  res.json(validateArgs(args));
});

module.exports = router;
