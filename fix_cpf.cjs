const fs = require('fs');
let f = 'reference/main_chat_interface_sbp_assistant/code.html';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/<p[^>]*>\s*Under <strong[^>]*>SBP Consumer Protection Framework \(CPF Circular No\. 05\)<\/strong>[\s\S]*?<\/p>/g, '');
fs.writeFileSync(f, c, 'utf8');
console.log('Fixed main chat!');
