define(['./Tile', './SceneGraph/SceneGraph'], function(Tile, SceneGraph) {

/**************************************************************************************************************/

/** 
	@constructor
	Create a renderable for the overlay.
	There is one renderable per overlay and per tile.
 */
var SceneGraphOverlayRenderable = function( bucket )
{
	this.bucket = bucket;
	this.tile = null;

	// Request members necessary for data retrieval:
	this.request = null;
	this.requestFinished = false;

	// 1. Create the scene graph root node of this tile. The node will contain
	//    the geometry for the tile, which is retrieved via a MeshRequest on demand.
	this._sgRootNode = new SceneGraph.Node();
	this.parentTmpNode = null;

	// 2. Add the (currently empty) node to the bucket (which represents one
	//    SceneGraphOverlayLayer rendered by the SceneGraphOverlayRenderer). This
	//    has the effect that the node will be rendered in SceneGraphOverlayRenderer.render().
	this.bucket.addNode(this._sgRootNode);
}

/**************************************************************************************************************/

/**
 * Return the root node
 */
SceneGraphOverlayRenderable.prototype.requestFrame = function()
{					
	this.bucket.renderer.tileManager.renderContext.requestFrame();
}

/**************************************************************************************************************/

/**
 * Return the root node
 */
SceneGraphOverlayRenderable.prototype.rootNode = function()
{					
	return this._sgRootNode;
}

/**************************************************************************************************************/

/**
 * Initialize a child renderable
 */
SceneGraphOverlayRenderable.prototype.initChild = function(i, j, childTile)
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

// FIXXME: finding the parent node this way is a brute-force method. It leads to 'overlaying' geometry in many
// cases, when multiple tile levels are displaying the same parent node!
function findNearestParentNode(tile) {
	if (tile.parent) {
		if (tile.parent.extension.sgExtension) {
			if (tile.parent.extension.sgExtension.renderables().length) {
				if (tile.parent.extension.sgExtension.renderables()[0].rootNode().children.length) {
					// console.log('found parent at level: ' + tile.parent.level);
					return tile.parent.extension.sgExtension.renderables()[0].rootNode();
				} else {
					return findNearestParentNode(tile.parent);
				}
			}
		}
	}
}

/** 
	Update geometry from its parent
 */
SceneGraphOverlayRenderable.prototype.updateNodeFromParent = function(parent)
{
	// console.log('parentlevel: ' + parent.tile.level);
	// console.log('child x/y: ' + this.tile.x + '/' + this.tile.y);
	// console.log('parent x/y: ' + this.tile.parent.x + '/' + this.tile.parent.y);
	// console.log('soll x/y: ' + (parent.tile.x * 2) + '/' + (parent.tile.y * 2));

	if (this.tile.x === parent.tile.x * 2 &&
		this.tile.y === parent.tile.y * 2) {
		// this.parentTmpNode = parent.rootNode();
		// FIXXME: leads to 'overlayed' rendering...
		this.parentTmpNode = findNearestParentNode(this.tile);
		if (!this.parentTmpNode) {
			console.log('Found NO parent for ' + this.tile.level + '/' + this.tile.x + '/' + this.tile.y);
		} else {
			this.parentTmpNode.isVisible = true;
			console.log('added parentTmpNode to tile: ' + this.tile.level + '/' + this.tile.x + '/' + this.tile.y);
		}
	}
}

/**************************************************************************************************************/

/** 
	Traverse renderable : add it to renderables list if there is a texture
	Request the texture
 */
 SceneGraphOverlayRenderable.prototype.traverse = function(manager, tile, isLeaf)
{
	if (!this.requestFinished)
	{
		this.bucket.renderer.requestMeshForTile(this);
	} 

	// For level-0 tiles we can stop here:
	if (tile.level === 0) {
		return;
	}

	if (tile.extension.sgExtension) {
		var sgex = tile.extension.sgExtension;

		if (!tile.parent) {
			return;
		}

		var sgex_parent = tile.parent.extension.sgExtension;
		
		// If all four children are loaded (see MeshCacheClient::createNodeFromDataAndAddToScene) the
		// 'temporary' geometry is removed and the children are rendered with their high resolution geometry:
		if (sgex_parent.numLoadedChildren === 4) {
			var renderable = sgex.renderables()[0];

			renderable.rootNode().isVisible = true;

			if (renderable.parentTmpNode) {
				renderable.parentTmpNode.isVisible = false;
				renderable.parentTmpNode = null;
			}
			this.requestFrame();

			// console.log('showing high resolution for tile: ' + this.tile.level + '/' + this.tile.x + '/' + this.tile.y);

			if (sgex_parent.numLoadedChildren > 4) {
				console.log('[SceneGraphOverlayRenderable.traverse] count > 4: this should not happen!');
			}
		}
	}
}

/**************************************************************************************************************/

/** 
	Dispose the renderable
 */
SceneGraphOverlayRenderable.prototype.dispose = function(renderContext,tilePool)
{
	if (this.tile.extension.sgExtension) {
		if (this.tile.extension.sgExtension.numLoadedChildren > 0) {
			this.tile.extension.sgExtension.numLoadedChildren--;
		}
		console.log('dispose: parentchildren: ' + this.tile.extension.sgExtension.numLoadedChildren);
	}

	this.bucket.removeNode(this._sgRootNode);
	this._sgRootNode.dispose(this.bucket.layer.sgRenderer.renderContext);
	this._sgRootNode = null;
	this.tile = null;
	this.request = null;
	this.requestFinished = false;
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

return SceneGraphOverlayRenderable;

});