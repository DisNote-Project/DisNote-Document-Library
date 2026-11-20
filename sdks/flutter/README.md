# DisNote Flutter SDK

The disnote_flutter package provides a typed DisNote document model, validator,
responsive native reader, secure editor bridge, NestJS HTTP client and autosave
session. It supports Web, Android and iOS. Editing uses a separately hosted React
editor through an iframe or WebView.

Current source requires Flutter >=3.50.0 and Dart >=3.13.0 <4.0.0 and uses
material_ui. Version declarations do not confirm registry publication.

## Installation

After publication, run flutter pub add disnote_flutter. During local development,
use a path dependency pointing to DisNote-Document-Library/sdks/flutter.
Import package:disnote_flutter/disnote_flutter.dart.

## Complete documentation

[Frontend Flutter integration and publishing guide](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/FLUTTER.md)
covers installation, parsing, native rendering, React bridge deployment,
Web/Android/iOS setup, NestJS authentication, autosave, conflict handling,
lifecycle, testing and pub.dev releases.

[Architecture](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/ARCHITECTURE.md)
explains the shared contract and platform boundaries.

DisNoteDocumentView renders canonical documents. DisNoteDocumentEditor needs a
trusted editor URL and onDocumentChanged callback. NestJS remains the authority
for access, validation and persistence. Review session conflict semantics before
calling retry or load on unsaved work.

Apache-2.0. See LICENSE and CHANGELOG.md.
