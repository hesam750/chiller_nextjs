module.exports = {
  apps: [
    {
      name: "chiller-next",
      cwd: ".",
      script: "node_modules/next/dist/bin/next",
      args: "start dist -p 3000 -H 0.0.0.0",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 5000,
      max_memory_restart: "512M",
      watch: false,
      env: {
        NODE_ENV: "production",
        AUTH_SECRET: process.env.AUTH_SECRET,
        COOKIE_SECURE: process.env.COOKIE_SECURE,
        TIMER_BASE_URL: process.env.TIMER_BASE_URL,
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
