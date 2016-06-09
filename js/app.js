//import idb from 'idb';
if(navigator.serviceWorker){
	navigator.serviceWorker.register('./sw.js')
	.then(function(res){
	console.log("Res " +res);
},
function(err){
	console.log(err);
});
}

/*var dbPromise = idb.open('test-db', 0, function(upgradeDb) {
	switch(upgradeDb.oldVersion) {
		case 0:
			var keyValStore = upgradeDb.createObjectStore('keyval');
			keyValStore.put("world", "hello");
	/*	case 1:
			upgradeDb.createObjectStore('people', { keyPath: 'name' });
    /*case 2:
      var peopleStore = upgradeDb.transaction.objectStore('people');
      peopleStore.createIndex('animal', 'favoriteAnimal');
    case 3:
      peopleStore = upgradeDb.transaction.objectStore('people');
      peopleStore.createIndex('age', 'age');
  }
});*/


var fromValue = '';
var toValue = '';

							

var stopArr = [];
var tripArr = [];
var stopTimesArr = [];
var stationNames = [];
var serachStations = [];
Papa.parse('../data/trips.txt', {
		delimiter: ",",
		download:true,
		header:true,
		complete: function(results) {
			tripArr = results.data;
			Papa.parse('../data/stop_times.txt', {
				delimiter: ",",
				download:true,
				header:true,
				step: function(newRow){
					$.each(tripArr, function(){
						if((this.trip_id === newRow.data[0].trip_id)){
							stopTimesArr.push(newRow.data[0]);
						}
					});
				},
				complete: function(newResults){
						Papa.parse('../data/stops.txt', {
						delimiter: ",",
						download:true,
						header:true,
						step: function(newStopRow){
							$.each(stopTimesArr, function(){
								if(this.stop_id === newStopRow.data[0].stop_id){
									var tripId = this.trip_id;
									var stopSeq = this.stop_sequence;
									var stopId = this.stop_id;
									var stopName = newStopRow.data[0].stop_name;
									var arrTime = this.arrival_time;
									var depTime = this.departure_time;
									var obj = {'stop_id': stopId,
										'stop_name': stopName,
										'arrival_time': arrTime,
										'departure_time': depTime,
										'trip_id': tripId,
										'stop_sequence': stopSeq
									}
									stopArr.push(obj);
								}
							});
						},
						complete: function(finalResult){
							navigator.serviceWorker.controller.postMessage(stopArr);
							$.each(stopArr,function(i,val){
								if(stationNames.indexOf(val.stop_name) === -1){
									stationNames.push(val.stop_name);
								}
							});
							$.each(stationNames, function(i,val){
								$('datalist#fromStops').append("<option value='" + val +"'>");
								$('datalist#toStops').append("<option value='" + val +"'>");
							});
							$('#search').on('click', function(){
								fromValue = $('#fromStop').val();
								toValue = $('#toStop').val();
								console.log("From Value is************* :"+fromValue);
								console.log("To Value is************* :"+toValue);
								$.each(stopArr,function(i,val){
									if(fromValue === val.stop_name || toValue === val.stop_name){
										console.log(val.trip_id);
										serachStations.push(val);
									}
							    });
								console.log(serachStations);
								
							});
						}
				});
				}
			});
  
		}
	});


