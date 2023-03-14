let zonedone = 0;
let url = 0;
let globalesaved = 0;
app();

function app(){

	////////////////////////////
	// get user gps position  //
	////////////////////////////
	// vérifie que la méthode est implémenté dans le navigateur
	if ( navigator.geolocation ) {
		// demande d'envoyer la position courante à la fonction callback
		navigator.geolocation.getCurrentPosition( callback, erreur );
	}

	let gps_state = 0;

	function erreur( error ) {
		switch( error.code ) {
			case error.PERMISSION_DENIED:
			console.log( 'L\'utilisateur a refusé la demande' );
			break;
			case error.POSITION_UNAVAILABLE:
			console.log( 'Position indéterminée' );
			break;
			case error.TIMEOUT:
			console.log( 'Réponse trop lente' );
			break;
		}
	};


	const tapstart = document.getElementById('tapstart');
	tapstart.addEventListener("mouseup", removeaccueil);

	function removeaccueil() {
		console.log( gps_state );
		if (gps_state > 0) {
			document.getElementById('accueil').classList.add('hide');
		}else{
			document.getElementById('accueil').classList.remove('hide');;
		}
	}

	function callback( position ) {
		gps_state = 1;
		let latuser = position.coords.latitude;
		let lnguser = position.coords.longitude;
		// latuser = 45.190186736692795; // Grenoble
		// lnguser = 5.722132379048996;
		// latuser = 38.89550; // Maison Blanche
		// lnguser = -77.03649;
		const gps = document.getElementById('start');
		gps.innerHTML = "TAP TO START";
		gps.classList.remove('red');
		const element = document.getElementById('salu');
		element.innerHTML = "Latitude : "+latuser;
		const element2 = document.getElementById('salu2');
		element2.innerHTML = "Longitude : " +lnguser;
		console.log( latuser, lnguser );
		readjson(latuser, lnguser);
	}

	// TODO:
	/////////////////////////////////////////////
	/// re-fetch openstreetmap if user go OOB ///
	/////////////////////////////////////////////
	// if (latuser  ) {
	// 	zonedone = 0;
	// }


	//////////////////////////////////////////////////
	// generate json file from                      //
	// user localisation with overpass api          //
	// calculate distance from user with Json file  //
	//////////////////////////////////////////////////
	async function readjson(latuser, lnguser){
		let frequencemax = 440; // en hz
		// let seuil = 300; // en mètres
		let seuil = document.getElementById("seuil").value;
		let shortest = 1000000000000;
		let shortest2 = 1000000000000;

		if (zonedone < 1) {
			url = zone(gps_state, latuser, lnguser);
			console.log("DONE ="+zonedone);
			// start waiting anim
			document.getElementById('fetching').classList.remove('hide');
			console.log("Receiving.....");
			var data = await $.get(encodeURI(url));
			// data.fail(function() { // ENDLE ERROR MAYBE ??
			// document.getElementById("receive").innerHTML = "Error with the request ! please refresh the app";
			// });
			// end waiting anim
			document.getElementById('fetching').classList.add('hide');
			console.log("Received !");
		}

		readit(data);
		function readit(data){
			//ecrire sur storedata que quand data pas null ou undefiened
			if (data == null) {
				storedata = globalesaved;
				// 'sup ?
			}else {
				var storedata = data;
				globalesaved = data;
				console.log("EPIC");
			}

			console.log(storedata);
			let selector = storedata.elements.length;
			for (var i = 0; i < selector ; i++) {
				let lat = storedata.elements[i]["lat"];
				let lon = storedata.elements[i]["lon"];
				let dist = Distance(lat, lon, latuser, lnguser)*111139; //angle lat lon to meters 0.01° = 1km
				// console.log(lat, lon);
				// console.log(dist);

				if (dist < seuil) {
					console.log("moins de "+ Math.trunc(seuil) +"m, (à "+ Math.trunc(dist) +"m)");

					if (dist < shortest) {  // shortest always take the minimum dist
						shortest = dist;
					}
					if (dist < shortest2 && dist != shortest) {
						shortest2 = dist; // shortest2 take the minimum dist sauf si = shortest
					}
				}
			}
			// shortest = 250; // testing distances
			let distfreq = frequencemax-((shortest*frequencemax)/seuil);		// frequence entre [0, frequencemax] pour distance entre [seuil, 0]
			let distfreq2 = frequencemax-((shortest2*frequencemax)/seuil);
			if (distfreq < 0) { // ne remonte pas pour des distances superieur au seuil
				distfreq = 0;
			}
			if (distfreq2 < 0) { // ne remonte pas pour des distances superieur au seuil
				distfreq2 = 0;
			}
			playthesound(distfreq, distfreq2); // play pour les deux nearest cctv
			console.log("shortest is "+shortest+"m");
			console.log("shortest2 is "+shortest2+"m");
		};
	}

	function Distance(x1, y1, x2, y2) {
		return Math.sqrt(sqr(y2 - y1) + sqr(x2 - x1));
	}
	function sqr(a) {
		return a*a;
	}

	setTimeout(app, 1000);
}


