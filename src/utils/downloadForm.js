/**
 * Downloads the official FRCC Membership Application Form PDF directly to the user's device.
 * Uses Blob object URL and download attribute to force file download without browser viewing.
 */
export async function downloadOfficialApplicationForm(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  const timestamp = Date.now();
  const pdfUrl = `/FRCC-Membership-Application-Form.pdf?t=${timestamp}`;
  const fileName = 'FRCC-Membership-Application-Form.pdf';

  try {
    const response = await fetch(pdfUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
    }, 150);
  } catch (err) {
    console.warn('[downloadForm] Fetch blob download fallback:', err);
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 150);
  }
}

export default downloadOfficialApplicationForm;
