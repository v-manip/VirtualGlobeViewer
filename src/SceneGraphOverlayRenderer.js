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

define([
    './Program',
    './Tile',
    './SceneGraphOverlayTileExtension',
    './SceneGraphOverlayRenderable',
    './MeshRequest',
    './MeshCacheClient',
    './Mesh',
    './SceneGraph/SceneGraph',
    './SceneGraph/Renderer',
    './ProgressiveRenderTree'
], function(Program,
    Tile,
    SceneGraphOverlayTileExtension,
    SceneGraphOverlayRenderable,
    MeshRequest,
    MeshCacheClient,
    Mesh,
    SceneGraph,
    SceneGraphRenderer,
    ProgressiveRenderTree) {

    /**************************************************************************************************************/

    /**
		@constructor
		SceneGraphOverlayRenderer constructor
	 */
    var SceneGraphOverlayRenderer = function(globe) {
        // FIXXME: I don't think we need this render manager in here
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

        this.progressiveRenderTree = new ProgressiveRenderTree();

        // FIXXME: extend the MeshCacheClient to be a generic connection to a W3DS endpoint!
        this.meshCacheClient = this._setupMeshCacheClient(this.sgRenderer, {
            // FIXXME: This has to be changed to the URL where the MeshCache stores its additional glTF files (.bin, images, shaders)!
            baseUrl: 'http://localhost:9000/gltf/'
        });

        this.meshRequests = this._setupMeshRequests(this.tileManager, this.meshCacheClient, 4);
    }

    /**************************************************************************************************************/

    /**
       Creates and configures the scene graph renderer
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
       Creates and configures the MeshCache client
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
       Configures the mesh requests
     */
    SceneGraphOverlayRenderer.prototype._setupMeshRequests = function(tileManager, meshCacheClient, numRequests) {
        var self = this;
        var meshRequests = [];

        for (var i = 0; i < numRequests; i++) {
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
        Add an overlay into the renderer.
        The overlay is added to all loaded tiles.
     */
    SceneGraphOverlayRenderer.prototype.addOverlay = function(layer) {
        // Initialize num requests to 0
        layer._numRequests = 0;

        var bucket = new Bucket({
            layer: layer,
            layer_renderer: this,
            id: this.rendererManager.bucketId++
        });

        this.buckets.push(bucket);

        // Backlink bucket to the layer. Necessary for layer removal from the layer_renderer
        layer._bucket = bucket;

        for (var i = 0; i < this.tileManager.level0Tiles.length; i++) {
            var tile = this.tileManager.level0Tiles[i];
            // We don't care if the imagery provider has loaded its data
            // if ( tile.state == Tile.State.LOADED )
            // {
            this.addOverlayToTile(tile, bucket);
            // }
        }
    }

    /**************************************************************************************************************/

    /**
        Remove an overlay
        The overlay is removed from all loaded tiles.
     */
    SceneGraphOverlayRenderer.prototype.removeOverlay = function(layer) {
        var index = this.buckets.indexOf(layer._bucket);
        this.buckets.splice(index, 1);

        var rc = this.tileManager.renderContext;
        var tp = this.tileManager.tilePool;
        this.tileManager.visitTiles(function(tile) {
            var sgex = tile.extension.sgExtension;
            // var renderable = sgex ? sgex.getRenderable(layer._bucket) : null;

            if (sgex) {
                var renderables = sgex.renderables();
                // FIXXME: currently all renderables no matter of which bucket are disposed:
                for (var idx = 0; idx < renderables.length; idx++) {
                    var renderable = renderables[idx]

                    // Remove the renderable
                    var index = renderables.indexOf(renderable);
                    renderables.splice(index, 1);

                    // Dispose its data
                    renderable.dispose(rc, tp);
                }
                // Remove tile data if not needed anymore
                if (renderables.length == 0) {
                    delete tile.extension.sgExtension;
                }
            }
        });
    }

    /**************************************************************************************************************/

    /**
        Add an overlay into a tile.
        Create tile data if needed, and create the renderable for the overlay.
     */
    SceneGraphOverlayRenderer.prototype.addOverlayToTile = function(tile, bucket, parentRenderable) {
        if (!this.overlayIntersects(tile.geoBound, bucket.layer)) {
            return;
        }

        if (!tile.extension.sgExtension) {
            tile.extension.sgExtension = new SceneGraphOverlayTileExtension(this.rendererManager);
        }

        var renderable = bucket.createRenderable();
        renderable.tile = tile;
        tile.extension.sgExtension.addRenderable(renderable);

        // if (parentRenderable && parentRenderable.rootNode().children.length) {
        // 	// console.log('parent available for: ' + parentRenderable.tile.level + '/' + parentRenderable.tile.x + '/' + parentRenderable.tile.y);
        // 	renderable.updateNodeFromParent(parentRenderable);
        // }

        if (tile.children) {
            // Add the overlay to loaded children
            for (var i = 0; i < 4; i++) {
                if (tile.children[i].state == Tile.State.LOADED) {
                    this.addOverlayToTile(tile.children[i], bucket, renderable);
                }
            }
        }

    }

    /**************************************************************************************************************/

    /**
        Create an interpolated for polygon clipping
     */
    var _createInterpolatedVertex = function(t, p1, p2) {
        return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
    }

    /**************************************************************************************************************/

    /**
        Clip polygon to a side (used by bound-overlay intersection)
     */
    SceneGraphOverlayRenderer.prototype.clipPolygonToSide = function(coord, sign, value, polygon) {
        var clippedPolygon = [];

        // iterate through vertices
        for (var i = 0; i < polygon.length; i++) {
            var p1 = polygon[i];
            var p2 = polygon[(i + 1) % polygon.length];
            var val1 = p1[coord];
            var val2 = p2[coord];

            // test containement
            var firstInside = (val1 - value) * sign >= 0.0;
            var secondInside = (val2 - value) * sign >= 0.0;

            // output vertices for inside polygon
            if (!firstInside && secondInside) {
                var t = (value - val1) / (val2 - val1);
                var newPoint = _createInterpolatedVertex(t, p1, p2);
                clippedPolygon.push(newPoint);
                clippedPolygon.push(p2);
            } else if (firstInside && secondInside) {
                clippedPolygon.push(p2);
            } else if (firstInside && !secondInside) {
                var t = (value - val1) / (val2 - val1);
                var newPoint = _createInterpolatedVertex(t, p1, p2);
                clippedPolygon.push(newPoint);
            }
        }

        return clippedPolygon;
    }

    /**************************************************************************************************************/

    /**
        Check the intersection between a geo bound and an overlay
     */
    SceneGraphOverlayRenderer.prototype.overlayIntersects = function(bound, overlay) {
        if (overlay.coordinates) {
            var c;
            c = this.clipPolygonToSide(0, 1, bound.west, overlay.coordinates);
            c = this.clipPolygonToSide(0, -1, bound.east, c);
            c = this.clipPolygonToSide(1, 1, bound.south, c);
            c = this.clipPolygonToSide(1, -1, bound.north, c);
            return c.length > 0;
        } else if (overlay.geoBound) {
            return overlay.geoBound.intersects(bound);
        }

        // No geobound or coordinates : always return true
        return true;
    }

    /**************************************************************************************************************/

    /**
        Generate Raster overlay data on the tile.
        The method is called by TileManager when a new tile has been generated.
     */
    SceneGraphOverlayRenderer.prototype.generateLevelZero = function(tile) {
        // Traverse all overlays
        for (var i = 0; i < this.buckets.length; i++) {
            if (!tile.extension.sgExtension) {
                this.addOverlayToTile(tile, this.buckets[i]);
            }
            this.requestMeshForTile(tile.extension.sgExtension.renderables()[0]);
        }
    }

    /**************************************************************************************************************/

    /**
        Request the overlay texture for a tile
     */
    SceneGraphOverlayRenderer.prototype.requestMeshForTile = function(renderable) {
        if (!renderable.request) {
            var meshRequest = null;
            for (var i = 0; i < this.meshRequests.length; i++) {
                if (!this.meshRequests[i].renderable) {
                    meshRequest = this.meshRequests[i];
                    break;
                }
            }

            if (meshRequest) {
                renderable.onRequestStarted(meshRequest);
                meshRequest.renderable = renderable;
                meshRequest.frameNumber = this.frameNumber;
                meshRequest.send(renderable.getUrl());
            }
        } else {
            renderable.request.frameNumber = this.frameNumber;
        }
    }

    /**************************************************************************************************************/

    /**
        Performs tile cleanup
     */
    SceneGraphOverlayRenderer.prototype.cleanupTile = function(tile) {
        console.log('[SceneGraphOverlayRenderer::cleanupTile] disposing...');
        tile.dispose();
    }

    /**************************************************************************************************************/

    /**
        Generate the SceneGraphExtension on all tiles and overlays
     */
    SceneGraphOverlayRenderer.prototype.generate = function(tile) {
        // FIXXME: think through multiple curtain layer case!

        if (!tile.parent) {
            // Traverse all overlays
            for (var i = 0; i < this.buckets.length; i++) {
                this.generateLevelZero(tile);
            }
        } else {
            var sgex = tile.extension.sgExtension;
            if (!sgex) {
                for (var i = 0; i < this.buckets.length; i++) {
                    this.addOverlayToTile(tile, this.buckets[i]);
                }
            }
        }
    }

    /**************************************************************************************************************/

    /**
        Render the overlays for the given tiles
     */
    SceneGraphOverlayRenderer.prototype.render = function(visible_tiles) {
        for (var idx = 0; idx < this.buckets.length; idx++) {
            var bucket = this.buckets[idx];

            // FIXXME: make it work with multiple buckets!
            this.sgRenderer.nodes = this.progressiveRenderTree.buildFromTiles(visible_tiles);
            this.sgRenderer.render(bucket.style.opacity());
            this.sgRenderer.nodes = [];
        };
    }

    /**************************************************************************************************************/

    /**
       Check if renderer is applicable
     */
    SceneGraphOverlayRenderer.prototype.canApply = function(type, style) {
        return false;
    }

    /**************************************************************************************************************/

    /**
      	Bucket constructor for SceneGraphOverlay
     */
    var Bucket = function(opts) {
        this.layer = opts.layer;
        this.renderer = opts.layer_renderer;
        this.id = id;

        // TODO : hack
        // MH: used in VectorRendererManager::renderableSort
        this.style = opts.layer;

        // this.sgRenderer = this.renderer.sgRenderer;
        // This is the root node of the bucket. It will contain the nodes of the visible
        // tiles at runtime. in SceneGraphOverlayRenderer.render() this node is the starting
        // point for rendering the geometry.
        this.sgRootNode = new SceneGraph.Node();
    }

    /**************************************************************************************************************/

    /**
        Adds a child node to the bucket
     */

    Bucket.prototype.addNode = function(node) {
        this.sgRootNode.children.push(node);
    }

    /**************************************************************************************************************/

    /**
        Removes a child node from the bucket
     */

    Bucket.prototype.removeNode = function(node) {
        var idx = this.sgRootNode.children.indexOf(node);
        if (idx != -1) {
            this.sgRootNode.children.splice(idx, 1);
        } else {
            console.error('[Bucket::removeNode] trying to remove node which is not a child of the root node. Continue safely, but you might want to have a look at the code...');
        }
    }

    /**************************************************************************************************************/

    /**
        Returns the root node
     */

    Bucket.prototype.rootNode = function() {
        return this.sgRootNode;
    }

    /**
        Create a renderable for this bucket
     */
    Bucket.prototype.createRenderable = function() {
        return new SceneGraphOverlayRenderable(this);
    }

    /**************************************************************************************************************/

    /**
        Create a renderable for this bucket
     */
    Bucket.prototype.addNode = function(node) {
        this.sgRootNode.children.push(node);
    }

    /**************************************************************************************************************/

    /**
        Dispose the bucket's (gl) data
     */
    Bucket.prototype.dispose = function() {
        this.sgRootNode.dispose(this.renderer.sgRenderer.renderContext);

        this.sgRootNode = null;
        this.layer = null;
        this.renderer = null;
        this.id = -1
        this.style = null;

        console.log('[Bucket::dispose] disposed bucket');
    }

    /**************************************************************************************************************/

    return SceneGraphOverlayRenderer;
});