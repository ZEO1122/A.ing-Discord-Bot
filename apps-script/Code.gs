function runConceptDaily() {
  try {
    Logger.log('runConceptDaily:start');
    ConceptService.runDailyConcept();
    Logger.log('runConceptDaily:success');
  } catch (error) {
    Logger.log(`runConceptDaily:error ${error && error.stack ? error.stack : error}`);
    throw error;
  }
}

function runTrendWeekly() {
  try {
    Logger.log('runTrendWeekly:start');
    TrendService.runWeeklyTrends();
    Logger.log('runTrendWeekly:success');
  } catch (error) {
    Logger.log(`runTrendWeekly:error ${error && error.stack ? error.stack : error}`);
    throw error;
  }
}
