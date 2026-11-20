import 'package:material_ui/material_ui.dart';

import 'constants.dart';
import 'localization.dart';
import 'model.dart';

typedef DisNoteBlockBuilder = Widget Function(
  BuildContext context,
  DisNoteBlock block,
);
typedef DisNoteLinkTap = void Function(Uri uri);
typedef DisNoteAssetResolver = Uri? Function(String assetId);
typedef DisNoteBlockTap = void Function(DisNoteBlock block);

@immutable
final class DisNoteRendererTheme {
  const DisNoteRendererTheme({
    this.padding = const EdgeInsets.all(16),
    this.blockSpacing = 8,
    this.childIndent = 16,
    this.columnBreakpoint = 600,
    this.textStyle,
    this.headingStyles = const <int, TextStyle>{},
    this.quoteDecoration,
    this.codeDecoration,
    this.cardDecoration,
    this.maxContentWidth = 920,
  });

  final EdgeInsetsGeometry padding;
  final double blockSpacing;
  final double childIndent;
  final double columnBreakpoint;
  final TextStyle? textStyle;
  final Map<int, TextStyle> headingStyles;
  final Decoration? quoteDecoration;
  final Decoration? codeDecoration;
  final Decoration? cardDecoration;
  final double maxContentWidth;
}

final class DisNoteDocumentView extends StatelessWidget {
  const DisNoteDocumentView({
    required this.document,
    this.theme = const DisNoteRendererTheme(),
    this.blockBuilders = const <String, DisNoteBlockBuilder>{},
    this.onLinkTap,
    this.assetResolver,
    this.onBlockTap,
    this.messages,
    this.locale,
    this.scrollable = true,
    this.controller,
    this.physics,
    this.shrinkWrap = false,
    super.key,
  });

  final DisNoteDocument document;
  final DisNoteRendererTheme theme;
  final Map<String, DisNoteBlockBuilder> blockBuilders;
  final DisNoteLinkTap? onLinkTap;
  final DisNoteAssetResolver? assetResolver;
  final DisNoteBlockTap? onBlockTap;
  final DisNoteMessages? messages;
  final String? locale;
  final bool scrollable;
  final ScrollController? controller;
  final ScrollPhysics? physics;
  final bool shrinkWrap;

  DisNoteMessages get _messages =>
      messages ??
      DisNoteMessages.forLocale(
        locale ?? document.metadata.locale ?? DisNoteLocales.english,
      );

