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

 define(['./Utils', './BaseLayer', './SceneGraphOverlayRenderer' ], 
	function(Utils, BaseLayer, SceneGraphOverlayRenderer) {

/**************************************************************************************************************/


/** @name SceneGraphOverlayLayer
	@class
	Base class for raster layer
	@augments BaseLayer
	@param options Configuration properties for the SceneGraphOverlayLayer. See {@link BaseLayer} for base properties :
		<ul>
			<li>tilePixelSize : the image size for a tile, default is 256.</li>
			<li>numberOfLevels : the maximum number of levels</li> 
			<li>geoBound : the extent of the layer</li> 
		</ul>
*/
var SceneGraphOverlayLayer = function( options )
{
	BaseLayer.prototype.constructor.call( this, options );
	
	// Base properties
	this.tilePixelSize = -1;
	this.tiling = null;
	this.numberOfLevels = -1;
	this.geoBound = options.geoBound || null;
	this.coordinates = options.coordinates || null;
	this.zIndex = options.zIndex || 0;
	
	// Internal
	this._overlay = true; 
	this._ready = true; // Ready is used by TileManager
}

/**************************************************************************************************************/

Utils.inherits( BaseLayer,SceneGraphOverlayLayer );

/**************************************************************************************************************/

/** 
  Attach the raster layer to the globe
 */
SceneGraphOverlayLayer.prototype._attach = function( g )
{
	if ( !this._overlay )
	{
		// Override id of background layer because of unicity of background not overlayed layer
		this.id = 0;
	}

	BaseLayer.prototype._attach.call( this, g );
		
	if ( this._overlay )
	{
		// Create the renderer if needed
		if ( !g.sceneGraphOverlayRenderer )
		{
			var renderer = new SceneGraphOverlayRenderer(g);
			// FIXXME: what is the functional difference between the two registration methods?
			// g.vectorRendererManager.renderers.push( renderer );
			g.tileManager.addPostRenderer( renderer );
			g.sceneGraphOverlayRenderer = renderer;
			this.sgRenderer = g.sceneGraphOverlayRenderer.sgRenderer;
		}
		g.sceneGraphOverlayRenderer.addOverlay(this);
	}
}

/**************************************************************************************************************/

/** 
  Detach the raster layer from the globe
 */
SceneGraphOverlayLayer.prototype._detach = function()
{
	// Remove raster from overlay renderer if needed
	if ( this._overlay && this.globe.rasterOverlayRenderer )
	{
		this.globe.rasterOverlayRenderer.removeOverlay(this);
	}
	
	BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 * Set layer opacity in changing the material opacity of registered nodes
 */
SceneGraphOverlayLayer.prototype.opacity = function(arg) {
    if (typeof arg == "number") {
        this._opacity = arg;
        if (this.sgRenderer) {
               this.sgRenderer.visitNodes(function(node) {
                   for (var idx = 0; idx < node.geometries.length; ++idx) {
                       node.geometries[idx].material.opacity = arg;
                   };
               });
               if (this.globe) this.globe.renderContext.requestFrame();
           }
    }
    return this._opacity;
}

/**************************************************************************************************************/

return SceneGraphOverlayLayer;

});
