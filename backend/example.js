let headers = new Headers();
headers.set('Authorization', 'Bearer Catsarecool55!')
fetch("https://liberties-shops-rest.lucien-aibel.workers.dev/rest/shops", {method:'GET',      headers: headers})
  .then((response) => response.json())
  .then((json) => console.log(json));
