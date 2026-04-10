module.exports = {
  apps: [
    {
      name: "pvc-bot",
      script: "bot.js",
      cwd: "/home/bababobo/pvc-bot",
      env_file: ".env",
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
    },
  ],
};
