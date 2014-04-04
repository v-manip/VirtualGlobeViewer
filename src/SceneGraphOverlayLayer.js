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

define([
    './Utils',
    './BaseLayer',
    './SceneGraphOverlayRenderer'
], function(
    Utils,
    BaseLayer,
    SceneGraphOverlayRenderer) {

    /**************************************************************************************************************/


    /** @name SceneGraphOverlayLayer
		@class
		Base class for geometry layer
		@augments BaseLayer
		@param options Configuration properties for the SceneGraphOverlayLayer. See {@link BaseLayer} for base properties.
	*/
    var SceneGraphOverlayLayer = function(options) {
        BaseLayer.prototype.constructor.call(this, options);

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

        this.tileManager = null;
    }

    /**************************************************************************************************************/

    Utils.inherits(BaseLayer, SceneGraphOverlayLayer);

    /**************************************************************************************************************/

    /**
	  Attach the raster layer to the globe
	 */
    SceneGraphOverlayLayer.prototype._attach = function(g) {
        BaseLayer.prototype._attach.call(this, g);

        if (!g.sceneGraphOverlayRenderer) {
            var renderer = new SceneGraphOverlayRenderer(g);

            // NOTE: adding the renderer as postRenderer calls the renderer.generate(tiles) method,
            // where tiles start with an array of all level-0 tiles and recurse to their children.
            g.tileManager.addPostRenderer(renderer);

            // NOTE: For VectorRendererManager renderers no renderer.generate(tiles) is called, as
            // those renderers are 'overlay' renderers, with no need for data from level-0 tiles
            // (correct me, if I'm wrong, please).
            // g.vectorRendererManager.renderers.push( renderer );

            g.sceneGraphOverlayRenderer = renderer;
            this.sgRenderer = g.sceneGraphOverlayRenderer.sgRenderer;
        }

        g.sceneGraphOverlayRenderer.addOverlay(this);

        this.tileManager = g.tileManager;
    }

    /**************************************************************************************************************/

    /**
	  Detach the raster layer from the globe
	 */
    SceneGraphOverlayLayer.prototype._detach = function() {
        // Remove raster from overlay renderer if needed
        if (this._overlay && this.globe.rasterOverlayRenderer) {
            this.globe.sceneGraphOverlayRenderer.removeOverlay(this);
        }

        BaseLayer.prototype._detach.call(this);
    }

    /**************************************************************************************************************/

    /**
       Set layer opacity in changing the material opacity of registered nodes
     */
    SceneGraphOverlayLayer.prototype.opacity = function(arg) {
        if (typeof arg == "number") {
            this._opacity = arg;
        }
        return this._opacity;
    }

    /**************************************************************************************************************/

    /**
       Updates data in existing tiles
     */
    SceneGraphOverlayLayer.prototype.update = function() {
        for (var i = 0; i < this.tileManager.level0Tiles.length; i++) {
            if (this.tileManager.level0Tiles[i].extension.sgExtension) {
                this.tileManager.level0Tiles[i].extension.sgExtension.update();
            }
        }

        this.tileManager.renderContext.requestFrame();
        
        // this.tileManager.visitTiles(function(tile) {
        //     var sgex = tile.extension.sgExtension;
        //     if (sgex) {
        //         sgex.update();
        //     }
        // });
    }

    /**************************************************************************************************************/

    return SceneGraphOverlayLayer;
});