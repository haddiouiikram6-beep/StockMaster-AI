export const uploadProductImage = async (uri: string): Promise<string> => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Configuration Cloudinary manquante.");
  }

  const formData = new FormData();
  
  // React Native FormData requires specific object structure for files
  formData.append("file", {
    uri,
    name: "product-image.jpg",
    type: "image/jpeg",
  } as any);

  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Impossible d’envoyer l’image. Vérifiez votre connexion puis réessayez.");
    }

    const data = await response.json();

    if (!data.secure_url) {
      throw new Error("Impossible de récupérer l'URL de l'image.");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error("Impossible d’envoyer l’image. Vérifiez votre connexion puis réessayez.");
  }
};
