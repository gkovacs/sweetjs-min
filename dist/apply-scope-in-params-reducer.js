"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var _terms=require("./terms"),_terms2=_interopRequireDefault(_terms),_symbol=require("./symbol"),_transforms=require("./transforms"),_errors=require("./errors"),_syntax=require("./syntax");function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}class ScopeApplyingReducer{constructor(a,b){this.context=b,this.scope=a}transform(a){let b="transform"+a.type;return"function"==typeof this[b]?this[b](a):void(0,_errors.assert)(!1,"transform not implemented yet for: "+a.type)}transformFormalParameters(a){let b=null==a.rest?null:this.transform(a.rest);return new _terms2.default("FormalParameters",{items:a.items.map(c=>this.transform(c)),rest:b})}transformBindingWithDefault(a){return new _terms2.default("BindingWithDefault",{binding:this.transform(a.binding),init:a.init})}transformObjectBinding(a){return a}transformBindingPropertyIdentifier(a){return new _terms2.default("BindingPropertyIdentifier",{binding:this.transform(a.binding),init:a.init})}transformBindingPropertyProperty(a){return new _terms2.default("BindingPropertyProperty",{name:a.name,binding:this.transform(a.binding)})}transformArrayBinding(a){return new _terms2.default("ArrayBinding",{elements:a.elements.map(b=>this.transform(b)),restElement:null==a.restElement?null:this.transform(a.restElement)})}transformBindingIdentifier(a){let b=a.name.addScope(this.scope,this.context.bindings,_syntax.ALL_PHASES),c=(0,_symbol.gensym)(b.val());return this.context.env.set(c.toString(),new _transforms.VarBindingTransform(b)),this.context.bindings.add(b,{binding:c,phase:this.context.phase,skipDup:!0}),new _terms2.default("BindingIdentifier",{name:b})}}exports.default=ScopeApplyingReducer;

