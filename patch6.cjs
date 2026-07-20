const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/    setActiveAlert\(null\);\n/g, '');
code = code.replace(/      \/\/ Active Emergency Alert monitoring system based on real-time data\n      const conditionText = data\.current\.condition\.text\.toLowerCase\(\);\n      if \(conditionText\.includes\('heavy rain'\) \|\| conditionText\.includes\('torrential'\) \|\| data\.current\.precip_mm > 15\) \{\n        setActiveAlert\(\{ title: 'Heavy Rain Warning', description: 'Severe precipitation detected in this area\. Expect potential flooding and reduced visibility\.' \}\);\n      \} else if \(conditionText\.includes\('cyclone'\) \|\| conditionText\.includes\('hurricane'\) \|\| data\.current\.wind_kph > 80\) \{\n        setActiveAlert\(\{ title: 'Severe Wind \/ Cyclone Alert', description: 'Dangerous wind speeds detected\. Seek shelter immediately and stay away from windows\.' \}\);\n      \} else if \(data\.current\.temp_c >= 40 \|\| data\.current\.feelslike_c >= 45\) \{\n        setActiveAlert\(\{ title: 'Extreme Heat Warning', description: 'Temperatures are at dangerously high levels\. Stay hydrated and avoid outdoor activities\.' \}\);\n      \} else if \(conditionText\.includes\('dense fog'\) \|\| conditionText\.includes\('smog'\)\) \{\n        setActiveAlert\(\{ title: 'Dense Fog Advisory', description: 'Visibility is significantly reduced\. Exercise extreme caution if driving\.' \}\);\n      \}\n/g, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Patched 6");
