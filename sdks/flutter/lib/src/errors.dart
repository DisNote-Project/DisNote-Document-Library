final class DisNoteFormatException implements Exception {
  const DisNoteFormatException(this.message, {this.path = ''});
  final String message;
  final String path;

  @override
  String toString() => path.isEmpty ? message : '$path: $message';
}

final class DisNoteApiException implements Exception {
  const DisNoteApiException(this.statusCode, this.code, this.message);
  final int statusCode;
  final String code;
  final String message;

  bool get isConflict => statusCode == 409;
  bool get isUnauthorized => statusCode == 401 || statusCode == 403;

  @override
  String toString() => 'DisNoteApiException($statusCode, $code, $message)';
}

final class DisNoteBridgeException implements Exception {
  const DisNoteBridgeException(this.message);
  final String message;

  @override
  String toString() => 'DisNoteBridgeException($message)';
}
