// utils/testData.js
// Update these values to match actual supplier/product names in the LS1 app
// for the gestid subdistributor account.

const TEST_DATA = {
  po: {
    Distributor: 'XO Distributing',  
    product:  'Jennies Eggs',                  
    quantity: 10,
  },
  salesOrder: {
    loadingStore: 'XO stores',
    paymentTerm: 'Cash',
    leadDays: 7,
  },
  transporter: {
    codePrefix: 'AUTO-TR',
    namePrefix: 'Auto Transporter',
    email: 'auto.transporter@yopmail.com',
    phone: '08012345678',
    country: 'Nigeria',
    state: 'Lagos',
    localGovernment: 'Ikeja',
    city: 'Lagos',
    street: '12 Automation Road',
    zipCode: '100001',
    documentPath: '',
    documentName: 'Transporter License',
    issueDate: '01/01/2025',
    expiryDate: '31/12/2026',
    documentNumber: 'DOC123456',
    issuingAuthority: 'Lagos State Ministry of Transport',
    contactFirstName: 'Automation',
    contactLastName: 'User',
    contactEmail: 'auto.contact@yopmail.com',
    contactPhone: '08087654321',
    relationship: 'Manager',
    photoPath: '',
  },
};

module.exports = { TEST_DATA };
