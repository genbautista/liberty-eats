import { useEffect, useState } from 'react'
import './App.css'
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

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
		return Math.round(a * 10) / 10
	}
	
	const setScrollPosition = (storeID) => {
		document.getElementById("store-" + storeID).scrollIntoView({behavior: "smooth", block:"center"})
	}
	
	//fetch initial data only when starting (remove the [] to do on every render, or add a variable to do so when that variable changes)
	useEffect(() => {
		fetchStores();
	}, []);

	return (
	<>
	    <nav>
		<a href="./placeholder.html">
		     <div class="navbar-item" style={{width: "3.868rem", height: "2.067rem", right: "3.125rem", position: "absolute", top: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", color: "black", fontSize: "1.25rem", fontFamily: "Inter", fontStyle: "italic", fontWeight: "800", textShadow: "0rem 0.25rem 0.25rem rgba(0, 0, 0, 0.25)"}}>Login</div>
		</a>
		<a href="./placeholder.html">
		    <div class="navbar-item" style={{width: "5.307rem", height: "1.567rem", right: "8.125rem", position: "absolute", top: "1.15rem", display: "flex", alignItems: "center", justifyContent: "center", color: "black", fontSize: "1.25rem", fontFamily: "Inter", fontStyle: "italic", fontWeight: "800", textShadow: "0rem 0.25rem 0.25rem rgba(0, 0, 0, 0.25)"}}>Settings</div>
		</a>
		<a href="./map.html">
		    <img class="navbar-item" style={{width: "3rem", height: "3rem", right: "13.5rem", position: "absolute", top: "0.5rem"}} src="./src/assets/Map_icon.png" />
		</a>
		<a href="./index.html">
		    <div class="navbar-item" style={{width: "25.454rem", height: "2.769rem", left: "3.125rem", position: "absolute", top: "0.6rem", display: "flex", alignItems: "center", color: "black", fontSize: "3.125rem", fontFamily: "Inter", fontStyle: "italic", fontWeight: "800", textShadow: "0rem 0.25rem 0.25rem rgba(0, 0, 0, 0.25)"}}>Liberties Shops</div>
		</a>
	    </nav>

	    { /* Dropdown toggle button for advanced filters */ }
	    <button id="toggle-filters-btn" class="toggle-filters-btn">
		<span>⚙️ Filters</span>
	    </button>

	    { /* Map Container */ }
	    <div id="map">
		<MapContainer center={[53.3415, -6.2777]} zoom={15} scrollWheelZoom={true}>
			<TileLayer
			attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
		    	{Object.keys(stores).map((storeID) => (
				<Marker position={[stores[storeID].latitude, stores[storeID].longitude]} eventHandlers={{ click: () => {setScrollPosition(storeID)}}}>
					<Popup>
					  {stores[storeID].storeName}
					</Popup>
				</Marker>
			))}
		</MapContainer>
	    </div>

	    <div class="filters-sidebar">
		<div class="filters-header">
		    <h2 class="filters-title">Filters & Results</h2>
		    <button class="filters-edit-btn">⋯</button>
		</div>

		<div class="search-container">
		    <input type="text" class="search-input" placeholder="🔍 Search"></input>
		</div>

		<section class="filter-section">
		    <h3 class="section-header">Inventory Type</h3>
		    
		    <button class="filter-item">
		        <span class="filter-icon">🍎</span>
		        <span class="filter-label">Fruit & Veg</span>
		        <span class="filter-detail">Expand</span>
		    </button>

		    <button class="filter-item filter-item-selected">
		        <span class="filter-icon">🥩</span>
		        <span class="filter-label">Butcher</span>
		        <span class="filter-detail">Expand ›</span>
		    </button>

		    <button class="filter-item filter-item-nested">
		        <span class="filter-icon">🍗</span>
		        <span class="filter-label">Chicken</span>
		    </button>

		    <button class="filter-item">
		        <span class="filter-icon">👕</span>
		        <span class="filter-label">Clothing</span>
		    </button>
		</section>

		<section class="filter-section">
		    <h3 class="section-header">Distance</h3>
		    
		    <button class="filter-item">
		        <span class="filter-icon">📍</span>
		        <span class="filter-label">2km</span>
		    </button>

		    <button class="filter-item">
		        <span class="filter-icon">📍</span>
		        <span class="filter-label">5km</span>
		    </button>
		</section>

		{ /* Results section with shop cards */ }
		<div class="results-section">
		    <h3 class="results-header">Results ({Object.keys(stores).length})</h3>
		    
		    {Object.keys(stores).map((storeID) => (
			    <div class="shop-card" id={"store-" + storeID}>
				<img class="shop-image" src="https://placehold.co/401x247" alt="Shop image"></img>
				<div class="shop-content">
				    <div class="shop-info left">
				        <h3 class="shop-name">{stores[storeID].storeName}</h3>
				        <p class="shop-description">{stores[storeID].description}</p>
				<p>{stores[storeID].website}</p>
				    </div>
				    <div class="shop-info">
				        <p><b>{computeDistance(stores[storeID].latitude, stores[storeID].longitude)} km away</b></p>
					<p>{stores[storeID].address}</p>
				        <p><b>12:00 - 18:15</b></p>
				    </div>
				</div>
			    </div>
		    ))}
		</div>
	    </div>

	    <aside id="advanced-filters" class="advanced-filters">
		<button class="close-filters-btn" id="close-filters-btn">×</button>
		
		<div class="keywords-section">
		    <label class="filter-label-text">Keywords</label>
		    <div class="keyword-tags">
		        <span class="keyword-tag">
		            Organic
		            <button class="tag-remove">×</button>
		        </span>
		        <span class="keyword-tag">
		            Pork
		            <button class="tag-remove">×</button>
		        </span>
		        <span class="keyword-tag">
		            Budget
		            <button class="tag-remove">×</button>
		        </span>
		    </div>
		</div>

		<div class="checkbox-section">
		    <label class="checkbox-item">
		        <input type="checkbox" checked></input>
		        <div class="checkbox-content">
		            <span class="checkbox-label">Open</span>
		            <span class="checkbox-description">Only shows stores that are currently open</span>
		        </div>
		    </label>

		    <label class="checkbox-item">
		        <input type="checkbox" checked></input>
		        <div class="checkbox-content">
		            <span class="checkbox-label">Transportation</span>
		            <span class="checkbox-description">Expands search to include shops further away</span>
		        </div>
		    </label>

		    <label class="checkbox-item">
		        <input type="checkbox" checked></input>
		        <div class="checkbox-content">
		            <span class="checkbox-label">Don't close soon</span>
		            <span class="checkbox-description">Removes stores that close less than 30 min from now</span>
		        </div>
		    </label>
		</div>

		<div class="slider-section">
		    <div class="slider-header">
		        <label class="filter-label-text">Price Range</label>
		        <span class="slider-value">€10-100</span>
		    </div>
		    <input type="range" class="price-slider" min="10" max="100" value="50"></input>
		</div>

		<div class="checkbox-section">
		    <label class="filter-label-text">inventory</label>
		    
		    <label class="checkbox-item-simple">
		        <input type="checkbox" checked></input>
		        <span>Clothing</span>
		    </label>

		    <label class="checkbox-item-simple">
		        <input type="checkbox" checked></input>
		        <span>Butcher</span>
		    </label>

		    <label class="checkbox-item-simple">
		        <input type="checkbox" checked></input>
		        <span>Produce</span>
		    </label>
		</div>

		<div class="checkbox-section">
		    <label class="filter-label-text">Distance</label>
		    
		    <label class="checkbox-item-simple">
		        <input type="checkbox" checked></input>
		        <span>Nearest</span>
		    </label>

		    <label class="checkbox-item-simple">
		        <input type="checkbox" checked></input>
		        <span>3Km</span>
		    </label>

		    <label class="checkbox-item-simple">
		        <input type="checkbox" checked></input>
		        <span>5Km</span>
		    </label>
		</div>
	    </aside>

	</>
	)
}

export default App
