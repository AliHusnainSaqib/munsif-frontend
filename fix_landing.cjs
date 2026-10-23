const fs = require('fs');
let content = fs.readFileSync('src/pages/LandingPage.tsx', 'utf8');

// Spacing fixes
content = content.replace(/-space-xs/g, '-1');
content = content.replace(/-space-sm/g, '-2');
content = content.replace(/-space-md/g, '-4');
content = content.replace(/-space-lg/g, '-6');
content = content.replace(/-space-xl/g, '-10');

// Typography fixes (e.g. font-headline-sm text-headline-sm -> text-headline-sm)
content = content.replace(/font-(display-lg|headline-xl|headline-lg|headline-sm|body-lg|body-md|body-sm|label-md|label-sm)\s+text-\1/g, 'text-$1');
// if there are leftover font-something without text-something
content = content.replace(/font-legal-code/g, 'text-legal-code');

// Color fixes
content = content.replace(/bg-tertiary-fixed-dim/g, 'bg-gold/80');
content = content.replace(/bg-tertiary-fixed/g, 'bg-gold');
content = content.replace(/text-on-tertiary-fixed/g, 'text-primary-container');
content = content.replace(/text-tertiary-fixed/g, 'text-gold');
content = content.replace(/text-primary-fixed-dim/g, 'text-secondary');
content = content.replace(/text-on-primary-container/g, 'text-muted');

fs.writeFileSync('src/pages/LandingPage.tsx', content, 'utf8');
console.log("Replaced successfully!");
