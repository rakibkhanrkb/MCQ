/**
 * Robust utility to open or download base64 data URLs or standard links on all devices.
 * Specifically bypasses security limitations in desktop browsers (Chrome, Edge, etc.)
 * where raw top-level navigation to data: URIs is blocked.
 */
export const openOrDownloadRoutine = (
  fileUrl: string,
  routineType: 'text' | 'image' | 'pdf',
  title: string
) => {
  if (!fileUrl) return;

  // Clean filename: Replace non-alphanumeric and spaces with underscores
  const cleanTitle = title.replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, '_');
  const extension = routineType === 'pdf' ? 'pdf' : 'png';
  const fileName = `${cleanTitle}.${extension}`;

  if (fileUrl.startsWith('data:')) {
    try {
      // Split header and base64 parts
      const parts = fileUrl.split(',');
      if (parts.length < 2) throw new Error("Invalid base64 format");
      
      const header = parts[0];
      const base64Data = parts[1];
      const mimeMatch = header.match(/data:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : (routineType === 'pdf' ? 'application/pdf' : 'image/png');

      // Decode base64 to byte arrays
      const sliceSize = 1024;
      const byteCharacters = atob(base64Data);
      const byteArrays: Uint8Array[] = [];

      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (routineType === 'pdf') {
        // Open PDF in a new tab so it loads the browser's built-in PDF viewer with view/print/download capabilities
        const win = window.open();
        if (win) {
          win.location.href = blobUrl;
        } else {
          // Fallback to direct download if popup blocker is active
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // Force direct download for images/other formats
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Cleanup object URL after a few seconds
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 15000);

    } catch (error) {
      console.error("Base64 downloader failed, falling back to direct navigation:", error);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } else {
    // Standard external URL or cloud-hosted resource
    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    if (routineType !== 'pdf') {
      link.download = fileName;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
