const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `          </div>
        {/* AI Weather Lab Section */}`;

const replacement = `          </div>
        </div>
        {/* AI Weather Lab Section */}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched 3");
