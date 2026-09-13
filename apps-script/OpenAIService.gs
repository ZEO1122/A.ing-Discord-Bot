const OpenAIService = {
  generateTrendBrief(prompt) {
    const apiKey = ConfigService.getOpenAiKey();
    const model = ConfigService.getOpenAiModel();
    Logger.log(`OpenAIService:request model=${model} prompt_length=${String(prompt).length}`);
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      payload: JSON.stringify({
        model,
        input: prompt,
        text: {
          format: { type: 'json_object' },
        },
      }),
      muteHttpExceptions: true,
    });
    const status = response.getResponseCode();
    Logger.log(`OpenAIService:response status=${status}`);
    if (status < 200 || status >= 300) {
      throw new Error(`OpenAI response failed: ${status} ${response.getContentText()}`);
    }
    return JSON.parse(response.getContentText());
  }
};
