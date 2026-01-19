import * as pdfjsLib from 'pdfjs-dist';

// Configuration du worker PDF.js pour Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

class PDFService {
  async extractTextFromPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Configuration pour éviter les erreurs de worker
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Réduire les logs
        disableAutoFetch: true,
        disableStream: true
      });
      
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      
      // Extraire le texte de chaque page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim())
            .map((item: any) => item.str)
            .join(' ');
          
          if (pageText.trim()) {
            fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
          }
        } catch (pageError) {
          console.warn(`Erreur page ${pageNum}:`, pageError);
          fullText += `\n--- Page ${pageNum} ---\n[Erreur lors de l'extraction de cette page]\n`;
        }
      }
      
      if (!fullText.trim()) {
        throw new Error('Aucun texte extractible trouvé dans le PDF');
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Erreur lors de l\'extraction du PDF:', error);
      
      // Messages d'erreur plus spécifiques
      if (error instanceof Error) {
        if (error.message.includes('worker')) {
          throw new Error('Erreur de configuration PDF worker - Réessayez');
        } else if (error.message.includes('Invalid PDF')) {
          throw new Error('Fichier PDF corrompu ou invalide');
        } else if (error.message.includes('Password')) {
          throw new Error('PDF protégé par mot de passe non supporté');
        }
      }
      
      throw new Error('Impossible d\'extraire le texte du PDF');
    }
  }

  isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }
}

export const pdfService = new PDFService();