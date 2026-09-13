const GitHubService = {
  buildRawUrl(path) {
    return `${ConfigService.getGithubRawBaseUrl().replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  },

  fetchText(path) {
    const response = UrlFetchApp.fetch(this.buildRawUrl(path), { muteHttpExceptions: true });
    const status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      throw new Error(`GitHub raw fetch failed: ${status} for ${path}`);
    }
    return response.getContentText();
  },

  fetchJson(path) {
    return JSON.parse(this.fetchText(path));
  }
};
