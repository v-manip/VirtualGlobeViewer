define([
    '../../Program'
], function(Program) {

    var ColorRampEffect = function(opts) {
        // FIXXME: error handling!
        this.vertexCode = '\
            attribute vec3 vertex; \n\
            attribute vec2 tcoord; \n\
            uniform mat4 modelViewMatrix;\n\
            uniform mat4 projectionMatrix;\n\
            varying vec2 texCoord; \n\
            \n\
            void main(void)  \n\
            { \n\
                gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex, 1.0); \n\
                texCoord = tcoord; \n\
            } \n\
        ';

        this.fragmentCode = '\
            precision lowp float; \n\
            varying vec2 texCoord; \n\
            uniform vec4 diffuse; \n\
            uniform float opacity; \n\
            uniform sampler2D texture;\n\
            \n\
            void main(void) \n\
            { \n\
                    gl_FragColor.rgba = texture2D(texture, texCoord); \n\
                    %%COLORRAMPCODE%% \n\
                    gl_FragColor.a *= opacity; \n\
            } \n\
            ';

        this.steps = [];
        this.alphaThreshold = 0.01;
    }

    ColorRampEffect.prototype.createProgram = function(renderContext) {

        var fragmentShader = this._generateFragmentCode();

        // console.log('fragmentShader: \n' + fragmentShader);

        var program = new Program(renderContext);
        program.createFromSource(this.vertexCode, fragmentShader);

        return program;
    }

    ColorRampEffect.prototype.addStep = function(opts) {
        this.steps.push(opts);
    }

    ColorRampEffect.prototype.setSteps = function(opts_array) {
        for (var idx = 0; idx < opts_array.length; idx++) {
            this.addStep(opts_array[idx]);
        };
    }

    ColorRampEffect.prototype.setAlphaThreshold = function(value) {
        this.alphaThreshold = value;
    }

    ColorRampEffect.prototype._generateFragmentCode = function() {

        var step_code_template = '\
            if (gl_FragColor.g >= %%START%% && gl_FragColor.g < %%STOP%%) { \n\
                gl_FragColor.rgba = vec4(%%RGBA%%); \n\
            } \n %%CONTINUE%% \
       ';

        var fragmentCode = this.fragmentCode;

        if (!this.steps.length) {
            fragmentCode = fragmentCode.replace('%%COLORRAMPCODE%%', '');
            return fragmentCode;
        }

        for (var idx = 0; idx < this.steps.length; idx++) {
            var step = this.steps[idx];

            var step_code = step_code_template;
            step_code = step_code.replace('%%START%%', (step.start).toFixed(3));
            step_code = step_code.replace('%%STOP%%', (step.stop).toFixed(3));

            // console.log('alphaThreshold: ' + this.alphaThreshold);

            if (this.alphaThreshold >= step.start) {
                step_code = step_code.replace('%%RGBA%%', (step.color[0]).toFixed(3) + ',' + (step.color[1]).toFixed(3) + ',' + (step.color[2]).toFixed(3) + ', 0.0');
            } else {
                step_code = step_code.replace('%%RGBA%%', (step.color[0]).toFixed(3) + ',' + (step.color[1]).toFixed(3) + ',' + (step.color[2]).toFixed(3) + ',' + (step.color[3]).toFixed(3));
            }

            if (idx === 0) {
                fragmentCode = fragmentCode.replace('%%COLORRAMPCODE%%', step_code);
            } else {
                fragmentCode = fragmentCode.replace('%%CONTINUE%%', 'else ' + step_code);
            }
        };

        fragmentCode = fragmentCode.replace('%%CONTINUE%%', '');

        return fragmentCode;
    }

    ColorRampEffect.prototype.clearSteps = function() {
        this.steps.length = 0;
    };

    return ColorRampEffect;
});