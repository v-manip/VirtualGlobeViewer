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
            this._renderables[idx].rootNode().isVisible = true;
            nodes.push(this._renderables[idx].rootNode());
        };

        return nodes;
    }

    /**************************************************************************************************************/

    /**
        Traverse the renderables of a tile
	 */
    SceneGraphOverlayTileExtension.prototype.traverse = function(tile, isLeaf) {
        for (var i = 0; i < this._renderables.length; i++) {
            var renderable = this._renderables[i];
            var bucket = renderable.bucket;
            if (bucket.layer._visible && bucket.layer._opacity > 0) {
                renderable.traverse(this.manager, tile, isLeaf);
            }
        }
    }

    /**************************************************************************************************************/

    /**
        Updates the extension, e.g. to propagate a 'time' parameter change
     */
    SceneGraphOverlayTileExtension.prototype.update = function() {
        if (!this._renderables.length) {
            return;
        }

        var time = this._renderables[0].bucket.layer.time.split('/');
        var timespan_start = time[0];
        var timespan_end = time[1];

        for (var i = 0; i < this._renderables.length; i++) {
            var renderable = this._renderables[i],
                geometries = [];

            // if (!renderable.tile.parent) {
            //     var tile = renderable.tile,
            //         bucket = renderable.bucket;

            //     renderable.requestFinished = false;
            //     renderable.dispose(bucket.renderer.tileManager.renderContext);
            // }

            if (renderable.tile.children && renderable.tile.children.length) {
                _.each(renderable.tile.children, function(child) {
                    if (child.extension.sgExtension) {
                        child.extension.sgExtension.update();
                    }
                })
            }

            // FIXXME: implement a sane way to get the geometries!
            if (renderable.rootNode().children[0]) {
                if (renderable.rootNode().children[0].children.length) {
                    geometries = renderable.rootNode().children[0].children[0].geometries;
                } else {
                    geometries = renderable.rootNode().children[0].geometries;
                }
            }

            _.each(geometries, function(geo) {
                var mesh_timespan = geo.name.split('-')[1].split('_'),
                    isUpToDate = (mesh_timespan[0] > timespan_start && mesh_timespan[0] <= timespan_end) ||
                        (mesh_timespan[1] > timespan_start && mesh_timespan[1] <= timespan_end);

                if (!isUpToDate) {
                    var tile = renderable.tile,
                        bucket = renderable.bucket;

                    this.dispose();

                    var newRenderable = bucket.createRenderable();
                    newRenderable.tile = renderable.tile;
                    this.addRenderable(newRenderable);

                    // var renderContext = renderable.bucket.renderer.tileManager.renderContext;
                    // if (!renderContext) {
                    //     throw Error('[SceneGraphOverlayTileExtension::dispose] renderContext is invalid');
                    // }
                    // renderable.dispose(renderContext);

                    console.log('scheduled for update!');
                    return;
                } else {
                    console.log('tile is up to date!');
                }
            }.bind(this));
        }
    }

    /**************************************************************************************************************/

    /**
		Dispose gl data of registered renderables
	 */
    SceneGraphOverlayTileExtension.prototype.dispose = function() {
        for (var idx = 0; idx < this._renderables.length; ++idx) {
            var renderContext = this._renderables[idx].bucket.renderer.tileManager.renderContext;
            if (!renderContext) {
                throw Error('[SceneGraphOverlayTileExtension::dispose] renderContext is invalid');
            }
            this._renderables[idx].dispose(renderContext);
        };
        this._renderables = [];
        this.numLoadedChildren = 0;
    }

    /**************************************************************************************************************/

    return SceneGraphOverlayTileExtension;
});