function zone(gps_state, latuser, lnguser) {
	let zonecoord_A = latuser-0.03; //zone carré de 11km*2 22km de coté autour de l'utilisateur
	let zonecoord_B = lnguser-0.03;
	let zonecoord_C = latuser+0.03;
	let zonecoord_D = lnguser+0.03;
	const url='https://www.overpass-api.de/api/interpreter?data=[out:json];node[man_made=surveillance]('+ zonecoord_A +','+ zonecoord_B +','+ zonecoord_C +','+ zonecoord_D +');out;'
	console.log(encodeURI(url));
	zonedone = 1;
	console.log("DONE ="+zonedone);
	return url;
}




/////////////////////
//// Music time  ////
/////////////////////
let oscillator, oscillator2, isPlaying, pixelRatio, sizeOnScreen, segmentWidth;
let initialisation = 0;

const canvas = document.getElementById("canvas"),
c = canvas.getContext("2d"),
ac = new AudioContext(),
powerBtn = document.getElementById("on-off"),
oscType = document.getElementById("osc-type"),
freqSlider = document.getElementById("frequency"),
gainSlider = document.getElementById("gain"),
seuilSlider = document.getElementById("seuil"),
gainNode = new GainNode(ac, {
	gain: 0.5
}),
analyser = new AnalyserNode(ac, {
	smoothingTimeConstant: 1,
	fftSize: 2048
}),
dataArray = new Uint8Array(analyser.frequencyBinCount);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
pixelRatio = window.devicePixelRatio;
sizeOnScreen = canvas.getBoundingClientRect();
canvas.width = sizeOnScreen.width * pixelRatio;
canvas.height = sizeOnScreen.height * pixelRatio;
canvas.style.width = canvas.width / pixelRatio + "px";
canvas.style.height = canvas.height / pixelRatio + "px";
c.fillStyle = "rgba(0, 0, 0)";
c.fillRect(0, 0, canvas.width, canvas.height);
c.strokeStyle = "#fff";
c.lineWidth = 4;
c.beginPath();
c.moveTo(canvas.width / 2, 0);
c.lineTo(canvas.width /2, canvas.height);
c.stroke();

powerBtn.addEventListener("click", playthesound);

function playthesound(distfreq, distfreq2) {
	console.log("distfreq = "+distfreq);
	console.log("distfreq2 = "+distfreq2);
	if (isPlaying) {
		if (oscillator) oscillator.stop();
		if (oscillator2) oscillator2.stop();
	} else {
		isPlaying = !isPlaying;
	}
	oscillator = new OscillatorNode(ac, {
		type: oscType.value,
		frequency: distfreq
	});
	console.log("frequence1 is on");
	oscillator.connect(gainNode);
	gainNode.connect(analyser);
	analyser.connect(ac.destination);
	oscillator.start();

	if (distfreq2 > 0) {
		oscillator2 = new OscillatorNode(ac, {
			type: oscType.value,
			frequency: distfreq2
		});
		console.log("frequence2 is on");
		oscillator2.connect(gainNode);
		gainNode.connect(analyser);
		analyser.connect(ac.destination);
		oscillator2.start();
	}

	if (initialisation === 0) {
		draw();
		initialisation = 1;
	}
}

// freqSlider.addEventListener("input", (event) => {
// 	let freq = event.target.value;
// 	document.getElementById("frequencyValue").innerHTML = freq;
// 	if (oscillator && isPlaying) {
// 		oscillator.frequency.value = freq;
// 	}
// });

oscType.addEventListener("change", (event) => {
	if (oscillator && isPlaying) {
		oscillator.type = event.target.value;
	}
});

gainSlider.addEventListener("input", (event) => {
	let gain = event.target.value;
	document.getElementById("gainValue").innerHTML = Math.round(gain*100);
	if (oscillator && isPlaying) {
		gainNode.gain.value = gain;
	}
});

seuilSlider.addEventListener("input", (event) => {
	let seuil = event.target.value;
	document.getElementById("seuilValue").innerHTML = seuil+"m";
});

const draw = () => {
	analyser.getByteTimeDomainData(dataArray);
	segmentHeight = canvas.height / analyser.frequencyBinCount;
	c.fillRect(0, 0, canvas.width, canvas.height);
	c.beginPath();
	c.moveTo(canvas.width / 2, -100);
	if (isPlaying) {
		for (let i = 1; i < analyser.frequencyBinCount; i += 1) {
			let y = i * segmentHeight;
			let v = dataArray[i] / 128.0;
			let x = (v * canvas.width) / 2;
			c.lineTo(x, y);
		}
	}
	c.lineTo(canvas.width / 2, canvas.height + 100);
	c.stroke();
	requestAnimationFrame(draw);
};


///////////////////////
//// Mobile detect ////
///////////////////////
const mobile = document.getElementById('mobile');
mobile.addEventListener("mouseup", removemobile);

if ("ontouchstart" in document.documentElement) {
	removemobile();
}

function removemobile() {
	document.getElementById('mobile').classList.add('hide');
}
