'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CollectBindingSyntax = undefined;
exports.collectBindings = collectBindings;

var _immutable = require('immutable');

var _astDispatcher = require('./ast-dispatcher');

var _astDispatcher2 = _interopRequireDefault(_astDispatcher);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class CollectBindingSyntax extends _astDispatcher2.default {
  constructor() {
    super('collect', true);
    this.names = (0, _immutable.List)();
  }

  // registerSyntax(stx) {
  //   let newBinding = gensym(stx.val());
  //   this.context.bindings.add(stx, {
  //     binding: newBinding,
  //     phase: this.context.phase,
  //     // skip dup because js allows variable redeclarations
  //     // (technically only for `var` but we can let later stages of the pipeline
  //     // handle incorrect redeclarations of `const` and `let`)
  //     skipDup: true
  //   });
  //   return stx;
  // }

  collect(term) {
    return this.dispatch(term);
  }

  collectBindingIdentifier(term) {
    return this.names.concat(term.name);
  }

  collectBindingPropertyIdentifier(term) {
    return this.collect(term.binding);
  }

  collectBindingPropertyProperty(term) {
    return this.collect(term.binding);
  }

  collectArrayBinding(term) {
    let restElement = null;
    if (term.restElement != null) {
      restElement = this.collect(term.restElement);
    }
    return this.names.concat(restElement).concat(term.elements.filter(el => el != null).flatMap(el => this.collect(el)));
  }

  collectObjectBinding() {
    // return term.properties.flatMap(prop => this.collect(prop));
    return (0, _immutable.List)();
  }

  // registerVariableDeclaration(term) {
  //   let declarators = term.declarators.map(decl => {
  //     return decl.extend({
  //       binding: this.register(decl.binding)
  //     });
  //   });
  //   return term.extend({ declarators });
  // }
  //
  // registerFunctionDeclaration(term) {
  //   return term.extend({
  //     name: this.register(term.name)
  //   });
  // }
  //
  // registerExport(term) {
  //   return term.extend({
  //     declaration: this.register(term.declaration)
  //   });
  // }
}

