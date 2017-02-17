'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compile = compile;

var _sweet = require('./sweet');

var _storeLoader = require('./store-loader');

var _storeLoader2 = _interopRequireDefault(_storeLoader);

var _store = require('./store');

var _store2 = _interopRequireDefault(_store);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class BrowserStoreLoader extends _storeLoader2.default {

  constructor(baseDir, store) {
    super(baseDir, store, true);
  }

  fetch({ name, address }) {
    if (this.store.has(address.path)) {
      return this.store.get(address.path);
    }
    throw new Error(`The module ${ name } is not in the debug store: addr.path is ${ address.path }`);
  }

  freshStore() {
    return new _store2.default({});
  }

  eval(source, store) {
    return (0, eval)(source);
  }
}

function compile(source) {
  let s = new Map();
  s.set('main.js', source);
  let loader = new BrowserStoreLoader('.', s);
  return (0, _sweet.compile)('main.js', loader);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9icm93c2VyLXN3ZWV0LmpzIl0sIm5hbWVzIjpbImNvbXBpbGUiLCJCcm93c2VyU3RvcmVMb2FkZXIiLCJjb25zdHJ1Y3RvciIsImJhc2VEaXIiLCJzdG9yZSIsImZldGNoIiwibmFtZSIsImFkZHJlc3MiLCJoYXMiLCJwYXRoIiwiZ2V0IiwiRXJyb3IiLCJmcmVzaFN0b3JlIiwiZXZhbCIsInNvdXJjZSIsInMiLCJNYXAiLCJzZXQiLCJsb2FkZXIiXSwibWFwcGluZ3MiOiI7Ozs7O1FBMkJnQkEsTyxHQUFBQSxPOztBQTNCaEI7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsTUFBTUMsa0JBQU4sK0JBQTZDOztBQUczQ0MsY0FBWUMsT0FBWixFQUE2QkMsS0FBN0IsRUFBeUQ7QUFDdkQsVUFBTUQsT0FBTixFQUFlQyxLQUFmLEVBQXNCLElBQXRCO0FBQ0Q7O0FBRURDLFFBQU0sRUFBRUMsSUFBRixFQUFRQyxPQUFSLEVBQU4sRUFBd0Q7QUFDdEQsUUFBSSxLQUFLSCxLQUFMLENBQVdJLEdBQVgsQ0FBZUQsUUFBUUUsSUFBdkIsQ0FBSixFQUFrQztBQUNoQyxhQUFPLEtBQUtMLEtBQUwsQ0FBV00sR0FBWCxDQUFlSCxRQUFRRSxJQUF2QixDQUFQO0FBQ0Q7QUFDRCxVQUFNLElBQUlFLEtBQUosQ0FBVyxlQUFhTCxJQUFLLDhDQUEyQ0MsUUFBUUUsSUFBSyxHQUFyRixDQUFOO0FBQ0Q7O0FBRURHLGVBQWE7QUFDWCxXQUFPLG9CQUFVLEVBQVYsQ0FBUDtBQUNEOztBQUVEQyxPQUFLQyxNQUFMLEVBQXFCVixLQUFyQixFQUFtQztBQUNqQyxXQUFPLENBQUMsR0FBR1MsSUFBSixFQUFVQyxNQUFWLENBQVA7QUFDRDtBQXBCMEM7O0FBdUJ0QyxTQUFTZCxPQUFULENBQWlCYyxNQUFqQixFQUF5QjtBQUM5QixNQUFJQyxJQUFJLElBQUlDLEdBQUosRUFBUjtBQUNBRCxJQUFFRSxHQUFGLENBQU0sU0FBTixFQUFpQkgsTUFBakI7QUFDQSxNQUFJSSxTQUFTLElBQUlqQixrQkFBSixDQUF1QixHQUF2QixFQUE0QmMsQ0FBNUIsQ0FBYjtBQUNBLFNBQU8sb0JBQWEsU0FBYixFQUF3QkcsTUFBeEIsQ0FBUDtBQUNEIiwiZmlsZSI6ImJyb3dzZXItc3dlZXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjb21waWxlIGFzIHN3ZWV0Q29tcGlsZSB9IGZyb20gJy4vc3dlZXQnO1xuaW1wb3J0IFN0b3JlTG9hZGVyIGZyb20gJy4vc3RvcmUtbG9hZGVyJztcbmltcG9ydCBTdG9yZSBmcm9tICcuL3N0b3JlJztcblxuY2xhc3MgQnJvd3NlclN0b3JlTG9hZGVyIGV4dGVuZHMgU3RvcmVMb2FkZXIge1xuICBzdG9yZTogTWFwPHN0cmluZywgc3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihiYXNlRGlyOiBzdHJpbmcsIHN0b3JlOiBNYXA8c3RyaW5nLCBzdHJpbmc+KSB7XG4gICAgc3VwZXIoYmFzZURpciwgc3RvcmUsIHRydWUpO1xuICB9XG5cbiAgZmV0Y2goeyBuYW1lLCBhZGRyZXNzIH06IHsgbmFtZTogc3RyaW5nLCBhZGRyZXNzOiBhbnl9KSB7XG4gICAgaWYgKHRoaXMuc3RvcmUuaGFzKGFkZHJlc3MucGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3JlLmdldChhZGRyZXNzLnBhdGgpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBtb2R1bGUgJHtuYW1lfSBpcyBub3QgaW4gdGhlIGRlYnVnIHN0b3JlOiBhZGRyLnBhdGggaXMgJHthZGRyZXNzLnBhdGh9YCk7XG4gIH1cblxuICBmcmVzaFN0b3JlKCkge1xuICAgIHJldHVybiBuZXcgU3RvcmUoe30pO1xuICB9XG4gIFxuICBldmFsKHNvdXJjZTogc3RyaW5nLCBzdG9yZTogU3RvcmUpIHtcbiAgICByZXR1cm4gKDAsIGV2YWwpKHNvdXJjZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGUoc291cmNlKSB7XG4gIGxldCBzID0gbmV3IE1hcCgpO1xuICBzLnNldCgnbWFpbi5qcycsIHNvdXJjZSk7XG4gIGxldCBsb2FkZXIgPSBuZXcgQnJvd3NlclN0b3JlTG9hZGVyKCcuJywgcyk7XG4gIHJldHVybiBzd2VldENvbXBpbGUoJ21haW4uanMnLCBsb2FkZXIpO1xufSJdfQ==