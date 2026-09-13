const ConceptService = {
  FIELD_LIMITS: {
    name: 256,
    value: 1024,
    count: 25,
    total: 6000,
  },

  runDailyConcept() {
    const manifest = GitHubService.fetchJson(ConfigService.getConceptManifestPath());
    const progress = HistoryService.getConceptProgress();
    const nextIndex = progress.lastIndex + 1;
    if (!manifest.order || nextIndex >= manifest.order.length) {
      Logger.log('No remaining concepts to post');
      return;
    }

    const nextPath = manifest.order[nextIndex];
    const markdown = GitHubService.fetchText(nextPath);
    const parsed = ConceptService.parseConceptMarkdown(markdown);
    const payload = ConceptService.buildConceptEmbed(parsed);
    DiscordService.sendWebhook(ConfigService.getConceptWebhookUrl(), payload);

    HistoryService.setConceptProgress({
      lastIndex: nextIndex,
      lastPath: nextPath,
      lastBriefingKey: parsed.briefing_key,
      lastPostedAt: Utils.nowIso(),
    });
  },

  parseConceptMarkdown(markdown) {
    const { frontmatterText, body } = Utils.parseFrontmatter(markdown);
    const meta = this.parseFrontmatterMap(frontmatterText);
    const sections = Utils.parseMarkdownSections(body);
    if (!meta.briefing_key || !meta.title || !meta.one_line) {
      throw new Error('Concept markdown frontmatter must include briefing_key, title, and one_line');
    }
    if (!sections.length) {
      throw new Error('Concept markdown must include at least one body section');
    }
    return {
      briefing_key: meta.briefing_key,
      title: meta.title,
      one_line: meta.one_line,
      track: meta.track || '',
      sections,
    };
  },

  parseFrontmatterMap(frontmatterText) {
    const result = {};
    frontmatterText.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      const index = trimmed.indexOf(':');
      if (index === -1) {
        return;
      }
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      value = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (key) {
        result[key] = value;
      }
    });
    return result;
  },

  buildConceptEmbed(parsed) {
    if (parsed.sections.length > this.FIELD_LIMITS.count) {
      throw new Error('Concept embed cannot contain more than 25 fields');
    }

    const embed = {
      title: parsed.title,
      description: parsed.one_line,
      color: 3447003,
      fields: parsed.sections.map((section) => {
        const fieldName = section.heading.toLowerCase() === 'source' ? '출처' : section.heading;
        const fieldValue = section.value;
        if (fieldName.length > this.FIELD_LIMITS.name) {
          throw new Error(`Concept section heading too long: ${fieldName}`);
        }
        if (fieldValue.length > this.FIELD_LIMITS.value) {
          throw new Error(`Concept section exceeds Discord field limit: ${fieldName}`);
        }
        return {
          name: fieldName,
          value: fieldValue,
          inline: false,
        };
      }),
    };

    const totalLength = embed.title.length
      + embed.description.length
      + embed.fields.reduce((acc, field) => acc + field.name.length + field.value.length, 0);
    if (totalLength > this.FIELD_LIMITS.total) {
      throw new Error('Concept embed exceeds Discord total embed length limit');
    }
    return { embeds: [embed] };
  }
};
