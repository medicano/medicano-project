// Config PM2 para desenvolvimento local.
// Copie para ecosystem.local.js (ignorado pelo git) e ajuste os caminhos.
module.exports = {
  apps: [
    {
      name: 'medicano-api',
      script: 'npm',
      args: 'run start:dev',
      cwd: '/caminho/para/medicano/apps/api',
      env: {
        NODE_ENV: 'development',
        AWS_REGION: 'sa-east-1',
      },
    },
    {
      name: 'medicano-web',
      script: 'npm',
      args: 'run dev',
      cwd: '/caminho/para/medicano/apps/web',
      env: {
        NODE_ENV: 'development',
        AWS_REGION: 'sa-east-1',
      },
    },
  ],
};