  @override
  Widget build(BuildContext context) {
    final Widget body = LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final double width = constraints.maxWidth.isFinite
            ? constraints.maxWidth.clamp(0, theme.maxContentWidth).toDouble()
            : theme.maxContentWidth;
        final List<Widget> blocks = _renderBlocks(
          context,
          document.blocks,
          0,
          width,
        );
        final Widget content = scrollable
            ? ListView(
                controller: controller,
                physics: physics,
                shrinkWrap: shrinkWrap,
                padding: theme.padding,
                children: blocks,
              )
            : Padding(
                padding: theme.padding,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: blocks,
                ),
              );
        return Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: theme.maxContentWidth),
            child: content,
          ),
        );
      },
    );
    return SelectionArea(child: body);
  }

  List<Widget> _renderBlocks(
    BuildContext context,
    List<DisNoteBlock> blocks,
    int depth,
    double availableWidth,
  ) => <Widget>[
    for (int index = 0; index < blocks.length; index += 1)
      Padding(
        key: ValueKey<String>(blocks[index].id),
        padding: EdgeInsets.only(
          left: depth == 0 ? 0 : theme.childIndent,
          bottom: theme.blockSpacing,
        ),
        child: _blockWithChildren(
          context,
          blocks[index],
          depth,
          availableWidth,
          index,
        ),
      ),
  ];

  Widget _blockWithChildren(
    BuildContext context,
    DisNoteBlock block,
    int depth,
    double availableWidth,
    int index,
  ) {
    final Widget rendered =
        blockBuilders[block.type]?.call(context, block) ??
        _standardBlock(context, block, depth, availableWidth, index);
    final bool ownsChildren = <String>{
      DisNoteBlockType.toggle,
      DisNoteBlockType.callout,
      DisNoteBlockType.syncedBlock,
      DisNoteBlockType.toggleHeading1,
      DisNoteBlockType.toggleHeading2,
      DisNoteBlockType.toggleHeading3,
      DisNoteBlockType.columnList,
      DisNoteBlockType.column,
    }.contains(block.type);
    final Widget interactive = onBlockTap == null
        ? rendered
        : InkWell(onTap: () => onBlockTap!(block), child: rendered);
    if (block.children.isEmpty || ownsChildren) return interactive;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        interactive,
        ..._renderBlocks(context, block.children, depth + 1, availableWidth),
      ],
    );
  }

  Widget _standardBlock(
    BuildContext context,
    DisNoteBlock block,
    int depth,
    double availableWidth,
    int index,
  ) {
    final Widget inline = _inline(context, block.content);
    switch (block.type) {
      case DisNoteBlockType.paragraph:
        return inline;
      case DisNoteBlockType.heading:
        return _heading(context, inline, _intProp(block, 'level', 1));
      case DisNoteBlockType.bulletListItem:
        return _leadingLine(const Text('•'), inline);
      case DisNoteBlockType.numberedListItem:
        return _leadingLine(
          Text('${_intProp(block, 'index', index + 1)}.'),
          inline,
        );
      case DisNoteBlockType.checklistItem:
        final bool checked = block.props['checked'] == true;
        return Semantics(
          checked: checked,
          label: checked ? _messages.checked : _messages.notChecked,
          child: _leadingLine(
            Icon(
              checked ? Icons.check_box : Icons.check_box_outline_blank,
              size: 20,
            ),
            inline,
          ),
        );
      case DisNoteBlockType.toggle:
        return _toggle(context, block, inline, depth, availableWidth);
      case DisNoteBlockType.quote:
        return Container(
          decoration:
              theme.quoteDecoration ??
              const BoxDecoration(
                border: Border(
                  left: BorderSide(width: 3, color: Colors.blueGrey),
                ),
              ),
          padding: const EdgeInsets.only(left: 12),
          child: inline,
        );
      case DisNoteBlockType.codeBlock:
        return _code(context, _stringProp(block, 'code'));
      case DisNoteBlockType.divider:
        return const Divider();
      case DisNoteBlockType.callout:
        return _card(
          context,
          block,
          inline,
          depth,
          availableWidth,
          icon: Icons.info_outline,
        );
      case DisNoteBlockType.image:
        return _image(context, block);
      case DisNoteBlockType.table:
        return _table(context, block);
      case DisNoteBlockType.math:
        return _code(context, _stringProp(block, 'code'), centered: true);
      case DisNoteBlockType.tableOfContents:
        return _tableOfContents(context);
      case DisNoteBlockType.breadcrumb:
        return Semantics(
          label: _messages.breadcrumb,
          child: Text(_messages.unavailable),
        );
      case DisNoteBlockType.syncedBlock:
        return _card(
          context,
          block,
          inline,
          depth,
          availableWidth,
          label: _messages.syncedContent,
          icon: Icons.sync,
        );
      case DisNoteBlockType.templateButton:
        return OutlinedButton.icon(
          onPressed: onBlockTap == null ? null : () => onBlockTap!(block),
          icon: const Icon(Icons.play_arrow),
          label: Text(_stringProp(block, 'label', _messages.templateButton)),
        );
      case DisNoteBlockType.toggleHeading1:
      case DisNoteBlockType.toggleHeading2:
      case DisNoteBlockType.toggleHeading3:
        final int level = block.type == DisNoteBlockType.toggleHeading1
            ? 1
            : block.type == DisNoteBlockType.toggleHeading2
            ? 2
            : 3;
        return _toggle(
          context,
          block,
          _heading(context, inline, level),
          depth,
          availableWidth,
        );
      case DisNoteBlockType.bookmark:
        return _bookmark(context, block);
      case DisNoteBlockType.video:
      case DisNoteBlockType.audio:
      case DisNoteBlockType.file:
        return _media(context, block);
      case DisNoteBlockType.columnList:
        return _columns(context, block, depth, availableWidth);
      case DisNoteBlockType.column:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _renderBlocks(
            context,
            block.children,
            depth + 1,
            availableWidth,
          ),
        );
      case DisNoteBlockType.tableDb:
      case DisNoteBlockType.board:
      case DisNoteBlockType.listDb:
      case DisNoteBlockType.gallery:
      case DisNoteBlockType.calendar:
      case DisNoteBlockType.timeline:
      case DisNoteBlockType.map:
        return _database(context, block);
      case DisNoteBlockType.diagram:
        return _placeholderCard(
          context,
          Icons.account_tree_outlined,
          _messages.diagram,
          _stringProp(block, 'code'),
        );
      default:
        return _placeholderCard(
          context,
          Icons.extension_off,
          _messages.unknownBlock,
          block.type,
        );
    }
  }

  Widget _heading(BuildContext context, Widget child, int rawLevel) {
    final int level = rawLevel.clamp(1, 3).toInt();
    final TextStyle? fallback = switch (level) {
      1 => Theme.of(context).textTheme.headlineMedium,
      2 => Theme.of(context).textTheme.headlineSmall,
      _ => Theme.of(context).textTheme.titleLarge,
    };
    return DefaultTextStyle.merge(
      style: theme.headingStyles[level] ?? fallback,
      child: child,
    );
  }

  Widget _leadingLine(Widget leading, Widget body) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      SizedBox(width: 28, child: Center(child: leading)),
      Expanded(child: body),
    ],
  );

  Widget _toggle(
    BuildContext context,
    DisNoteBlock block,
    Widget title,
    int depth,
    double availableWidth,
  ) => Theme(
    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
    child: ExpansionTile(
      tilePadding: EdgeInsets.zero,
      childrenPadding: EdgeInsets.only(left: theme.childIndent),
      initiallyExpanded: true,
      title: title,
      children: _renderBlocks(
        context,
        block.children,
        depth + 1,
        availableWidth,
      ),
    ),
  );

  Widget _code(BuildContext context, String code, {bool centered = false}) =>
      Container(
        width: double.infinity,
        decoration:
            theme.codeDecoration ??
            BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
        padding: const EdgeInsets.all(12),
        child: SelectableText(
          code,
          textAlign: centered ? TextAlign.center : TextAlign.start,
          style: const TextStyle(fontFamily: 'monospace'),
        ),
      );

  Widget _card(
    BuildContext context,
    DisNoteBlock block,
    Widget inline,
    int depth,
    double availableWidth, {
    String? label,
    IconData? icon,
  }) => Container(
    decoration:
        theme.cardDecoration ??
        BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
    padding: const EdgeInsets.all(12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (label != null || icon != null)
          Row(
            children: <Widget>[
              if (icon != null) Icon(icon, size: 18),
              if (icon != null && label != null) const SizedBox(width: 6),
              if (label != null)
                Text(label, style: Theme.of(context).textTheme.labelMedium),
            ],
          ),
        inline,
        ..._renderBlocks(context, block.children, depth + 1, availableWidth),
      ],
    ),
  );

  Widget _image(BuildContext context, DisNoteBlock block) {
    final Uri? uri = _assetUri(block);
    final String alt = _stringProp(block, 'alt', _messages.imageUnavailable);
    final String caption = _stringProp(block, 'caption');
    return Semantics(
      image: true,
      label: alt,
      child: Column(
        children: <Widget>[
          if (uri == null)
            _placeholderCard(
              context,
              Icons.broken_image_outlined,
              _messages.imageUnavailable,
              alt,
            )
          else
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.network(
                uri.toString(),
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => _placeholderCard(
                  context,
                  Icons.broken_image_outlined,
                  _messages.imageUnavailable,
                  alt,
                ),
              ),
            ),
          if (caption.isNotEmpty) ...<Widget>[
            const SizedBox(height: 4),
            Text(
              caption,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  Widget _table(BuildContext context, DisNoteBlock block) {
    final Object? rawRows = block.props['rows'];
    if (rawRows is! List<Object?>) {
      return _placeholderCard(
        context,
        Icons.table_chart,
        _messages.unavailable,
        '',
      );
    }
    final List<List<Object?>> parsedRows = <List<Object?>>[];
    for (final Object? rawRow in rawRows) {
      if (rawRow is! Map<Object?, Object?> ||
          rawRow['cells'] is! List<Object?>) {
        continue;
      }
      parsedRows.add(rawRow['cells']! as List<Object?>);
    }
    if (parsedRows.isEmpty) {
      return _placeholderCard(
        context,
        Icons.table_chart,
        _messages.unavailable,
        '',
      );
    }
    final int columnCount = parsedRows
        .map((List<Object?> row) => row.length)
        .fold<int>(0, (int a, int b) => a > b ? a : b);
    if (columnCount == 0) {
      return _placeholderCard(
        context,
        Icons.table_chart,
        _messages.unavailable,
        '',
      );
    }
    final List<TableRow> rows = <TableRow>[
      for (final List<Object?> cells in parsedRows)
        TableRow(
          children: <Widget>[
            for (int index = 0; index < columnCount; index += 1)
              Padding(
                padding: const EdgeInsets.all(8),
                child: _inline(
                  context,
                  index < cells.length
                      ? _parseInlineList(cells[index])
                      : const <DisNoteInline>[],
                ),
              ),
          ],
        ),
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Table(
        defaultColumnWidth: const IntrinsicColumnWidth(flex: 1),
        border: TableBorder.all(
          color: Theme.of(context).colorScheme.outlineVariant,
        ),
        children: rows,
      ),
    );
  }

  Widget _tableOfContents(BuildContext context) {
    final List<({String id, int level, String text})> headings =
        <({String id, int level, String text})>[];
    void collect(List<DisNoteBlock> blocks) {
      for (final DisNoteBlock block in blocks) {
        if (block.type == DisNoteBlockType.heading) {
          headings.add((
            id: block.id,
            level: _intProp(block, 'level', 1),
            text: _plainText(block.content),
          ));
        }
        collect(block.children);
      }
    }

    collect(document.blocks);
    return _surface(
      context,
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            _messages.tableOfContents,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          if (headings.isEmpty) Text(_messages.noHeadings),
          for (final heading in headings)
            Padding(
              padding: EdgeInsets.only(
                left: (heading.level - 1).clamp(0, 2).toDouble() * 16,
                top: 3,
              ),
              child: Text(
                heading.text.isEmpty ? _messages.untitledHeading : heading.text,
              ),
            ),
        ],
      ),
    );
  }

  Widget _bookmark(BuildContext context, DisNoteBlock block) {
    final Uri? uri = _safeUri(_stringProp(block, 'url'));
    final String title = _stringProp(block, 'title', _messages.openLink);
    final String description = _stringProp(block, 'description');
    return Semantics(
      link: uri != null,
      child: _surface(
        context,
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.bookmark_outline),
          title: Text(title),
          subtitle: description.isEmpty ? null : Text(description),
          trailing: uri == null ? null : const Icon(Icons.open_in_new),
          onTap: uri == null || onLinkTap == null
              ? null
              : () => onLinkTap!(uri),
        ),
      ),
    );
  }

  Widget _media(BuildContext context, DisNoteBlock block) {
    final Uri? uri = _assetUri(block);
    final String name = _stringProp(block, 'name', _messages.attachment);
    final IconData icon = switch (block.type) {
      DisNoteBlockType.video => Icons.videocam_outlined,
      DisNoteBlockType.audio => Icons.audio_file_outlined,
      _ => Icons.attach_file,
    };
    return _surface(
      context,
      ListTile(
        contentPadding: EdgeInsets.zero,
        leading: Icon(icon),
        title: Text(name),
        subtitle: Text(
          uri == null ? _messages.mediaUnavailable : _messages.download,
        ),
        onTap: uri == null || onLinkTap == null ? null : () => onLinkTap!(uri),
      ),
    );
  }

  Widget _columns(
    BuildContext context,
    DisNoteBlock block,
    int depth,
    double availableWidth,
  ) {
    final bool stacked = availableWidth < theme.columnBreakpoint;
    final List<Widget> columns = <Widget>[
      for (final DisNoteBlock column in block.children)
        SizedBox(
          width: stacked
              ? availableWidth
              : availableWidth *
                    (_doubleProp(column, 'width', 1 / block.children.length)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _renderBlocks(
              context,
              column.children,
              depth + 1,
              availableWidth,
            ),
          ),
        ),
    ];
    if (stacked) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          for (int index = 0; index < columns.length; index += 1) ...<Widget>[
            columns[index],
            if (index < columns.length - 1) const SizedBox(height: 12),
          ],
        ],
      );
    }
    return Wrap(spacing: 16, runSpacing: 12, children: columns);
  }

  Widget _database(BuildContext context, DisNoteBlock block) =>
      _placeholderCard(
        context,
        Icons.dataset_outlined,
        _stringProp(block, 'title', _messages.database),
        block.type,
      );

  Widget _placeholderCard(
    BuildContext context,
    IconData icon,
    String title,
    String detail,
  ) => _surface(
    context,
    ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(title),
      subtitle: detail.isEmpty ? null : Text(detail),
    ),
  );

  Widget _surface(BuildContext context, Widget child) => Container(
    decoration:
        theme.cardDecoration ??
        BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
    child: child,
  );

  Widget _inline(BuildContext context, List<DisNoteInline> content) {
    final TextStyle base =
        theme.textStyle ?? DefaultTextStyle.of(context).style;
    return Text.rich(
      TextSpan(
        style: base,
        children: content
            .map<InlineSpan>(
              (DisNoteInline inline) => _span(context, inline, base),
            )
            .toList(),
      ),
    );
  }

  InlineSpan _span(BuildContext context, DisNoteInline inline, TextStyle base) {
    switch (inline) {
      case DisNoteText(:final text, :final marks):
        return TextSpan(text: text, style: _markStyle(base, marks));
      case DisNoteLink(:final href, :final content):
        final Uri? uri = _safeUri(href);
        return WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: Semantics(
            link: true,
            label: _messages.openLink,
            child: InkWell(
              onTap: uri == null || onLinkTap == null
                  ? null
                  : () => onLinkTap!(uri),
              child: Text(
                content.map((DisNoteText text) => text.text).join(),
                style: base.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ),
        );
      case DisNoteMention(:final label):
        return TextSpan(
          text: '@$label',
          style: base.copyWith(color: Theme.of(context).colorScheme.primary),
        );
      case DisNoteReference(:final label):
        return TextSpan(
          text: label,
          style: base.copyWith(fontWeight: FontWeight.w600),
        );
    }
  }

  TextStyle _markStyle(TextStyle style, List<DisNoteMark> marks) {
    TextStyle result = style;
    for (final DisNoteMark mark in marks) {
      result = switch (mark.type) {
        DisNoteMarkType.bold => result.copyWith(fontWeight: FontWeight.bold),
        DisNoteMarkType.italic => result.copyWith(fontStyle: FontStyle.italic),
        DisNoteMarkType.underline => result.copyWith(
          decoration: TextDecoration.underline,
        ),
        DisNoteMarkType.strike => result.copyWith(
          decoration: TextDecoration.lineThrough,
        ),
        DisNoteMarkType.code => result.copyWith(fontFamily: 'monospace'),
        DisNoteMarkType.textColor => result.copyWith(
          color: _parseHexColor(mark.value) ?? result.color,
        ),
        DisNoteMarkType.backgroundColor => result.copyWith(
          backgroundColor: _parseHexColor(mark.value) ?? result.backgroundColor,
        ),
        _ => result,
      };
    }
    return result;
  }

  Uri? _assetUri(DisNoteBlock block) {
    final String assetId = _stringProp(block, 'assetId');
    final Uri? resolved = assetId.isEmpty ? null : assetResolver?.call(assetId);
    if (resolved != null &&
        <String>{'https', 'http'}.contains(resolved.scheme)) {
      return resolved;
    }
    return _safeUri(
      _stringProp(block, 'url'),
      allowedSchemes: const <String>{'https', 'http'},
    );
  }

  Uri? _safeUri(
    String value, {
    Set<String> allowedSchemes = const <String>{
      'https',
      'http',
      'mailto',
      'tel',
    },
  }) {
    final Uri? uri = Uri.tryParse(value.trim());
    if (uri == null || !allowedSchemes.contains(uri.scheme)) return null;
    return uri;
  }
}

