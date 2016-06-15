importScripts('js/cache-polyfill.js');
var CACHE_NAME = "public_transport_cache-v3";
var urlsToCache = [
	'/',
	'js/app.js',
	'/css/style.css',
	'bootstrap-3.3.6-dist/css/bootstrap.min.css',
	'/imgs/BSicon_BAHN.svg.png',
	'js/lib/jquery-2.4.4.min.js',
	'bootstrap-3.3.6-dist/js/bootstrap.min.js'
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
self.addEventListener('fetch', function(event){
	event.respondWith(
		caches.match(event.request).then(function(response){
			if(response) {
				return response;
			}
			else {
				return fetch(event.request);
			}
		})
	);
});


