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

define(['../Program','../glMatrix'], function(Program) {
 
/**************************************************************************************************************/

/**
 *	@constructor SceneGraph Renderer
 */
var SceneGraphRenderer = function(renderContext,node, options)
{
	var vertexShader = "\
	attribute vec3 vertex; \n\
	attribute vec2 tcoord; \n\
	uniform mat4 modelViewMatrix;\n\
	uniform mat4 projectionMatrix;\n\
	varying vec2 texCoord; \n\
	\n\
	void main(void)  \n\
	{ \n\
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex.x, vertex.y, vertex.z, 1.0); \n\
		texCoord = tcoord; \n\
	} \n\
	";
	
	var fragmentShader = "\
	precision lowp float; \n\
	varying vec2 texCoord; \n\
	uniform vec4 diffuse; \n\
	uniform float opacity; \n\
	uniform sampler2D texture;\n\
	\n\
	void main(void) \n\
	{ \n\
		    gl_FragColor.rgba = diffuse * texture2D(texture, texCoord); \n\
		    gl_FragColor.a *= opacity; \n\
	} \n\
	";
	
	var gl = renderContext.gl;
	this.defaultTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);
	var whitePixel = new Uint8Array([255, 255, 255, 255]);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);

	this.renderContext = renderContext;
	
	this.program = new Program(renderContext);
	this.program.createFromSource(vertexShader,fragmentShader);
	this.nodes = [];
	if ( node )
	{
		this.nodes.push( node );
	}
	
	this.matrixStack = [];
	
	renderContext.minNear = options.minNear || 0.1;
	renderContext.far = options.far || 5000;
	renderContext.fov = options.fov || 60;
	
    this.enableAlphaBlending = (typeof options.enableAlphaBlending !== 'undefined') ? options.enableAlphaBlending : true;
    
    // NOTE: The renderer is explicitly added to the RenderContext now.
	//renderContext.renderer = this;
	renderContext.requestFrame();	
}

/**************************************************************************************************************/

/**
 *	Sets the shader program from outside:
 */
SceneGraphRenderer.prototype.setProgram = function(program)
{
	this.program = program;
}

/**************************************************************************************************************/

/**
 *	Recursive method to render node
 */
SceneGraphRenderer.prototype.renderNode = function(node, opacity)
{
	var rc = this.renderContext;
	var gl = rc.gl;
	
	if (node.matrix)
	{
		var mat = mat4.create();
		mat4.set( this.matrixStack[ this.matrixStack.length-1 ], mat );
		mat4.multiply(mat, node.matrix);
		this.matrixStack.push( mat );
	}
	
	node.render(this, opacity);
	
	if (node.matrix)
	{
		this.matrixStack.length = this.matrixStack.length-1;
	}
}

/**************************************************************************************************************/

/**
 *	Main render. Takes a global opacity as optional argument.
 */
SceneGraphRenderer.prototype.render = function(opacity)
{
	var rc = this.renderContext;
	var gl = rc.gl;
	
	gl.disable(gl.CULL_FACE);
	if (this.enableAlphaBlending) {
	    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	    gl.enable(gl.BLEND);
	} else {
       	gl.enable(gl.DEPTH_TEST);
    	gl.depthFunc(gl.LESS);	
    }

	gl.activeTexture(gl.TEXTURE0);

	// Setup program
	this.program.apply();
		
	gl.uniformMatrix4fv( this.program.uniforms["projectionMatrix"], false, rc.projectionMatrix);
	gl.uniform1i(this.program.uniforms["texture"], 0);
	
	this.matrixStack.length = 0;
	this.matrixStack.push( rc.viewMatrix );
	
	for ( var i = 0; i < this.nodes.length; i++ )
	{
		this.renderNode(this.nodes[i], opacity);
	}

	if (this.enableAlphaBlending) {
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
	}
}

/**************************************************************************************************************/

/**
 *	Remove a node
 */
SceneGraphRenderer.prototype.removeNode = function(node) {
	var index = this.nodes.indexOf(node);
	if (index > -1) {
		this.nodes.splice(index, 1);
	}
	node.dispose(this.renderContext);
}

/**************************************************************************************************************/

/**
 *  Visit all nodes
 */
SceneGraphRenderer.prototype.visitNodes = function(callback) {
    function visit(root_node, cb) {
        for (var idx = 0; idx < root_node.children.length; ++idx) {
            visit(root_node.children[idx], cb)
        }
        cb(root_node);
    }

    for (var idx = 0; idx < this.nodes.length; ++idx) {
        visit(this.nodes[idx], callback)
    }
}

/**************************************************************************************************************/

return SceneGraphRenderer;

});
