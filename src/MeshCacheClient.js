define([
	'./SceneGraph/SceneGraph',
	'./Mesh',
	'./Loader/glTF/glTFLoader',
	'underscore',
	'jquery'
], function(SceneGraph, Mesh, glTFLoader, _, $) {

	var MeshCacheClient = function(opts) {
		this.connectionType = opts.connectionType; // 'http', 'websocket'
		this.meshFormat = opts.meshFormat; // 'model/x3d', 'model/x3db'; 'model/gltf'
		this.sgRenderer = opts.sgRenderer;
		this.baseURL = opts.baseURL;

		this.cache = this.createCache(opts.size);

		// FIXXME: implement error/options handling!
	};

	MeshCacheClient.prototype.createCache = function() {
		return {};
	};

	MeshCacheClient.prototype.request = function(url, request) {
		request.renderable.mesh = this._queryDB(url, request);

		if (!request.renderable.mesh) {
			// console.log('[MeshCacheClient::request] Requested mesh data from W3DS url: ' + url);
			// console.log('    via: ' + (this.connectionType === 'http') ? 'W3DS/http' : 'WebSocket');
			// console.log(' format: ' + this.meshFormat);

			this._sendRequest(url, request);
		} else {
			console.log('[MeshCacheClient::request] mesh already in cache, skipping external request...');

			request.successCallback.call(request);
		}
	};

	MeshCacheClient.prototype._sendRequest = function(url, request) {
		// Create a promise:
		var requestTileData = function() {
			return $.get(url);
		};

		var that = this;

		requestTileData().done(function(data) {
			that.createNodeFromDataAndAddToScene(data, that.baseURL, request.renderable);
			request.successCallback.call(request);

			// FIXXME: Test/Decide if cache is reasonable!
			//var metadata = that.parseUrl(url);
			//var id = metadata.tilelevel + '-' + metadata.tilerow + '-' + metadata.tilecol;
			//that.cache[id] = data;		
		}).fail(function() {
			console.log('[MeshCacheClient::_sendRequest] request failed! (url: ' + url + ')');
		});
	};

    MeshCacheClient.prototype.createNodeFromDataAndAddToScene = function(glTF_data, baseURL, renderable) {
        var loader = Object.create(glTFLoader);
        var that = this;

        loader.initWithJSON(glTF_data, baseURL);

        var node = new SceneGraph.Node();

        loader.load({
            rootObj: node // The loaded geometry will be added as child of the 'rootObj'
        }, function(success) {
            // NOTE: It is possible that a renderable requested some data and then gets disposed. At a later
            // time the request resolves here. In this case the renderable's root node is null to indicate
            // that circumstance. In this case we dispose the created nodes and return.
            if (renderable.rootNode() == null) {
                node.dispose();
            } else if (success) {
                // if (node.geometries.length || node.children.length) {
                renderable.rootNode().children.push(node);

                // Trigger draw update when new node is loaded
                // FIXXME: Doing this here is hackish. It triggers to often, but well...
                setTimeout(function() {
                    this.sgRenderer.renderContext.requestFrame();
                }.bind(this), 100);
                // console.log('[MeshCacheClient::createNodeFromDataAndAddToScene] Received geometry for node ' + renderable.tile.level + '/' + renderable.tile.x + '/' + renderable.tile.y);
                // }

                // // FIXXME: Not sure if this is the right place to keep track of the children, but for now
                // // its the easiest solution:
                // if (renderable.tile.parent) {
                //     renderable.tile.parent.extension.sgExtension.numLoadedChildren++;
                // }

            } else {
                console.log('[MeshCacheClient::createNodeFromDataAndAddToScene] Error creating scene-graph node ...');
            }
        }.bind(this));
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