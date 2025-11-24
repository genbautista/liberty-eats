import { useEffect, useState } from 'react'
import './App.css'
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import * as L from "leaflet";

const URL = "https://rest-liberties-shops.libertiesshops.workers.dev" //live DB
//const URL = "http://localhost:8787" //testing URL
const DAYS_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]


function App() {
	//useState means that React will automatically rerender parts of the page they're used in when they update, as long as they're updated with the function returned as the second paramter of useState
	const [matchingStores, setMatchingStores] = useState({})
	const [allStores, setAllStores] = useState({})
	const [allCategories, setAllCategories] = useState({})
	const [addingItem, setAddingItem] = useState(false)
	const [resultPopupText, setResultPopupText] = useState("")
	const [locationOn, setLocationOn] = useState(false)
	const [userLat, setUserLat] = useState(0.1)
	const [userLong, setUserLong] = useState(0.1)
	const [expandedHours, setExpandedHours] = useState(-1)

	const fetchAllCategories = () => {
		fetch(url + "/categories").then(res => res.json()).then((json) => setAllCategories(json))
	}
	const fetchAllStores = () => {
		fetch(url + "/stores").then(res => res.json()).then((json) => setAllStores(json))
	}
	
	const fetchStores = () => {
		fetch(url + "/stores").then(res => res.json()).then((json) => setMatchingStores(json))
	}
	
	//TODO: click outside to close dropdown
	
	const searchItem = (event) => {
		let query = event.target.value
		if (query.length === 0) {
			// deactivate dropdown
		}
		if (query.length >= 2) {
			query = query.toLowerCase.trim()
			
			const response = await fetch(`${URL}/items?name=${query}`)
			setMatchingStores({})
		}
	}
	
	const submitItem = (e) => {
		// Prevent the browser from reloading the page
		e.preventDefault();

		// Read the form data
		const form = e.target;
		const formData = new FormData(form);

		let formJson = Object.fromEntries(formData.entries());
		
		if (formJson.euros == "") {
			formJson.euros = "0"
		}
		
		formJson = {"itemName":formJson.itemName, "price":Number(formJson.euros + "." + formJson.cents), "storeID":Number(formJson.storeID),"categoryID":Number(formJson.categoryID)}
		fetch(url + "/items", {
			method: "POST",
			body: JSON.stringify(formJson),
			headers: {"Content-Type":"application/json; charset=UTF-8"}
		}).then(res => {processSubmitResult(res)})
	}
	
	async function processSubmitResult(res) {
		if (res.status == 201) {
			setResultPopupText("Item added successfully!")
			return
		}
		const json = await res.json()
		if (json.error == "itemName is a required field") {
			setResultPopupText("You must provide a name for the item!")
			return
		} 
		if (res.status == 400) {
			setResultPopupText("Submission error.\n" + json.error)
			return
		}
		if (res.status == 429) {
			setResultPopupText("Rate limited! Please try again in a moment.")
			return
		}
		if (res.status == 500) {
			setResultPopupText("Server error.\n" + json.error)
			return
		}
	}
	
	const joinTypes = (typesList) => {
		let output = ""
		for (let i in typesList) {
			if (i != 0) {
				output += ", "
			}
			output += typesList[i].typeName
		}
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
	
	const convertHour = (hourNumber) => {
		let hour = Math.floor(hourNumber)
		let minutes = (hourNumber % 1) * 60
		
		return String(hour).padStart(2,"0") + ":" + String(minutes).padStart(2,"0")
	}
	
	const printHours = (hoursPair) => {
		if (hoursPair[0] == 0 && hoursPair[1] == 0) {
			return "CLOSED"
		}
		return convertHour(hoursPair[0]) + " - " + convertHour(hoursPair[1])
	}
	
	const getWeekday = () => {
		const d = new Date();
		return d.getDay();
	}
	
	const toggleExpandedHours = (storeID) => {
		if (expandedHours != storeID) {
			setExpandedHours(storeID)
		} else {
			setExpandedHours(-1)
		}
	}
  
	const updateLocation = (pos) => {
		setUserLat(pos.coords.latitude);
		setUserLong(pos.coords.longitude);
		setLocationOn(true)
	}
	
	const disableLocation = () => {
		setLocationOn(false)
	}
	
	const locationSetup = () => {
		if (navigator.geolocation) {
			navigator.geolocation.watchPosition(updateLocation, disableLocation)
		} else {
			disableLocation()
		}
	}

  	const setScrollPosition = (storeID) => {
		document.getElementById("store-" + storeID).scrollIntoView({behavior: "smooth", block:"center"})
	}
	
	//fetch initial data only when starting (remove the [] to do on every render, or add a variable to do so when that variable changes)
	useEffect(() => {
		fetchStores();
		locationSetup();
		fetchAllStores();
		fetchAllCategories();
	}, []);

	const userIcon = new L.Icon({iconUrl: "./src/assets/user.png", iconSize: [20,20]})

	return (
	<>
	    <nav>
		<a href="./index.html">
		    <div class="navbar-item" style={{width: "25.454rem", height: "2.769rem", left: "3.125rem", position: "absolute", top: "0.6rem", display: "flex", alignItems: "center", color: "black", fontSize: "3.125rem", fontFamily: "Inter", fontStyle: "italic", fontWeight: "800", textShadow: "0rem 0.25rem 0.25rem rgba(0, 0, 0, 0.25)"}}>Liberties Shops</div>
		</a>
	    </nav>

	    { /* Dropdown toggle button for advanced filters */ }
	    <button id="toggle-filters-btn" class="toggle-filters-btn big-button">
		<span>⚙️ Filters</span>
	    </button>matchingStores
	    
	    <button id="add-item" class="big-button" onClick={() => {setAddingItem(true)}}>Add Item</button>
	    { (resultPopupText != "")&& <div id="result-popup">
	    	<span>{resultPopupText}</span>
	    	<button onClick={() => {setResultPopupText("")}}>OK</button>
	    </div>
	    }
	    { addingItem && <div id="item-add-popup">
	    	<button id="close-item-popup" onClick={() => {setAddingItem(false)}}>X</button>
	    	<form method="post" onSubmit={submitItem}>
		    	<div>
			    	<label for="item-name-input">Name: </label>
			    	<input id="item-name-input" name="itemName"></input>
		    	</div>
		    	<div>
		    		<label class="optional-label">optional--can be left blank</label><br></br>
			    	<label for="price-input">Price: € </label>
			    	<input id="price-euros-input" class="price-input" placeholder={"0"} name="euros"></input>
			    	<span> . </span>
			    	<input id="price-cents-input"  class="price-input" maxLength={2} placeholder={"00"} name="cents"></input>
		    	</div>
		    	<div>
			    	<label for="price-input">Store: </label>
			    	<select id="store-input" name="storeID">
			    		{Object.keys(allStores).map((storeID) => (
			    			<option value={storeID}>{allStores[storeID].storeName}</option>
			    		))}
			    	</select>
		    	</div>
		    	<div>
			    	<label for="category-input">Category: </label>
			    	<select id="category-input" name="categoryID">
			    		{Object.keys(allCategories).map((categoryID) => (
			    			<option value={categoryID}>{allCategories[categoryID].categoryName}</option>
			    		))}
			    	</select>
		    	</div>
		    	<button type="submit" id="submit-item" class="big-button">SUBMIT</button>
	    	</form>
	    </div>
	    }
	    
	    { /* Map Container */ }
	    <div id="map">
		<MapContainer center={[53.3415, -6.2777]} zoom={15} scrollWheelZoom={true}>
			<TileLayer
			attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{locationOn && <Marker position={[userLat, userLong]} icon={userIcon}>
			</Marker>
			}
		    	{Object.keys(matchingStores).map((storeID) => (
				<Marker position={[matchingStores[storeID].latitude, matchingStores[storeID].longitude]} eventHandlers={{ click: () => {setScrollPosition(storeID)}}}>
					<Popup>
					  {matchingStores[storeID].storeName}
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
		    <input 
		        type="text" 
		        class="search-input" 
		        id="main-search-input"
		        placeholder="🔍 Search stores or items..."
		        autocomplete="off"
		        onChange={searchItem}
		    ></input>
		    <div class="search-results-dropdown" id="search-results-dropdown"></div>
		</div>

		 <section class="filter-section">
		    <h3 class="section-header">Categories</h3>
		    
		    <button class="filter-item category-filter" data-category="Produce">
		        <span class="filter-icon">🍎</span>
		        <span class="filter-label">Produce</span>
		    </button>

		    <button class="filter-item category-filter" data-category="Dairy">
		        <span class="filter-icon">🥛</span>
		        <span class="filter-label">Dairy</span>
		    </button>

		    <button class="filter-item category-filter" data-category="Meat">
		        <span class="filter-icon">🥩</span>
		        <span class="filter-label">Meat</span>
		    </button>

		    <button class="filter-item category-filter">
		        <span class="filter-icon">👕</span>
		        <span class="filter-label">Clothing</span>
		    </button>
		</section>

		<section class="filter-section">
		    <h3 class="section-header">Store Types</h3>
		    
		    <button class="filter-item type-filter" data-type="Grocery">
		        <span class="filter-icon">🛒</span>
		        <span class="filter-label">Grocery</span>
		    </button>

		    <button class="filter-item type-filter" data-type="Restaurant">
		        <span class="filter-icon">🍽️</span>
		        <span class="filter-label">Restaurant</span>
		    </button>

		    <button class="filter-item type-filter" data-type="Pub">
		        <span class="filter-icon">🍺</span>
		        <span class="filter-label">Pub</span>
		    </button>

		    <button class="filter-item type-filter" data-type="Hardware">
		        <span class="filter-icon">🔨</span>
		        <span class="filter-label">Hardware</span>
		    </button>

		    <button class="filter-item type-filter" data-type="Home Goods">
		        <span class="filter-icon">🏠</span>
		        <span class="filter-label">Home Goods</span>
		    </button>

		</section>
		
		<section class="filter-section">
		    <h3 class="section-header">Distance</h3>
		    
		    <button class="filter-item distance-filter active" data-distance="all">
		        <span class="filter-icon">📍</span>
		        <span class="filter-label">All</span>
		    </button>

		    <button class="filter-item distance-filter" data-distance="1">
		        <span class="filter-icon">📍</span>
		        <span class="filter-label">1km</span>
		    </button>

		    <button class="filter-item distance-filter" data-distance="2">
		        <span class="filter-icon">📍</span>
		        <span class="filter-label">2km</span>
		    </button>

		    <button class="filter-item distance-filter" data-distance="5">
		        <span class="filter-icon">📍</span>
		        <span class="filter-label">5km</span>
		    </button>
		</section>


		{ /* Results section with shop cards */ }
		<div class="results-section">
		    <h3 class="results-header">Results ({Object.keys(matchingStores).length})</h3>
		    {Object.keys(matchingStores).map((storeID) => (
			    <div class="shop-card" id={"store-" + storeID}>
				<img class="shop-image" src={matchingStores[storeID].pictureURL} alt="Shop image"></img>
				<div class="shop-content">
				    <div class="shop-info left">
				        <h3 class="shop-name">{matchingStores[storeID].storeName}</h3>
				        <p class="shop-description">{matchingStores[storeID].description}</p>
				<p>{matchingStores[storeID].website}</p>
				    </div>
				    <div class="shop-info">
				        {locationOn && <p><b>{computeDistance(matchingStores[storeID].latitude, matchingStores[storeID].longitude)} km away</b></p>}
					<p>{matchingStores[storeID].address}</p>
				        <p onClick={() => {toggleExpandedHours(storeID)}}><b>{printHours(matchingStores[storeID].hours[getWeekday()])} ({DAYS_NAMES[getWeekday()].substr(0,3)}) v</b></p>
				        {expandedHours == storeID && <div class="expanded-hours">
						{Array(7).keys().map((dayIndex) => (
				        		<p>{printHours(matchingStores[storeID].hours[dayIndex])} ({DAYS_NAMES[dayIndex].substr(0,3)})</p>
				        	))}
				        </div>}
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
