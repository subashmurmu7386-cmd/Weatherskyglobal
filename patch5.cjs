const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/\{\/\* Main App Canvas \*\/\}\n\s*<div className="flex-1 flex flex-col h-screen overflow-y-auto relative">\n\s*<div className="w-full max-w-sm/, `      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
      {/* Name Welcome Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
         <div className="w-full max-w-sm`);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched 5");
