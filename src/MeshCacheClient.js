define([
	'./Mesh',
	'underscore',
	'jquery'
], function(Mesh, _, $) {

	var MeshCacheClient = function(opts) {
		this.connectionType = opts.connectionType; // 'http', 'websocket'
		this.meshFormat = opts.meshFormat; // 'model/x3d', 'model/x3db'; 'model/gltf'

		this.cache = this.createCache(opts.size);

		// FIXXME: implement error/options handling!
	};

	MeshCacheClient.prototype.createCache = function() {
		return {};
	};

	MeshCacheClient.prototype.request = function(url, request) {
		request.renderable.mesh = this._queryDB(url, request);

		if (!request.renderable.mesh) {
			console.log('[MeshCacheClient::request] Requested mesh data from W3DS url: ' + url);
			// console.log('    via: ' + (this.connectionType === 'http') ? 'W3DS/http' : 'WebSocket');
			// console.log(' format: ' + this.meshFormat);

			this._sendRequest(url, request);
		} 
		else {
			console.log('[MeshCacheClient::request] mesh already in cache, skipping external request...');

			request.successCallback.call(request);
		}
	};

	MeshCacheClient.prototype._sendRequest = function(url, request) {
		// FIXXME: request mesh data from serverside MeshCache. Mesh format and connection
		// type is determined by the internal options.
		// Currently a dummy mesh is created here and returned...

        $.getJSON(url, function(data) {
        	console.log('W3DS data: ' + data);
        })
        // .fail(function() {
        //     alert('[MeshCacheClient::_sendRequest] request failed! (url: ' + url + ')');
        // });

		var metadata = this.parseUrl(url);
		var level = parseInt(metadata.tilelevel);
		var mesh = this.generateDummyMesh(request.renderContext, level);

		// FIXXME: store mesh into internal cache efficiently!
		var id = metadata.tilelevel + '-' + metadata.tilerow + '-' + metadata.tilecol;
		this.cache[id] = mesh;

		request.renderable.mesh = mesh;
		request.successCallback.call(request);

		//console.log('[MeshCacheClient::_queryDB] requesting level: ' + metadata.tilelevel + ' / row: ' + metadata.tilerow + ' / col: ' + metadata.tilecol);
	};

	MeshCacheClient.prototype._queryDB = function(url, request) {
		var metadata = this.parseUrl(url);
		var id = metadata.tilelevel + '-' + metadata.tilerow + '-' + metadata.tilecol;

		var mesh = this.cache[id];
		return mesh;
	};

	MeshCacheClient.prototype.parseUrl = function(url) {
		var tokens = url.split('&');

		var level, row, col;

		_.each(tokens, function(token, idx) {
			if (this.startsWith(token, 'tileLevel')) {
				var tmptk = token.split('=');
				level = tmptk[1];
			} else if (this.startsWith(token, 'tilecol')) {
				var tmptk = token.split('=');
				col = tmptk[1];
			} else if (this.startsWith(token, 'tilerow')) {
				var tmptk = token.split('=');
				row = tmptk[1];
			}
		}.bind(this));

		return {
			layer: 'adm_aeolus',
			tilelevel: level,
			tilecol: col,
			tilerow: row
		};
	};

	MeshCacheClient.prototype.generateDummyMesh = function(renderContext, level) {

		var fac;
		if (level === 1) {
			fac = 0.1;
		} else if (level > 1 && level <= 4) {
			fac = 1 / (level * level);
		} else if (level > 4 && level <= 8) {
			fac = 1 / (level * level * level);
		} else if (level > 8 && level <= 16) {
			fac = 1 / (level * level * level * level);
		} else {
			fac = 1 / (level * level * level * level * level);
		}

		var mesh = new Mesh(renderContext);
		var vertices = [-1 * fac, -1 * fac, 0.0,
			1 * fac, -1 * fac, 0.0,
			1 * fac, 1 * fac, 0.0, -1 * fac, 1 * fac, 0.0
		];
		mesh.setVertices(vertices);

		var indices = [0, 1, 2, 0, 2, 3];
		mesh.setIndices(indices);

// 		var vertices = [
// 			0.0, 0.1, 0.0, -0.1, -0.1, 0.0,
// 			0.1, -0.1, 0.0
// 		];
// 		mesh.setVertices(vertices);

		return mesh;
	};

	MeshCacheClient.prototype.startsWith = function(str, prefix) {
		return str.indexOf(prefix) === 0;
	};
    
	return MeshCacheClient;
});