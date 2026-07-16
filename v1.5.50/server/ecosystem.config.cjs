module.exports = {
  apps: [
    {
      name: "tennispro-new",
      script: "dist/index.js",
      cwd: "/var/www/tennispro-new",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_file: "/var/www/tennispro-new/.env",
      error_file: "/var/log/tennispro-new/pm2-error.log",
      out_file: "/var/log/tennispro-new/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
