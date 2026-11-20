import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'model.dart';

String disNoteCanonicalJson(Object? value) => jsonEncode(_sort(value));

String disNoteChecksum(DisNoteDocument document) => sha256
    .convert(utf8.encode(disNoteCanonicalJson(document.toJson())))
    .toString();

Object? _sort(Object? value) {
  if (value is List<Object?>) {
    return value.map<Object?>(_sort).toList(growable: false);
  }
  if (value is Map<String, Object?>) {
    final List<String> keys = value.keys.toList()..sort();
    return <String, Object?>{
      for (final String key in keys) key: _sort(value[key]),
    };
  }
  return value;
}
