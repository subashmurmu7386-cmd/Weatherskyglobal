const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/  const \[activeAlert, setActiveAlert\] = useState<{ title: string, description: string } \| null>\(null\);\n/, '');
code = code.replace(/  const \[streak, setStreak\] = useState\(0\);\n/, '');
code = code.replace(/  const \[unlockedBadges, setUnlockedBadges\] = useState<string\[\]>\(\[\]\);\n/, '');
code = code.replace(/  const \[newBadgeModal, setNewBadgeModal\] = useState<any \| null>\(null\);\n/, '');
code = code.replace(/  const \[searchedCities, setSearchedCities\] = useState<string\[\]>\(\[\]\);\n/, '');
code = code.replace(/  const \[weatherAlerts, setWeatherAlerts\] = useState<any\[\]>\(\[\]\);\n/, '');
code = code.replace(/  const \[isAdRewardModalOpen, setIsAdRewardModalOpen\] = useState\(false\);\n/, '');

fs.writeFileSync('src/App.tsx', code);
console.log('State cleanup done.');
