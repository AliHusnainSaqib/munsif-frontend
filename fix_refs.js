import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('reference');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // NADRA
    content = content.replace(/<p class="font-body-sm text-body-sm text-on-surface-variant">\s*Institutional details indexed against NADRA VERISYS &amp; SBP Corporate Directory.\s*<\/p>/g, '');
    content = content.replace(/<span class="px-2\.5 py-1 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold tracking-wide uppercase">\s*NADRA Sync Active\s*<\/span>/g, '');
    content = content.replace(/<span class="font-legal-code text-legal-code text-on-surface-variant tracking-wider">\s*NADRA FORMAT\s*<\/span>/g, '');
    content = content.replace(/alert\('Verification request received\. An official NADRA verification dispatch has been initiated\.'\);/g, "alert('Verification request received.');");

    // PECA
    content = content.replace(/<p class="font-mono text-\[11px\] leading-4 text-on-surface-variant">\s*Pursuant to the Banking Companies Ordinance \(1962\), unauthorized access to this grievance repository is subject to statutory prosecution under PECA 2016\.\s*<\/p>/g, '');

    // SBP-PSD-04
    content = content.replace(/<span>Complies with SBP-PSD-04<\/span>/g, '');

    // IBD Circular
    content = content.replace(/value="IBD Circular No\. 02\/2012: Grace period applied when terminal day is public holiday\."/g, 'value=""');

    // CPF Circular No. 05
    content = content.replace(/<div class="p-4 bg-primary-container\/5 rounded-lg border border-primary\/10 mt-2">\s*<p class="text-sm text-on-surface leading-relaxed">\s*Under <strong class="font-semibold text-primary">SBP Consumer Protection Framework \(CPF Circular No\. 05\)<\/strong>[\s\S]*?<\/p>\s*<\/div>/g, '');

    // 10 business days / SBP CPD-03
    content = content.replace(/<p class="text-sm text-on-surface-variant italic border-l-2 border-gold pl-3 py-1 my-2">\s*"Under BCO 1962 and SBP Circular CPD-03, unauthorized electronic funds transfers must be provisionally credited within 10 business days pending investigation, provided citizen files formal dispute within 45 days of statement issuance\."\s*<\/p>/g, '');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Modified ${file}`);
    }
});
