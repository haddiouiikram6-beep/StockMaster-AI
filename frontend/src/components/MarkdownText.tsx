import React from 'react';
import { View, Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { COLORS } from '../constants/theme';

interface MarkdownTextProps {
  content: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Parses inline markdown tags (**bold**, *italic*, `code`) into styled React Native Text components.
 */
const renderInlineMarkdown = (text: string, baseStyle?: StyleProp<TextStyle>) => {
  if (!text) return null;

  // Regex to match **bold**, *italic*, and `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={index} style={[baseStyle, styles.bold]}>
          {part.slice(2, -2)}
        </Text>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <Text key={index} style={[baseStyle, styles.italic]}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text key={index} style={[baseStyle, styles.code]}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    return (
      <Text key={index} style={baseStyle}>
        {part}
      </Text>
    );
  });
};

/**
 * Native React Native Markdown Parser Component
 * Formats headers, lists, code spans, and bold text into clean, readable mobile typography.
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, style }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        // Empty line -> spacing
        if (!trimmed) {
          return <View key={lineIndex} style={styles.emptyLine} />;
        }

        // Horizontal rule
        if (trimmed === '---' || trimmed === '___' || trimmed === '***') {
          return <View key={lineIndex} style={styles.horizontalRule} />;
        }

        // Heading 1 / 2
        if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return (
            <Text key={lineIndex} style={[styles.heading1, style]}>
              {renderInlineMarkdown(headerText, [styles.heading1, style])}
            </Text>
          );
        }

        // Heading 3 / 4
        if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return (
            <Text key={lineIndex} style={[styles.heading2, style]}>
              {renderInlineMarkdown(headerText, [styles.heading2, style])}
            </Text>
          );
        }

        // Bullet list item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const itemText = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <View key={lineIndex} style={styles.bulletRow}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={[styles.bodyText, style, styles.bulletContent]}>
                {renderInlineMarkdown(itemText, [styles.bodyText, style])}
              </Text>
            </View>
          );
        }

        // Numbered list item
        const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const itemText = numberedMatch[2];
          return (
            <View key={lineIndex} style={styles.bulletRow}>
              <Text style={styles.numberSymbol}>{num}.</Text>
              <Text style={[styles.bodyText, style, styles.bulletContent]}>
                {renderInlineMarkdown(itemText, [styles.bodyText, style])}
              </Text>
            </View>
          );
        }

        // Standard paragraph line
        return (
          <Text key={lineIndex} style={[styles.bodyText, style]}>
            {renderInlineMarkdown(line, [styles.bodyText, style])}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontWeight: '600',
    color: COLORS.primaryBlue,
    backgroundColor: COLORS.infoBg,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontSize: 13,
  },
  heading1: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 22,
  },
  heading2: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 4,
  },
  bulletSymbol: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.primaryBlue,
    fontWeight: '700',
    width: 14,
  },
  numberSymbol: {
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.primaryBlue,
    fontWeight: '700',
    marginRight: 6,
  },
  bulletContent: {
    flex: 1,
  },
  horizontalRule: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 8,
  },
  emptyLine: {
    height: 6,
  },
});

export default MarkdownText;
