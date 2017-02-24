'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = readTemplateLiteral;

var _immutable = require('immutable');

var _readtable = require('readtable');

var _utils = require('./utils');

var _tokenReader = require('./token-reader');

var _tokens = require('../tokens');

function readTemplateLiteral(stream, prefix) {
  let element,
      items = [];
  stream.readString();

  do {
    element = readTemplateElement.call(this, stream);
    items.push(element);
    if (element.interp) {
      element = this.readToken(stream, (0, _immutable.List)(), false);
      items.push(element);
    }
  } while (!element.tail);

  return new _tokens.TemplateToken({
    items: (0, _immutable.List)(items)
  });
}


function readTemplateElement(stream) {
  let char = stream.peek(),
      idx = 0,
      value = '',
      octal = null;
  const startLocation = Object.assign({}, this.locationInfo, stream.sourceInfo);
  while (!(0, _readtable.isEOS)(char)) {
    switch (char) {
      case '`':
        {
          stream.readString(idx);
          const slice = (0, _tokenReader.getSlice)(stream, startLocation);
          stream.readString();
          return new _tokens.TemplateElementToken({
            tail: true,
            interp: false,
            value,
            slice
          });
        }
      case '$':
        {
          if (stream.peek(idx + 1) === '{') {
            stream.readString(idx);
            const slice = (0, _tokenReader.getSlice)(stream, startLocation);
            stream.readString();

            return new _tokens.TemplateElementToken({
              tail: false,
              interp: true,
              value,
              slice
            });
          }
          break;
        }
      case '\\':
        {
          let newVal;
          [newVal, idx, octal] = _utils.readStringEscape.call(this, '', stream, idx, octal);
          if (octal != null) throw this.createILLEGAL(octal);
          value += newVal;
          --idx;
          break;
        }
      default:
        {
          value += char;
        }
    }
    char = stream.peek(++idx);
  }
  throw this.createILLEGAL(char);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9yZWFkZXIvcmVhZC10ZW1wbGF0ZS5qcyJdLCJuYW1lcyI6WyJyZWFkVGVtcGxhdGVMaXRlcmFsIiwic3RyZWFtIiwicHJlZml4IiwiZWxlbWVudCIsIml0ZW1zIiwicmVhZFN0cmluZyIsInJlYWRUZW1wbGF0ZUVsZW1lbnQiLCJjYWxsIiwicHVzaCIsImludGVycCIsInJlYWRUb2tlbiIsInRhaWwiLCJjaGFyIiwicGVlayIsImlkeCIsInZhbHVlIiwib2N0YWwiLCJzdGFydExvY2F0aW9uIiwiT2JqZWN0IiwiYXNzaWduIiwibG9jYXRpb25JbmZvIiwic291cmNlSW5mbyIsInNsaWNlIiwibmV3VmFsIiwiY3JlYXRlSUxMRUdBTCJdLCJtYXBwaW5ncyI6Ijs7Ozs7a0JBVXdCQSxtQjs7QUFUeEI7O0FBR0E7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBRWUsU0FBU0EsbUJBQVQsQ0FBNkJDLE1BQTdCLEVBQWlEQyxNQUFqRCxFQUFtRjtBQUNoRyxNQUFJQyxPQUFKO0FBQUEsTUFBYUMsUUFBUSxFQUFyQjtBQUNBSCxTQUFPSSxVQUFQOztBQUVBLEtBQUc7QUFDREYsY0FBVUcsb0JBQW9CQyxJQUFwQixDQUF5QixJQUF6QixFQUErQk4sTUFBL0IsQ0FBVjtBQUNBRyxVQUFNSSxJQUFOLENBQVdMLE9BQVg7QUFDQSxRQUFJQSxRQUFRTSxNQUFaLEVBQW9CO0FBQ2xCTixnQkFBVSxLQUFLTyxTQUFMLENBQWVULE1BQWYsRUFBdUIsc0JBQXZCLEVBQStCLEtBQS9CLENBQVY7QUFDQUcsWUFBTUksSUFBTixDQUFXTCxPQUFYO0FBQ0Q7QUFDRixHQVBELFFBT1EsQ0FBQ0EsUUFBUVEsSUFQakI7O0FBU0EsU0FBTywwQkFBa0I7QUFDdkJQLFdBQU8scUJBQUtBLEtBQUw7QUFEZ0IsR0FBbEIsQ0FBUDtBQUdEOzs7QUFFRCxTQUFTRSxtQkFBVCxDQUE2QkwsTUFBN0IsRUFBdUU7QUFDckUsTUFBSVcsT0FBT1gsT0FBT1ksSUFBUCxFQUFYO0FBQUEsTUFBMEJDLE1BQU0sQ0FBaEM7QUFBQSxNQUFtQ0MsUUFBUSxFQUEzQztBQUFBLE1BQStDQyxRQUFRLElBQXZEO0FBQ0EsUUFBTUMsZ0JBQWdCQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQixLQUFLQyxZQUF2QixFQUFxQ25CLE9BQU9vQixVQUE1QyxDQUF0QjtBQUNBLFNBQU8sQ0FBQyxzQkFBTVQsSUFBTixDQUFSLEVBQXFCO0FBQ25CLFlBQVFBLElBQVI7QUFDRSxXQUFLLEdBQUw7QUFBVTtBQUNSWCxpQkFBT0ksVUFBUCxDQUFrQlMsR0FBbEI7QUFDQSxnQkFBTVEsUUFBUSwyQkFBU3JCLE1BQVQsRUFBaUJnQixhQUFqQixDQUFkO0FBQ0FoQixpQkFBT0ksVUFBUDtBQUNBLGlCQUFPLGlDQUF5QjtBQUM5Qk0sa0JBQU0sSUFEd0I7QUFFOUJGLG9CQUFRLEtBRnNCO0FBRzlCTSxpQkFIOEI7QUFJOUJPO0FBSjhCLFdBQXpCLENBQVA7QUFNRDtBQUNELFdBQUssR0FBTDtBQUFVO0FBQ1IsY0FBSXJCLE9BQU9ZLElBQVAsQ0FBWUMsTUFBSSxDQUFoQixNQUF1QixHQUEzQixFQUFnQztBQUM5QmIsbUJBQU9JLFVBQVAsQ0FBa0JTLEdBQWxCO0FBQ0Esa0JBQU1RLFFBQVEsMkJBQVNyQixNQUFULEVBQWlCZ0IsYUFBakIsQ0FBZDtBQUNBaEIsbUJBQU9JLFVBQVA7O0FBRUEsbUJBQU8saUNBQXlCO0FBQzlCTSxvQkFBTSxLQUR3QjtBQUU5QkYsc0JBQVEsSUFGc0I7QUFHOUJNLG1CQUg4QjtBQUk5Qk87QUFKOEIsYUFBekIsQ0FBUDtBQU1EO0FBQ0Q7QUFDRDtBQUNELFdBQUssSUFBTDtBQUFXO0FBQ1QsY0FBSUMsTUFBSjtBQUNBLFdBQUNBLE1BQUQsRUFBU1QsR0FBVCxFQUFjRSxLQUFkLElBQXVCLHdCQUFpQlQsSUFBakIsQ0FBc0IsSUFBdEIsRUFBNEIsRUFBNUIsRUFBZ0NOLE1BQWhDLEVBQXdDYSxHQUF4QyxFQUE2Q0UsS0FBN0MsQ0FBdkI7QUFDQSxjQUFJQSxTQUFTLElBQWIsRUFBbUIsTUFBTSxLQUFLUSxhQUFMLENBQW1CUixLQUFuQixDQUFOO0FBQ25CRCxtQkFBU1EsTUFBVDtBQUNBLFlBQUVULEdBQUY7QUFDQTtBQUNEO0FBQ0Q7QUFBUztBQUNQQyxtQkFBU0gsSUFBVDtBQUNEO0FBckNIO0FBdUNBQSxXQUFPWCxPQUFPWSxJQUFQLENBQVksRUFBRUMsR0FBZCxDQUFQO0FBQ0Q7QUFDRCxRQUFNLEtBQUtVLGFBQUwsQ0FBbUJaLElBQW5CLENBQU47QUFDRCIsImZpbGUiOiJyZWFkLXRlbXBsYXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQGZsb3dcbmltcG9ydCB7IExpc3QgfSBmcm9tICdpbW11dGFibGUnO1xuXG5pbXBvcnQgdHlwZSB7IENoYXJTdHJlYW0gfSBmcm9tICdyZWFkdGFibGUnO1xuaW1wb3J0IHsgaXNFT1MgfSBmcm9tICdyZWFkdGFibGUnO1xuXG5pbXBvcnQgeyByZWFkU3RyaW5nRXNjYXBlIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBnZXRTbGljZSB9IGZyb20gJy4vdG9rZW4tcmVhZGVyJztcbmltcG9ydCB7IFRlbXBsYXRlVG9rZW4sIFRlbXBsYXRlRWxlbWVudFRva2VuIH0gZnJvbSAnLi4vdG9rZW5zJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVhZFRlbXBsYXRlTGl0ZXJhbChzdHJlYW06IENoYXJTdHJlYW0sIHByZWZpeDogTGlzdDxhbnk+KTogVGVtcGxhdGVUb2tlbiB7XG4gIGxldCBlbGVtZW50LCBpdGVtcyA9IFtdO1xuICBzdHJlYW0ucmVhZFN0cmluZygpO1xuXG4gIGRvIHtcbiAgICBlbGVtZW50ID0gcmVhZFRlbXBsYXRlRWxlbWVudC5jYWxsKHRoaXMsIHN0cmVhbSk7XG4gICAgaXRlbXMucHVzaChlbGVtZW50KTtcbiAgICBpZiAoZWxlbWVudC5pbnRlcnApIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLnJlYWRUb2tlbihzdHJlYW0sIExpc3QoKSwgZmFsc2UpO1xuICAgICAgaXRlbXMucHVzaChlbGVtZW50KTtcbiAgICB9XG4gIH0gd2hpbGUoIWVsZW1lbnQudGFpbCk7XG5cbiAgcmV0dXJuIG5ldyBUZW1wbGF0ZVRva2VuKHtcbiAgICBpdGVtczogTGlzdChpdGVtcylcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRUZW1wbGF0ZUVsZW1lbnQoc3RyZWFtOiBDaGFyU3RyZWFtKTogVGVtcGxhdGVFbGVtZW50VG9rZW4ge1xuICBsZXQgY2hhciA9IHN0cmVhbS5wZWVrKCksIGlkeCA9IDAsIHZhbHVlID0gJycsIG9jdGFsID0gbnVsbDtcbiAgY29uc3Qgc3RhcnRMb2NhdGlvbiA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMubG9jYXRpb25JbmZvLCBzdHJlYW0uc291cmNlSW5mbyk7XG4gIHdoaWxlICghaXNFT1MoY2hhcikpIHtcbiAgICBzd2l0Y2ggKGNoYXIpIHtcbiAgICAgIGNhc2UgJ2AnOiB7XG4gICAgICAgIHN0cmVhbS5yZWFkU3RyaW5nKGlkeCk7XG4gICAgICAgIGNvbnN0IHNsaWNlID0gZ2V0U2xpY2Uoc3RyZWFtLCBzdGFydExvY2F0aW9uKTtcbiAgICAgICAgc3RyZWFtLnJlYWRTdHJpbmcoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBUZW1wbGF0ZUVsZW1lbnRUb2tlbih7XG4gICAgICAgICAgdGFpbDogdHJ1ZSxcbiAgICAgICAgICBpbnRlcnA6IGZhbHNlLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIHNsaWNlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnJCc6IHtcbiAgICAgICAgaWYgKHN0cmVhbS5wZWVrKGlkeCsxKSA9PT0gJ3snKSB7XG4gICAgICAgICAgc3RyZWFtLnJlYWRTdHJpbmcoaWR4KTtcbiAgICAgICAgICBjb25zdCBzbGljZSA9IGdldFNsaWNlKHN0cmVhbSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICAgICAgc3RyZWFtLnJlYWRTdHJpbmcoKTtcblxuICAgICAgICAgIHJldHVybiBuZXcgVGVtcGxhdGVFbGVtZW50VG9rZW4oe1xuICAgICAgICAgICAgdGFpbDogZmFsc2UsXG4gICAgICAgICAgICBpbnRlcnA6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIHNsaWNlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlICdcXFxcJzoge1xuICAgICAgICBsZXQgbmV3VmFsO1xuICAgICAgICBbbmV3VmFsLCBpZHgsIG9jdGFsXSA9IHJlYWRTdHJpbmdFc2NhcGUuY2FsbCh0aGlzLCAnJywgc3RyZWFtLCBpZHgsIG9jdGFsKTtcbiAgICAgICAgaWYgKG9jdGFsICE9IG51bGwpIHRocm93IHRoaXMuY3JlYXRlSUxMRUdBTChvY3RhbCk7XG4gICAgICAgIHZhbHVlICs9IG5ld1ZhbDtcbiAgICAgICAgLS1pZHg7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICB2YWx1ZSArPSBjaGFyO1xuICAgICAgfVxuICAgIH1cbiAgICBjaGFyID0gc3RyZWFtLnBlZWsoKytpZHgpO1xuICB9XG4gIHRocm93IHRoaXMuY3JlYXRlSUxMRUdBTChjaGFyKTtcbn1cbiJdfQ==