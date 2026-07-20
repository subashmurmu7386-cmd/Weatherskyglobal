fetch(`https://api.weatherapi.com/v1/search.json?key=f6f975bfbd7e4d4c9ea72207260707&q=Gojamba`)
  .then(res => res.json())
  .then(data => console.log(data))
