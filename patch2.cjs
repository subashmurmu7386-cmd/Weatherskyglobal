const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `        </div>
            <Sparkles className="text-purple-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">AI Weather Lab</h3>
          </div>`;

const replacement = `        {/* AI Weather Lab Section */}
        <div className="w-full mt-8 mb-4">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <Sparkles className="text-purple-300" size={24} />
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow-md">AI Weather Lab</h3>
          </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched 2");
