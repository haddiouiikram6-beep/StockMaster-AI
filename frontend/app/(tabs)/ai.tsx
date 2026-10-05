import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../src/components/AppHeader';
import { ChatBubble } from '../../src/components/ChatBubble';
import { SuggestionChip } from '../../src/components/SuggestionChip';
import { sendChatMessage } from '../../src/services/aiStream';
import { Message, ReorderRecommendation } from '../../src/types';
import { COLORS, SHADOWS } from '../../src/constants/theme';

export default function AIAssistantScreen() {
  const scrollViewRef = useRef<ScrollView>(null);

  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingTools, setStreamingTools] = useState<string[]>([]);

  // Preload initial messages from reference design so screen starts visually stunning
  const [messages, setMessages] = useState<
    Array<{ message: Message; recommendations?: ReorderRecommendation[] }>
  >([
    {
      message: {
        role: 'user',
        content: 'Quels produits sont en rupture de stock ou presque ?',
      },
    },
    {
      message: {
        role: 'assistant',
        content:
          '3 produits sont actuellement en dessous de leur niveau de stock minimum :\n\n• Hub USB-C multi-ports 7-en-1 (2 / 8 unités) [Critique]\n• Chaise de bureau ergonomique (5 / 10 unités) [Stock faible]\n• Souris ergonomique sans fil (3 / 10 unités) [Stock faible]',
        toolsExecuted: ['getLowStockProducts'],
      },
    },
    {
      message: {
        role: 'user',
        content: 'Que dois-je recommander ?',
      },
    },
    {
      message: {
        role: 'assistant',
        content: 'Voici mes recommandations de réapprovisionnement basées sur votre vitesse de vente actuelle et les délais des fournisseurs :',
        toolsExecuted: ['recommendReorder'],
      },
      recommendations: [
        {
          productName: 'USB-C 4K Monitor Cable 2m',
          currentStock: 2,
          minStock: 20,
          recommendedOrder: 50,
          priority: 'CRITICAL',
          estimatedCost: 450.0,
          supplier: 'TechCorp Logistics',
        },
        {
          productName: 'Ergonomic Desk Mesh Chair',
          currentStock: 5,
          minStock: 10,
          recommendedOrder: 15,
          priority: 'HIGH',
          estimatedCost: 1250.0,
          supplier: 'Global Office Essentials',
        },
      ],
    },
  ]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, streamingText]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isGenerating) return;

    setInputText('');
    setIsGenerating(true);
    setStreamingText('');
    setStreamingTools([]);

    // Add user message to thread
    const newMsg: Message = {
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, { message: newMsg }]);

    sendChatMessage({
      message: text,
      conversationId,
      onChunk: (chunk) => {
        setStreamingText((prev) => prev + chunk);
      },
      onToolsExecuted: (tools) => {
        setStreamingTools(tools);
      },
      onComplete: ({ conversationId: newConvId, fullAnswer, toolsExecuted, recommendations }) => {
        setConversationId(newConvId);
        setIsGenerating(false);
        setStreamingText('');
        setStreamingTools([]);

        setMessages((prev) => [
          ...prev,
          {
            message: {
              role: 'assistant',
              content: fullAnswer,
              toolsExecuted: toolsExecuted && toolsExecuted.length > 0 ? toolsExecuted : undefined,
              createdAt: new Date().toISOString(),
            },
            recommendations: recommendations && recommendations.length > 0 ? recommendations : undefined,
          },
        ]);
      },
      onError: (errMsg) => {
        setIsGenerating(false);
        setStreamingText('');
        setStreamingTools([]);
        setMessages((prev) => [
          ...prev,
          {
            message: {
              role: 'assistant',
              content: errMsg,
              createdAt: new Date().toISOString(),
            },
          },
        ]);
      },
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(undefined);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="StockMaster AI"
        subtitle="Informations intelligentes sur l'inventaire"
        statusBadge="En ligne & Prêt"
        rightAction={
          <TouchableOpacity
            onPress={handleClearChat}
            style={styles.newChatBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh-outline" size={18} color={COLORS.secondaryText} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardContainer}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item, index) => (
            <ChatBubble
              key={index}
              message={item.message}
              recommendations={item.recommendations}
            />
          ))}

          {/* Progressive Streaming Bubble */}
          {isGenerating && (
            <ChatBubble
              message={{
                role: 'assistant',
                content: streamingText || 'Réflexion...',
                toolsExecuted: streamingTools.length > 0 ? streamingTools : undefined,
              }}
            />
          )}
        </ScrollView>

        {/* Suggestion Chips */}
        <View style={styles.chipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            <SuggestionChip
              label="Stock faible"
              icon="alert-circle-outline"
              onPress={() => handleSendMessage('Quels produits sont en rupture de stock ou presque ?')}
            />
            <SuggestionChip
              label="Que dois-je recommander ?"
              icon="cart-outline"
              onPress={() => handleSendMessage('Que dois-je recommander ?')}
            />
            <SuggestionChip
              label="Résumé du stock"
              icon="pie-chart-outline"
              onPress={() => handleSendMessage('Donnez-moi un résumé complet du stock.')}
            />
          </ScrollView>
        </View>

        {/* Chat Input Bar */}
        <View style={styles.inputBarContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Posez une question sur votre stock..."
              placeholderTextColor={COLORS.mutedText}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSendMessage()}
              disabled={isGenerating || !inputText.trim()}
              style={[
                styles.sendBtn,
                (!inputText.trim() || isGenerating) && styles.sendBtnDisabled,
              ]}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  chatScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipsWrapper: {
    paddingVertical: 6,
    backgroundColor: COLORS.background,
  },
  chipsScroll: {
    paddingHorizontal: 16,
  },
  inputBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 4,
    minHeight: 48,
    ...SHADOWS.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryDarkNavy,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
