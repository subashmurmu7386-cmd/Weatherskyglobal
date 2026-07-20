with open("src/components/HeroCanvas.tsx", "r") as f:
    content = f.read()

target1 = """  // Logic to determine weather category
  const condition = weatherData?.current?.condition?.text?.toLowerCase() || 'clear';
  let category = 'clear';
  if (condition.includes('rain') || condition.includes('drizzle')) category = 'rain';
  else if (condition.includes('snow') || condition.includes('ice') || condition.includes('blizzard')) category = 'snow';
  else if (condition.includes('cloud') || condition.includes('overcast') || condition.includes('mist')) category = 'cloudy';
  else if (condition.includes('fog')) category = 'fog';
  else if (condition.includes('thunder') || condition.includes('storm')) category = 'storm';
  else if (condition.includes('wind') || weatherData?.current?.wind_kph > 30) category = 'wind';"""

replacement1 = """  // Logic to determine weather category
  const condition = weatherData?.current?.condition?.text?.toLowerCase() || 'clear';
  const precip = weatherData?.current?.precip_mm || 0;
  let category = 'clear';
  
  if ((condition.includes('rain') || condition.includes('drizzle')) && precip > 0) {
    category = 'rain';
  } else if ((condition.includes('rain') || condition.includes('drizzle')) && precip === 0) {
    category = 'overcast';
  } else if (condition.includes('snow') || condition.includes('ice') || condition.includes('blizzard')) {
    category = 'snow';
  } else if (condition.includes('overcast') || condition.includes('heavy cloud')) {
    category = 'overcast';
  } else if (condition.includes('cloud') || condition.includes('mist')) {
    category = 'cloudy';
  } else if (condition.includes('fog')) {
    category = 'fog';
  } else if (condition.includes('thunder') || condition.includes('storm')) {
    category = 'storm';
  } else if (condition.includes('wind') || weatherData?.current?.wind_kph > 30) {
    category = 'wind';
  }"""

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Replaced category logic")
else:
    print("Target 1 not found")

target2 = """const getTimeGradient = (phase: string, category: string) => {
  if (category === 'storm' || category === 'rain') {"""

replacement2 = """const getTimeGradient = (phase: string, category: string) => {
  if (category === 'storm' || category === 'rain' || category === 'overcast') {"""

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Replaced time gradient logic")
else:
    print("Target 2 not found")

target3 = """       {/* Storm Clouds */}
       {(category === 'storm' || category === 'rain') && ("""

replacement3 = """       {/* Storm Clouds */}
       {(category === 'storm' || category === 'rain' || category === 'overcast') && ("""

if target3 in content:
    content = content.replace(target3, replacement3)
    print("Replaced storm clouds logic")
else:
    print("Target 3 not found")

with open("src/components/HeroCanvas.tsx", "w") as f:
    f.write(content)

