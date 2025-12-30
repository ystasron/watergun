module.exports = {
  apps: [
    {
      name: "my-app",
      script: "./a.js",
      cron_restart: "*/25 * * * *",
      max_memory_restart: "600M",
      restart_delay: 5000, // wait 5 seconds before restarting on crash
      exp_backoff_restart_delay: 100, // wait longer and longer if it keeps crashing
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