exports.CollectBindingSyntax = CollectBindingSyntax;
function collectBindings(term) {
  return new CollectBindingSyntax().collect(term);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oeWdpZW5lLXV0aWxzLmpzIl0sIm5hbWVzIjpbImNvbGxlY3RCaW5kaW5ncyIsIkNvbGxlY3RCaW5kaW5nU3ludGF4IiwiY29uc3RydWN0b3IiLCJuYW1lcyIsImNvbGxlY3QiLCJ0ZXJtIiwiZGlzcGF0Y2giLCJjb2xsZWN0QmluZGluZ0lkZW50aWZpZXIiLCJjb25jYXQiLCJuYW1lIiwiY29sbGVjdEJpbmRpbmdQcm9wZXJ0eUlkZW50aWZpZXIiLCJiaW5kaW5nIiwiY29sbGVjdEJpbmRpbmdQcm9wZXJ0eVByb3BlcnR5IiwiY29sbGVjdEFycmF5QmluZGluZyIsInJlc3RFbGVtZW50IiwiZWxlbWVudHMiLCJmaWx0ZXIiLCJlbCIsImZsYXRNYXAiLCJjb2xsZWN0T2JqZWN0QmluZGluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O1FBNkVnQkEsZSxHQUFBQSxlOztBQTdFaEI7O0FBRUE7Ozs7OztBQUVPLE1BQU1DLG9CQUFOLGlDQUFpRDtBQUN0REMsZ0JBQWM7QUFDWixVQUFNLFNBQU4sRUFBaUIsSUFBakI7QUFDQSxTQUFLQyxLQUFMLEdBQWEsc0JBQWI7QUFDRDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUFDLFVBQVFDLElBQVIsRUFBYztBQUNaLFdBQU8sS0FBS0MsUUFBTCxDQUFjRCxJQUFkLENBQVA7QUFDRDs7QUFFREUsMkJBQXlCRixJQUF6QixFQUErQjtBQUM3QixXQUFPLEtBQUtGLEtBQUwsQ0FBV0ssTUFBWCxDQUFrQkgsS0FBS0ksSUFBdkIsQ0FBUDtBQUNEOztBQUVEQyxtQ0FBaUNMLElBQWpDLEVBQXVDO0FBQ3JDLFdBQU8sS0FBS0QsT0FBTCxDQUFhQyxLQUFLTSxPQUFsQixDQUFQO0FBQ0Q7O0FBRURDLGlDQUFnQ1AsSUFBaEMsRUFBc0M7QUFDcEMsV0FBTyxLQUFLRCxPQUFMLENBQWFDLEtBQUtNLE9BQWxCLENBQVA7QUFDRDs7QUFFREUsc0JBQXFCUixJQUFyQixFQUEyQjtBQUN6QixRQUFJUyxjQUFjLElBQWxCO0FBQ0EsUUFBSVQsS0FBS1MsV0FBTCxJQUFvQixJQUF4QixFQUE4QjtBQUM1QkEsb0JBQWMsS0FBS1YsT0FBTCxDQUFhQyxLQUFLUyxXQUFsQixDQUFkO0FBQ0Q7QUFDRCxXQUFPLEtBQUtYLEtBQUwsQ0FBV0ssTUFBWCxDQUFrQk0sV0FBbEIsRUFBK0JOLE1BQS9CLENBQ0xILEtBQUtVLFFBQUwsQ0FBY0MsTUFBZCxDQUFxQkMsTUFBTUEsTUFBTSxJQUFqQyxFQUNjQyxPQURkLENBQ3NCRCxNQUFNLEtBQUtiLE9BQUwsQ0FBYWEsRUFBYixDQUQ1QixDQURLLENBQVA7QUFJRDs7QUFFREUseUJBQXdCO0FBQ3RCO0FBQ0EsV0FBTyxzQkFBUDtBQUNEOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUF0RXNEOztRQUEzQ2xCLG9CLEdBQUFBLG9CO0FBeUVOLFNBQVNELGVBQVQsQ0FBeUJLLElBQXpCLEVBQStCO0FBQ3BDLFNBQU8sSUFBSUosb0JBQUosR0FBMkJHLE9BQTNCLENBQW1DQyxJQUFuQyxDQUFQO0FBQ0QiLCJmaWxlIjoiaHlnaWVuZS11dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExpc3QgfSBmcm9tICdpbW11dGFibGUnO1xuXG5pbXBvcnQgQVNURGlzcGF0Y2hlciBmcm9tICcuL2FzdC1kaXNwYXRjaGVyJztcblxuZXhwb3J0IGNsYXNzIENvbGxlY3RCaW5kaW5nU3ludGF4IGV4dGVuZHMgQVNURGlzcGF0Y2hlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCdjb2xsZWN0JywgdHJ1ZSk7XG4gICAgdGhpcy5uYW1lcyA9IExpc3QoKTtcbiAgfVxuXG4gIC8vIHJlZ2lzdGVyU3ludGF4KHN0eCkge1xuICAvLyAgIGxldCBuZXdCaW5kaW5nID0gZ2Vuc3ltKHN0eC52YWwoKSk7XG4gIC8vICAgdGhpcy5jb250ZXh0LmJpbmRpbmdzLmFkZChzdHgsIHtcbiAgLy8gICAgIGJpbmRpbmc6IG5ld0JpbmRpbmcsXG4gIC8vICAgICBwaGFzZTogdGhpcy5jb250ZXh0LnBoYXNlLFxuICAvLyAgICAgLy8gc2tpcCBkdXAgYmVjYXVzZSBqcyBhbGxvd3MgdmFyaWFibGUgcmVkZWNsYXJhdGlvbnNcbiAgLy8gICAgIC8vICh0ZWNobmljYWxseSBvbmx5IGZvciBgdmFyYCBidXQgd2UgY2FuIGxldCBsYXRlciBzdGFnZXMgb2YgdGhlIHBpcGVsaW5lXG4gIC8vICAgICAvLyBoYW5kbGUgaW5jb3JyZWN0IHJlZGVjbGFyYXRpb25zIG9mIGBjb25zdGAgYW5kIGBsZXRgKVxuICAvLyAgICAgc2tpcER1cDogdHJ1ZVxuICAvLyAgIH0pO1xuICAvLyAgIHJldHVybiBzdHg7XG4gIC8vIH1cblxuICBjb2xsZWN0KHRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaCh0ZXJtKTtcbiAgfVxuXG4gIGNvbGxlY3RCaW5kaW5nSWRlbnRpZmllcih0ZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZXMuY29uY2F0KHRlcm0ubmFtZSk7XG4gIH1cblxuICBjb2xsZWN0QmluZGluZ1Byb3BlcnR5SWRlbnRpZmllcih0ZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdCh0ZXJtLmJpbmRpbmcpO1xuICB9XG5cbiAgY29sbGVjdEJpbmRpbmdQcm9wZXJ0eVByb3BlcnR5ICh0ZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdCh0ZXJtLmJpbmRpbmcpO1xuICB9XG5cbiAgY29sbGVjdEFycmF5QmluZGluZyAodGVybSkge1xuICAgIGxldCByZXN0RWxlbWVudCA9IG51bGw7XG4gICAgaWYgKHRlcm0ucmVzdEVsZW1lbnQgIT0gbnVsbCkge1xuICAgICAgcmVzdEVsZW1lbnQgPSB0aGlzLmNvbGxlY3QodGVybS5yZXN0RWxlbWVudCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5hbWVzLmNvbmNhdChyZXN0RWxlbWVudCkuY29uY2F0KFxuICAgICAgdGVybS5lbGVtZW50cy5maWx0ZXIoZWwgPT4gZWwgIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAuZmxhdE1hcChlbCA9PiB0aGlzLmNvbGxlY3QoZWwpKVxuICAgICk7XG4gIH1cblxuICBjb2xsZWN0T2JqZWN0QmluZGluZyAoKSB7XG4gICAgLy8gcmV0dXJuIHRlcm0ucHJvcGVydGllcy5mbGF0TWFwKHByb3AgPT4gdGhpcy5jb2xsZWN0KHByb3ApKTtcbiAgICByZXR1cm4gTGlzdCgpO1xuICB9XG5cbiAgLy8gcmVnaXN0ZXJWYXJpYWJsZURlY2xhcmF0aW9uKHRlcm0pIHtcbiAgLy8gICBsZXQgZGVjbGFyYXRvcnMgPSB0ZXJtLmRlY2xhcmF0b3JzLm1hcChkZWNsID0+IHtcbiAgLy8gICAgIHJldHVybiBkZWNsLmV4dGVuZCh7XG4gIC8vICAgICAgIGJpbmRpbmc6IHRoaXMucmVnaXN0ZXIoZGVjbC5iaW5kaW5nKVxuICAvLyAgICAgfSk7XG4gIC8vICAgfSk7XG4gIC8vICAgcmV0dXJuIHRlcm0uZXh0ZW5kKHsgZGVjbGFyYXRvcnMgfSk7XG4gIC8vIH1cbiAgLy9cbiAgLy8gcmVnaXN0ZXJGdW5jdGlvbkRlY2xhcmF0aW9uKHRlcm0pIHtcbiAgLy8gICByZXR1cm4gdGVybS5leHRlbmQoe1xuICAvLyAgICAgbmFtZTogdGhpcy5yZWdpc3Rlcih0ZXJtLm5hbWUpXG4gIC8vICAgfSk7XG4gIC8vIH1cbiAgLy9cbiAgLy8gcmVnaXN0ZXJFeHBvcnQodGVybSkge1xuICAvLyAgIHJldHVybiB0ZXJtLmV4dGVuZCh7XG4gIC8vICAgICBkZWNsYXJhdGlvbjogdGhpcy5yZWdpc3Rlcih0ZXJtLmRlY2xhcmF0aW9uKVxuICAvLyAgIH0pO1xuICAvLyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb2xsZWN0QmluZGluZ3ModGVybSkge1xuICByZXR1cm4gbmV3IENvbGxlY3RCaW5kaW5nU3ludGF4KCkuY29sbGVjdCh0ZXJtKTtcbn1cbiJdfQ==