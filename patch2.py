with open("src/components/HeroCanvas.tsx", "r") as f:
    content = f.read()

target = """          <div className="flex items-center justify-center shrink-0">
             <div className="text-7xl md:text-8xl drop-shadow-xl">{renderWeatherEmoji(weatherData.current.condition.text)}</div>
          </div>

          <div className="text-7xl md:text-9xl font-display font-bold text-white drop-shadow-xl text-center md:text-right w-full md:w-1/3">
             {Math.round(weatherData.current.temp_c)}°C
          </div>"""

replacement = """          <div className="text-8xl md:text-[10rem] font-display font-bold text-white drop-shadow-xl text-center w-full md:w-1/3 flex justify-center items-center">
             {Math.round(weatherData.current.temp_c)}°C
          </div>

          <div className="w-full md:w-1/3 hidden md:block"></div>"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/HeroCanvas.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
