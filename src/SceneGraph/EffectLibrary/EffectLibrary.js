define([
	'./TextureMaterialEffect',
    './ColorRampEffect'
], function(
	TextureMaterialEffect,
	ColorRampEffect) {

    var EffectLibrary = function() {
        this.effects = {};

        this._loadDefaultEffects();
    }

    EffectLibrary.prototype.getEffect = function(effect_name) {
        if (this.effects[effect_name]) {
            return this.effects[effect_name];
        }
    }

    EffectLibrary.prototype.addEffect = function(name, effect) {
        this.effects[name] = effect;
    }

    EffectLibrary.prototype._loadDefaultEffects = function() {
    	this.addEffect('color-ramp', new ColorRampEffect());
    	this.addEffect('texture-material', new TextureMaterialEffect());
    };

    return EffectLibrary;
});