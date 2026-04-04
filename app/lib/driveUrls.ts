export function getDriveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`
}

export function getDriveDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?id=${fileId}&export=download`
}
