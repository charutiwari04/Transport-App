/*
 * Register Service Worker.
 */
if(navigator.serviceWorker){
	navigator.serviceWorker.register('sw.js')
	.then(function(res){
		if(!navigator.serviceWorker.controller){
			return;
		}
		console.log("Service Worker Registered.");
	},
	function(err){
		console.log(err);
	});
}
/*
 * Open IndexedDB transport.
 */
function openDatabase(){
	if (!navigator.serviceWorker) {
		return Promise.resolve();
	}
	return idb.open('transport', 1, function(upgradeDb) {
		var store = upgradeDb.createObjectStore('transports', {
			keyPath: 'id'
		});
		store.createIndex('by-trip', 'trip_id');
	});
}
var dbPromise = openDatabase();
var fromValue = '';
var toValue = '';
var serviceDay = '';
var stopArr = [];
var tripArr = [];
var stopTimesArr = [];
var stationNames = [];
$.getJSON("data/trips.json")
.done(function(data){
	tripArr = data;
	$.getJSON("data/stop_times.json")
	.done(function(timeData){
		$.each(timeData, function(timeIndx, timeVal){
			$.each(tripArr, function(tripIndx, tripVal){
				if(timeVal.trip_id === tripVal.trip_id){
					var obj = {
							trip_id: timeVal.trip_id,
							arrival_time: timeVal.arrival_time,
							departure_time: timeVal.departure_time,
							stop_id: timeVal.stop_id,
							stop_sequence: timeVal.stop_sequence,
							pickup_type: timeVal.pickup_type,
							drop_off_type: timeVal.drop_off_type,
							route_id: tripVal.route_id,
							service_id: tripVal.service_id,
							direction_id: tripVal.direction_id
						}
						stopTimesArr.push(obj);
				}
			});
		});
		$.getJSON("data/stops.json")
		.done(function(stopData){
			$.each(stopTimesArr, function(newIndx, newVal){
				$.each(stopData, function(stopIndx, stopVal){
					if(newVal.stop_id === stopVal.stop_id){
						var Id = newVal.trip_id + newVal.stop_sequence;
						var objNew = {
							'id': Id,
							'stop_id': newVal.stop_id,
							'stop_name': stopVal.stop_name,
							'arrival_time': newVal.arrival_time,
							'departure_time': newVal.departure_time,
							'trip_id': newVal.trip_id,
							'stop_sequence': newVal.stop_sequence,
							'route_id': newVal.route_id,
							'service_id': newVal.service_id,
							'direction_id': newVal.direction_id
						}
						stopArr.push(objNew);
					}
				});
			});
			$.each(stopArr, function(i,val){
				if(stationNames.indexOf(val.stop_name) === -1){
					stationNames.push(val.stop_name);
				}
			});
			$.each(stationNames, function(i,val){
				$('#fromStop').append("<option>"+ val +"</option>");
				$('#toStop').append("<option>"+ val +"</option>");
			});
			dbPromise.then(function(db) {
				if (!db) return;
					var tx = db.transaction('transports', 'readwrite');
					var store = tx.objectStore('transports');
					stopArr.forEach(function(message) {
						store.put(message);
					});
			});
		})
		.fail(function(jqxhr, textStatus, error){
			var err = textStatus +","+error;
			console.log("Stops Request Failed: "+err);
		});
	})
	.fail(function(jqxhr, textStatus, error){
		var err = textStatus +","+error;
		console.log("Stop_Times Request Failed: "+err);
	});
})
.fail(function(jqxhr, textStatus, error){
	var err = textStatus +","+error;
	console.log("Trips Request Failed: "+err);
});
/*
 * Input Validation.
 */
function validateFrom(){
	var txt ="";
	if(document.getElementById('fromStop').validity.valueMissing){
		txt ="Please select out the field."
	}
	document.getElementById('from-err').innerHTML = txt;
}
function validateTo(){
	var txt ="";
	if(document.getElementById('toStop').validity.valueMissing){
		txt ="Please select out the field."
	}
	document.getElementById('to-err').innerHTML = txt;
}
function validateDay(){
	var txt ="";
	if(document.getElementById('serviceDay').validity.valueMissing){
		txt ="Please select out the field."
	}
	document.getElementById('day-err').innerHTML = txt;
}
/*
 * Click event handler on Search button.
 */
