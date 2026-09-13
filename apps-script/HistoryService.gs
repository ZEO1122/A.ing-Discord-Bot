const HistoryService = {
  getConceptProgress() {
    const properties = PropertiesService.getScriptProperties();
    return {
      lastIndex: Number(properties.getProperty('CONCEPT_LAST_INDEX') || -1),
      lastPath: properties.getProperty('CONCEPT_LAST_PATH'),
      lastBriefingKey: properties.getProperty('CONCEPT_LAST_BRIEFING_KEY'),
      lastPostedAt: properties.getProperty('CONCEPT_LAST_POSTED_AT'),
    };
  },

  setConceptProgress(progress) {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('CONCEPT_LAST_INDEX', String(progress.lastIndex));
    properties.setProperty('CONCEPT_LAST_PATH', progress.lastPath || '');
    properties.setProperty('CONCEPT_LAST_BRIEFING_KEY', progress.lastBriefingKey || '');
    properties.setProperty('CONCEPT_LAST_POSTED_AT', progress.lastPostedAt || '');
  },

  getTrendSheet() {
    const sheet = SpreadsheetApp.openById(ConfigService.getTrendHistorySheetId()).getSheetByName(ConfigService.getTrendHistorySheetName());
    if (!sheet) {
      throw new Error('Trend history sheet not found');
    }
    return sheet;
  },

  appendTrendHistoryRow(row) {
    this.getTrendSheet().appendRow([
      row.channel_key,
      row.channel_id,
      row.interest,
      row.source_url,
      row.source_title,
      row.published_at,
      row.posted_at,
      row.brief_title,
    ]);
  },

  getTrendHistory(channelId, interest) {
    const values = this.getTrendSheet().getDataRange().getValues();
    if (values.length <= 1) {
      return [];
    }
    const rows = values.slice(1);
    return rows
      .filter((row) => String(row[1]) === String(channelId) && String(row[2]) === String(interest))
      .map((row) => ({
        channel_key: row[0],
        channel_id: row[1],
        interest: row[2],
        source_url: row[3],
        source_title: row[4],
        published_at: row[5],
        posted_at: row[6],
        brief_title: row[7],
      }));
  },

  hasSeenSource(channelId, interest, sourceUrl) {
    return this.getTrendHistory(channelId, interest).some((row) => row.source_url === sourceUrl);
  }
};
