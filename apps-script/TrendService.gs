const TrendService = {
  FIELD_LIMITS: {
    topic: 220,
    core: 700,
    reason: 700,
    terms: 320,
    question: 120,
    source: 500,
  },

  CAUTION_MESSAGE:
    '주의: 이 브리핑은 최신 source를 바탕으로 GPT가 요약한 내용입니다. 해석 오류나 누락 가능성이 있으니 원문 출처를 함께 확인하세요.',

  runWeeklyTrends() {
    const config = GitHubService.fetchJson(ConfigService.getChannelMapPath());
    const channels = (config.channels || []).filter((channel) => channel.enabled);
    Logger.log(`TrendService:enabled_channels count=${channels.length}`);

    if (!channels.length) {
      throw new Error('No enabled trend channels configured.');
    }

    channels.forEach((channel) => {
      Logger.log(`TrendService:channel_start key=${channel.channel_key} interests=${(channel.interests || []).join(',')}`);
      const sections = [];
      (channel.interests || []).slice(0, channel.max_topics || 1).forEach((interest) => {
        const sources = this.fetchSourcesForInterest(interest, 3);
        Logger.log(`TrendService:interest_fetch key=${channel.channel_key} interest=${interest} fetched=${sources.length}`);
        const freshSources = sources.filter(
          (source) => !HistoryService.hasSeenSource(channel.channel_id, interest, Utils.normalizeArxivUrl(source.url))
        );
        Logger.log(`TrendService:interest_fresh key=${channel.channel_key} interest=${interest} fresh=${freshSources.length}`);
        if (!freshSources.length) {
          Logger.log(`No fresh trend sources for ${channel.channel_key}:${interest}`);
          return;
        }

        const prompt = this.buildPrompt(interest, freshSources);
        Logger.log(`TrendService:interest_prompt key=${channel.channel_key} interest=${interest} source_count=${freshSources.length}`);
        const response = OpenAIService.generateTrendBrief(prompt);
        const generated = this.normalizeTrendOutput(response);
        Logger.log(`TrendService:interest_generated key=${channel.channel_key} interest=${interest} title=${generated.title}`);
        sections.push({ interest, generated, sources: freshSources });
      });

      if (!sections.length) {
        Logger.log(`No fresh trend sections for ${channel.channel_key}`);
        return;
      }

      const webhookUrl = ConfigService.getTrendWebhookUrl(channel.webhook_key);

      const payload = this.buildTrendEmbed(channel.channel_key, sections);
      Logger.log(`TrendService:channel_post key=${channel.channel_key} section_count=${sections.length}`);
      DiscordService.sendWebhook(webhookUrl, payload);
      Logger.log(`TrendService:channel_posted key=${channel.channel_key}`);

      sections.forEach((section) => {
        section.sources.forEach((source) => {
          HistoryService.appendTrendHistoryRow({
            channel_key: channel.channel_key,
            channel_id: channel.channel_id,
            interest: section.interest,
            source_url: Utils.normalizeArxivUrl(source.url),
            source_title: source.title,
            published_at: source.published_at,
            posted_at: Utils.nowIso(),
            brief_title: section.generated.title,
          });
        });
      });
      Logger.log(`TrendService:history_written key=${channel.channel_key}`);
    });
  },

  fetchSourcesForInterest(interest, maxResults) {
    const sources = this.fetchArxivApiSources(interest, maxResults);
    if (sources.length) {
      return sources;
    }
    return this.fetchArxivRssSources(interest, maxResults);
  },

  fetchArxivApiSources(interest, maxResults) {
    try {
      Logger.log(`TrendService:arxiv_api_start interest=${interest} maxResults=${maxResults}`);
      const response = UrlFetchApp.fetch(Utils.buildArxivUrl(interest, maxResults), {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Discord-Bot/1.0 (GAS trend fetch)' },
      });
      const status = response.getResponseCode();
      Logger.log(`TrendService:arxiv_api_status interest=${interest} status=${status}`);
      if (status === 429) {
        Logger.log(`arXiv API rate limited for ${interest}`);
        return [];
      }
      if (status < 200 || status >= 300) {
        throw new Error(`arXiv API failed: ${status}`);
      }
      return this.parseArxivAtom(response.getContentText()).slice(0, maxResults);
    } catch (error) {
      Logger.log(`arXiv API fetch failed for ${interest}: ${error}`);
      return [];
    }
  },

  fetchArxivRssSources(interest, maxResults) {
    Logger.log(`TrendService:arxiv_rss_start interest=${interest} maxResults=${maxResults}`);
    const categories = Utils.RSS_CATEGORY_MAP[interest] || [];
    const keywords = Utils.RSS_KEYWORDS_MAP[interest] || [];
    if (!categories.length) {
      throw new Error(`No RSS fallback categories configured for ${interest}`);
    }

    const dedup = {};
    categories.forEach((category) => {
      const response = UrlFetchApp.fetch(`${Utils.ARXIV_RSS_URL}/${category}`, {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Discord-Bot/1.0 (GAS trend fetch fallback)' },
      });
      const status = response.getResponseCode();
      Logger.log(`TrendService:arxiv_rss_status interest=${interest} category=${category} status=${status}`);
      if (status < 200 || status >= 300) {
        throw new Error(`arXiv RSS failed: ${status} for ${category}`);
      }
      this.parseArxivRss(response.getContentText(), keywords).forEach((source) => {
        dedup[source.url] = source;
      });
    });

    const results = Object.values(dedup).slice(0, maxResults);
    Logger.log(`TrendService:arxiv_rss_results interest=${interest} count=${results.length}`);
    return results;
  },

  parseArxivAtom(xmlText) {
    const document = XmlService.parse(xmlText);
    const root = document.getRootElement();
    const atomNs = XmlService.getNamespace('http://www.w3.org/2005/Atom');
    return root.getChildren('entry', atomNs)
      .map((entry) => {
        const title = (entry.getChildText('title', atomNs) || '').replace(/\s+/g, ' ').trim();
        const publishedRaw = entry.getChildText('published', atomNs) || '';
        const links = entry.getChildren('link', atomNs);
        const htmlLink = links.find((link) => {
          const relAttr = link.getAttribute('rel');
          return relAttr && relAttr.getValue() === 'alternate';
        });
        return {
          title,
          url: htmlLink ? htmlLink.getAttribute('href').getValue() : '',
          published_at: publishedRaw ? Utils.formatUtcDate(new Date(publishedRaw)) : Utils.formatUtcDate(new Date()),
          source_type: 'paper',
        };
      })
      .filter((item) => item.title && item.url);
  },

  parseArxivRss(xmlText, keywords) {
    const document = XmlService.parse(xmlText);
    const root = document.getRootElement();
    const channel = root.getChild('channel');
    if (!channel) {
      return [];
    }

    return channel.getChildren('item')
      .map((item) => {
        const title = (item.getChildText('title') || '').trim();
        const url = (item.getChildText('link') || '').trim();
        const description = (item.getChildText('description') || '').trim();
        const pubDate = item.getChildText('pubDate') || '';
        return {
          title,
          url,
          description,
          published_at: pubDate ? Utils.formatUtcDate(new Date(pubDate)) : Utils.formatUtcDate(new Date()),
          source_type: 'paper',
        };
      })
      .filter((item) => {
        if (!item.title || !item.url) {
          return false;
        }
        const haystack = `${item.title}\n${item.description}`.toLowerCase();
        return !keywords.length || keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
      });
  },

  buildPrompt(interest, sources) {
    const sourceLines = sources
      .map((source) => `- ${source.title} | ${source.url} | ${source.published_at || ''}`)
      .join('\n');
    return [
      '당신은 AI 학술동아리용 브리핑 에디터다.',
      `트랙: ${interest}`,
      '아래 출처만 근거로 한국어 브리핑을 작성하라.',
      '반드시 JSON으로만 답하라.',
      '필수 키: title, core_explanation, why_it_matters, quick_terms, discussion_prompt',
      '키 이름은 반드시 영어 snake_case 그대로 사용하라.',
      '과장된 일반론, 뜬금없는 응용 시사점, 출처에 없는 주장, 모호한 미래 예측을 쓰지 마라.',
      '각 필드는 짧고 읽기 쉽게 작성하라.',
      'title: 40자 이내',
      'core_explanation: 2~3문장, 350자 이내',
      'why_it_matters: 2~3문장, 350자 이내',
      'quick_terms: 2~3개 bullet, 총 220자 이내',
      'discussion_prompt: 1문장, 80자 이내',
      '{"title":"...","core_explanation":"...","why_it_matters":"...","quick_terms":"- 용어: 설명\\n- 용어: 설명","discussion_prompt":"..."}',
      '출처를 바꾸거나 추가하지 마라.',
      '',
      '출처 목록:',
      sourceLines,
    ].join('\n');
  },

  normalizeTrendOutput(response) {
    const rawText = this.extractOutputText(response);
    const parsed = JSON.parse(rawText);
    const normalized = this.normalizeGeneratedFields(parsed);
    this.validateGeneratedFields(normalized);
    return normalized;
  },

  extractOutputText(response) {
    const outputs = response.output || [];
    for (let i = 0; i < outputs.length; i += 1) {
      const contents = outputs[i].content || [];
      for (let j = 0; j < contents.length; j += 1) {
        if (contents[j].type === 'output_text') {
          return contents[j].text;
        }
      }
    }
    throw new Error('OpenAI response did not contain output_text');
  },

  normalizeGeneratedFields(data) {
    const aliasGroups = {
      title: ['title', '제목'],
      core_explanation: ['core_explanation', 'coreExplanation', 'what_happened', 'summary', '핵심 설명', '핵심 요약'],
      why_it_matters: ['why_it_matters', 'whyItMatters', 'importance', '왜 중요한가', '의미'],
      quick_terms: ['quick_terms', 'quickTerms', 'terms', '용어 빠르게 이해하기', '핵심 용어'],
      discussion_prompt: ['discussion_prompt', 'discussionPrompt', 'question', 'prompt', '생각해볼 질문', '토론 질문'],
    };

    const normalized = {};
    Object.keys(aliasGroups).forEach((target) => {
      const aliases = aliasGroups[target];
      let value = '';
      aliases.some((alias) => {
        const raw = data[alias];
        if (typeof raw === 'string' && raw.trim()) {
          value = raw.trim();
          return true;
        }
        return false;
      });
      normalized[target] = value;
    });

    if (!normalized.why_it_matters && normalized.core_explanation) {
      normalized.why_it_matters = '이 동향이 실제 모델 설계와 응용 방향에 어떤 영향을 주는지 추가 확인이 필요합니다.';
    }
    if (!normalized.quick_terms) {
      normalized.quick_terms = '- 핵심 용어: 원문 출처를 함께 확인하세요.';
    }
    if (!normalized.discussion_prompt && normalized.title) {
      normalized.discussion_prompt = `${normalized.title}가 실제 적용에 미칠 영향은 무엇일까?`;
    }
    return normalized;
  },

  validateGeneratedFields(data) {
    ['title', 'core_explanation', 'why_it_matters', 'quick_terms', 'discussion_prompt'].forEach((field) => {
      if (!data[field]) {
        throw new Error(`Missing generated field: ${field}`);
      }
    });
  },

  buildTrendEmbed(channelKey, sections) {
    const fields = [];
    sections.forEach((section) => {
      fields.push({ name: '주제', value: Utils.safeTruncateText(section.generated.title, this.FIELD_LIMITS.topic), inline: false });
      fields.push({ name: '핵심 설명', value: Utils.safeTruncateText(section.generated.core_explanation, this.FIELD_LIMITS.core), inline: false });
      fields.push({ name: '왜 중요한가', value: Utils.safeTruncateText(section.generated.why_it_matters, this.FIELD_LIMITS.reason), inline: false });
      fields.push({ name: '용어 빠르게 이해하기', value: Utils.safeTruncateText(section.generated.quick_terms, this.FIELD_LIMITS.terms), inline: false });
      fields.push({ name: '생각해볼 질문', value: Utils.safeTruncateText(section.generated.discussion_prompt, this.FIELD_LIMITS.question), inline: false });
      fields.push({
        name: '출처',
        value: this.formatSourceValue(section.sources),
        inline: false,
      });
    });
    fields.push({
      name: '주의',
      value: this.CAUTION_MESSAGE,
      inline: false,
    });

    return {
      embeds: [
        {
          title: `이번 주 관심분야 브리핑 | ${channelKey}`,
          color: 15844367,
          fields,
        },
      ],
    };
  },

  formatSourceValue(sources) {
    if (!sources.length) {
      return '출처 없음';
    }
    const joined = sources
      .slice(0, 2)
      .map((source) => `- ${source.title}: ${source.url}`)
      .join('\n');
    return Utils.safeTruncateText(joined, this.FIELD_LIMITS.source);
  },
};
