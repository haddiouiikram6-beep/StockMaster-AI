export const formatDH = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `${num.toFixed(2).replace('.', ',')} DH`;
};

/**
 * Generate a clean, readable response in French without raw markdown symbols,
 * formatted in Moroccan Dirham (DH).
 */
export const generateLocalGroundedResponse = ({ userMessage, intentResult, toolExecutionResults = [] }) => {
  const executedNames = toolExecutionResults.map(t => t.toolName);

  // 1. Reorder recommendations response
  if (executedNames.includes('recommendReorder')) {
    const toolData = toolExecutionResults.find(t => t.toolName === 'recommendReorder')?.result;
    const recs = toolData?.recommendations || [];
    const totalCost = toolData?.totalEstimatedCost || 0;

    let reply = `📋 Reorder Recommendations & Replenishment Plan\n\n`;
    reply += `Voici l'analyse des réapprovisionnements recommandés pour votre entrepôt basée sur les niveaux de stock actuels et les seuils minimaux :\n\n`;

    if (recs.length === 0) {
      reply += `Tous les stocks sont optimaux. Aucun article n'a besoin de réapprovisionnement immédiat.\n`;
    } else {
      reply += `• Nombre d'articles à réapprovisionner : ${recs.length}\n`;
      reply += `• Coût total estimé du réassort : ${formatDH(totalCost)}\n\n`;
      reply += `Détail des commandes suggérées :\n`;

      recs.forEach((item, idx) => {
        const supplierName = item.supplier?.name ? `Fournisseur : ${item.supplier.name}` : 'Fournisseur non assigné';
        reply += `${idx + 1}. ${item.name} (Réf : ${item.reference})\n`;
        reply += `   • Quantité à commander : ${item.suggestedQuantity} unités\n`;
        reply += `   • Stock actuel : ${item.currentQuantity} / Seuil : ${item.minStock}\n`;
        reply += `   • Prix unitaire : ${formatDH(item.unitPrice)} | Coût : ${formatDH(item.estimatedCost)}\n`;
        reply += `   • Priorité : ${item.priority} (${item.urgencyReason})\n`;
        reply += `   • ${supplierName}\n\n`;
      });

      reply += `Les cartes interactives de ces produits sont affichées ci-dessous pour consultation rapide.`;
    }

    return reply;
  }

  // 2. Low stock alert response
  if (executedNames.includes('getLowStockProducts')) {
    const toolData = toolExecutionResults.find(t => t.toolName === 'getLowStockProducts')?.result;
    const products = toolData?.products || [];

    let reply = `⚠️ Alertes de Stock Bas\n\n`;
    if (products.length === 0) {
      reply += `Excellente nouvelle ! Aucun produit n'est actuellement en situation de stock critique ou bas.\n`;
    } else {
      reply += `Actuellement, ${products.length} produit(s) requièrent votre attention car leur stock est sous le seuil de sécurité :\n\n`;
      products.forEach((p, idx) => {
        const status = p.quantity === 0 ? 'Rupture de stock' : 'Stock bas';
        reply += `${idx + 1}. ${p.name} (Réf : ${p.reference})\n`;
        reply += `   • Quantité disponible : ${p.quantity} unités (Seuil : ${p.minStock})\n`;
        reply += `   • Statut : ${status} | Prix : ${formatDH(p.price)}\n\n`;
      });
      reply += `Les produits concernés sont affichés dans la carte ci-dessous.`;
    }

    return reply;
  }

  // 3. Create product response
  if (executedNames.includes('createProduct')) {
    const toolData = toolExecutionResults.find(t => t.toolName === 'createProduct')?.result;
    const prod = toolData?.product;

    let reply = `✅ Produit Créé avec Succès\n\n`;
    if (prod) {
      reply += `Le nouveau produit a été enregistré dans le catalogue StockMaster :\n\n`;
      reply += `• Nom : ${prod.name}\n`;
      reply += `• Référence : ${prod.reference}\n`;
      reply += `• Prix unitaire : ${formatDH(prod.price)}\n`;
      reply += `• Stock initial : ${prod.quantity} unités (Seuil : ${prod.minStock})\n`;
      reply += `• Catégorie : ${prod.category || 'Général'}\n\n`;
      reply += `La fiche produit correspondante est affichée ci-dessous.`;
    } else {
      reply += `L'article a été ajouté avec succès à votre inventaire.`;
    }
    return reply;
  }

  // 4. Product search response (vector or keywords)
  if (executedNames.includes('vectorSearchProducts') || executedNames.includes('searchProducts') || executedNames.includes('getProductInfo') || executedNames.includes('getProductStock')) {
    const toolRes = toolExecutionResults.find(t => t.toolName === 'vectorSearchProducts' || t.toolName === 'searchProducts')?.result;
    const products = toolRes?.products || [];

    let reply = `🔍 Résultats de Recherche de Produits\n\n`;
    if (products.length === 0) {
      reply += `Aucun produit correspondant n'a été trouvé pour votre requête. Vérifiez le mot-clé ou la référence et réessayez.`;
    } else {
      reply += `Voici les produits trouvés dans l'inventaire :\n\n`;
      products.forEach((p, idx) => {
        reply += `${idx + 1}. ${p.name} (Réf : ${p.reference})\n`;
        reply += `   • Prix : ${formatDH(p.price)} | Stock : ${p.quantity} unités (Seuil : ${p.minStock})\n`;
        if (p.description) reply += `   • Description : ${p.description}\n`;
        reply += `\n`;
      });
      reply += `Vous pouvez consulter les détails de chaque produit directement ci-dessous.`;
    }
    return reply;
  }

  // 5. Stock movements response
  if (executedNames.includes('getStockMovements')) {
    const toolData = toolExecutionResults.find(t => t.toolName === 'getStockMovements')?.result;
    const movements = toolData?.movements || [];

    let reply = `📦 Historique des Mouvements de Stock\n\n`;
    if (movements.length === 0) {
      reply += `Aucun mouvement de stock récent n'a été enregistré.`;
    } else {
      movements.forEach((m, idx) => {
        reply += `${idx + 1}. [${m.type}] ${m.quantity} unités de ${m.product} - ${m.reason || 'Mouvement standard'} (${new Date(m.date).toLocaleDateString()})\n`;
      });
    }
    return reply;
  }

  return `Bonjour ! Je suis votre assistant StockMaster AI pour la gestion de l'inventaire. Comment puis-je vous aider aujourd'hui ? Vous pouvez me demander les produits en stock bas, des recommandations de réapprovisionnement, ou rechercher un article.`;
};