String _stringProp(DisNoteBlock block, String key, [String fallback = '']) =>
    block.props[key] is String ? block.props[key]! as String : fallback;

int _intProp(DisNoteBlock block, String key, int fallback) =>
    block.props[key] is int ? block.props[key]! as int : fallback;

double _doubleProp(DisNoteBlock block, String key, double fallback) =>
    block.props[key] is num ? (block.props[key]! as num).toDouble() : fallback;

String _plainText(List<DisNoteInline> content) => content
    .map(
      (DisNoteInline inline) => switch (inline) {
        DisNoteText(:final text) => text,
        DisNoteLink(:final content) =>
          content.map((DisNoteText text) => text.text).join(),
        DisNoteMention(:final label) => '@$label',
        DisNoteReference(:final label) => label,
      },
    )
    .join();

List<DisNoteInline> _parseInlineList(Object? value) {
  if (value is! List<Object?>) return const <DisNoteInline>[];
  final List<DisNoteInline> result = <DisNoteInline>[];
  for (final Object? item in value) {
    if (item is! Map<Object?, Object?>) continue;
    try {
      result.add(
        DisNoteInline.fromJson(
          item.map<String, Object?>(
            (Object? key, Object? value) =>
                MapEntry<String, Object?>(key.toString(), value),
          ),
        ),
      );
    } on Object {
      continue;
    }
  }
  return result;
}

Color? _parseHexColor(String? value) {
  if (value == null) return null;
  final String normalized = value.trim().replaceFirst('#', '');
  if (!RegExp(r'^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$').hasMatch(normalized)) {
    return null;
  }
  final String argb = normalized.length == 6
      ? 'FF$normalized'
      : '${normalized.substring(6)}${normalized.substring(0, 6)}';
  return Color(int.parse(argb, radix: 16));
}
