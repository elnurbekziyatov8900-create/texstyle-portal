// pm2 — Node ilovasini doimiy ishlatish va qayta ishga tushirish uchun.
// Ishga tushirish:  pm2 start ecosystem.config.js
// Holatni ko'rish:  pm2 list
// Loglar:           pm2 logs texstyle-portal
// Server reboot'da avtomatik:  pm2 startup && pm2 save
module.exports = {
  apps: [{
    name: "texstyle-portal",
    script: "server.js",
    instances: 1,             // ALB orqasida bir nechta EC2 — har birida 1 instans
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      AWS_REGION: "eu-west-2"
    },
    max_memory_restart: "300M",
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    time: true
  }]
};
