# QanPrism Example Plugins 💎

This directory contains example plugins demonstrating QanPrism's extensibility.

---

## Quick Reference

| Plugin | Type | Description |
|--------|------|-------------|
| `yahoo-stock-data/` | Data Connector | Yahoo Finance stock prices and historical data |
| `custom-toolbar/` | UI Extension | Custom toolbar widgets (stock display, news feed) |
| `research-assistant/` | AI Agent | Financial research and analysis assistant |

---

## Installation Guide

To use an example plugin:

```bash
# Copy to your plugins directory
cp -r yahoo-stock-data ~/.qanprism/plugins/

# Restart QanPrism
npm run tauri dev
```

**Note**: These are examples for learning. Production plugins should be thoroughly tested.

---

## Plugin Manifest Format

All plugins must include a `manifest.json` or inline manifest:

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "type": "data-connector" | "ui-extension" | "ai-agent",
  "author": "Your Name",
  "description": "What this plugin does",
  "config": {
    "required": [],
    "optional": ["api_key"]
  }
}
```

---

## Development Tips

1. **Start Simple**: Begin with a data connector (easiest to implement)
2. **Test Locally**: Run your plugin in development mode first
3. **Document Everything**: Include usage examples in your README
4. **Handle Errors Gracefully**: Always catch and log errors

---

## Contributing Example Plugins

When submitting a new example plugin:

1. Create in this directory
2. Add comprehensive documentation
3. Include unit tests if possible
4. Follow the naming convention: `plugin-name/`

---

See [CONTRIBUTING.md](../../CONTRIBUTING.md#plugin-development) for plugin development guidelines.
