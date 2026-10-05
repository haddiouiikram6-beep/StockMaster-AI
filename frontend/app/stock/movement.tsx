import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '../../src/components/InputField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useProducts, useCreateStockMovement } from '../../src/hooks/useQueries';
import { COLORS } from '../../src/constants/theme';
import { MovementType } from '../../src/types';

export default function StockMovementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string; type?: MovementType }>();

  const { data: productsData } = useProducts({ limit: 50 });
  const createMovementMutation = useCreateStockMovement();

  const [selectedProductId, setSelectedProductId] = useState<number>(
    params.productId ? Number(params.productId) : 1
  );
  const [type, setType] = useState<MovementType>(params.type || 'IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const products = productsData?.data || [];
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async () => {
    const qtyNum = parseInt(quantity, 10);
    if (!qtyNum || qtyNum <= 0) {
      setError('Please specify a valid quantity greater than 0.');
      return;
    }

    if (type === 'OUT' && selectedProduct && qtyNum > Number(selectedProduct.quantity)) {
      setError(
        `Insufficient stock! Only ${selectedProduct.quantity} units available.`
      );
      return;
    }

    try {
      setError(null);
      await createMovementMutation.mutateAsync({
        productId: selectedProductId,
        type,
        quantity: qtyNum,
        reason: reason.trim() || undefined,
      });

      Alert.alert('Success', 'Stock movement recorded successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to submit stock movement.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Record Stock Movement</Text>
            <View style={{ width: 36 }} />
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.dangerText} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Movement Type Selector */}
          <View style={styles.typeSelectorRow}>
            {(['IN', 'OUT', 'ADJUSTMENT'] as MovementType[]).map((t) => {
              const isSelected = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.typeTab,
                    isSelected && (t === 'IN' ? styles.typeTabIn : t === 'OUT' ? styles.typeTabOut : styles.typeTabAdj),
                  ]}
                >
                  <Text
                    style={[
                      styles.typeTabText,
                      isSelected && styles.typeTabTextActive,
                    ]}
                  >
                    {t === 'IN' ? '+ Stock IN' : t === 'OUT' ? '- Stock OUT' : '~ Adjust'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Product Picker */}
          <Text style={styles.label}>Select Product</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.productsScroll}
          >
            {products.map((p) => {
              const isSelected = p.id === selectedProductId;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProductId(p.id)}
                  style={[
                    styles.productChip,
                    isSelected && styles.productChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.productChipText,
                      isSelected && styles.productChipTextSelected,
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.productChipStock,
                      isSelected && styles.productChipStockSelected,
                    ]}
                  >
                    ({p.quantity} units)
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quantity & Reason */}
          <InputField
            label="Quantity *"
            placeholder="e.g. 10"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={(t) => {
              setQuantity(t);
              if (error) setError(null);
            }}
          />

          <InputField
            label="Reason / Reference Note"
            placeholder="e.g. Restocked from TechCorp Logistics"
            value={reason}
            onChangeText={setReason}
          />

          <PrimaryButton
            title="Confirm Movement"
            onPress={handleSubmit}
            loading={createMovementMutation.isPending}
            variant={type === 'OUT' ? 'danger' : 'primary'}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.dangerText,
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  typeTabIn: {
    backgroundColor: COLORS.success,
  },
  typeTabOut: {
    backgroundColor: COLORS.danger,
  },
  typeTabAdj: {
    backgroundColor: COLORS.primaryBlue,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryText,
  },
  typeTabTextActive: {
    color: COLORS.white,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  productsScroll: {
    marginBottom: 18,
  },
  productChip: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 8,
    alignItems: 'center',
  },
  productChipSelected: {
    backgroundColor: COLORS.primaryDarkNavy,
    borderColor: COLORS.primaryDarkNavy,
  },
  productChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  productChipTextSelected: {
    color: COLORS.white,
  },
  productChipStock: {
    fontSize: 11,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  productChipStockSelected: {
    color: COLORS.lightCyan,
  },
  submitBtn: {
    marginTop: 12,
  },
});
