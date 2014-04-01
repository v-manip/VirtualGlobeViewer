define([], function() {

    /* 
     * A node tree that stores a parent-child relationship between the given tiles. The relation
     * criteria are the relations between the different 'levels' of the tiles.
     */
    var NodeTree = function() {}

    NodeTree.prototype.getRenderNodes = function(tiles) {
        var sorted_tiles = this._sortTiles(tiles),
            render_nodes = [];

        _.each(sorted_tiles, function(level, idx) {
            // The level-0 entry (which is present, otherwise it is an error) always has one tile:
            var l0tile = level[0][0];
            this._determineRenderNodes(l0tile, render_nodes);
        }.bind(this));

        // _.each(sorted_tiles, function(level, idx) {
        // 	var l0tile = level[0][0];
        //     render_nodes.push(this._getRootNode(l0tile));
        // }.bind(this));

        return render_nodes;
    }

    NodeTree.prototype._determineRenderNodes = function(start_tile, container) {
        if (start_tile.renderChildren) {
            // Check for each child, if it already has geometry loaded:
            var numLoaded = 0;
            _.each(start_tile.renderChildren, function(tile, idx) {
                if (this._hasGeometryLoaded(tile)) {
                    ++numLoaded;
                }
            }.bind(this));

            console.log('loaded: ' + numLoaded + ' / needed: ' +  start_tile.renderChildren.length);

            // If all children have renderable geometry, recurse into them to determine
            // eventual higher resolution geometry:
            if (numLoaded === start_tile.renderChildren.length) {
                _.each(start_tile.renderChildren, function(tile, idx) {
                    this._determineRenderNodes(tile, container);
                }.bind(this));
            } else { // If not all children have geometry add the current tile's geometry:
                var node = this._getRootNode(start_tile);
                // FIXXME: what if the node has no geometry loaded?
                //if (node) {
                    container.push(node);
                    if (!node.geometries.length) {
                    	asdflkj
                    	console.log('fehler');
                    }
                //}
            }
        } else {
            var node = this._getRootNode(start_tile);
            // FIXXME: what if the node has no geometry loaded?
            //if (node) {
                container.push(node);
            //}
        }
    }

    NodeTree.prototype._sortTiles = function(tiles) {

        var node_tree = {};

        //-------------------------------------------------------------------------
        // 1. Sort tiles as children into their respective level-0 tile:
        //-------------------------------------------------------------------------

        for (var idx = 0; idx < tiles.length; idx++) {
            var tile = tiles[idx];

            // The level-0 tile is the major key:
            var l0tile = this._getLevel0Tile(tile);

            var id = l0tile.y + '/' + l0tile.x;
            if (!node_tree[id]) {
                node_tree[id] = {};

                // Add the level-0 tile to the datastructure:
                node_tree[id][0] = [l0tile];
            }

            // The levels of the contained tiles are the minor key:
            if (!node_tree[id][tile.level]) {
                node_tree[id][tile.level] = [];
            }
            node_tree[id][tile.level].push(tile);
        };

        //-------------------------------------------------------------------------
        // 2. Store all tiles on the way from the highest-level visible tiles to 
        //    the lowest level tiles in a parent child relation:
        //-------------------------------------------------------------------------

        var level0_ids = Object.keys(node_tree);

        for (var idx = 0; idx < level0_ids.length; idx++) {
            var l0tile = node_tree[level0_ids[idx]];

            // console.log('l0tile: ' + level0_ids[idx]);

            var levels = Object.keys(l0tile).sort()

            if (levels.length > 2) {
            	var additional_tiles = [];

                // idx: 0 -> level-0 tile
                // idx: 1 -> start level tile, which has not to be taken into account
                for (var idx = 1; idx < levels.length; idx++) {
                    var level = levels[idx];

                    for (var idx0 = 0; idx0 < l0tile[level].length; idx0++) {
                        // 1. Check if the child has a parent in the next LOD level:
                        var tile = l0tile[level][idx0],
                            parent = tile.parent;

                        var list = _.findWhere(l0tile[level - 1], {
                            x: parent.x,
                            y: parent.y
                        });

                        // No entry was found in next LOD level, adding corresponding one:
                        if (!list) {
                            // console.log('generating entry in level: ' + (level - 1));

                            // Check for cornercase, when the next coarser level is not directly
                            // following (can this happen?):
                            if (l0tile[level - 1]) {
                                // l0tile[level - 1].push(parent);
                                additional_tiles.push({
                                	level: l0tile[level-1],
                                	tile: parent
                                });
                            } else {
                                // FIXXME: wrong place, I guess...
                                if (!l0tile[0][0].renderChildren) {
                                    l0tile[0][0].renderChildren = [];
                                }
                                l0tile[0][0].renderChildren.push(tile);
                            }
                        }

                        // At this point each higher resolution tile (the 'smaller' ones) has a corresponding
                        // parent tile in the nodetree (l0tiles variable, for now).

                        // Map the child tile to the parent one in the nodetree (the parent is definitely in
                        // the nodetree at this point):
                        // FIXXME: introduce class for that:
                        if (!parent.renderChildren) {
                            parent.renderChildren = [];
                        }
                        parent.renderChildren.push(tile);
                    }
                }
            }
        }

        _.each(additional_tiles, function(value, key){
        	value.level.push(value.tile);
        });

        return node_tree;
    };

    NodeTree.prototype._hasGeometryLoaded = function(tile) {
        if (tile.extension.sgExtension) {
            if (tile.extension.sgExtension.renderables().length) {
                var node = tile.extension.sgExtension.renderables()[0].rootNode();

                if (node.children.length) {
                    return true;
                } else if (node.geometries.length) {
                    return true;
                }
            }
        }

        return false;
    };

    NodeTree.prototype._getRootNode = function(tile) {
        if (tile.extension.sgExtension) {
            if (tile.extension.sgExtension.renderables()) {
                return tile.extension.sgExtension.renderables()[0].rootNode();
            }
        }

        return null;
    };

    NodeTree.prototype._getLevel0Tile = function(tile) {
        if (tile.parent) {
            return this._getLevel0Tile(tile.parent);
        }

        return tile;
    };

    return NodeTree;
});