$('#search').on("click", function(evt) {
  $('.modal-content').html('');
  $('#form-err').text('');
	fromValue = $('#fromStop').val();
	toValue = $('#toStop').val();
	serviceDay = $('#serviceDay').val();
	if(fromValue === '' || toValue === '' || serviceDay === ''){$('#form-err').text('Please provide all values');return;}
	if(fromValue === toValue){
		$('#form-err').text('Both stations should be different');
		return;
	}
	$('.modal-content').append('<h3>'+"Select Any Trip"+'</h3><table><tr><th>'+'Trip ID'+'</th><th>'+'Arrival Time'+'</th>+<th>'+'Departure Time'+'</th><th>'+'Stop Seq'+'</th></tr></table><button id="returnMain" class="btn btn-primary">Return</button>');
	dbPromise.then(function(db) {
		if (!db) return;
		var indexN = db.transaction('transports')
		.objectStore('transports').index('by-trip');

		return indexN.getAll().then(function(trip) {
			var tripData =[];
			trip.forEach(function(e, index, array){
				if((fromValue === e.stop_name) && (e.service_id.indexOf(serviceDay) > 0)){
				tripData.push(
					{
						'trip_id': e.trip_id,
						'arr_time': e.arrival_time,
						'dep_time': e.departure_time,
						'stop_seq': e.stop_sequence
					}
				);
				}
			});
			if(tripData.length ===0){
				$('.modal-content').append("<h4>Sorry!!! There are no service available between selected stations on this service Day. Please select other stations or service Day.</h4>")
			}
			else{
				tripData.forEach(function(e, ind, arr){
					$('.modal-content table').append('<tr><td>'+e.trip_id+'</td><td>'+e.arr_time+'</td><td>'+e.dep_time+'</td><td>'+e.stop_seq+'</td></tr>');
				});
			}
		});
	});
});	
/*
 * @assignService function to convert route id to route description.
 */
function assignService(inp){
	var serviceType='';
	if(inp.startsWith("TaSj")) {serviceType = "Caltrain Shuttle"};
	if(inp.startsWith("Lo")) {serviceType = "Local"};
	if(inp.startsWith("Li")) {serviceType = "Limited"};
	if(inp.startsWith("Bu")) {serviceType = "Baby Bullet"};
	return serviceType;
}	
/*
 * Click event handler on every row('tr') on trip table.
 */
