import { PlayerRegistration, Tournament } from '../types';

export const printRegistrationSlip = (reg: PlayerRegistration, tournament?: Tournament) => {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Please allow popups to print/download the registration form.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <title>Player Registration - ${reg.name}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 20px;
          background: #fff;
        }
        .card {
          border: 2px solid #0f766e;
          border-radius: 16px;
          padding: 24px;
          max-width: 720px;
          margin: 0 auto;
          position: relative;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .title-area h1 {
          font-size: 22px;
          margin: 0;
          color: #0f766e;
          font-weight: 800;
        }
        .title-area p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #64748b;
        }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-approved { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .badge-rejected { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
        .main-content {
          display: flex;
          gap: 24px;
          margin-bottom: 24px;
        }
        .photo-box {
          width: 140px;
          height: 160px;
          border: 2px dashed #94a3b8;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          flex-shrink: 0;
        }
        .photo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
        }
        .info-table th, .info-table td {
          padding: 8px 12px;
          text-align: left;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }
        .info-table th {
          color: #64748b;
          font-weight: 600;
          width: 35%;
        }
        .info-table td {
          color: #0f172a;
          font-weight: 700;
        }
        .section-title {
          font-size: 14px;
          font-weight: 800;
          color: #0f766e;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 20px 0 8px;
          border-left: 4px solid #0f766e;
          padding-left: 8px;
        }
        .payment-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          font-size: 13px;
        }
        .payment-item span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .payment-item strong {
          color: #0f172a;
          font-size: 14px;
        }
        .footer-signs {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          padding-top: 24px;
        }
        .sign-line {
          width: 180px;
          border-top: 1px dashed #64748b;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          padding-top: 6px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="title-area">
            <h1>${tournament?.name || 'Tournament Player Registration'}</h1>
            <p>Player Official Registration Form & Verification Receipt</p>
          </div>
          <div>
            <span class="badge ${reg.status === 'approved' ? 'badge-approved' : reg.status === 'pending' ? 'badge-pending' : 'badge-rejected'}">
              ${reg.status}
            </span>
          </div>
        </div>

        <div class="main-content">
          <div class="photo-box">
            ${reg.imageUrl ? `<img src="${reg.imageUrl}" alt="${reg.name}" />` : '<span style="color:#94a3b8; font-size:12px;">No Photo</span>'}
          </div>
          <table class="info-table">
            <tr><th>Player Name</th><td>${reg.name}</td></tr>
            <tr><th>Player Role</th><td>${reg.role}</td></tr>
            <tr><th>Father's Name</th><td>${reg.fatherName || '-'}</td></tr>
            <tr><th>Mother's Name</th><td>${reg.motherName || '-'}</td></tr>
            <tr><th>WhatsApp / Mobile</th><td>${reg.whatsappNumber}</td></tr>
            <tr><th>Blood Group</th><td>${reg.bloodGroup || '-'}</td></tr>
            <tr><th>Jersey No & Size</th><td>${reg.jerseyNumber ? '#' + reg.jerseyNumber : '-'} (${reg.jerseySize || '-'})</td></tr>
            <tr><th>Assigned Team</th><td>${reg.assignedTeamName || 'Not Assigned Yet'}</td></tr>
            <tr><th>Address</th><td>${reg.address || '-'}</td></tr>
          </table>
        </div>

        <div class="section-title">Payment & Verification Information</div>
        <div class="payment-box">
          <div class="payment-item">
            <span>Registration Fee</span>
            <strong>৳${reg.registrationFee}</strong>
          </div>
          <div class="payment-item">
            <span>Payment Gateway</span>
            <strong style="text-transform: uppercase;">${reg.paymentMethod}</strong>
          </div>
          <div class="payment-item">
            <span>Sender Number</span>
            <strong>${reg.senderNumber || '-'}</strong>
          </div>
          <div class="payment-item">
            <span>Transaction ID (TrxID)</span>
            <strong>${reg.transactionId || '-'}</strong>
          </div>
          <div class="payment-item">
            <span>Registration Date</span>
            <strong>${new Date(reg.createdAt).toLocaleDateString()}</strong>
          </div>
          <div class="payment-item">
            <span>Registration ID</span>
            <strong style="font-family: monospace;">${reg.id}</strong>
          </div>
        </div>

        <div class="footer-signs">
          <div class="sign-line">Player Signature</div>
          <div class="sign-line">Admin / Authority Signature</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
