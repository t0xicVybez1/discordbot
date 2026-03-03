module.exports = {
  apps: [
    {
      name: 'api',
      cwd: `${__dirname}/packages/api`,
      script: 'node',
      args: '--env-file ../../.env dist/index.js',
      autorestart: true,
      watch: false,
    },
    {
      name: 'bot',
      cwd: `${__dirname}/packages/bot`,
      script: 'node',
      args: '--env-file ../../.env dist/index.js',
      autorestart: true,
      watch: false,
    },
    {
      name: 'web',
      cwd: `${__dirname}/packages/web`,
      script: './node_modules/.bin/next',
      args: 'start -p 3000',
      autorestart: true,
      watch: false,
    },
  ],
};
