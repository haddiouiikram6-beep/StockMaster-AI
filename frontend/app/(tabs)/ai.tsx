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
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../src/components/AppHeader';
import { ChatBubble } from '../../src/components/ChatBubble';
import { SuggestionChip } from '../../src/components/SuggestionChip';
import { ConversationsSheet } from '../../src/components/ConversationsSheet';
import { sendChatMessage, extractReorderRecommendations } from '../../src/services/aiStream';
import { aiApi } from '../../src/services/ai/apis';
import { useConversations, AI_QUERY_KEYS } from '../../src/services/ai/queries';
import { useDeleteConversation } from '../../src/services/ai/mutations';
import { Message, ReorderRecommendation, Conversation } from '../../src/types';
import { COLORS, SHADOWS } from '../../src/constants/theme';

export default function AIAssistantScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();

  const { data: convsData, isLoading: loadingConvs } = useConversations();
  const deleteConvMutation = useDeleteConversation();
  const conversations: Conversation[] = convsData?.data || [];

  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingTools, setStreamingTools] = useState<string[]>([]);

  const [messages, setMessages] = useState<
    Array<{
      message: Message;
      recommendations?: ReorderRecommendation[];
      products?: any[];
      createdProduct?: any;
    }>
  >([]);

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
      onComplete: ({
        conversationId: newConvId,
        fullAnswer,
        toolsExecuted,
        recommendations,
        products,
        createdProduct,
      }) => {
        setConversationId(newConvId);
        setIsGenerating(false);
        setStreamingText('');
        setStreamingTools([]);

        // Invalidate conversations list so sheet displays newly created discussion
        queryClient.invalidateQueries({ queryKey: AI_QUERY_KEYS.conversations });

        setMessages((prev) => [
          ...prev,
          {
            message: {
              role: 'assistant',
              content: fullAnswer,
              toolsExecuted: toolsExecuted && toolsExecuted.length > 0 ? toolsExecuted : undefined,
              products: products && products.length > 0 ? products : undefined,
              createdProduct: createdProduct || undefined,
              createdAt: new Date().toISOString(),
            },
            recommendations: recommendations && recommendations.length > 0 ? recommendations : undefined,
            products: products && products.length > 0 ? products : undefined,
            createdProduct: createdProduct || undefined,
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
    setStreamingText('');
    setStreamingTools([]);
  };

  const handleSelectConversation = async (id: number) => {
    if (id === conversationId) return;

    try {
      setLoadingConversation(true);
      const res = await aiApi.getConversationById(id);
      if (res.data && res.data.messages) {
        const loadedMessages = res.data.messages.map((m: any) => {
          const content = m.textContent || m.content || '';
          const recs = extractReorderRecommendations(content);
          return {
            message: {
              role: m.role,
              content,
              createdAt: m.createdAt,
            },
            recommendations: recs.length > 0 ? recs : undefined,
          };
        });
        setMessages(loadedMessages);
        setConversationId(res.data.id);
      }
    } catch (e) {
      console.error('Error loading conversation:', e);
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleDeleteConversation = async (id: number) => {
    try {
      await deleteConvMutation.mutateAsync(id);
      if (id === conversationId) {
        handleClearChat();
      }
    } catch (e) {
      console.error('Error deleting conversation:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="StockMaster AI"
        subtitle="Informations intelligentes sur l'inventaire"
        statusBadge="En ligne & Prêt"
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setSheetVisible(true)}
              style={styles.headerIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color={COLORS.primaryBlue} />
              {conversations.length > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{conversations.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearChat}
              style={[styles.headerIconBtn, { marginLeft: 8 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={20} color={COLORS.secondaryText} />
            </TouchableOpacity>
          </View>
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
          {messages.length === 0 && !isGenerating && (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIconBox}>
                <Ionicons name="sparkles" size={32} color={COLORS.primaryBlue} />
              </View>
              <Text style={styles.welcomeTitle}>Comment puis-je vous aider ?</Text>
              <Text style={styles.welcomeSubtitle}>
                Posez vos questions sur l'inventaire en temps réel, lancez une recherche vectorielle ou demandez des recommandations de réapprovisionnement.
              </Text>
            </View>
          )}

          {messages.map((item, index) => (
            <ChatBubble
              key={index}
              message={item.message}
              recommendations={item.recommendations}
              products={item.products || item.message.products}
              createdProduct={item.createdProduct || item.message.createdProduct}
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
              label="Recherche Vectorielle Pinecone"
              icon="git-network-outline"
              onPress={() => handleSendMessage('Trouve des câbles pour écran et des accessoires avec la recherche vectorielle Pinecone')}
            />
            <SuggestionChip
              label="Créer un Produit"
              icon="add-circle-outline"
              onPress={() => handleSendMessage('Crée un nouveau produit Écran 4K Ultra au prix de 3499 DH dans la catégorie Électronique')}
            />
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

      {/* Loading overlay when switching conversations */}
      {loadingConversation && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primaryBlue} />
          <Text style={styles.loadingOverlayText}>Chargement de la conversation...</Text>
        </View>
      )}

      {/* Conversations History Sheet */}
      <ConversationsSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        conversations={conversations}
        activeConversationId={conversationId}
        isLoading={loadingConvs}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleClearChat}
        onDeleteConversation={handleDeleteConversation}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primaryBlue,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    zIndex: 99,
  },
  loadingOverlayText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 8,
    fontWeight: '600',
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
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  welcomeIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
