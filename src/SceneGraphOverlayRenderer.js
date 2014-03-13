/***************************************
 * Copyright 2011, 2012 GlobWeb contributors.
 *
 * This file is part of GlobWeb.
 *
 * GlobWeb is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, version 3 of the License, or
 * (at your option) any later version.
 *
 * GlobWeb is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with GlobWeb. If not, see <http://www.gnu.org/licenses/>.
 ***************************************/

define( ['./Program','./Tile','./RendererTileData', './MeshRequest', './MeshCacheClient', './Mesh', './SceneGraph/SceneGraph', './SceneGraph/Renderer'], function(Program, Tile, RendererTileData, MeshRequest, MeshCacheClient, Mesh, SceneGraph, SceneGraphRenderer) {

/**************************************************************************************************************/

/** 
	@constructor
	SceneGraphOverlayRenderer constructor
 */
var SceneGraphOverlayRenderer = function(globe)
{	
	this.rendererManager = globe.vectorRendererManager;
	this.tileManager = globe.tileManager;
	
	this.buckets = [];
	this.meshRequests = [];
	this.frameNumber = 0;
	
	this.sgRenderer = this._setupSGRenderer(this.tileManager, {
		farPlane: 6,
		fov: 45,
		enableAlphaBlending: true
	});

	this.meshCacheClient = this._setupMeshCacheClient(this.sgRenderer, {
		// FIXXME: This has to be changed to the URL where the MeshCache stores its additional glTF files (.bin, images, shaders)!
		baseUrl: 'http://localhost:9000/gltf/'
	});

	this.meshRequests = this._setupMeshRequests(this.tileManager, this.meshCacheClient);
}

/**************************************************************************************************************/

/**
 * Creates and configures the scene graph renderer
 */
SceneGraphOverlayRenderer.prototype._setupSGRenderer = function(tileManager, opts) {
	var renderContext = tileManager.renderContext;

	var sgRenderer = new SceneGraphRenderer(renderContext, null, {
        minNear: renderContext.minNear,
        far: opts.farPlane,
        fov: opts.fov,
        enableAlphaBlending: opts.enableAlphaBlending
    });

	return sgRenderer;
}

/**************************************************************************************************************/

/**
 * Creates and configures the MeshCache client
 */
SceneGraphOverlayRenderer.prototype._setupMeshCacheClient = function(sgRenderer, opts) {
	var meshCacheClient = new MeshCacheClient({
		sgRenderer: sgRenderer,
		baseURL: opts.baseUrl
	});

	return meshCacheClient;
}

/**************************************************************************************************************/

/**
 * Configures the mesh requests
 */
SceneGraphOverlayRenderer.prototype._setupMeshRequests = function(tileManager, meshCacheClient) {
	var self = this;
	var meshRequests = [];

	for (var i = 0; i < 4; i++) {
		var meshRequest = new MeshRequest({
			renderContext: tileManager.renderContext,
			meshCache: meshCacheClient,
			successCallback: function() {
				if (this.renderable) {
					this.renderable.onRequestFinished(true);
					this.renderable = null;
					self.tileManager.renderContext.requestFrame();
				}
			},
			failCallback: function() {
				if (this.renderable) {
					this.renderable.onRequestFinished(true);
					this.renderable = null;
				}
			},
			abortCallback: function() {
				console.log("VectorOverlay overlay request abort.");
				if (this.renderable) {
					this.renderable.onRequestFinished(false);
					this.renderable = null;
				}
			}
		});

		meshRequests.push(meshRequest);
	}

	return meshRequests;
}

/**************************************************************************************************************/

/**
	Bucket constructor for SceneGraphOverlay
 */
var Bucket = function(layer, sgRenderer)
{
	this.layer = layer;
	this.sgRenderer = sgRenderer;
	this.sgRootNode = new SceneGraph.Node();

	// FIXXME: implement a 'lazy' adding mechanism!
	this.sgRenderer.nodes.push(this.sgRootNode);

	this.renderer = null;

	// TODO : hack
	// MH: used in VectorRendererManager::renderableSort
	this.style = layer;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
Bucket.prototype.createRenderable = function()
{
	if (!this.idx) {
		this.idx = 0;
	}

	var renderable = new SceneGraphOverlayRenderable(this);
	renderable['id'] = this.idx++;
	return renderable;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
Bucket.prototype.addNode = function(node)
{
	this.sgRootNode.children.push(node);
}

/**************************************************************************************************************/

/**
	Dispose the bucket (gl) data
 */
Bucket.prototype.dispose = function()
{
	this.sgRenderer.removeNode(this.sgRootNode);
	// FIXXME: when setting sgRootNode = null here an error is generated when deleting a W3DS layer. Investigate this!
    this.sgRootNode.dispose(this.sgRenderer.renderContext);
}

/**************************************************************************************************************/

/** 
	@constructor
	Create a renderable for the overlay.
	There is one renderable per overlay and per tile.
 */
var SceneGraphOverlayRenderable = function( bucket, rootNode )
{
	this.bucket = bucket;
	this.node = null;
	this.request = null;
	this.requestFinished = false;
	this.tile = null;

	this.rootNode = rootNode;

}

/**************************************************************************************************************/

/** 
	Called when a request is started
 */
SceneGraphOverlayRenderable.prototype.onRequestStarted = function(request)
{
	this.request = request;
	this.requestFinished = false;
	var layer = this.bucket.layer;
	if ( layer._numRequests == 0 )
	{
		layer.globe.publish('startLoad',layer);
	}
	layer._numRequests++;
}

/**************************************************************************************************************/

/** 
	Called when a request is finished
 */
SceneGraphOverlayRenderable.prototype.onRequestFinished = function(completed)
{
	this.request = null;
	this.requestFinished = completed;
	var layer = this.bucket.layer;
	layer._numRequests--;
	if ( layer.globe && layer._numRequests == 0 )
	{
		layer.globe.publish('endLoad',layer);
	}
}

/**************************************************************************************************************/

/**
 * Initialize a child renderable
 */
SceneGraphOverlayRenderable.prototype.initChild = function(i,j,childTile)
{					
	var renderable = this.bucket.createRenderable();
	renderable.tile = childTile;
	
	return renderable;
}

/**************************************************************************************************************/

/** 
	Generate child renderable
 */
SceneGraphOverlayRenderable.prototype.generateChild = function( tile )
{
	var r = this.bucket.renderer;
	r.addOverlayToTile( tile, this.bucket, this );
}

/**************************************************************************************************************/

/** 
	Traverse renderable : add it to renderables list if there is a texture
	Request the texture
 */
 SceneGraphOverlayRenderable.prototype.traverse = function( manager, tile, isLeaf  )
{
	if ( isLeaf && this.bucket.node )
	{
		manager.renderables.push( this );
	}
	
	if (!this.requestFinished && this.tile.state == Tile.State.LOADED)
	{
		this.bucket.renderer.requestMeshDataForTile( this);
	}
}

/**************************************************************************************************************/

/** 
	Dispose the renderable
 */
SceneGraphOverlayRenderable.prototype.dispose = function(renderContext,tilePool)
{
	if (this.bucket) {
		this.bucket.dispose();
	}
}


/**************************************************************************************************************/

/** 
	Convenience function to get the data URL for the renderable
 */
SceneGraphOverlayRenderable.prototype.getUrl = function()
{
	return this.bucket.layer.getUrl(this.tile);
}

/**************************************************************************************************************/

/**
	Add an overlay into the renderer.
	The overlay is added to all loaded tiles.
 */
SceneGraphOverlayRenderer.prototype.addOverlay = function( overlay )
{
	// Initialize num requests to 0
	overlay._numRequests = 0;

	var bucket = new Bucket(overlay, this.sgRenderer);
	bucket.renderer = this;
	bucket.id = this.rendererManager.bucketId++;
	this.buckets.push( bucket );
	
	overlay._bucket = bucket;
	
	for ( var i = 0; i < this.tileManager.level0Tiles.length; i++ )
	{
		var tile = this.tileManager.level0Tiles[i];
		if ( tile.state == Tile.State.LOADED )
		{
			this.addOverlayToTile( tile, bucket );
		}
	}
}

/**************************************************************************************************************/

/**
	Remove an overlay
	The overlay is removed from all loaded tiles.
 */
SceneGraphOverlayRenderer.prototype.removeOverlay = function( overlay )
{
	var index = this.buckets.indexOf( overlay._bucket );
	this.buckets.splice(index,1);
	
	var rc = this.tileManager.renderContext;
	var tp = this.tileManager.tilePool;
	this.tileManager.visitTiles( function(tile) 
			{
				var rs = tile.extension.renderer;
				var renderable = rs ?  rs.getRenderable( overlay._bucket ) : null;
				if ( renderable ) 
				{
					// Remove the renderable
					var index = rs.renderables.indexOf(renderable);
					rs.renderables.splice(index,1);
					
					// Dispose its data
					renderable.dispose(rc,tp);
					
					// Remove tile data if not needed anymore
					if ( rs.renderables.length == 0 )
						delete tile.extension.renderer;
				}
			}
	);
}

/**************************************************************************************************************/

/**
	Add an overlay into a tile.
	Create tile data if needed, and create the renderable for the overlay.
 */
SceneGraphOverlayRenderer.prototype.addOverlayToTile = function( tile, bucket, parentRenderable )
{
	if (!this.overlayIntersects( tile.geoBound, bucket.layer ))
		return;
		
	if ( !tile.extension.renderer )
		tile.extension.renderer = new RendererTileData(this.rendererManager);
	
	var renderable = bucket.createRenderable();
	renderable.tile = tile;
	tile.extension.renderer.renderables.push( renderable );
	
	// // FIXXME: How to connect parentRenderable with child for the glTF case here?
	// if ( parentRenderable && parentRenderable.texture )
	// {
	// 	renderable.updateTextureFromParent( parentRenderable );
	// }
	
	if ( tile.children )
	{
		// Add the overlay to loaded children
		for ( var i = 0; i < 4; i++ )
		{
			if ( tile.children[i].state == Tile.State.LOADED )
			{
				this.addOverlayToTile( tile.children[i], bucket, renderable );
			}
		}
	}

}

/**************************************************************************************************************/

/**
	Create an interpolated for polygon clipping
 */	
var _createInterpolatedVertex = function( t, p1, p2 )
{
	return [ p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]) ];
}

/**************************************************************************************************************/

/**
	Clip polygon to a side (used by bound-overlay intersection)
 */	
SceneGraphOverlayRenderer.prototype.clipPolygonToSide = function( coord, sign, value, polygon )
{
	var clippedPolygon = [];

	// iterate through vertices
	for ( var i = 0; i < polygon.length; i++ )
	{
		var p1 = polygon[i];
		var p2 = polygon[ (i+1) % polygon.length ];
		var val1 = p1[coord];
		var val2 = p2[coord];

		// test containement
		var firstInside = (val1 - value) * sign >= 0.0;
		var secondInside = (val2 - value) * sign >= 0.0;
	
		// output vertices for inside polygon
		if ( !firstInside && secondInside )
		{
			var t = (value - val1) / (val2- val1);
			var newPoint = _createInterpolatedVertex( t, p1, p2 );
			clippedPolygon.push( newPoint );
			clippedPolygon.push( p2 );
		}
		else if ( firstInside && secondInside )
		{
			clippedPolygon.push( p2 );
		}
		else if ( firstInside && !secondInside )
		{
			var t = (value - val1) / (val2- val1);
			var newPoint = _createInterpolatedVertex( t, p1, p2 );
			clippedPolygon.push( newPoint );
		}
	}
	
	return clippedPolygon;
}

/**************************************************************************************************************/

/**
	Check the intersection between a geo bound and an overlay
 */	
SceneGraphOverlayRenderer.prototype.overlayIntersects = function( bound, overlay )
{
	if ( overlay.coordinates )
	{
		var c;
		c = this.clipPolygonToSide( 0, 1, bound.west, overlay.coordinates );
		c = this.clipPolygonToSide( 0, -1, bound.east, c );
		c = this.clipPolygonToSide( 1, 1, bound.south, c );
		c = this.clipPolygonToSide( 1, -1, bound.north, c );
		return c.length > 0;
	}
	else if ( overlay.geoBound )
	{
		return overlay.geoBound.intersects( bound );
	}
	
	// No geobound or coordinates : always return true
	return true;
}

/**************************************************************************************************************/

/**
	Generate Raster overlay data on the tile.
	The method is called by TileManager when a new tile has been generated.
 */
SceneGraphOverlayRenderer.prototype.generateLevelZero = function( tile )
{
	// Traverse all overlays
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		this.addOverlayToTile(tile,this.buckets[i]);
	}
}

/**************************************************************************************************************/

/**
	Request the overlay texture for a tile
 */
SceneGraphOverlayRenderer.prototype.requestMeshDataForTile = function( renderable )
{	
	if ( !renderable.request )
	{
		var meshRequest;
		for ( var i = 0; i < this.meshRequests.length; i++ )
		{
			if ( !this.meshRequests[i].renderable  ) 
			{
				meshRequest = this.meshRequests[i];
				break;
			}
		}

		if ( meshRequest )
		{
			renderable.onRequestStarted(meshRequest);
			meshRequest.renderable = renderable;
			meshRequest.frameNumber = this.frameNumber;
			meshRequest.send(renderable.getUrl());
		}
	}
	else
	{
		renderable.request.frameNumber = this.frameNumber;
	}
}

/**************************************************************************************************************/

/**
 *	Performs tile cleanup
 */
SceneGraphOverlayRenderer.prototype.cleanupTile = function( tile )
{
	console.log('[SceneGraphOverlayRenderer::cleanupTile] disposing...');
 	tile.dispose();
}

/**************************************************************************************************************/

// FIXXME: necessary?
/**
 *	Performs tile initialization when adding the renderer to the TileManager
 */
// SceneGraphOverlayRenderer.prototype.generate = function( tile )
// {
//  	tile.cleanup();
// }

/**************************************************************************************************************/

/**
 *	Render the raster overlays for the given tiles
 */
SceneGraphOverlayRenderer.prototype.render = function( renderables, start, end )
{
 	this.sgRenderer.render();
}

/**************************************************************************************************************/

/**
 * Check if renderer is applicable
 */
SceneGraphOverlayRenderer.prototype.canApply = function(type,style)
{
	return false;
}

/**************************************************************************************************************/
									
return SceneGraphOverlayRenderer;

});
