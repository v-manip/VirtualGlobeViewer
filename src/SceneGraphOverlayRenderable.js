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

	// FIXXME: this is a hack for the things done in NodeTree::_determineRenderNodes!
	this.tile.renderChildren = 0;
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