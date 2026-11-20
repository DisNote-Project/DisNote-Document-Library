import 'package:http/http.dart' as http;

import 'api_client.dart';

final class DisNotePackageHttpTransport implements DisNoteHttpTransport {
  DisNotePackageHttpTransport({
    http.Client? client,
    this.timeout = const Duration(seconds: 30),
  }) : _client = client ?? http.Client(),
       _ownsClient = client == null;

  final http.Client _client;
  final bool _ownsClient;
  final Duration timeout;

  @override
  Future<DisNoteHttpResponse> send(DisNoteHttpRequest request) async {
    final http.Request outgoing = http.Request(
      request.method.name.toUpperCase(),
      request.uri,
    )..headers.addAll(request.headers);
    if (request.body != null) outgoing.body = request.body!;
    final http.StreamedResponse response = await _client
        .send(outgoing)
        .timeout(timeout);
    return DisNoteHttpResponse(
      response.statusCode,
      await response.stream.bytesToString(),
      headers: response.headers,
    );
  }

  void close() {
    if (_ownsClient) _client.close();
  }
}
