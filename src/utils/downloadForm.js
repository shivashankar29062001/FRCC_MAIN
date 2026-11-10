/**
 * Downloads the official FRCC Membership Application Form PDF directly to the user's device.
 * Tries static PDF fetch first with reliable blob download, and falls back to dynamic
 * jsPDF generation so downloads always succeed across all browsers and devices.
 */

function getStoredMemberOrDemo() {
  try {
    const rawUser =
      (typeof window !== 'undefined' && window.localStorage?.getItem('frcc.session.v1')) ||
      (typeof window !== 'undefined' && window.sessionStorage?.getItem('frcc.session.v1'));
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { name: '', memberCode: '' };
}

function triggerBlobDownload(blob, fileName) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  // Keep the blob URL alive for 60 seconds so browser download manager finishes saving file
  setTimeout(() => {
    try {
      window.URL.revokeObjectURL(blobUrl);
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    } catch {
      /* ignore */
    }
  }, 60000);
}

export async function downloadOfficialApplicationForm(e, member = null) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  const fileName = 'FRCC-Membership-Application-Form.pdf';

  // 1. Try static file fetch without cache-busting query strings that break static routing
  try {
    const response = await fetch('/FRCC-Membership-Application-Form.pdf');
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        const blob = await response.blob();
        if (blob && blob.size > 1000) {
          triggerBlobDownload(blob, fileName);
          return;
        }
      }
    }
  } catch (fetchErr) {
    console.warn('[downloadForm] Static file fetch notice, trying dynamic generation:', fetchErr);
  }

  // 2. Try documents subpath
  try {
    const response2 = await fetch('/documents/FRCC-Membership-Application-Form.pdf');
    if (response2.ok) {
      const contentType = response2.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        const blob = await response2.blob();
        if (blob && blob.size > 1000) {
          triggerBlobDownload(blob, fileName);
          return;
        }
      }
    }
  } catch {
    /* fallback to dynamic generator */
  }

  // 3. Dynamic generator via jsPDF (official A4 portrait application form)
  try {
    const { buildApplicationFormPdf } = await import('../lib/applicationForm.js');
    const memberData = member || getStoredMemberOrDemo();
    const doc = await buildApplicationFormPdf(memberData);
    doc.save(fileName);
    return;
  } catch (genErr) {
    console.warn('[downloadForm] Dynamic PDF generator fallback:', genErr);
  }

  // 4. Final anchor download fallback
  try {
    const link = document.createElement('a');
    link.href = '/FRCC-Membership-Application-Form.pdf';
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 2000);
  } catch {
    /* ignore */
  }
}

export default downloadOfficialApplicationForm;
