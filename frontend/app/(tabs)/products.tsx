import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../src/utils/currency';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadProductImage } from '../../src/services/cloudinaryService';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../../src/components/SearchBar';
import { FilterChip } from '../../src/components/FilterChip';
import { ProductRow } from '../../src/components/ProductRow';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { InputField } from '../../src/components/InputField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useProducts, useCreateProduct, useCategories } from '../../src/hooks/useQueries';
import { Product } from '../../src/types';
import { COLORS, SHADOWS } from '../../src/constants/theme';

export default function ProductsScreen() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New product form state
  const [newName, setNewName] = useState('');
  const [newRef, setNewRef] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newMinStock, setNewMinStock] = useState('5');
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    data: productsData,
    isLoading,
    refetch,
    isRefetching,
  } = useProducts({ limit: 100 });

  const { data: categoriesData } = useCategories();
  const createProductMutation = useCreateProduct();

  // Reference demo items fallback
  const rawProducts: Product[] = useMemo(() => {
    if (productsData?.data && productsData.data.length > 0) {
      return productsData.data;
    }
    return [
      {
        id: 1,
        name: 'Logitech MX Master 3S',
        reference: 'SKU-9821',
        category: { id: 1, name: 'Electronics' },
        categoryId: 1,
        quantity: 42,
        minStock: 15,
        price: 99.00,
        description: 'Wireless Performance Mouse - Graphite',
      },
      {
        id: 2,
        name: 'Ergonomic Desk Chair',
        reference: 'SKU-4420',
        category: { id: 2, name: 'Furniture' },
        categoryId: 2,
        quantity: 5,
        minStock: 10,
        price: 249.99,
        description: 'Breathable mesh chair with lumbar support',
      },
      {
        id: 3,
        name: 'Ultra HD 4K Monitor',
        reference: 'SKU-7710',
        category: { id: 1, name: 'Cables & Displays' },
        categoryId: 1,
        quantity: 1,
        minStock: 8,
        price: 389.00,
        description: '27-inch IPS UHD 4K HDR Monitor',
      },
      {
        id: 4,
        name: 'Anker USB-C Power Bank',
        reference: 'SKU-4810',
        category: { id: 1, name: 'Power & Accessories' },
        categoryId: 1,
        quantity: 18,
        minStock: 5,
        price: 59.99,
        description: '20,000mAh portable charger with 65W PD',
      },
      {
        id: 5,
        name: 'Aluminum Laptop Stand',
        reference: 'SKU-3320',
        category: { id: 2, name: 'Workspace' },
        categoryId: 2,
        quantity: 15,
        minStock: 6,
        price: 45.00,
        description: 'Adjustable ergonomic aluminum laptop riser',
      },
    ];
  }, [productsData]);

  // Counts for filter chips
  const counts = useMemo(() => {
    const total = rawProducts.length;
    const low = rawProducts.filter(
      (p) => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.minStock)
    ).length;
    const out = rawProducts.filter((p) => Number(p.quantity) === 0).length;
    return { total, low, out };
  }, [rawProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return rawProducts.filter((item) => {
      // Search matching
      const matchesSearch =
        search.trim() === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.reference.toLowerCase().includes(search.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      // Filter chip matching
      const qty = Number(item.quantity);
      const min = Number(item.minStock);

      if (activeFilter === 'LOW') {
        return qty <= min;
      }
      if (activeFilter === 'OUT') {
        return qty === 0;
      }
      return true;
    });
  }, [rawProducts, search, activeFilter]);

  // Valuation summary stats
  const totalValuation = useMemo(() => {
    const sum = rawProducts.reduce(
      (acc, p) => acc + Number(p.price || 0) * Number(p.quantity || 0),
      0
    );
    return sum > 0 ? formatCurrency(sum) : formatCurrency(40290);
  }, [rawProducts]);

  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setFormError('L’image ne doit pas dépasser 5 Mo.');
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (asset.mimeType && !validTypes.includes(asset.mimeType)) {
        setFormError('Format d’image non pris en charge.');
        return;
      }
      
      setFormError(null);
      setSelectedImage(asset);
    }
  };

  const handleCreateProduct = async () => {
    if (!newName.trim() || !newRef.trim() || !newPrice.trim()) {
      setFormError('Veuillez remplir le nom du produit, la référence SKU et le prix.');
      return;
    }

    try {
      setFormError(null);
      setIsUploading(true);

      let uploadedImageUrl = null;
      if (selectedImage) {
        uploadedImageUrl = await uploadProductImage(selectedImage.uri);
      }

      const catId = categoriesData?.data?.[0]?.id || 1;
      await createProductMutation.mutateAsync({
        name: newName.trim(),
        reference: newRef.trim().toUpperCase(),
        price: parseFloat(newPrice) || 0,
        quantity: parseInt(newQty, 10) || 0,
        minStock: parseInt(newMinStock, 10) || 5,
        categoryId: catId,
        imageUrl: uploadedImageUrl,
      });

      setShowAddModal(false);
      setNewName('');
      setNewRef('');
      setNewPrice('');
      setNewQty('');
      setNewMinStock('5');
      setSelectedImage(null);
      Alert.alert('Succès', 'Produit créé avec succès.');
    } catch (err: any) {
      setFormError(
        err.message || err.response?.data?.message || 'Échec de la création du produit. Vérifiez l\'unicité du SKU.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Produits</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAddModal(true)}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par nom, SKU..."
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          <FilterChip
            label="Tout"
            count={counts.total}
            active={activeFilter === 'ALL'}
            onPress={() => setActiveFilter('ALL')}
          />
          <FilterChip
            label="Stock faible"
            count={counts.low}
            active={activeFilter === 'LOW'}
            onPress={() => setActiveFilter('LOW')}
          />
          <FilterChip
            label="Rupture de stock"
            count={counts.out}
            active={activeFilter === 'OUT'}
            onPress={() => setActiveFilter('OUT')}
          />
        </View>

        {/* Inventory Summary Mini Row */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryValue}>{totalValuation}</Text>
            <Text style={styles.summarySub}>+2.1% ce mois-ci</Text>
          </View>
          <View style={[styles.summaryCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.summaryValue}>{rawProducts.length} Articles</Text>
            <Text style={[styles.summarySub, { color: COLORS.warningText }]}>
              {counts.low} à recommander
            </Text>
          </View>
        </View>

        {/* Product List */}
        {isLoading && !productsData ? (
          <LoadingState message="Chargement du catalogue..." />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="Aucun produit trouvé"
            description="Essayez de modifier votre recherche ou filtre."
            actionText="Effacer les filtres"
            onActionPress={() => {
              setSearch('');
              setActiveFilter('ALL');
            }}
          />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ProductRow
                product={item}
                variant="full"
                onPress={() => router.push(`/products/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={COLORS.primaryBlue}
                colors={[COLORS.primaryBlue]}
              />
            }
            ListFooterComponent={
              /* AI Reorder Prompt Banner matching reference design */
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/(tabs)/ai')}
                style={styles.aiBanner}
              >
                <View style={styles.aiBannerIcon}>
                  <Ionicons name="sparkles" size={16} color={COLORS.primaryBlue} />
                </View>
                <View style={styles.aiBannerTextCol}>
                  <View style={styles.aiBannerTagRow}>
                    <Text style={styles.aiBannerTag}>Recommandation IA</Text>
                    <Text style={styles.aiBannerAction}>Voir le brouillon →</Text>
                  </View>
                  <Text style={styles.aiBannerBody}>
                    Alerte de stock faible détectée.
                  </Text>
                </View>
              </TouchableOpacity>
            }
          />
        )}

        {/* Create Product Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouveau produit</Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color={COLORS.secondaryText} />
                </TouchableOpacity>
              </View>

              {formError && (
                <View style={styles.modalError}>
                  <Text style={styles.modalErrorText}>{formError}</Text>
                </View>
              )}

              <View style={styles.imagePickerContainer}>
                <Text style={styles.imagePickerLabel}>Image du produit</Text>
                {selectedImage ? (
                  <View style={styles.selectedImageWrapper}>
                    <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                    <TouchableOpacity onPress={handleSelectImage} style={styles.changeImageBtn}>
                      <Text style={styles.changeImageText}>Modifier l’image</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleSelectImage} style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color={COLORS.secondaryText} />
                    <Text style={styles.imagePlaceholderText}>Ajouter une image</Text>
                  </TouchableOpacity>
                )}
              </View>

              <InputField
                label="Nom du produit *"
                placeholder="ex: Souris sans fil"
                value={newName}
                onChangeText={setNewName}
              />
              <InputField
                label="Référence SKU *"
                placeholder="e.g. SKU-9821"
                value={newRef}
                onChangeText={setNewRef}
                autoCapitalize="characters"
              />
              <View style={styles.modalRowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <InputField
                    label="Prix (DH) *"
                    placeholder="99.00"
                    keyboardType="numeric"
                    value={newPrice}
                    onChangeText={setNewPrice}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <InputField
                    label="Quantité"
                    placeholder="20"
                    keyboardType="number-pad"
                    value={newQty}
                    onChangeText={setNewQty}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Stock min"
                    placeholder="5"
                    keyboardType="number-pad"
                    value={newMinStock}
                    onChangeText={setNewMinStock}
                  />
                </View>
              </View>

              <PrimaryButton
                title={isUploading ? "Ajout en cours..." : "Créer le produit"}
                onPress={handleCreateProduct}
                loading={isUploading || createProductMutation.isPending}
                style={styles.modalSaveBtn}
              />
            </View>
          </View>
        </Modal>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(217, 244, 242, 0.35)',
    borderRadius: 14,
    marginHorizontal: 20,
  },
  summaryCol: {},
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  summarySub: {
    fontSize: 11,
    color: COLORS.secondaryText,
    marginTop: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  aiBanner: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#C8E6E5',
    marginTop: 12,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  aiBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightCyan,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  aiBannerTextCol: {
    flex: 1,
  },
  aiBannerTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  aiBannerTag: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDarkNavy,
  },
  aiBannerAction: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryBlue,
  },
  aiBannerBody: {
    fontSize: 12,
    color: COLORS.secondaryText,
    lineHeight: 16,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalError: {
    backgroundColor: COLORS.dangerBg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  modalErrorText: {
    color: COLORS.dangerText,
    fontSize: 12,
  },
  modalRowInputs: {
    flexDirection: 'row',
  },
  modalSaveBtn: {
    marginTop: 8,
  },
  imagePickerContainer: {
    marginBottom: 16,
  },
  imagePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  imagePlaceholder: {
    height: 100,
    width: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: COLORS.secondaryText,
    marginTop: 4,
  },
  selectedImageWrapper: {
    alignItems: 'flex-start',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  changeImageBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.lightCyan,
    borderRadius: 6,
  },
  changeImageText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryBlue,
  },
});
