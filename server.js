const path = require('node:path');
const { createApp } = require('./app');
const { loadEnvFile, resolveConfig } = require('./lib/config');

const config = resolveConfig(loadEnvFile(path.join(__dirname, '.env')));

createApp({
  databaseProvider: config.databaseProvider,
  dbDir: config.dbDir,
  dbFilePath: config.dbFilePath,
  supabaseUrl: config.supabaseUrl,
  supabaseServiceRoleKey: config.supabaseServiceRoleKey,
  tablePrefix: config.tablePrefix,
  adminAccount: config.adminAccount,
  sessionSecret: config.sessionSecret,
  openaiApiKey: config.openaiApiKey,
  openaiTranscriptionModel: config.openaiTranscriptionModel,
  uploadDir: config.uploadDir
}).listen(config.port, () => {
  console.log(`ChurchOS running at http://localhost:${config.port}`);
});
