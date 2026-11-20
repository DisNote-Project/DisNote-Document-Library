import 'dart:async';

import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'errors.dart';
import 'model.dart';
import 'validation.dart';

typedef DisNoteIdempotencyKeyFactory = String Function();

enum DisNoteSessionStatus {
  idle,
  loading,
  ready,
  saving,
  conflict,
  failed,
  disposed,
}

final class DisNoteDocumentSession extends ChangeNotifier {
  DisNoteDocumentSession({
    required this.client,
    required this.channelId,
    required this.pageId,
    required this.idempotencyKeyFactory,
    this.saveDelay = const Duration(milliseconds: 750),
  });

  final DisNoteNestClient client;
  final String channelId;
  final String pageId;
  final DisNoteIdempotencyKeyFactory idempotencyKeyFactory;
  final Duration saveDelay;

  DisNoteSessionStatus _status = DisNoteSessionStatus.idle;
  DisNoteDocument? _document;
  int? _revision;
  int? _conflictingRevision;
  Object? _error;
  StackTrace? _errorStackTrace;
  Timer? _saveTimer;
  Future<void>? _activeSave;
  String? _pendingKey;
  int _editGeneration = 0;
  bool _disposed = false;

  DisNoteSessionStatus get status => _status;
  DisNoteDocument? get document => _document;
  int? get revision => _revision;
  int? get conflictingRevision => _conflictingRevision;
  Object? get error => _error;
  StackTrace? get errorStackTrace => _errorStackTrace;
  bool get hasUnsavedChanges => _pendingKey != null;
  bool get canEdit =>
      _status == DisNoteSessionStatus.ready ||
      _status == DisNoteSessionStatus.saving ||
      _status == DisNoteSessionStatus.failed;

  Future<void> load() async {
    _ensureActive();
    _saveTimer?.cancel();
    _transition(DisNoteSessionStatus.loading);
    try {
      final DisNotePageSnapshot snapshot = await client.openPage(
        channelId: channelId,
        pageId: pageId,
      );
      if (_disposed) return;
      _document = snapshot.document;
      _revision = snapshot.revision;
      _conflictingRevision = null;
      _pendingKey = null;
      _error = null;
      _errorStackTrace = null;
      _transition(DisNoteSessionStatus.ready);
    } on Object catch (error, stackTrace) {
      _recordFailure(error, stackTrace);
    }
  }

  void acceptEditorChange(DisNoteDocument next) {
    _ensureActive();
    if (next.id != pageId || !DisNoteValidator.validate(next).isValid) {
      throw ArgumentError.value(
        next,
        'next',
        'must be a valid document for this page',
      );
    }
    if (_revision == null) throw StateError('load the document before editing');
    _document = next;
    _editGeneration += 1;
    _pendingKey = idempotencyKeyFactory();
    _conflictingRevision = null;
    _error = null;
    _errorStackTrace = null;
    if (_status != DisNoteSessionStatus.saving) {
      _transition(DisNoteSessionStatus.ready);
    } else {
      notifyListeners();
    }
    _scheduleSave();
  }

  Future<void> flush() {
    _ensureActive();
    _saveTimer?.cancel();
    final Future<void>? active = _activeSave;
    if (active != null) {
      return () async {
        await active;
        if (_pendingKey != null) await flush();
      }();
    }
    if (_pendingKey == null) return Future<void>.value();
    final Future<void> operation = _saveNow();
    _activeSave = operation;
    return operation.whenComplete(() {
      _activeSave = null;
      if (!_disposed &&
          _pendingKey != null &&
          _status != DisNoteSessionStatus.conflict) {
        _scheduleSave();
      }
    });
  }

  Future<void> retry() async {
    _ensureActive();
    if (_document == null || _revision == null) {
      await load();
      return;
    }
    if (_status == DisNoteSessionStatus.conflict) {
      await load();
      return;
    }
    await flush();
  }

  void adoptServerRevision(int revision) {
    _ensureActive();
    if (_document == null || _pendingKey == null || revision < 1) {
      throw StateError(
        'a pending local document and positive server revision are required',
      );
    }
    _revision = revision;
    _conflictingRevision = null;
    _transition(DisNoteSessionStatus.ready);
    _scheduleSave();
  }

  Future<void> _saveNow() async {
    final DisNoteDocument? currentDocument = _document;
    final int? currentRevision = _revision;
    final String? currentKey = _pendingKey;
    if (currentDocument == null ||
        currentRevision == null ||
        currentKey == null) {
      return;
    }
    final int generation = _editGeneration;
    _transition(DisNoteSessionStatus.saving);
    try {
      final DisNoteSaveResult result = await client.savePage(
        channelId: channelId,
        pageId: pageId,
        document: currentDocument,
        revision: currentRevision,
        idempotencyKey: currentKey,
      );
      if (!result.ok) {
        _conflictingRevision = result.currentRevision;
        _transition(DisNoteSessionStatus.conflict);
        return;
      }
      _revision = result.revision ?? currentRevision;
      if (generation == _editGeneration && currentKey == _pendingKey) {
        _pendingKey = null;
      }
      _error = null;
      _errorStackTrace = null;
      _transition(DisNoteSessionStatus.ready);
    } on DisNoteApiException catch (error, stackTrace) {
      if (error.isConflict) {
        _transition(DisNoteSessionStatus.conflict);
      } else {
        _recordFailure(error, stackTrace);
      }
    } on Object catch (error, stackTrace) {
      _recordFailure(error, stackTrace);
    }
  }

  void _scheduleSave() {
    _saveTimer?.cancel();
    _saveTimer = Timer(saveDelay, () => unawaited(flush()));
  }

  void _recordFailure(Object error, StackTrace stackTrace) {
    _error = error;
    _errorStackTrace = stackTrace;
    _transition(DisNoteSessionStatus.failed);
  }

  void _transition(DisNoteSessionStatus next) {
    if (_disposed) return;
    _status = next;
    notifyListeners();
  }

  void _ensureActive() {
    if (_disposed) throw StateError('document session is disposed');
  }

  @override
  void dispose() {
    if (_disposed) return;
    _saveTimer?.cancel();
    _disposed = true;
    _status = DisNoteSessionStatus.disposed;
    super.dispose();
  }
}
