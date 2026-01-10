import { GoogleGenAI } from "@google/genai";
import { Vehicle } from "../types.ts";

export const analyzeFleetStatus = async (vehicles: Vehicle[]): Promise<string> => {
  // Vérification de la présence de la clé API pour éviter un crash de l'application
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
  
  if (!apiKey) {
    return "Configuration de l'IA manquante (Clé API non trouvée).";
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `En tant qu'Analyste de Parc pour les Sapeurs-Pompiers, analyse l'inventaire suivant et fournis un résumé concis de la disponibilité opérationnelle, des risques de maintenance potentiels et des recommandations d'allocation de ressources :
  ${JSON.stringify(vehicles, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Tu es un Conseiller Technique Parc pour un Chef de Corps. Sois concis, axé sur la sécurité et professionnel. Réponds exclusivement en français."
      }
    });
    return response.text || "Impossible de générer l'analyse pour le moment.";
  } catch (error) {
    console.error("Erreur d'analyse Gemini :", error);
    return "Service d'analyse du parc temporairement indisponible.";
  }
};