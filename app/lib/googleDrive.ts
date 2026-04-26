import 'server-only'
import { google } from 'googleapis'
import { Readable } from 'stream'

function getOAuth2Client() {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Faltan variables de entorno de Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)')
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

function getDriveClient() {
  return google.drive({ version: 'v3', auth: getOAuth2Client() })
}

export async function createUploadSession(
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID no está definida')

  const oauth2Client = getOAuth2Client()
  const tokenResponse = await oauth2Client.getAccessToken()
  const accessToken = tokenResponse.token
  if (!accessToken) throw new Error('No se pudo obtener el access token de Google')

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(fileSize),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google Drive rechazó la sesión de subida: ${response.status} ${text}`)
  }

  const sessionUri = response.headers.get('location')
  if (!sessionUri) throw new Error('Google Drive no devolvió el header Location')

  return sessionUri
}

export async function verifyDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.get({ fileId, fields: 'id' })
}

export async function makeFilePublic(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })
}

export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const drive = getDriveClient()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID no está definida')

  const stream = Readable.from(buffer)

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id',
  })

  const fileId = response.data.id
  if (!fileId) throw new Error('No se pudo obtener el ID del archivo de Drive')

  await makeFilePublic(fileId)

  return fileId
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient()
  const res = await drive.files.delete({ fileId })
  if (res.status !== 204) {
    throw new Error(`Drive respondió con status ${res.status}`)
  }
}

export { getDriveViewUrl, getDriveDownloadUrl } from './driveUrls'
