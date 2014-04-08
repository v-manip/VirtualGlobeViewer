define(['../../Program'], function(Program) {

    var TextureMaterialEffect = function() {
        this.vertexShader = '\
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
        ';

        this.fragmentShader = '\
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
        ';
    }

    TextureMaterialEffect.prototype.createProgram = function(renderContext) {
        var program = new Program(renderContext);
        program.createFromSource(this.vertexShader, this.fragmentShader);

        return program;
    }

    return TextureMaterialEffect;
});