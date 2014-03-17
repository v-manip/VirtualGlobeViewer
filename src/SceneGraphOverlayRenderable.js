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
	this.sgRootNode = new SceneGraph.Node();

	// 2. Add the (currently empty) node to the bucket (which represents one
	//    SceneGraphOverlayLayer rendered by the SceneGraphOverlayRenderer). This
	//    has the effect that the node will be rendered in SceneGraphOverlayRenderer.render().
	this.bucket.addNode(this.sgRootNode);
}

/**************************************************************************************************************/

/**
 * Return the root node
 */
SceneGraphOverlayRenderable.prototype.rootNode = function()
{					
	return this.sgRootNode;
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
	if (!this.requestFinished && this.tile.state == Tile.State.LOADED)
	{
		this.bucket.renderer.requestMeshForTile(this);
	}
}

/**************************************************************************************************************/

/** 
	Dispose the renderable
 */
SceneGraphOverlayRenderable.prototype.dispose = function(renderContext,tilePool)
{
	// FIXXME: For some reason 'this.sgRootNode' can be 'null', which should not be. Investigate!
	if (this.sgRootNode) {
		this.bucket.removeNode(this.sgRootNode);
		this.sgRootNode.dispose(this.bucket.layer.sgRenderer.renderContext);
	}
	this.sgRootNode = null;
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