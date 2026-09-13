const ConfigService = {
  getScriptProperty(key) {
    return PropertiesService.getScriptProperties().getProperty(key);
  },

  getJsonFromProperty(key) {
    const raw = this.getScriptProperty(key);
    if (!raw) {
      throw new Error(`Missing Script Property: ${key}`);
    }
    const normalizedRaw = this.normalizeJsonLikeString(raw);
    try {
      return JSON.parse(normalizedRaw);
    } catch (error) {
      return this.parseSimpleYamlMap(normalizedRaw);
    }
  },

  normalizeJsonLikeString(raw) {
    return String(raw)
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  },

  parseSimpleYamlMap(raw) {
    const normalizedRaw = this.normalizeJsonLikeString(raw)
      .trim()
      .replace(/^\{\s*/, '')
      .replace(/\s*\}$/, '');
    const lines = normalizedRaw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line !== '{' && line !== '}');
    const result = {};
    lines.forEach((line) => {
      line
        .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
          const idx = part.indexOf(':');
          if (idx === -1) {
            return;
          }
          const key = part.slice(0, idx).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          const value = part.slice(idx + 1).trim().replace(/,$/, '').replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          if (key && value) {
            result[key] = value;
          }
        });
    });
    if (!Object.keys(result).length) {
      throw new Error('Failed to parse JSON/YAML Script Property');
    }
    return result;
  },

  getGithubRawBaseUrl() {
    return this.getScriptProperty('GITHUB_RAW_BASE_URL');
  },

  getConceptManifestPath() {
    return this.getScriptProperty('CONCEPT_MANIFEST_PATH') || 'content/concepts/manifest.json';
  },

  getChannelMapPath() {
    return this.getScriptProperty('CHANNEL_MAP_PATH') || 'config/channel_interest_map.json';
  },

  getConceptWebhookUrl() {
    return this.getScriptProperty('DISCORD_WEBHOOK_URL');
  },

  getTrendWebhookMap() {
    return this.getJsonFromProperty('DISCORD_WEBHOOK_MAP_JSON');
  },

  getTrendWebhookUrl(webhookKey) {
    const webhookMap = this.getTrendWebhookMap();
    if (webhookMap[webhookKey]) {
      return webhookMap[webhookKey];
    }

    const normalizedTarget = String(webhookKey).trim().toLowerCase();
    const match = Object.keys(webhookMap).find(
      (key) => String(key).trim().toLowerCase() === normalizedTarget,
    );
    if (match) {
      return webhookMap[match];
    }

    throw new Error(`Missing webhook mapping for ${webhookKey}. Available keys: ${Object.keys(webhookMap).join(', ')}`);
  },

  getOpenAiKey() {
    return this.getScriptProperty('OPENAI_API_KEY');
  },

  getOpenAiModel() {
    return this.getScriptProperty('OPENAI_MODEL') || 'gpt-5.1';
  },

  getTrendHistorySheetId() {
    return this.getScriptProperty('TREND_HISTORY_SHEET_ID');
  },

  getTrendHistorySheetName() {
    return this.getScriptProperty('TREND_HISTORY_SHEET_NAME') || 'trend_history';
  }
};
