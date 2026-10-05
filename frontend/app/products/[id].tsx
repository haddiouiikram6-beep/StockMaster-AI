import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../src/utils/currency';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../src/components/AppHeader';
import { StockBadge } from '../../src/components/StockBadge';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { MovementRow } from '../../src/components/MovementRow';
import { InputField } from '../../src/components/InputField';
import { LoadingState } from '../../src/components/LoadingState';
import { ErrorState } from '../../src/components/ErrorState';
import {
  useProduct,
  useProductStockMovements,
  useCreateStockMovement,
} from '../../src/hooks/useQueries';
import { COLORS, SHADOWS } from '../../src/constants/theme';
import { MovementType } from '../../src/types';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [bookmarked, setBookmarked] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [movementError, setMovementError] = useState<string | null>(null);

  const {
    data: productData,
    isLoading: loadingProduct,
    isError,
    refetch,
  } = useProduct(id);

  const {
    data: movementsData,
    refetch: refetchMovements,
  } = useProductStockMovements(id);

  const createMovementMutation = useCreateStockMovement();

  // Reference product fallback
  const product = useMemo(() => {
    if (productData?.data) {
      return productData.data;
    }
    return {
      id: Number(id) || 1,
      name: 'Logitech MX Master 3S',
      reference: 'SKU-9821',
      description: 'Wireless Performance Mouse - Graphite',
      price: 99.0,
      quantity: 42,
      minStock: 15,
      categoryId: 1,
      category: { id: 1, name: 'Electronics & Peripherals' },
      supplier: { id: 1, name: 'Logitech International S.A.' },
    };
  }, [productData, id]);

  const stockValue = useMemo(() => {
    const val = Number(product.price || 0) * Number(product.quantity || 0);
    return formatCurrency(val);
  }, [product]);

  // Demo movements fallback for product
  const displayedMovements = useMemo(() => {
    if (movementsData?.data && movementsData.data.length > 0) {
      return movementsData.data;
    }
    return [
      {
        id: 201,
        productId: Number(id) || 1,
        userId: 1,
        type: 'IN' as const,
        quantity: 20,
        reason: 'Réapprovisionnement fournisseur',
        date: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        product,
      },
      {
        id: 202,
        productId: Number(id) || 1,
        userId: 2,
        type: 'OUT' as const,
        quantity: 5,
        reason: 'Commande client #1084',
        date: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        product,
      },
      {
        id: 203,
        productId: Number(id) || 1,
        userId: 1,
        type: 'OUT' as const,
        quantity: 2,
        reason: 'Retour endommagé / perte',
        date: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        product,
      },
    ];
  }, [movementsData, id, product]);

  const openMovementModal = (type: MovementType) => {
    setMovementType(type);
    setQty('');
    setReason('');
    setMovementError(null);
    setModalVisible(true);
  };

  const handleConfirmMovement = async () => {
    const quantityNum = parseInt(qty, 10);
    if (!quantityNum || quantityNum <= 0) {
      setMovementError('Veuillez entrer une quantité positive valide.');
      return;
    }

    if (movementType === 'OUT' && quantityNum > Number(product.quantity)) {
      setMovementError(
        `Impossible de retirer ${quantityNum} unités. Seulement ${product.quantity} unités en stock.`
      );
      return;
    }

    try {
      setMovementError(null);
      await createMovementMutation.mutateAsync({
        productId: Number(id),
        type: movementType,
        quantity: quantityNum,
        reason: reason.trim() || undefined,
      });

      setModalVisible(false);
      await Promise.all([refetch(), refetchMovements()]);
      Alert.alert(
        'Succès',
        `${quantityNum} unités ${movementType === 'IN' ? 'ajoutées' : 'retirées'} avec succès.`
      );
    } catch (err: any) {
      setMovementError(
        err.response?.data?.message || 'Échec de l\'enregistrement du mouvement de stock.'
      );
    }
  };

  if (loadingProduct && !productData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="Chargement des détails du produit..." />
      </SafeAreaView>
    );
  }

  if (isError && !productData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState message="Impossible de charger les détails du produit." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Détails du produit"
        showBack
        rightAction={
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setBookmarked(!bookmarked)}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={bookmarked ? COLORS.primaryBlue : COLORS.text}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Product Card */}
        <View style={styles.mainCard}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <StockBadge
              quantity={Number(product.quantity)}
              minStock={Number(product.minStock)}
              size="md"
            />
          </View>
          <Text style={styles.description}>
            {product.description || 'Article de catalogue d\'inventaire professionnel'}
          </Text>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBox}>
            <View>
              <Text style={styles.metricBig}>{product.quantity} unités</Text>
              <Text style={styles.metricSub}>en stock</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metricBig}>{stockValue}</Text>
              <Text style={styles.metricSub}>valeur totale du stock</Text>
            </View>
          </View>

          {/* Two Main Actions: Add Stock / Remove Stock */}
          <View style={styles.actionsRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <PrimaryButton
                title="+ Ajouter du stock"
                onPress={() => openMovementModal('IN')}
                style={styles.addStockBtn}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                title="- Retirer du stock"
                onPress={() => openMovementModal('OUT')}
                variant="outline"
              />
            </View>
          </View>
        </View>

        {/* Product Information Section */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informations sur le produit</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <Ionicons name="pricetag-outline" size={16} color={COLORS.secondaryText} />
              <Text style={styles.infoLabel}>Référence SKU</Text>
            </View>
            <Text style={styles.infoValue}>{product.reference}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <Ionicons name="layers-outline" size={16} color={COLORS.secondaryText} />
              <Text style={styles.infoLabel}>Catégorie</Text>
            </View>
            <Text style={styles.infoValue}>{product.category?.name || 'Général'}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <Ionicons name="business-outline" size={16} color={COLORS.secondaryText} />
              <Text style={styles.infoLabel}>Fournisseur</Text>
            </View>
            <Text style={styles.infoValue}>
              {product.supplier?.name || 'Global Logistics Supply'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <Ionicons name="cube-outline" size={16} color={COLORS.secondaryText} />
              <Text style={styles.infoLabel}>Stock actuel</Text>
            </View>
            <Text style={[styles.infoValue, { fontWeight: '700' }]}>
              {product.quantity} unités
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelGroup}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.secondaryText} />
              <Text style={styles.infoLabel}>Seuil min.</Text>
            </View>
            <Text style={styles.infoValue}>{product.minStock} unités</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLabelGroup}>
              <Ionicons name="cash-outline" size={16} color={COLORS.secondaryText} />
              <Text style={styles.infoLabel}>Prix unitaire</Text>
            </View>
            <Text style={[styles.infoValue, { color: COLORS.primaryBlue, fontWeight: '700' }]}>
              {formatCurrency(Number(product.price))}
            </Text>
          </View>
        </View>

        {/* Recent Movements for this product */}
        <View style={styles.movementsHeader}>
          <Text style={styles.sectionTitle}>Mouvements récents</Text>
        </View>

        <View style={styles.movementsList}>
          {displayedMovements.map((item) => (
            <MovementRow key={item.id} movement={item} />
          ))}
        </View>

        {/* Prediction Pill Note */}
        <View style={styles.predictionPill}>
          <Ionicons name="analytics-outline" size={16} color={COLORS.primaryBlue} />
          <Text style={styles.predictionText}>
            Le point de commande devrait être atteint dans 14 jours.
          </Text>
        </View>
      </ScrollView>

      {/* Add / Remove Stock Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {movementType === 'IN' ? '+ Ajouter du stock' : '- Retirer du stock'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.secondaryText} />
              </TouchableOpacity>
            </View>

            {movementError && (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>{movementError}</Text>
              </View>
            )}

            <Text style={styles.modalProductNotice}>
              Cible : <Text style={{ fontWeight: '700' }}>{product.name}</Text> (Actuel : {product.quantity} unités)
            </Text>

            <InputField
              label="Quantité *"
              placeholder="e.g. 10"
              keyboardType="number-pad"
              value={qty}
              onChangeText={(text) => {
                setQty(text);
                if (movementError) setMovementError(null);
              }}
            />

            <InputField
              label="Raison / Référence"
              placeholder={
                movementType === 'IN'
                  ? 'ex: Réapprovisionnement fournisseur'
                  : 'ex: Expédition client / Dommage'
              }
              value={reason}
              onChangeText={setReason}
            />

            <PrimaryButton
              title={`Confirmer ${movementType === 'IN' ? "l'entrée" : 'la sortie'}`}
              onPress={handleConfirmMovement}
              loading={createMovementMutation.isPending}
              variant={movementType === 'IN' ? 'primary' : 'danger'}
              style={{ marginTop: 8 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  description: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginBottom: 14,
  },
  metricsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.lightCyan,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  metricBig: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDarkNavy,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.secondaryText,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  addStockBtn: {
    backgroundColor: COLORS.primaryBlue,
  },
  infoCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  movementsHeader: {
    marginBottom: 4,
    marginTop: 4,
  },
  movementsList: {
    marginBottom: 14,
  },
  predictionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 244, 242, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8EAE7',
  },
  predictionText: {
    fontSize: 12,
    color: COLORS.primaryBlue,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalProductNotice: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginBottom: 16,
  },
  modalError: {
    backgroundColor: COLORS.dangerBg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  modalErrorText: {
    color: COLORS.dangerText,
    fontSize: 12,
  },
});
