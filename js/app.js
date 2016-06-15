/*
 * Register Service Worker.
 */
if(navigator.serviceWorker){
	navigator.serviceWorker.register('./sw.js')
	.then(function(res){
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
/*
 * Parse CSV file trips.txt into JSON format.
 */
Papa.parse('../data/trips.txt', {
	delimiter: ",",
	download:true,
	header:true,
	complete: function(results) {
		tripArr = results.data;
		/*
		 * Parse CSV file stop_times.txt into JSON format.
		 */
		Papa.parse('../data/stop_times.txt', {
			delimiter: ",",
			download:true,
			header:true,
			step: function(newRow){
				$.each(tripArr, function(){
					if((this.trip_id === newRow.data[0].trip_id)){
						var obj = {
							trip_id: newRow.data[0].trip_id,
							arrival_time: newRow.data[0].arrival_time,
							departure_time: newRow.data[0].departure_time,
							stop_id: newRow.data[0].stop_id,
							stop_sequence: newRow.data[0].stop_sequence,
							pickup_type: newRow.data[0].pickup_type,
							drop_off_type: newRow.data[0].drop_off_type,
							route_id: this.route_id,
							service_id: this.service_id
						}
						stopTimesArr.push(obj);
					}
				});
			},
			complete: function(newResults){
				/*
				 * Parse CSV file stops.txt into JSON format.
				 */
				Papa.parse('../data/stops.txt', {
					delimiter: ",",
					download:true,
					header:true,
					step: function(newStopRow){
						$.each(stopTimesArr, function(){
							if(this.stop_id === newStopRow.data[0].stop_id){
								var Id = this.trip_id + this.stop_sequence;
								var objNew = {
									'id': Id,
									'stop_id': this.stop_id,
									'stop_name': newStopRow.data[0].stop_name,
									'arrival_time': this.arrival_time,
									'departure_time': this.departure_time,
									'trip_id': this.trip_id,
									'stop_sequence': this.stop_sequence,
									'route_id': this.route_id,
									'service_id': this.service_id
								}
								stopArr.push(objNew);
							}
						});
					},
					complete: function(finalResult){
						$.each(stopArr,function(i,val){
							if(stationNames.indexOf(val.stop_name) === -1){
								stationNames.push(val.stop_name);
							}
						});
						$.each(stationNames, function(i,val){
							$('#fromStop').append("<option>"+ val +"</option>");
							$('#toStop').append("<option>"+ val +"</option>");
						});
						/*
						 * Store data to indexedDB transport.
						 */
						dbPromise.then(function(db) {
							if (!db) return;
								var tx = db.transaction('transports', 'readwrite');
								var store = tx.objectStore('transports');
								stopArr.forEach(function(message) {
									store.put(message);
								});
						});
						
					}
				});
			}
			});
		}
});
/*
 * Click event handler on Search button.
 */
$('#search').on('click', function(){
	$('.modal-content').html('');
	fromValue = $('#fromStop').val();
	toValue = $('#toStop').val();
	serviceDay = $('#serviceDay').val();
	if(fromValue === '' || toValue === '' || serviceDay === ''){alert('Please provide all values');}
	if(fromValue === toValue){
		alert('Both stations should be different');
		return;
	}
	$('.modal-content').append('<h3>'+"Select Any Trip"+'</h3><table><tr><th>'+'Trip ID'+'</th><th>'+'Departure Time'+'</th><th>'+'Stop Seq'+'</th></tr></table><button id="returnMain" class="btn btn-primary">Return</button>');
	dbPromise.then(function(db) {
		if (!db) return;
		var index = db.transaction('transports')
		.objectStore('transports').index('by-trip');

		return index.getAll().then(function(trip) {
			trip.forEach(function(e, index, array){
				if((fromValue === e.stop_name) && (e.service_id.indexOf(serviceDay) > 0)){
					$('.modal-content table').append('<tr><td>'+e.trip_id+'</td><td>'+e.arrival_time+'</td><td>'+e.stop_sequence+'</td></tr>');
				}
			});
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
		var index = db.transaction('transports')
		.objectStore('transports').index('by-trip');
		return index.getAll(tripVal).then(function(trip) {
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
				$('#schedules').append('<span>'+fromResult[0].arrival_time+'</span><span class="glyphicon glyphicon-triangle-bottom"></span><br>');
				$('#schedules').append('<span class="glyphicon glyphicon-option-vertical"></span><br>');
				$('#schedules').append('<span>'+fromResult[0].departure_time+'</span><span class="glyphicon glyphicon-triangle-bottom"></span><br><br>');
				$('#schedules').append('<div id="route-icon"></div><br>');
				var routeID = fromResult[0].route_id;
				for(var i=parseInt(fromResult[0].stop_sequence)+1; i<=parseInt(toResult[0].stop_sequence)-1;i++){
					
					var nextResult = $.grep(trip, function(e){return parseInt(e.stop_sequence) === i});
					
					if(nextResult){
						if(nextResult[0].route_id !== routeID){
							routeID = nextResult[0].route_id;
							$('#schedules').append('<span>'+nextResult[0].stop_name+' '+'('+assignService(nextResult[0].route_id)+')</span><br>');
							$('#schedules').append('<span>'+nextResult[0].arrival_time+'</span><span class="glyphicon glyphicon-triangle-bottom"></span><br>');
							$('#schedules').append('<span class="glyphicon glyphicon-option-vertical"></span><br>');
							$('#schedules').append('<span>'+nextResult[0].departure_time+'</span><span class="glyphicon glyphicon-triangle-bottom"></span><br><br>');
							$('#schedules').append('<div id="route-icon"></div><br>');
						}
					}
				}
				$('#schedules').append('<span>'+toValue+'</span><br>');
				$('#schedules').append('<span>'+toResult[0].arrival_time+'</span><br><span class="glyphicon glyphicon-record"></span><br>');
			}
			else{
				$('#schedules').append('<span>'+fromValue+' '+'('+assignService(fromResult[0].route_id)+')</span><br>');
				$('#schedules').append('<span>'+fromResult[0].arrival_time+'</span><br><span class="glyphicon glyphicon-record"></span><br><br>');
				$('#schedules').append('<div id="route-icon"></div><br>');
				var routeID = fromResult[0].route_id;
				for(var i=parseInt(fromResult[0].stop_sequence)-1; i>=parseInt(toResult[0].stop_sequence)+1;i--){
					var nextResult = $.grep(trip, function(e){return parseInt(e.stop_sequence) === i});
					if(nextResult){
						if(nextResult[0].route_id !== routeID){
							routeID = nextResult[0].route_id;
							$('#schedules').append('<span>'+nextResult[0].stop_name+' '+'('+assignService(nextResult[0].route_id)+')</span><br>');
							$('#schedules').append('<span>'+nextResult[0].arrival_time+'</span><span class="glyphicon glyphicon-triangle-top"></span><br>');
							$('#schedules').append('<span class="glyphicon glyphicon-option-vertical"></span><br>');
							$('#schedules').append('<span>'+nextResult[0].departure_time+'</span><span class="glyphicon glyphicon-triangle-top"></span><br><br>');
							$('#schedules').append('<div id="route-icon"></div><br>');
						}
					}
				}
				$('#schedules').append('<span>'+toValue+'</span><br>');
				$('#schedules').append('<span>'+toResult[0].arrival_time+'</span><span class="glyphicon glyphicon-triangle-top"></span><br>');
				$('#schedules').append('<span class="glyphicon glyphicon-option-vertical"></span><br>');
				$('#schedules').append('<span>'+toResult[0].departure_time+'</span><span class="glyphicon glyphicon-triangle-top"></span>');
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