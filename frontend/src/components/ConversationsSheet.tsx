import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Conversation } from '../types';
import { COLORS, SHADOWS } from '../constants/theme';

interface ConversationsSheetProps {
  visible: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId?: number;
  isLoading?: boolean;
  onSelectConversation: (id: number) => void;
  onDeleteConversation: (id: number) => void;
  onNewConversation: () => void;
}

export const ConversationsSheet: React.FC<ConversationsSheetProps> = ({
  visible,
  onClose,
  conversations,
  activeConversationId,
  isLoading,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}) => {
  const confirmDelete = (conv: Conversation) => {
    Alert.alert(
      'Supprimer la conversation',
      `Voulez-vous vraiment supprimer "${conv.title || 'Discussion sans titre'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDeleteConversation(conv.id),
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Historique des discussions</Text>
              <Text style={styles.subtitle}>
                {conversations.length} conversation{conversations.length > 1 ? 's' : ''} enregistrée{conversations.length > 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={COLORS.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={onNewConversation}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color={COLORS.white} />
            <Text style={styles.newChatBtnText}>Nouvelle conversation</Text>
          </TouchableOpacity>

          {/* Conversations List */}
          {conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={42} color={COLORS.mutedText} />
              <Text style={styles.emptyText}>Aucune discussion enregistrée</Text>
              <Text style={styles.emptySubtext}>
                Vos échanges avec l'assistant apparaîtront ici.
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isActive = item.id === activeConversationId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.convItem,
                      isActive && styles.convItemActive,
                    ]}
                    onPress={() => onSelectConversation(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.convIconBox, isActive && styles.convIconBoxActive]}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={18}
                        color={isActive ? COLORS.primaryBlue : COLORS.secondaryText}
                      />
                    </View>
                    <View style={styles.convDetails}>
                      <Text
                        style={[styles.convTitle, isActive && styles.convTitleActive]}
                        numberOfLines={1}
                      >
                        {item.title || 'Discussion sans titre'}
                      </Text>
                      <Text style={styles.convDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDelete(item)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.dangerText} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.75,
    minHeight: height * 0.4,
    paddingTop: 16,
    paddingBottom: 32,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBlue,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  newChatBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  convItemActive: {
    backgroundColor: COLORS.infoBg,
    borderColor: COLORS.primaryBlue,
  },
  convIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.badgeGrayBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  convIconBoxActive: {
    backgroundColor: COLORS.white,
  },
  convDetails: {
    flex: 1,
  },
  convTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  convTitleActive: {
    color: COLORS.primaryBlue,
  },
  convDate: {
    fontSize: 11,
    color: COLORS.mutedText,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 4,
  },
});
