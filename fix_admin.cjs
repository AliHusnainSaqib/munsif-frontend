const fs = require('fs');
let f = 'reference/admin_dashboard_sbp_consumer_protection/code.html';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/<p[^>]*>\s*"Under BCO 1962 and SBP Circular CPD-03, unauthorized electronic funds transfers must be provisionally credited within 10 business days pending investigation, provided citizen files formal dispute within 45 days of statement issuance\."\s*<\/p>/g, '');
fs.writeFileSync(f, c, 'utf8');
console.log('Fixed admin dashboard reference!');
