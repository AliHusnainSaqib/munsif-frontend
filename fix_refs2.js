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

    // Remove the PECA 2016 paragraph
    content = content.replace(/<p[^>]*>\s*Pursuant to the Banking Companies Ordinance \(1962\), unauthorized access to this grievance repository is subject to statutory prosecution under PECA 2016\.\s*<\/p>/g, '');

    // Remove the CPF Circular 05 div claim
    content = content.replace(/<div[^>]*>\s*<p[^>]*>\s*Under <strong[^>]*>SBP Consumer Protection Framework \(CPF Circular No\. 05\)<\/strong>[\s\S]*?<\/p>\s*<\/div>/g, '');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Modified ${file}`);
    }
});
