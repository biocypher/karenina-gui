/**
 * File Download Utilities
 * Functions for downloading files in the browser
 */

/**
 * Downloads a file with the given content
 * @param content - The file content as a string
 * @param fileName - The name of the file to download
 * @param mimeType - The MIME type of the file
 */
export function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Downloads data as a JSON file
 * @param data - The data to download (will be JSON stringified)
 * @param fileName - The name of the file (without extension)
 * @param prettify - Whether to prettify the JSON (default: true)
 */
export function downloadJSON(data: unknown, fileName: string, prettify: boolean = true): void {
  const dataStr = JSON.stringify(data, null, prettify ? 2 : 0);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  triggerDataUriDownload(dataUri, fileName + '.json');
}

/**
 * Downloads a data URI as a file
 * @param dataUri - The data URI to download
 * @param fileName - The name of the file
 */
function triggerDataUriDownload(dataUri: string, fileName: string): void {
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', fileName);
  linkElement.click();
}

/**
 * Generates a date-stamped filename
 * @param baseName - The base name of the file
 * @param extension - The file extension (with or without leading dot)
 * @returns A date-stamped filename
 */
export function generateDateStampedFilename(baseName: string, extension: string): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  const date = new Date().toISOString().split('T')[0];
  return `${baseName}_${date}${ext}`;
}