$('.modal-content').on('click', 'tr', function(){
	$(".trip-modal").modal('hide');
	var indexVal = $('tr').index(this);
	var tripVal = $(this).find('td').eq(0).text();
	/*
	 * Read from indexedDB transport.
	 */
	dbPromise.then(function(db) {
		if (!db) return;
		var indexT = db.transaction('transports')
		.objectStore('transports').index('by-trip');
		return indexT.getAll(tripVal).then(function(trip) {
			function compareNumbers(a, b){
				return a.stop_sequence - b.stop_sequence;
			}
			fromValue = $('#fromStop').val();
			toValue = $('#toStop').val();
			var fromResult = $.grep(trip, function(e){return e.stop_name === fromValue});
			var toResult = $.grep(trip, function(e){return e.stop_name === toValue});
			if(fromResult.length === 0 || toResult.length === 0){
				$('#schedules').html("Sorry!!! This trip is not available. Please choose another trip.");
				return;
			}
			$('#schedules').html('<h3>'+'Schedule - from: '+'<span class="style-item">'+fromValue.replace('Caltrain', '')+'</span>'+' to: '+'<span class="style-item">'+toValue.replace('Caltrain', '')+'</span></h3>');
			if(parseInt(fromResult[0].stop_sequence) < parseInt(toResult[0].stop_sequence)){
				$('#schedules').append('<span>'+fromValue+' '+'('+assignService(fromResult[0].route_id)+')</span><br>');
				$('#schedules').append('<span>'+fromResult[0].arrival_time+'</span><img src="imgs/glyphicons/png/glyphicons-349-hand-down.png"><br>');
				$('#schedules').append('<img src="imgs/glyphicons/png/glyphicons-518-option-vertical.png"><br>');
				$('#schedules').append('<span>'+fromResult[0].departure_time+'</span><img src="imgs/glyphicons/png/glyphicons-349-hand-down.png"><br><br>');
				$('#schedules').append('<div id="route-icon"></div><br>');
				var routeID = fromResult[0].route_id;
				for(var i=parseInt(fromResult[0].stop_sequence)+1; i<=parseInt(toResult[0].stop_sequence)-1;i++){
					
					var nextResult = $.grep(trip, function(e){return parseInt(e.stop_sequence) === i});
					
					if(nextResult){
						if(nextResult[0].route_id !== routeID){
							routeID = nextResult[0].route_id;
							$('#schedules').append('<span>'+nextResult[0].stop_name+' '+'('+assignService(nextResult[0].route_id)+')</span><br>');
							$('#schedules').append('<span>'+nextResult[0].arrival_time+'</span><img src="imgs/glyphicons/png/glyphicons-349-hand-down.png"><br>');
							$('#schedules').append('<img src="imgs/glyphicons/png/glyphicons-518-option-vertical.png"><br>');
							$('#schedules').append('<span>'+nextResult[0].departure_time+'</span><img src="imgs/glyphicons/png/glyphicons-349-hand-down.png"></span><br><br>');
							$('#schedules').append('<div id="route-icon"></div><br>');
						}
					}
				}
				$('#schedules').append('<span>'+toValue+'</span><br>');
				$('#schedules').append('<span>'+toResult[0].arrival_time+'</span><br><img src="imgs/glyphicons/png/glyphicons-170-record.png"><br>');
			}
			else{
				$('#schedules').append('<span>'+fromValue+' '+'('+assignService(fromResult[0].route_id)+')</span><br>');
				$('#schedules').append('<span>'+fromResult[0].arrival_time+'</span><br><img src="imgs/glyphicons/png/glyphicons-170-record.png"><br><br>');
				$('#schedules').append('<div id="route-icon"></div><br>');
				var routeID = fromResult[0].route_id;
				for(var i=parseInt(fromResult[0].stop_sequence)-1; i>=parseInt(toResult[0].stop_sequence)+1;i--){
					var nextResult = $.grep(trip, function(e){return parseInt(e.stop_sequence) === i});
					if(nextResult){
						if(nextResult[0].route_id !== routeID){
							routeID = nextResult[0].route_id;
							$('#schedules').append('<span>'+nextResult[0].stop_name+' '+'('+assignService(nextResult[0].route_id)+')</span><br>');
							$('#schedules').append('<span>'+nextResult[0].arrival_time+'</span><img src="imgs/glyphicons/png/glyphicons-348-hand-up.png"><br>');
							$('#schedules').append('<img src="imgs/glyphicons/png/glyphicons-518-option-vertical.png"><br>');
							$('#schedules').append('<span>'+nextResult[0].departure_time+'</span><img src="imgs/glyphicons/png/glyphicons-348-hand-up.png"><br><br>');
							$('#schedules').append('<div id="route-icon"></div><br>');
						}
					}
				}
				$('#schedules').append('<span>'+toValue+'</span><br>');
				$('#schedules').append('<span>'+toResult[0].arrival_time+'</span><img src="imgs/glyphicons/png/glyphicons-348-hand-up.png"><br>');
				$('#schedules').append('<img src="imgs/glyphicons/png/glyphicons-518-option-vertical.png"><br>');
				$('#schedules').append('<span>'+toResult[0].departure_time+'</span><img src="imgs/glyphicons/png/glyphicons-348-hand-up.png">');
			}
		});
	});	
	$('#schedule').removeClass('hide');
	$('#schedule').addClass('show');
	$('.trips').addClass('hide');
	$('.trips').removeClass('show');
});
/*
 * Click event handler on Change Trip button.
 */	
$('#change-trip').on('click', function(){
	$('.trips').removeClass('hide');
	$('.trips').addClass('show');
	$('#schedule').removeClass('show');
	$('#schedule').addClass('hide');
});
/*
 * Click event handler on Return button.
 */	
$('.modal-content').on('click', '#returnMain', function(){
	$(".trip-modal").modal('hide');
});