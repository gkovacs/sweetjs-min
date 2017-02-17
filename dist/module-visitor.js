'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bindImports = bindImports;

var _loadSyntax = require('./load-syntax');

var _ramda = require('ramda');

var _ = _interopRequireWildcard(_ramda);

var _sweetSpec = require('sweet-spec');

var T = _interopRequireWildcard(_sweetSpec);

var _sweetSpecUtils = require('./sweet-spec-utils');

var S = _interopRequireWildcard(_sweetSpecUtils);

var _symbol = require('./symbol');

var _transforms = require('./transforms');

var _hygieneUtils = require('./hygiene-utils');

var _sweetModule = require('./sweet-module');

var _sweetModule2 = _interopRequireDefault(_sweetModule);

var _immutable = require('immutable');

var _sweetToShiftReducer = require('./sweet-to-shift-reducer');

var _sweetToShiftReducer2 = _interopRequireDefault(_sweetToShiftReducer);

var _shiftCodegen = require('shift-codegen');

var _shiftCodegen2 = _interopRequireDefault(_shiftCodegen);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function bindImports(impTerm, exModule, phase, context) {
  let names = [];
  let phaseToBind = impTerm.forSyntax ? phase + 1 : phase;
  if (impTerm.defaultBinding != null) {
    let exportName = exModule.exportedNames.find(exName => exName.exportedName.val() === '_default');
    let name = impTerm.defaultBinding.name;
    if (exportName != null) {
      let newBinding = (0, _symbol.gensym)('_default');
      let toForward = exportName.exportedName;
      context.bindings.addForward(name, toForward, newBinding, phaseToBind);
      names.push(name);
    }
  }
  if (impTerm.namedImports) {
    impTerm.namedImports.forEach(specifier => {
      let name = specifier.binding.name;
      let exportName = exModule.exportedNames.find(exName => exName.exportedName.val() === name.val());
      if (exportName != null) {
        let newBinding = (0, _symbol.gensym)(name.val());
        let toForward = exportName.name ? exportName.name : exportName.exportedName;
        context.bindings.addForward(name, toForward, newBinding, phaseToBind);
        names.push(name);
      }
    });
  }
  if (impTerm.namespaceBinding) {
    let name = impTerm.namespaceBinding.name;
    let newBinding = (0, _symbol.gensym)(name.val());
    context.store.set(newBinding.toString(), new _transforms.ModuleNamespaceTransform(name, exModule));
    context.bindings.add(name, {
      binding: newBinding,
      phase: phaseToBind,
      skipDup: false
    });

    names.push(name);
  }
  return (0, _immutable.List)(names);
}
exports.default = class {

  constructor(context) {
    this.context = context;
  }

  visit(mod, phase, store) {
    mod.imports.forEach(imp => {
      if (imp.forSyntax) {
        let mod = this.context.loader.get(imp.moduleSpecifier.val(), phase + 1, '');
        this.visit(mod, phase + 1, store);
        this.invoke(mod, phase + 1, store);
      } else {
        let mod = this.context.loader.get(imp.moduleSpecifier.val(), phase, '');
        this.visit(mod, phase, store);
      }
      bindImports(imp, mod, phase, this.context);
    });
    for (let term of mod.compiletimeItems()) {
      if (S.isSyntaxDeclarationStatement(term)) {
        this.registerSyntaxDeclaration(term.declaration, phase, store);
      }
    }
    return store;
  }

  invoke(mod, phase, store) {
    mod.imports.forEach(imp => {
      if (!imp.forSyntax) {
        let mod = this.context.loader.get(imp.moduleSpecifier.val(), phase, '');
        this.invoke(mod, phase, store);
        bindImports(imp, mod, phase, this.context);
      }
    });
    let items = mod.runtimeItems();
    for (let term of items) {
      if (S.isVariableDeclarationStatement(term)) {
        this.registerVariableDeclaration(term.declaration, phase, store);
      } else if (S.isFunctionDeclaration(term)) {
        this.registerFunctionOrClass(term, phase, store);
      }
    }
    let parsed = new T.Module({
      directives: (0, _immutable.List)(), items
    }).reduce(new _sweetToShiftReducer2.default(phase));

    let gen = (0, _shiftCodegen2.default)(parsed, new _shiftCodegen.FormattedCodeGen());
    let result = this.context.transform(gen);

    this.context.loader.eval(result.code, store);
    return store;
  }

  registerSyntaxDeclaration(term, phase, store) {
    term.declarators.forEach(decl => {
      let val = (0, _loadSyntax.evalCompiletimeValue)(decl.init, _.merge(this.context, {
        phase: phase + 1, store
      }));

      (0, _hygieneUtils.collectBindings)(decl.binding).forEach(stx => {
        if (phase !== 0) {
          // phase 0 bindings extend the binding map during compilation
          let newBinding = (0, _symbol.gensym)(stx.val());
          this.context.bindings.add(stx, {
            binding: newBinding,
            phase: phase,
            skipDup: false
          });
        }
        let resolvedName = stx.resolve(phase);
        store.set(resolvedName, new _transforms.CompiletimeTransform(val));
      });
    });
  }

  registerVariableDeclaration(term, phase, store) {
    term.declarators.forEach(decl => {
      (0, _hygieneUtils.collectBindings)(decl.binding).forEach(stx => {
        if (phase !== 0) {
          // phase 0 bindings extend the binding map during compilation
          let newBinding = (0, _symbol.gensym)(stx.val());
          this.context.bindings.add(stx, {
            binding: newBinding,
            phase: phase,
            skipDup: term.kind === 'var'
          });
        }
      });
    });
  }

  registerFunctionOrClass(term, phase, store) {
    (0, _hygieneUtils.collectBindings)(term.name).forEach(stx => {
      if (phase !== 0) {
        let newBinding = (0, _symbol.gensym)(stx.val());
        this.context.bindings.add(stx, {
          binding: newBinding,
          phase: phase,
          skipDup: false
        });
      }
    });
  }

};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2R1bGUtdmlzaXRvci5qcyJdLCJuYW1lcyI6WyJiaW5kSW1wb3J0cyIsIl8iLCJUIiwiUyIsImltcFRlcm0iLCJleE1vZHVsZSIsInBoYXNlIiwiY29udGV4dCIsIm5hbWVzIiwicGhhc2VUb0JpbmQiLCJmb3JTeW50YXgiLCJkZWZhdWx0QmluZGluZyIsImV4cG9ydE5hbWUiLCJleHBvcnRlZE5hbWVzIiwiZmluZCIsImV4TmFtZSIsImV4cG9ydGVkTmFtZSIsInZhbCIsIm5hbWUiLCJuZXdCaW5kaW5nIiwidG9Gb3J3YXJkIiwiYmluZGluZ3MiLCJhZGRGb3J3YXJkIiwicHVzaCIsIm5hbWVkSW1wb3J0cyIsImZvckVhY2giLCJzcGVjaWZpZXIiLCJiaW5kaW5nIiwibmFtZXNwYWNlQmluZGluZyIsInN0b3JlIiwic2V0IiwidG9TdHJpbmciLCJhZGQiLCJza2lwRHVwIiwiY29uc3RydWN0b3IiLCJ2aXNpdCIsIm1vZCIsImltcG9ydHMiLCJpbXAiLCJsb2FkZXIiLCJnZXQiLCJtb2R1bGVTcGVjaWZpZXIiLCJpbnZva2UiLCJ0ZXJtIiwiY29tcGlsZXRpbWVJdGVtcyIsImlzU3ludGF4RGVjbGFyYXRpb25TdGF0ZW1lbnQiLCJyZWdpc3RlclN5bnRheERlY2xhcmF0aW9uIiwiZGVjbGFyYXRpb24iLCJpdGVtcyIsInJ1bnRpbWVJdGVtcyIsImlzVmFyaWFibGVEZWNsYXJhdGlvblN0YXRlbWVudCIsInJlZ2lzdGVyVmFyaWFibGVEZWNsYXJhdGlvbiIsImlzRnVuY3Rpb25EZWNsYXJhdGlvbiIsInJlZ2lzdGVyRnVuY3Rpb25PckNsYXNzIiwicGFyc2VkIiwiTW9kdWxlIiwiZGlyZWN0aXZlcyIsInJlZHVjZSIsImdlbiIsInJlc3VsdCIsInRyYW5zZm9ybSIsImV2YWwiLCJjb2RlIiwiZGVjbGFyYXRvcnMiLCJkZWNsIiwiaW5pdCIsIm1lcmdlIiwic3R4IiwicmVzb2x2ZWROYW1lIiwicmVzb2x2ZSIsImtpbmQiXSwibWFwcGlu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SUFBTCxLQUFjO0FBSE0sV0FBL0I7QUFLRDtBQUNGLE9BVEQ7QUFVRCxLQVhEO0FBWUQ7O0FBRURqQiwwQkFBd0JWLElBQXhCLEVBQW1DckMsS0FBbkMsRUFBK0N1QixLQUEvQyxFQUEyRDtBQUN6RCx1Q0FBZ0JjLEtBQUt6QixJQUFyQixFQUEyQk8sT0FBM0IsQ0FBbUMwQyxPQUFPO0FBQ3hDLFVBQUk3RCxVQUFVLENBQWQsRUFBaUI7QUFDZixZQUFJYSxhQUFhLG9CQUFPZ0QsSUFBSWxELEdBQUosRUFBUCxDQUFqQjtBQUNBLGFBQUtWLE9BQUwsQ0FBYWMsUUFBYixDQUFzQlcsR0FBdEIsQ0FBMEJtQyxHQUExQixFQUErQjtBQUM3QnhDLG1CQUFTUixVQURvQjtBQUU3QmIsaUJBQU9BLEtBRnNCO0FBRzdCMkIsbUJBQVM7QUFIb0IsU0FBL0I7QUFLRDtBQUNGLEtBVEQ7QUFVRDs7QUFyR2tCLEMiLCJmaWxlIjoibW9kdWxlLXZpc2l0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAZmxvd1xuaW1wb3J0IHsgZXZhbENvbXBpbGV0aW1lVmFsdWUgfSBmcm9tICcuL2xvYWQtc3ludGF4JztcbmltcG9ydCAqIGFzIF8gZnJvbSAncmFtZGEnO1xuaW1wb3J0ICogYXMgVCBmcm9tICdzd2VldC1zcGVjJztcbmltcG9ydCAqIGFzIFMgZnJvbSAnLi9zd2VldC1zcGVjLXV0aWxzJztcbmltcG9ydCB7IGdlbnN5bSB9IGZyb20gJy4vc3ltYm9sJztcbmltcG9ydCB7IE1vZHVsZU5hbWVzcGFjZVRyYW5zZm9ybSwgQ29tcGlsZXRpbWVUcmFuc2Zvcm0gfSBmcm9tICcuL3RyYW5zZm9ybXMnO1xuaW1wb3J0IHsgY29sbGVjdEJpbmRpbmdzIH0gZnJvbSAnLi9oeWdpZW5lLXV0aWxzJztcbmltcG9ydCBTd2VldE1vZHVsZSBmcm9tICcuL3N3ZWV0LW1vZHVsZSc7XG5pbXBvcnQgeyBMaXN0IH0gZnJvbSAnaW1tdXRhYmxlJztcbmltcG9ydCBTd2VldFRvU2hpZnRSZWR1Y2VyIGZyb20gJy4vc3dlZXQtdG8tc2hpZnQtcmVkdWNlcic7XG5pbXBvcnQgY29kZWdlbiwgeyBGb3JtYXR0ZWRDb2RlR2VuIH0gZnJvbSAnc2hpZnQtY29kZWdlbic7XG5cbmltcG9ydCB0eXBlIHsgQ29udGV4dCB9IGZyb20gJy4vc3dlZXQtbG9hZGVyJztcblxuXG5leHBvcnQgZnVuY3Rpb24gYmluZEltcG9ydHMoaW1wVGVybTogVC5JbXBvcnREZWNsYXJhdGlvbiwgZXhNb2R1bGU6IFN3ZWV0TW9kdWxlLCBwaGFzZTogYW55LCBjb250ZXh0OiBDb250ZXh0KSB7XG4gIGxldCBuYW1lcyA9IFtdO1xuICBsZXQgcGhhc2VUb0JpbmQgPSBpbXBUZXJtLmZvclN5bnRheCA/IHBoYXNlICsgMSA6IHBoYXNlO1xuICBpZiAoaW1wVGVybS5kZWZhdWx0QmluZGluZyAhPSBudWxsKSB7XG4gICAgbGV0IGV4cG9ydE5hbWUgPSBleE1vZHVsZS5leHBvcnRlZE5hbWVzLmZpbmQoZXhOYW1lID0+IGV4TmFtZS5leHBvcnRlZE5hbWUudmFsKCkgPT09ICdfZGVmYXVsdCcpO1xuICAgIGxldCBuYW1lID0gaW1wVGVybS5kZWZhdWx0QmluZGluZy5uYW1lO1xuICAgIGlmIChleHBvcnROYW1lICE9IG51bGwpIHtcbiAgICAgIGxldCBuZXdCaW5kaW5nID0gZ2Vuc3ltKCdfZGVmYXVsdCcpO1xuICAgICAgbGV0IHRvRm9yd2FyZCA9IGV4cG9ydE5hbWUuZXhwb3J0ZWROYW1lO1xuICAgICAgY29udGV4dC5iaW5kaW5ncy5hZGRGb3J3YXJkKG5hbWUsIHRvRm9yd2FyZCwgbmV3QmluZGluZywgcGhhc2VUb0JpbmQpO1xuICAgICAgbmFtZXMucHVzaChuYW1lKTtcbiAgICB9XG4gIH1cbiAgaWYgKGltcFRlcm0ubmFtZWRJbXBvcnRzKSB7XG4gICAgaW1wVGVybS5uYW1lZEltcG9ydHMuZm9yRWFjaChzcGVjaWZpZXIgPT4ge1xuICAgICAgbGV0IG5hbWUgPSBzcGVjaWZpZXIuYmluZGluZy5uYW1lO1xuICAgICAgbGV0IGV4cG9ydE5hbWUgPSBleE1vZHVsZS5leHBvcnRlZE5hbWVzLmZpbmQoZXhOYW1lID0+IGV4TmFtZS5leHBvcnRlZE5hbWUudmFsKCkgPT09IG5hbWUudmFsKCkpO1xuICAgICAgaWYgKGV4cG9ydE5hbWUgIT0gbnVsbCkge1xuICAgICAgICBsZXQgbmV3QmluZGluZyA9IGdlbnN5bShuYW1lLnZhbCgpKTtcbiAgICAgICAgbGV0IHRvRm9yd2FyZCA9IGV4cG9ydE5hbWUubmFtZSA/IGV4cG9ydE5hbWUubmFtZSA6IGV4cG9ydE5hbWUuZXhwb3J0ZWROYW1lO1xuICAgICAgICBjb250ZXh0LmJpbmRpbmdzLmFkZEZvcndhcmQobmFtZSwgdG9Gb3J3YXJkLCBuZXdCaW5kaW5nLCBwaGFzZVRvQmluZCk7XG4gICAgICAgIG5hbWVzLnB1c2gobmFtZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgaWYgKGltcFRlcm0ubmFtZXNwYWNlQmluZGluZykge1xuICAgIGxldCBuYW1lID0gaW1wVGVybS5uYW1lc3BhY2VCaW5kaW5nLm5hbWU7XG4gICAgbGV0IG5ld0JpbmRpbmcgPSBnZW5zeW0obmFtZS52YWwoKSk7XG4gICAgY29udGV4dC5zdG9yZS5zZXQobmV3QmluZGluZy50b1N0cmluZygpLCBuZXcgTW9kdWxlTmFtZXNwYWNlVHJhbnNmb3JtKG5hbWUsIGV4TW9kdWxlKSk7XG4gICAgY29udGV4dC5iaW5kaW5ncy5hZGQobmFtZSwge1xuICAgICAgYmluZGluZzogbmV3QmluZGluZyxcbiAgICAgIHBoYXNlOiBwaGFzZVRvQmluZCxcbiAgICAgIHNraXBEdXA6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBuYW1lcy5wdXNoKG5hbWUpO1xuICB9XG4gIHJldHVybiBMaXN0KG5hbWVzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBjb250ZXh0OiBDb250ZXh0O1xuXG4gIGNvbnN0cnVjdG9yKGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB9XG5cbiAgdmlzaXQobW9kOiBTd2VldE1vZHVsZSwgcGhhc2U6IGFueSwgc3RvcmU6IGFueSkge1xuICAgIG1vZC5pbXBvcnRzLmZvckVhY2goaW1wID0+IHtcbiAgICAgIGlmIChpbXAuZm9yU3ludGF4KSB7XG4gICAgICAgIGxldCBtb2QgPSB0aGlzLmNvbnRleHQubG9hZGVyLmdldChpbXAubW9kdWxlU3BlY2lmaWVyLnZhbCgpLCBwaGFzZSArIDEsICcnKTtcbiAgICAgICAgdGhpcy52aXNpdChtb2QsIHBoYXNlICsgMSwgc3RvcmUpO1xuICAgICAgICB0aGlzLmludm9rZShtb2QsIHBoYXNlICsgMSwgc3RvcmUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IG1vZCA9IHRoaXMuY29udGV4dC5sb2FkZXIuZ2V0KGltcC5tb2R1bGVTcGVjaWZpZXIudmFsKCksIHBoYXNlLCAnJyk7XG4gICAgICAgIHRoaXMudmlzaXQobW9kLCBwaGFzZSwgc3RvcmUpO1xuICAgICAgfVxuICAgICAgYmluZEltcG9ydHMoaW1wLCBtb2QsIHBoYXNlLCB0aGlzLmNvbnRleHQpO1xuICAgIH0pO1xuICAgIGZvciAobGV0IHRlcm0gb2YgbW9kLmNvbXBpbGV0aW1lSXRlbXMoKSkge1xuICAgICBpZiAoUy5pc1N5bnRheERlY2xhcmF0aW9uU3RhdGVtZW50KHRlcm0pKSB7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJTeW50YXhEZWNsYXJhdGlvbih0ZXJtLmRlY2xhcmF0aW9uLCBwaGFzZSwgc3RvcmUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3RvcmU7XG4gIH1cblxuICBpbnZva2UobW9kOiBhbnksIHBoYXNlOiBhbnksIHN0b3JlOiBhbnkpIHtcbiAgICBtb2QuaW1wb3J0cy5mb3JFYWNoKGltcCA9PiB7XG4gICAgICBpZiAoIWltcC5mb3JTeW50YXgpIHtcbiAgICAgICAgbGV0IG1vZCA9IHRoaXMuY29udGV4dC5sb2FkZXIuZ2V0KGltcC5tb2R1bGVTcGVjaWZpZXIudmFsKCksIHBoYXNlLCAnJyk7XG4gICAgICAgIHRoaXMuaW52b2tlKG1vZCwgcGhhc2UsIHN0b3JlKTtcbiAgICAgICAgYmluZEltcG9ydHMoaW1wLCBtb2QsIHBoYXNlLCB0aGlzLmNvbnRleHQpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGxldCBpdGVtcyA9IG1vZC5ydW50aW1lSXRlbXMoKTtcbiAgICBmb3IgKGxldCB0ZXJtIG9mIGl0ZW1zKSB7XG4gICAgICBpZiAoUy5pc1ZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQodGVybSkpIHtcbiAgICAgICAgdGhpcy5yZWdpc3RlclZhcmlhYmxlRGVjbGFyYXRpb24odGVybS5kZWNsYXJhdGlvbiwgcGhhc2UsIHN0b3JlKTtcbiAgICAgIH0gZWxzZSBpZiAoUy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24odGVybSkpIHtcbiAgICAgICAgdGhpcy5yZWdpc3RlckZ1bmN0aW9uT3JDbGFzcyh0ZXJtLCBwaGFzZSwgc3RvcmUpO1xuICAgICAgfVxuICAgIH1cbiAgICBsZXQgcGFyc2VkID0gbmV3IFQuTW9kdWxlKHtcbiAgICAgIGRpcmVjdGl2ZXM6IExpc3QoKSwgaXRlbXNcbiAgICB9KS5yZWR1Y2UobmV3IFN3ZWV0VG9TaGlmdFJlZHVjZXIocGhhc2UpKTtcblxuICAgIGxldCBnZW4gPSBjb2RlZ2VuKHBhcnNlZCwgbmV3IEZvcm1hdHRlZENvZGVHZW4pO1xuICAgIGxldCByZXN1bHQgPSB0aGlzLmNvbnRleHQudHJhbnNmb3JtKGdlbik7XG5cbiAgICB0aGlzLmNvbnRleHQubG9hZGVyLmV2YWwocmVzdWx0LmNvZGUsIHN0b3JlKTtcbiAgICByZXR1cm4gc3RvcmU7XG4gIH1cblxuICByZWdpc3RlclN5bnRheERlY2xhcmF0aW9uKHRlcm06IFQuVmFyaWFibGVEZWNsYXJhdGlvblN0YXRlbWVudCwgcGhhc2U6IGFueSwgc3RvcmU6IGFueSkge1xuICAgIHRlcm0uZGVjbGFyYXRvcnMuZm9yRWFjaChkZWNsID0+IHtcbiAgICAgIGxldCB2YWwgPSBldmFsQ29tcGlsZXRpbWVWYWx1ZShkZWNsLmluaXQsIF8ubWVyZ2UodGhpcy5jb250ZXh0LCB7XG4gICAgICAgIHBoYXNlOiBwaGFzZSArIDEsIHN0b3JlXG4gICAgICB9KSk7XG5cbiAgICAgIGNvbGxlY3RCaW5kaW5ncyhkZWNsLmJpbmRpbmcpLmZvckVhY2goc3R4ID0+IHtcbiAgICAgICAgaWYgKHBoYXNlICE9PSAwKSB7IC8vIHBoYXNlIDAgYmluZGluZ3MgZXh0ZW5kIHRoZSBiaW5kaW5nIG1hcCBkdXJpbmcgY29tcGlsYXRpb25cbiAgICAgICAgICBsZXQgbmV3QmluZGluZyA9IGdlbnN5bShzdHgudmFsKCkpO1xuICAgICAgICAgIHRoaXMuY29udGV4dC5iaW5kaW5ncy5hZGQoc3R4LCB7XG4gICAgICAgICAgICBiaW5kaW5nOiBuZXdCaW5kaW5nLFxuICAgICAgICAgICAgcGhhc2U6IHBoYXNlLFxuICAgICAgICAgICAgc2tpcER1cDogZmFsc2VcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmVzb2x2ZWROYW1lID0gc3R4LnJlc29sdmUocGhhc2UpO1xuICAgICAgICBzdG9yZS5zZXQocmVzb2x2ZWROYW1lLCBuZXcgQ29tcGlsZXRpbWVUcmFuc2Zvcm0odmFsKSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlZ2lzdGVyVmFyaWFibGVEZWNsYXJhdGlvbih0ZXJtOiBhbnksIHBoYXNlOiBhbnksIHN0b3JlOiBhbnkpIHtcbiAgICB0ZXJtLmRlY2xhcmF0b3JzLmZvckVhY2goZGVjbCA9PiB7XG4gICAgICBjb2xsZWN0QmluZGluZ3MoZGVjbC5iaW5kaW5nKS5mb3JFYWNoKHN0eCA9PiB7XG4gICAgICAgIGlmIChwaGFzZSAhPT0gMCkgeyAvLyBwaGFzZSAwIGJpbmRpbmdzIGV4dGVuZCB0aGUgYmluZGluZyBtYXAgZHVyaW5nIGNvbXBpbGF0aW9uXG4gICAgICAgICAgbGV0IG5ld0JpbmRpbmcgPSBnZW5zeW0oc3R4LnZhbCgpKTtcbiAgICAgICAgICB0aGlzLmNvbnRleHQuYmluZGluZ3MuYWRkKHN0eCwge1xuICAgICAgICAgICAgYmluZGluZzogbmV3QmluZGluZyxcbiAgICAgICAgICAgIHBoYXNlOiBwaGFzZSxcbiAgICAgICAgICAgIHNraXBEdXA6IHRlcm0ua2luZCA9PT0gJ3ZhcidcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICByZWdpc3RlckZ1bmN0aW9uT3JDbGFzcyh0ZXJtOiBhbnksIHBoYXNlOiBhbnksIHN0b3JlOiBhbnkpIHtcbiAgICBjb2xsZWN0QmluZGluZ3ModGVybS5uYW1lKS5mb3JFYWNoKHN0eCA9PiB7XG4gICAgICBpZiAocGhhc2UgIT09IDApIHtcbiAgICAgICAgbGV0IG5ld0JpbmRpbmcgPSBnZW5zeW0oc3R4LnZhbCgpKTtcbiAgICAgICAgdGhpcy5jb250ZXh0LmJpbmRpbmdzLmFkZChzdHgsIHtcbiAgICAgICAgICBiaW5kaW5nOiBuZXdCaW5kaW5nLFxuICAgICAgICAgIHBoYXNlOiBwaGFzZSxcbiAgICAgICAgICBza2lwRHVwOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG59XG4iXX0=