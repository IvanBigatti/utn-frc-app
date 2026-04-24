import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

type OptimizeResult = {
  buffer: Buffer
  mimeType: string
}

export async function optimizeFile(buffer: Buffer, mimeType: string): Promise<OptimizeResult> {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    const optimized = await sharp(buffer)
      .jpeg({ quality: 83, progressive: true })
      .withMetadata({ exif: {} })
      .toBuffer()
    return { buffer: optimized, mimeType: 'image/jpeg' }
  }

  if (mimeType === 'image/png') {
    const metadata = await sharp(buffer).metadata()
    const hasAlpha = metadata.hasAlpha === true

    if (hasAlpha) {
      const optimized = await sharp(buffer)
        .png({ compressionLevel: 9 })
        .withMetadata({ exif: {} })
        .toBuffer()
      return { buffer: optimized, mimeType: 'image/png' }
    } else {
      // Sin transparencia: convertir a JPEG para máximo ahorro
      const optimized = await sharp(buffer)
        .jpeg({ quality: 85, progressive: true })
        .withMetadata({ exif: {} })
        .toBuffer()
      return { buffer: optimized, mimeType: 'image/jpeg' }
    }
  }

  if (mimeType === 'application/pdf') {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      const optimized = await pdfDoc.save({ useObjectStreams: true })
      return { buffer: Buffer.from(optimized), mimeType: 'application/pdf' }
    } catch {
      // Si falla la optimización del PDF, devolver el original
      return { buffer, mimeType }
    }
  }

  return { buffer, mimeType }
}
