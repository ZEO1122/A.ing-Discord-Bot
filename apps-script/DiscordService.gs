const DiscordService = {
  sendWebhook(webhookUrl, payload) {
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      throw new Error(`Discord webhook failed: ${status} ${response.getContentText()}`);
    }
    return response.getContentText();
  }
};
