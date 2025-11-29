import { useEffect, useState, useRef } from 'react'
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
	const [allTypes, setAllTypes] = useState({})
	const [inventories, setInventories] = useState({})
	const [matchingItems, setMatchingItems] = useState({})
	const [addingItem, setAddingItem] = useState(false)
	const [resultPopupText, setResultPopupText] = useState("")
	const [locationOn, setLocationOn] = useState(false)
	const [searchResultsVisible, setSearchResultsVisible] = useState(false)
	const [userLat, setUserLat] = useState(0.1)
	const [userLong, setUserLong] = useState(0.1)
	const [expandedHours, setExpandedHours] = useState(-1)
	const [mapPos, setMapPos] = useState([53.3415,-6.2777]) //lat, long
	const [mapZoom, setMapZoom] = useState(15)
	const [selectedCategories, setSelectedCategories] = useState([])
	const [selectedTypes, setSelectedTypes] = useState([])
	const markerRefs = useRef([]);
	const searchInput = useRef(0);
	const map = useRef(null);
	
	const fetchAllCategories = () => {
		fetch(URL + "/categories").then(res => res.json()).then((json) => setAllCategories(json))
		fetch(URL + "/types").then(res => res.json()).then((json) => setAllTypes(json))
	}
	
	const fetchAllStores = () => {
		fetch(URL + "/stores").then(res => res.json()).then((json) => setAllStores(json))
	}
	
	const buildQuery = () => {
		let query = searchInput.current.value
		query = query.toLowerCase().trim()
		
		let filters = ""
		for (let x of selectedCategories) {
			filters += "&categoryID=" + x
		}
		for (let x of selectedTypes) {
			filters += "&typeID=" + x
		}
		return {query: query, filters: filters}
	}
	
	const fetchStoreInventory = (storeID) => {
		let {query, filters} = buildQuery()
		fetch(URL + "/items?storeID=" + storeID + (matchingStores[storeID].storeNameMatched ? "" : ("&item=" + query)) + filters).then((res) => res.json()).then((json) => {
			setInventory(json, storeID)
		})
	}
	
	const toggleShowInventory = (storeID) => {
		if (inventories[storeID] == undefined || Object.keys(inventories[storeID]).length == 0) {
			fetchStoreInventory(storeID)
		} else {
			setInventory({},storeID)
		}
	}

	const setInventory = (itemDict, storeID) => {
		let dict = {}
		for (let id in inventories) {
			dict[id] = inventories[id]
		}
		dict[storeID] = itemDict
		setInventories(dict)
	}
	
	const focusStore = (storeID) => {
		setScrollPosition(storeID)
		setMapPos([allStores[storeID].latitude, allStores[storeID].longitude])
		setMapZoom(17)
		markerRefs.current[storeID].openPopup();
	}

	
	const handleGlobalClick = (event) => {
		setSearchResultsVisible(false)
	}
	
	const searchHandler = (event) => {
		if (event.target.value.length === 0) {
			setSearchResultsVisible(false)
		}
		if (event.key == "Enter") {
			searchItem(event, true)
		}
	}
	
	const searchItem = (event, showResults) => {
		if (showResults) {
			setTimeout(() => setSearchResultsVisible(true), 100)
		}
		
		let {query, filters} = buildQuery()
			
		setInventories({})
			
		//Find stores with matching names
		fetch(URL + "/stores?store=" + query + filters).then((res) => res.json()).then((json) => {
			let list = {}
			for (let id of Object.keys(json)) {
				list[id] = json[id]
				list[id].storeNameMatched = true
			}
			return list
		}).then((list) => {
		
		//Find stores with items with matching names
		fetch(URL + "/stores?item=" + query + filters).then((res) => res.json()).then((json) => {
			for (let id of Object.keys(json)) {
				list[id] = json[id]
				list[id].storeNameMatched = false
			}
			setMatchingStores(list)
		})
		
		})
		
		if (event != undefined) {
			event.preventDefault();
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
		fetch(URL + "/items", {
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
		document.getElementById("store-" + storeID).getElementsByClassName("shop-name")[0].scrollIntoView({behavior: "smooth", block:"center"})
	}
	
	const toggleCategory = (categoryID) => {
		let wasFound = false
		let categoryLis = []
		for (let i in selectedCategories) {
			if (selectedCategories[i] === categoryID) {
				wasFound = true
			} else {
				categoryLis.push(selectedCategories[i])
			}
		}
		if (!wasFound) {
			categoryLis.push(categoryID)
		}
		setSelectedCategories(categoryLis)
	}
	
	const toggleType = (typeID) => {
		let wasFound = false
		let typeLis = []
		for (let i in selectedTypes) {
			if (selectedTypes[i] === typeID) {
				wasFound = true
			} else {
				typeLis.push(selectedTypes[i])
			}
		}
		if (!wasFound) {
			typeLis.push(typeID)
		}
		setSelectedTypes(typeLis)
	}
	
	//fetch initial data only when starting (remove the [] to do on every render, or add a variable to do so when that variable changes)
	useEffect(() => {
		locationSetup();
		fetchAllStores();
		fetchAllCategories();
		window.addEventListener("click",handleGlobalClick)
		searchItem(undefined, false)
	}, []);
	
	useEffect(() => {
		searchItem(undefined, false)
	}, [selectedCategories, selectedTypes])
	
	const RecenterAutomatically = ({lat,lng,zoom}) => {
	 const map = useMap();
	  useEffect(() => {
	    map.setView([lat, lng], zoom);
	  }, [lat, lng, zoom]);
	  return null;
	}


	const userIcon = new L.Icon({iconUrl: "./src/assets/user.png", iconSize: [40,40]})

	return (
	<>
		<img 
		src="./src/assets/LibertiesShopsLogo.png"
		className="navbar-item"
		style={{
			width: "12rem",
			height: "auto",
			left: "2rem",
			position: "absolute",
			top: "0rem"
		}}
		/>

	    { /* Dropdown toggle button for advanced filters */ }
	    {/*
	    <button id="toggle-filters-btn" className="toggle-filters-btn big-button">
		<span>⚙️ Filters</span>
	    </button>
	    */}
	    
	    <button id="add-item" className="big-button" onClick={() => {setAddingItem(true)}}>Add Item</button>
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
		    		<label className="optional-label">optional--can be left blank</label><br></br>
			    	<label for="price-input">Price: € </label>
			    	<input id="price-euros-input" className="price-input" placeholder={"0"} name="euros"></input>
			    	<span> . </span>
			    	<input id="price-cents-input"  className="price-input" maxLength={2} placeholder={"00"} name="cents"></input>
		    	</div>
		    	<div>
			    	<label for="price-input">Store: </label>
			    	<select id="store-input" name="storeID">
			    		{Object.keys(allStores).map((storeID) => (
			    			<option key={storeID} value={storeID}>{allStores[storeID].storeName}</option>
			    		))}
			    	</select>
		    	</div>
		    	<div>
			    	<label for="category-input">Category: </label>
			    	<select id="category-input" name="categoryID">
			    		{Object.keys(allCategories).map((categoryID) => (
			    			<option key={categoryID} value={categoryID}>{allCategories[categoryID].categoryName}</option>
			    		))}
			    	</select>
		    	</div>
		    	<button type="submit" id="submit-item" className="big-button">SUBMIT</button>
	    	</form>
	    </div>
	    }
	    
	    { /* Map Container */ }
	    <div id="map">
		<MapContainer center={mapPos} zoom={mapZoom} scrollWheelZoom={true} ref={map}>
			<TileLayer
			attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{locationOn && <Marker position={[userLat, userLong]} icon={userIcon}>
			</Marker>
			}
		    	{Object.keys(matchingStores).map((storeID) => (
					<Marker key={storeID} position={[matchingStores[storeID].latitude, matchingStores[storeID].longitude]} eventHandlers={{ click: () => {setScrollPosition(storeID)}}} ref={(element) => markerRefs.current[storeID] = element}>
						<Popup>
						  {matchingStores[storeID].storeName}
						</Popup>
					</Marker>
			))}
			<RecenterAutomatically lat={mapPos[0]} lng={mapPos[1]} zoom={mapZoom}/>
		</MapContainer>
	    </div>

	    <div className="filters-sidebar">
		<div className="filters-header">
		    <h2 className="filters-title">Filters & Results</h2>
		    <button className="filters-edit-btn">⋯</button>
		</div>

		<div className="search-container">
		    <input 
			type="text" 
			className="search-input" 
			id="main-search-input"
			placeholder="🔍 Search stores or items..."
			autoComplete="off"
			onKeyPress={searchHandler}
			onChange={searchHandler}
			ref={searchInput}
		    ></input>
		    <button className="search-button big-button" onClick={(event) => searchItem(event, true)}>🔍</button>
		    {searchResultsVisible && <div className="search-results-dropdown active" id="search-results-dropdown">
		    	{(Object.keys(matchingStores).length === 0) && <div className="no-results">
				No stores found with that item
		    	</div>
		    	}
		    	{Object.keys(matchingStores).map((storeID) => (
		            <div key={storeID} className="search-result-item" onClick={() => focusStore(storeID)}>
		                <div className="search-result-name">{matchingStores[storeID].storeName}</div>
		                <div className="search-result-details">
		                    {matchingStores[storeID].address} • {locationOn ? (computeDistance(matchingStores[storeID].latitude,matchingStores[storeID].longitude) + "km away") : ""}
		                </div>
		                <div className="search-result-match"></div>
		            </div>))}
		    </div>}
		</div>

		 <section className="filter-section">
		    <h3 className="section-header">Categories</h3>
		    
		    {Object.keys(allCategories).map((categoryID) => (
		    <button key={categoryID} className={"filter-item type-filter" + ((selectedCategories.includes(categoryID)) ? " filter-item-selected" : "")} data-category={allCategories[categoryID].categoryName} onClick={() => toggleCategory(categoryID)}>
		        <span className="filter-icon">{allCategories[categoryID].categorySymbol}</span>
		        <span className="filter-label">{allCategories[categoryID].categoryName}</span>
		    </button>
		    ))}
		</section>

		<section className="filter-section">
		    <h3 className="section-header">Store Types</h3>
		    
		    {Object.keys(allTypes).map((typeID) => (
		    <button key={typeID} className={"filter-item type-filter" + ((selectedTypes.includes(typeID)) ? " filter-item-selected" : "")} data-category={allTypes[typeID].typeName} onClick={() => toggleType(typeID)}>
		        <span className="filter-icon">{allTypes[typeID].typeSymbol}</span>
		        <span className="filter-label">{allTypes[typeID].typeName}</span>
		    </button>
		    ))}
		</section>

		{ /* Results section with shop cards */ }
		<div className="results-section">
		    <h3 className="results-header">Results ({Object.keys(matchingStores).length})</h3>
		    {Object.keys(matchingStores).map((storeID) => (
			    <div key={storeID} className="shop-card" id={"store-" + storeID} onClick={() => focusStore(storeID)}>
				<img className="shop-image" src={matchingStores[storeID].pictureURL} alt="Shop image"></img>
				<div className="shop-content">
				    <div className="shop-info left">
				        <h3 className="shop-name">{matchingStores[storeID].storeName}</h3>
				        <p className="shop-description">{matchingStores[storeID].description}</p>
					<p>{matchingStores[storeID].website}</p>
				    </div>
				    <div className="shop-info">
				        {locationOn && <p><b>{computeDistance(matchingStores[storeID].latitude, matchingStores[storeID].longitude)} km away</b></p>}
					<p>{matchingStores[storeID].address}</p>
				        <p onClick={() => {toggleExpandedHours(storeID)}}><b>{printHours(matchingStores[storeID].hours[getWeekday()])} ({DAYS_NAMES[getWeekday()].substr(0,3)}) v</b></p>
				        {expandedHours == storeID && <div className="expanded-hours">
						{Array(7).keys().map((dayIndex) => (
				        		<p key={dayIndex}>{printHours(matchingStores[storeID].hours[dayIndex])} ({DAYS_NAMES[dayIndex].substr(0,3)})</p>
				        	))}
				        </div>}
				    </div>
				</div>
				<button className="small-button" onClick={() => toggleShowInventory(storeID)}>{((inventories[storeID] != undefined && Object.keys(inventories[storeID]).length > 0) ? "hide" : "show") + " inventory"}</button>
				<div className="inventory-panel">
				{(inventories[storeID] == undefined || Object.keys(inventories[storeID]).length == 0) ? "" : (Object.keys(inventories[storeID]).map((itemID) => (
				<div key={itemID} className="item-card">
					<div className="item-info left">
					<p>{inventories[storeID][itemID].itemName}</p>
					</div>
					<div className="item-info">
					{(inventories[storeID][itemID].price != 0) ? (<p> €{inventories[storeID][itemID].price} </p>) : ""}
					</div>
				</div>
				))
				)}
				</div>
			    </div>
		    ))}
		</div>
	    </div>

	    {/*
	    <aside id="advanced-filters" className="advanced-filters">
		<button className="close-filters-btn" id="close-filters-btn">×</button>
		
		<div className="keywords-section">
		    <label className="filter-label-text">Keywords</label>
		    <div className="keyword-tags">
		        <span className="keyword-tag">
		            Organic
		            <button className="tag-remove">×</button>
		        </span>
		        <span className="keyword-tag">
		            Pork
		            <button className="tag-remove">×</button>
		        </span>
		        <span className="keyword-tag">
		            Budget
		            <button className="tag-remove">×</button>
		        </span>
		    </div>
		</div>

		<div className="checkbox-section">
		    <label className="checkbox-item">
		        <input type="checkbox" checked></input>
		        <div className="checkbox-content">
		            <span className="checkbox-label">Open</span>
		            <span className="checkbox-description">Only shows stores that are currently open</span>
		        </div>
		    </label>

		    <label className="checkbox-item">
		        <input type="checkbox" checked></input>
		        <div className="checkbox-content">
		            <span className="checkbox-label">Transportation</span>
		            <span className="checkbox-description">Expands search to include shops further away</span>
		        </div>
		    </label>

		    <label className="checkbox-item">
		        <input type="checkbox" checked></input>
		        <div className="checkbox-content">
		            <span className="checkbox-label">Don't close soon</span>
		            <span className="checkbox-description">Removes stores that close less than 30 min from now</span>
		        </div>
		    </label>
		</div>

		<div className="slider-section">
		    <div className="slider-header">
		        <label className="filter-label-text">Price Range</label>
		        <span className="slider-value">€10-100</span>
		    </div>
		    <input type="range" className="price-slider" min="10" max="100" value="50"></input>
		</div>

		<div className="checkbox-section">
		    <label className="filter-label-text">inventory</label>
		    
		    <label className="checkbox-item-simple">
		        <input type="checkbox"></input>
		        <span>Clothing</span>
		    </label>

		    <label className="checkbox-item-simple">
		        <input type="checkbox"></input>
		        <span>Butcher</span>
		    </label>

		    <label className="checkbox-item-simple">
		        <input type="checkbox"></input>
		        <span>Produce</span>
		    </label>
		</div>

		<div className="checkbox-section">
		    <label className="filter-label-text">Distance</label>
		    
		    <label className="checkbox-item-simple">
		        <input type="checkbox"></input>
		        <span>Nearest</span>
		    </label>

		    <label className="checkbox-item-simple">
		        <input type="checkbox"></input>
		        <span>3Km</span>
		    </label>

		    <label className="checkbox-item-simple">
		        <input type="checkbox"></input>
		        <span>5Km</span>
		    </label>
		</div>
	    </aside>*/}

	</>
	)
}

export default App
