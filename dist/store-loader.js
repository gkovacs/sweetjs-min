'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sweetLoader = require('./sweet-loader');

var _sweetLoader2 = _interopRequireDefault(_sweetLoader);

var _vm = require('vm');

var _vm2 = _interopRequireDefault(_vm);

var _store = require('./store');

var _store2 = _interopRequireDefault(_store);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = class extends _sweetLoader2.default {

  constructor(baseDir, store, noBabel = false) {
    super(baseDir, noBabel);
    this.store = store;
  }

  fetch({ name, address }) {
    if (this.store.has(address.path)) {
      return this.store.get(address.path);
    }
    throw new Error(`The module ${ name } is not in the debug store: addr.path is ${ address.path }`);
  }

  freshStore() {
    return new _store2.default(_vm2.default.createContext());
  }

  eval(source, store) {
    return _vm2.default.runInContext(source, store.getBackingObject());
  }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zdG9yZS1sb2FkZXIuanMiXSwibmFtZXMiOlsiY29uc3RydWN0b3IiLCJiYXNlRGlyIiwic3RvcmUiLCJub0JhYmVsIiwiZmV0Y2giLCJuYW1lIiwiYWRkcmVzcyIsImhhcyIsInBhdGgiLCJnZXQiLCJFcnJvciIsImZyZXNoU3RvcmUiLCJjcmVhdGVDb250ZXh0IiwiZXZhbCIsInNvdXJjZSIsInJ1bkluQ29udGV4dCIsImdldEJhY2tpbmdPYmplY3QiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O2tCQUdlLG9DQUEwQjs7QUFHdkNBLGNBQVlDLE9BQVosRUFBNkJDLEtBQTdCLEVBQXlEQyxVQUFtQixLQUE1RSxFQUFtRjtBQUNqRixVQUFNRixPQUFOLEVBQWVFLE9BQWY7QUFDQSxTQUFLRCxLQUFMLEdBQWFBLEtBQWI7QUFDRDs7QUFFREUsUUFBTSxFQUFFQyxJQUFGLEVBQVFDLE9BQVIsRUFBTixFQUF3RDtBQUN0RCxRQUFJLEtBQUtKLEtBQUwsQ0FBV0ssR0FBWCxDQUFlRCxRQUFRRSxJQUF2QixDQUFKLEVBQWtDO0FBQ2hDLGFBQU8sS0FBS04sS0FBTCxDQUFXTyxHQUFYLENBQWVILFFBQVFFLElBQXZCLENBQVA7QUFDRDtBQUNELFVBQU0sSUFBSUUsS0FBSixDQUFXLGVBQWFMLElBQUssOENBQTJDQyxRQUFRRSxJQUFLLEdBQXJGLENBQU47QUFDRDs7QUFFREcsZUFBYTtBQUNYLFdBQU8sb0JBQVUsYUFBR0MsYUFBSCxFQUFWLENBQVA7QUFDRDs7QUFFREMsT0FBS0MsTUFBTCxFQUFxQlosS0FBckIsRUFBbUM7QUFDakMsV0FBTyxhQUFHYSxZQUFILENBQWdCRCxNQUFoQixFQUF3QlosTUFBTWMsZ0JBQU4sRUFBeEIsQ0FBUDtBQUNEO0FBckJzQyxDIiwiZmlsZSI6InN0b3JlLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEBmbG93XG5pbXBvcnQgU3dlZXRMb2FkZXIgZnJvbSAnLi9zd2VldC1sb2FkZXInO1xuaW1wb3J0IHZtIGZyb20gJ3ZtJztcbmltcG9ydCBTdG9yZSBmcm9tICcuL3N0b3JlJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBleHRlbmRzIFN3ZWV0TG9hZGVyIHtcbiAgc3RvcmU6IE1hcDxzdHJpbmcsIHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IoYmFzZURpcjogc3RyaW5nLCBzdG9yZTogTWFwPHN0cmluZywgc3RyaW5nPiwgbm9CYWJlbDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgc3VwZXIoYmFzZURpciwgbm9CYWJlbCk7XG4gICAgdGhpcy5zdG9yZSA9IHN0b3JlO1xuICB9XG5cbiAgZmV0Y2goeyBuYW1lLCBhZGRyZXNzIH06IHsgbmFtZTogc3RyaW5nLCBhZGRyZXNzOiBhbnl9KSB7XG4gICAgaWYgKHRoaXMuc3RvcmUuaGFzKGFkZHJlc3MucGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3JlLmdldChhZGRyZXNzLnBhdGgpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBtb2R1bGUgJHtuYW1lfSBpcyBub3QgaW4gdGhlIGRlYnVnIHN0b3JlOiBhZGRyLnBhdGggaXMgJHthZGRyZXNzLnBhdGh9YCk7XG4gIH1cblxuICBmcmVzaFN0b3JlKCkge1xuICAgIHJldHVybiBuZXcgU3RvcmUodm0uY3JlYXRlQ29udGV4dCgpKTtcbiAgfVxuICBcbiAgZXZhbChzb3VyY2U6IHN0cmluZywgc3RvcmU6IFN0b3JlKSB7XG4gICAgcmV0dXJuIHZtLnJ1bkluQ29udGV4dChzb3VyY2UsIHN0b3JlLmdldEJhY2tpbmdPYmplY3QoKSk7XG4gIH1cbn0iXX0=