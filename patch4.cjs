const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                 <div className="w-full max-w-sm`;

const replacement = `      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
      {/* Name Welcome Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
         <div className="w-full max-w-sm`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched 4");
} else {
    console.log("Target not found!");
}
