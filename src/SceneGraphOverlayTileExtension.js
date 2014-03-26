/***************************************
 * Copyright 2014 GlobWeb contributors.
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

define(function() {

/**************************************************************************************************************/

/** 
	@constructor
	SceneGraphOverlayTileExtension constructor
 */
var SceneGraphOverlayTileExtension = function() {
	this._renderables = [];
	this.numLoadedChildren = 0;
}

/**************************************************************************************************************/

/** 
	Adds a renderable to the extension
 */
SceneGraphOverlayTileExtension.prototype.addRenderable = function(renderable) {
	this._renderables.push(renderable);
}

/**************************************************************************************************************/

/** 
	
 */
SceneGraphOverlayTileExtension.prototype.renderables = function() {
	return this._renderables;
}

/**************************************************************************************************************/

/** 
	
 */
SceneGraphOverlayTileExtension.prototype.nodes = function() {
	var nodes = [];
	for (var idx = 0; idx < this._renderables.length; ++idx) {
		if (this._renderables[idx].parentTmpNode) {
			this._renderables[idx].parentTmpNode.isVisible = true;
			nodes.push(this._renderables[idx].parentTmpNode);
		} else {
			this._renderables[idx].rootNode().isVisible = true;
			nodes.push(this._renderables[idx].rootNode());
		}
	};

	return nodes;
}

/**************************************************************************************************************/

/**
   Traverse the renderables of a tile
 */
SceneGraphOverlayTileExtension.prototype.traverse = function(tile, isLeaf)
{
	for ( var i = 0; i < this._renderables.length; i++ ) 
	{
		var renderable = this._renderables[i];
		var bucket = renderable.bucket;
		if ( bucket.layer._visible && bucket.layer._opacity > 0 )
		{
			renderable.traverse(this.manager, tile, isLeaf);
		}
	}
}

/**************************************************************************************************************/

/** 
	Dispose gl data of registered renderables
 */
SceneGraphOverlayTileExtension.prototype.dispose = function() {
	for (var idx = 0; idx < this._renderables.length; ++idx) {
		this._renderables[idx].dispose();
	};
	this._renderables = [];
	this.numLoadedChildren = 0;
}

/**************************************************************************************************************/

return SceneGraphOverlayTileExtension;

});