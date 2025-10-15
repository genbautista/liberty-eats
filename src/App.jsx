import { useEffect, useState } from 'react'
import './App.css'

const url = "https://rest-liberties-shops.libertiesshops.workers.dev"
const userLat = 53.34296378813723
const userLong = -6.280536890952785

function App() {
	//useState means that React will automatically rerender parts of the page they're used in when they update, as long as they're updated with the function returned as the second paramter of useState
	const [stores, setStores] = useState({})

	const fetchStores = () => {
		fetch(url + "/stores").then(res => res.json()).then((json) => setStores(json))
	}
	
	const joinTypes = (typesList) => {
		let output = ""
		for (let i in typesList) {
			if (i != 0) {
				output += ", "
			}
			output += typesList[i].typeName
		}
		console.log(typesList)
		return output
	}
	
	//Compute the crow-flies distance between two lat/long coordinates in kilometers
	//Adapted from https://www.geeksforgeeks.org/dsa/haversine-formula-to-find-distance-between-two-points-on-a-sphere/
	const computeDistance = (targetLat, targetLong) => {
		//Calculate differences
		const dLat = (targetLat - userLat) * Math.PI / 180.0
		const dLong = (targetLong - userLong) * Math.PI / 180.0
		
		//Convert to radians
		const lat1 = (targetLat) * Math.PI / 180.0
		const lat2 = (userLat) * Math.PI / 180.0
		
		//Apply formulae
		let a = Math.pow(Math.sin(dLat / 2), 2) +
			(Math.pow(Math.sin(dLong / 2), 2) *
			Math.cos(lat1) * Math.cos(lat2))
		a = 2 * 6371 * Math.asin(Math.sqrt(a))
		return Math.round(a * 100) / 100
	}

	return (
	<>
		<button onClick={() => fetchStores()}></button>
		{Object.keys(stores).map((storeID) => (
			<div>
				<p>{stores[storeID].storeName}</p>
				<p>{stores[storeID].description}</p>
				<p>{stores[storeID].website}</p>
				<p>{stores[storeID].address}</p>
				<p>{computeDistance(stores[storeID].latitude, stores[storeID].longitude)} km</p>
				<p>{joinTypes(stores[storeID].type)}</p>
			</div>
		))}
	</>
	)
}

export default App
