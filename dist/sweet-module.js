'use strict';Object.defineProperty(exports,'__esModule',{value:!0});var _sweetSpec=require('sweet-spec'),T=_interopRequireWildcard(_sweetSpec),_ramda=require('ramda'),_=_interopRequireWildcard(_ramda),_sweetSpecUtils=require('./sweet-spec-utils'),S=_interopRequireWildcard(_sweetSpecUtils),_codegen=require('./codegen'),_codegen2=_interopRequireDefault(_codegen),_immutable=require('immutable'),_sweetToShiftReducer=require('./sweet-to-shift-reducer.js'),_sweetToShiftReducer2=_interopRequireDefault(_sweetToShiftReducer),_syntax=require('./syntax'),_syntax2=_interopRequireDefault(_syntax);function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}function _interopRequireWildcard(a){if(a&&a.__esModule)return a;var b={};if(null!=a)for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&(b[c]=a[c]);return b.default=a,b}const extractDeclaration=_.cond([[S.isExport,_.prop('declaration')],[S.isExportDefault,_.prop('body')],[_.T,a=>{throw new Error(`Expecting an Export or ExportDefault but got ${a}`)}]]),ExpSpec=a=>({exportedName:a}),extractDeclarationNames=_.cond([[S.isVariableDeclarator,({binding:a})=>_immutable.List.of(ExpSpec(a.name))],[S.isVariableDeclaration,({declarators:a})=>a.flatMap(extractDeclarationNames)],[S.isFunctionDeclaration,({name:a})=>_immutable.List.of(ExpSpec(a.name))],[S.isClassDeclaration,({name:a})=>_immutable.List.of(ExpSpec(a.name))]]);function extractNames(a){if(S.isExport(a))return extractDeclarationNames(a.declaration);if(S.isExportDefault(a))return(0,_immutable.List)();if(S.isExportFrom(a))return a.namedExports;throw new Error(`Unknown export type`)}function wrapStatement(a){return S.isVariableDeclaration(a)?new T.VariableDeclarationStatement({declaration:a}):a}const memoSym=Symbol('memo');function makeVarDeclStmt(a,b){return new T.VariableDeclarationStatement({declaration:new T.VariableDeclaration({kind:'var',declarators:_immutable.List.of(new T.VariableDeclarator({binding:a,init:b}))})})}class SweetModule{constructor(a){let b=[],c=[],d=[];this.exportedNames=(0,_immutable.List)();for(let e of a)if(S.isImportDeclaration(e))c.push(e);else if(!S.isExportDeclaration(e))b.push(e);else if(d.push(e),this.exportedNames=this.exportedNames.concat(extractNames(e)),S.isExport(e))b.push(wrapStatement(extractDeclaration(e)));else if(S.isExportDefault(e)){let f=extractDeclaration(e),g=_syntax2.default.fromIdentifier('_default'),h=new T.BindingIdentifier({name:g});this.exportedNames=this.exportedNames.push(ExpSpec(g)),S.isFunctionDeclaration(f)||S.isClassDeclaration(f)?(b.push(f),b.push(makeVarDeclStmt(h,new T.IdentifierExpression({name:f.name.name})))):b.push(makeVarDeclStmt(h,f))}this.items=(0,_immutable.List)(b),this.imports=(0,_immutable.List)(c),this.exports=(0,_immutable.List)(d)}[memoSym](){let a=[],b=[];for(let c of this.items)S.isCompiletimeStatement(c)?b.push(c):a.push(c);this.runtime=(0,_immutable.List)(a),this.compiletime=(0,_immutable.List)(b)}runtimeItems(){return null==this.runtime&&this[memoSym](),this.runtime}compiletimeItems(){return null==this.compiletime&&this[memoSym](),this.compiletime}parse(){return new T.Module({items:this.items,directives:(0,_immutable.List)()}).reduce(new _sweetToShiftReducer2.default(0))}codegen(){return(0,_codegen2.default)(this.parse()).code}}exports.default=SweetModule;

