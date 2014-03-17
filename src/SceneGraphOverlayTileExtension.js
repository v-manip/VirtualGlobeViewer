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
		nodes.push(this._renderables[idx].sgRootNode);
	};

	return nodes;
}

/**************************************************************************************************************/

/**
   Initialize a child renderable
 */
SceneGraphOverlayTileExtension.prototype.initChild = function(childTile, i, j)
{
	for (var n = 0; n < this._renderables.length; n++) {
		if (this._renderables[n].initChild) {		
			var childRenderable = this._renderables[n].initChild(i, j, childTile);
			if (childRenderable) {
				childTile.extension.sgExtension = new SceneGraphOverlayTileExtension();
				childTile.extension.sgExtension._renderables.push(childRenderable);
			}
		}
	}
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
			if ( renderable.traverse )
			{
				renderable.traverse( this.manager, tile, isLeaf  );
			}
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
}

/**************************************************************************************************************/

return SceneGraphOverlayTileExtension;

});