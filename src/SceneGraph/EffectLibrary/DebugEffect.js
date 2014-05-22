define(['../../Program'], function(Program) {

    var DebugEffect = function() {
        this.vertexShader = '\
            attribute vec3 vertex; \n\
            attribute vec2 tcoord; \n\
            uniform mat4 modelViewMatrix;\n\
            uniform mat4 projectionMatrix;\n\
            \n\
            void main(void)  \n\
            { \n\
                gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex.x, vertex.y, vertex.z, 1.0); \n\
            } \n\
        ';

        this.fragmentShader = '\
            precision lowp float; \n\
            uniform vec4 diffuse; \n\
            uniform float opacity; \n\
            \n\
            void main(void) \n\
            { \n\
                gl_FragColor.rgba = vec4(1,0,0,1); \n\
            } \n\
        ';
    }

    DebugEffect.prototype.createProgram = function(renderContext) {
        var program = new Program(renderContext);
        program.createFromSource(this.vertexShader, this.fragmentShader);

        return program;
    }

    return DebugEffect;
});