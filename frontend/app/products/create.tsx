import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadProductImage } from '../../src/services/cloudinaryService';
import { InputField } from '../../src/components/InputField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useCreateProduct, useCategories } from '../../src/hooks/useQueries';
import { COLORS, SHADOWS } from '../../src/constants/theme';

export default function CreateProductScreen() {
  const router = useRouter();

  const { data: categoriesData } = useCategories();
  const createProductMutation = useCreateProduct();

  // Form state
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minStock, setMinStock] = useState('5');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = categoriesData?.data || [];

  // Default to first category when loaded if none selected
  React.useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Veuillez autoriser l’accès à votre galerie pour ajouter une photo du produit.'
      );
      return;
    }

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
        setFormError('Format d’image non pris en charge (utilisez JPG, PNG ou WEBP).');
        return;
      }

      setFormError(null);
      setSelectedImage(asset);
    }
  };

  const handleGenerateSku = () => {
    const prefix = name ? name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD') : 'PRD';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setReference(`${prefix}-${randomNum}`);
  };

  const handleCreateProduct = async () => {
    if (!name.trim()) {
      setFormError('Le nom du produit est requis.');
      return;
    }

    if (!reference.trim()) {
      setFormError('La référence SKU est requise.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Veuillez saisir un prix valide supérieur ou égal à 0.');
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setFormError('La quantité doit être un nombre positif.');
      return;
    }

    const minStockNum = parseInt(minStock, 10);
    if (isNaN(minStockNum) || minStockNum < 0) {
      setFormError('Le stock minimum doit être un nombre positif.');
      return;
    }

    try {
      setFormError(null);
      setIsUploading(true);

      let uploadedImageUrl: string | null = null;
      if (selectedImage) {
        uploadedImageUrl = await uploadProductImage(selectedImage.uri);
      }

      const categoryId = selectedCategoryId || (categories[0]?.id ?? 1);

      await createProductMutation.mutateAsync({
        name: name.trim(),
        reference: reference.trim().toUpperCase(),
        price: priceNum,
        quantity: qtyNum,
        minStock: minStockNum,
        categoryId,
        description: description.trim() || undefined,
        imageUrl: uploadedImageUrl || undefined,
      });

      Alert.alert('Succès', 'Le produit a été créé avec succès.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Échec de la création du produit. Vérifiez l’unicité de la référence SKU.';
      setFormError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Sheet Drag Handle */}
      <View style={styles.sheetHandleContainer}>
        <View style={styles.sheetHandle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Nouveau produit</Text>
          <Text style={styles.headerSubtitle}>Ajouter un article à l'inventaire</Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color={COLORS.secondaryText} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {formError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          {/* Image Picker Section */}
          <View style={styles.imageSection}>
            <Text style={styles.fieldLabel}>Photo du produit</Text>
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={handleSelectImage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={16} color={COLORS.primaryBlue} />
                    <Text style={styles.changeImageText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    <Text style={styles.removeImageText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePlaceholder}
                onPress={handleSelectImage}
                activeOpacity={0.7}
              >
                <View style={styles.imagePlaceholderIcon}>
                  <Ionicons name="cloud-upload-outline" size={26} color={COLORS.primaryBlue} />
                </View>
                <Text style={styles.imagePlaceholderTitle}>Ajouter une photo</Text>
                <Text style={styles.imagePlaceholderSubtitle}>JPG, PNG ou WEBP jusqu'à 5 Mo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Product Name */}
          <InputField
            label="Nom du produit *"
            placeholder="Ex: Clavier Mécanique Sans Fil"
            value={name}
            onChangeText={setName}
          />

          {/* SKU Reference with auto-generate action */}
          <View style={styles.skuRow}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Référence SKU *"
                placeholder="Ex: KB-MEC-001"
                value={reference}
                onChangeText={(val) => setReference(val.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={styles.autoSkuButton}
              onPress={handleGenerateSku}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles-outline" size={14} color={COLORS.primaryBlue} />
              <Text style={styles.autoSkuText}>Auto SKU</Text>
            </TouchableOpacity>
          </View>

          {/* Numbers Grid: Price, Quantity, Min Stock */}
          <View style={styles.numbersGrid}>
            <View style={styles.gridColumn}>
              <InputField
                label="Prix unitaire (DH) *"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={styles.gridColumn}>
              <InputField
                label="Quantité initiale"
                placeholder="0"
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            <View style={styles.gridColumn}>
              <InputField
                label="Stock min (alerte)"
                placeholder="5"
                keyboardType="number-pad"
                value={minStock}
                onChangeText={setMinStock}
              />
            </View>
          </View>

          {/* Category Chips Selector */}
          <View style={styles.categorySection}>
            <Text style={styles.fieldLabel}>Catégorie</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'folder-outline'}
                      size={14}
                      color={isSelected ? COLORS.white : COLORS.secondaryText}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Optional Description */}
          <InputField
            label="Description (optionnelle)"
            placeholder="Détails du produit, caractéristiques ou emplacement..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Submit Action */}
          <View style={styles.submitContainer}>
            <PrimaryButton
              title={isUploading ? 'Téléversement de l’image...' : 'Créer le produit'}
              onPress={handleCreateProduct}
              loading={isUploading || createProductMutation.isPending}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={isUploading || createProductMutation.isPending}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
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
  sheetHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
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
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    color: COLORS.dangerText,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  imageSection: {
    marginBottom: 16,
  },
  imagePlaceholder: {
    height: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  imagePlaceholderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePlaceholderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  imagePlaceholderSubtitle: {
    fontSize: 11,
    color: COLORS.mutedText,
    marginTop: 2,
  },
  selectedImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  previewImage: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: COLORS.badgeGrayBg,
  },
  imageActions: {
    flex: 1,
    marginLeft: 14,
    gap: 8,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  changeImageText: {
    color: COLORS.primaryBlue,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  removeImageText: {
    color: COLORS.dangerText,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  autoSkuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoBg,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 111, 166, 0.2)',
  },
  autoSkuText: {
    color: COLORS.primaryBlue,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  numbersGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  gridColumn: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primaryDarkNavy,
    borderColor: COLORS.primaryDarkNavy,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondaryText,
    marginLeft: 6,
  },
  categoryChipTextSelected: {
    color: COLORS.white,
  },
  submitContainer: {
    marginTop: 12,
    gap: 10,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: COLORS.secondaryText,
    fontWeight: '600',
  },
});
