importScripts('js/cache-polyfill.js');
var CACHE_NAME = "public_transport_cache-v1";
var urlsToCache = [
	'/',
	'js/app.js',
	'/css/style.css',
	'/imgs/BSicon_BAHN.svg.png'
];

console.log("SW Started");
self.addEventListener('install', function(event){
	console.log("Installed");
	event.waitUntil(
			caches.open(CACHE_NAME)
			.then(function(cache){
				console.log('Opened Cache');
				return cache.addAll(urlsToCache);
			})
	);
});
self.addEventListener('activate', function(event){
	event.waitUntil(
		caches.keys().then(function(cacheNames){
			return Promise.all(
			cacheNames.filter(function(cacheName){
				return cacheName.startsWith('public-')&&
						cacheName != CACHE_NAME;
			}).map(function(cacheName){
				return cache.delete(cacheName);
			})
			);
		})
	);
});
self.addEventListener('message', function(event){
	//console.log(event.data);
});
self.addEventListener('fetch', function(event){
	console.log("Fetch Request Url " + event.request.url);
	event.respondWith(
		caches.match(event.request).then(function(response){
			if(response) {
				console.log("Got Response");
				console.log(response);
				return response;
			}
			else {
				return fetch(event.request);
			}
		})
	);
});


